import { createHash, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

import {
  DashboardData,
  DocumentType,
  ImportRun,
  ImportSourceRow,
  LegalStatus,
  ReviewStatus,
  TaxStatus,
  Vendor,
  VendorClassification,
  VendorContact,
  VendorComplianceSummary,
  VendorDetail,
  VendorDocument,
  VendorReview,
  VendorService,
  VendorState,
  VendorSummary,
} from "@/lib/vendor/types";
import {
  appendVendorAuditEntry,
  createVendorPortalAccessToken,
  createVendorRevisionRequest,
  ensureVendorOpsState,
  getVendorOpsState,
  getVendorPortalAccessToken,
  queueVendorNotification,
  getVendorRevisionByToken,
  resolveVendorRevisionRequest,
} from "@/lib/vendor/ops-store";

const DATA_DIR = path.join(process.cwd(), "data");
const STATE_PATH = path.join(DATA_DIR, "vendor-state.json");
const DEFAULT_SOURCE_PATH = path.join(DATA_DIR, "source", "vendor-responses.xlsx");
const SOURCE_PATH = process.env.VENDOR_SOURCE_XLSX_PATH ?? DEFAULT_SOURCE_PATH;
const SOURCE_LABEL = path.basename(SOURCE_PATH);

const EMPTY_STATE: VendorState = {
  vendors: [],
  vendorContacts: [],
  vendorServices: [],
  vendorDocuments: [],
  vendorReviews: [],
  importRuns: [],
  importSourceRows: [],
};

const DOCUMENT_LABELS: Record<DocumentType, string> = {
  company_profile: "Company Profile / Compro",
  catalog: "Item Pricelist / Catalog",
  npwp_scan: "NPWP Scan",
  owner_ktp: "Owner KTP",
  nib: "NIB",
  invoice_sample: "Invoice Sample",
  pkp_certificate: "PKP / Non-PKP Letter",
  nda: "NDA",
  pic_ktp: "PIC KTP",
};

type ImportedRow = {
  rowNumber: number;
  rowHash: string;
  vendorKey: string;
  vendor: Vendor;
  contacts: VendorContact[];
  services: VendorService[];
  documents: VendorDocument[];
  sourceRow: ImportSourceRow;
};

export type VendorIntakePayload = {
  vendorName: string;
  services: string[];
  coverageArea: string;
  email: string;
  legalStatus: LegalStatus;
  taxStatus: TaxStatus;
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  npwpNumber: string;
  websiteUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  linkedinUrl: string;
  picName: string;
  picTitle: string;
  picPhone: string;
  picEmail: string;
  businessAddress: string;
  documentsFolderUrl: string;
  companyProfileUrl: string;
  catalogUrl: string;
  npwpScanUrl: string;
  ownerKtpUrl: string;
  nibUrl: string;
  invoiceSampleUrl: string;
  pkpCertificateUrl: string;
  ndaUrl: string;
  picKtpUrl: string;
};

function slug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function stringValue(value: unknown) {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value).trim();
}

function normalizeLegalStatus(value: string): LegalStatus {
  if (value === "PT/CV" || value === "Freelance/Perorangan" || value === "Lainnya") {
    return value;
  }
  return "Unknown";
}

function normalizeTaxStatus(value: string): TaxStatus {
  if (value === "PKP" || value === "Non-PKP") {
    return value;
  }
  return "Unknown";
}

function nowIso() {
  return new Date().toISOString();
}

const SERVICE_NAME_MAP: Record<string, string> = {
  "Advertisting": "Advertising",
  "Ringging": "Rigging & Booth Construction",
  "& Booth": "Booth Construction",
  "Talent Managemenr Service": "Talent Management",
  "Talent Management Services": "Talent Management",
  "Stage Show Management Services": "Show Management",
  "Stage Show Management System": "Show Management",
  "Stage Show Management": "Show Management",
  "Show Management": "Show Management",
  "Dancer & Choreograpers": "Dancers & Choreographers",
  "Designer 3D Motion Graphic": "Designer 3D Motion Graphics",
  "Designer 3D Motion Graphics & Animation": "Designer 3D Motion Graphics",
  "Floor Team": "Production Floor Team",
  "Lain Lain": "Others",
  "Option 18": "General Service",
};

function normalizeServiceName(service: string) {
  const trimmed = service.trim().replace(/\s+/g, " ");
  // Apply specific mapping if exists
  const mapped = SERVICE_NAME_MAP[trimmed];
  if (mapped) return mapped;
  
  // Default normalization for booth if not explicitly mapped
  if (/^&\s*booth$/i.test(trimmed)) return "Booth Construction";
  
  return trimmed;
}

function hashRow(rawSource: Record<string, string>) {
  return createHash("sha256").update(JSON.stringify(rawSource)).digest("hex");
}

function requiredDocumentTypes(legalStatus: LegalStatus) {
  if (legalStatus === "PT/CV") {
    return [
      "company_profile",
      "npwp_scan",
      "owner_ktp",
      "nib",
      "pkp_certificate",
      "nda",
      "pic_ktp",
    ] as DocumentType[];
  }

  if (legalStatus === "Freelance/Perorangan") {
    return [
      "company_profile",
      "npwp_scan",
      "owner_ktp",
      "nda",
      "pic_ktp",
    ] as DocumentType[];
  }

  return ["company_profile", "nda", "pic_ktp"] as DocumentType[];
}

function createDocument(
  vendorId: string,
  type: DocumentType,
  url: string,
  requiredTypes: DocumentType[],
) {
  const cleanUrl = stringValue(url);

  if (!cleanUrl) {
    return null;
  }

  return {
    id: randomUUID(),
    vendorId,
    type,
    label: DOCUMENT_LABELS[type],
    url: cleanUrl,
    isRequired: requiredTypes.includes(type),
    isVerified: false,
  } satisfies VendorDocument;
}

function splitServices(value: string) {
  return value
    .split(",")
    .map((item) => normalizeServiceName(item))
    .filter(Boolean);
}

function normalizePhoneToWhatsApp(phone: string) {
  const digits = phone.replace(/[^\d]/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("62")) return digits;
  return digits;
}

function inferClassification(services: string[]): VendorClassification {
  const goodsKeywords = [
    "rental", "equipment", "stage", "rigging", "booth",
    "catering", "souvenir", "merchandise", "logistic",
    "cargo", "transport", "printing", "tenda", "genset",
    "ac", "audio", "lighting", "led", "screen"
  ];

  const talentKeywords = [
    "mc", "host", "talent", "performer", "singer", "band",
    "dancer", "model", "manpower", "crew", "usher", "makeup",
    "mua", "stylist", "photographer", "videographer", "choreo"
  ];

  const lowerServices = services.map(s => s.toLowerCase());

  const matchesGoods = lowerServices.some(s =>
    goodsKeywords.some(k => s.includes(k))
  );
  if (matchesGoods) return "Penyedia Barang";

  const matchesTalent = lowerServices.some(s =>
    talentKeywords.some(k => s.includes(k))
  );
  if (matchesTalent) return "Talent/Manpower";

  return "Penyedia Jasa";
}

function isValidHttpUrl(value: string) {
  if (!value) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidPhone(value: string) {
  const normalized = normalizePhoneToWhatsApp(value);
  return normalized.length >= 10 && normalized.length <= 16 && /^62\d+$/.test(normalized);
}

function isValidEmail(value: string) {
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validateVendorIntakePayload(payload: VendorIntakePayload) {
  const errors: string[] = [];
  const requiredTypes = requiredDocumentTypes(payload.legalStatus);

  if (!payload.vendorName.trim()) errors.push("Vendor name is required.");
  if (payload.services.length === 0) errors.push("At least one service is required.");
  if (!payload.picName.trim()) errors.push("PIC name is required.");
  if (!payload.picPhone.trim()) errors.push("PIC phone/WhatsApp is required.");
  if (!isValidPhone(payload.picPhone)) errors.push("PIC phone/WhatsApp format is invalid.");
  if (!isValidEmail(payload.email)) errors.push("Business email format is invalid.");
  if (!isValidEmail(payload.picEmail)) errors.push("PIC email format is invalid.");

  const urlFields: [string, string][] = [
    ["websiteUrl", payload.websiteUrl],
    ["instagramUrl", payload.instagramUrl],
    ["tiktokUrl", payload.tiktokUrl],
    ["linkedinUrl", payload.linkedinUrl],
    ["companyProfileUrl", payload.companyProfileUrl],
    ["catalogUrl", payload.catalogUrl],
    ["npwpScanUrl", payload.npwpScanUrl],
    ["ownerKtpUrl", payload.ownerKtpUrl],
    ["nibUrl", payload.nibUrl],
    ["invoiceSampleUrl", payload.invoiceSampleUrl],
    ["pkpCertificateUrl", payload.pkpCertificateUrl],
    ["ndaUrl", payload.ndaUrl],
    ["picKtpUrl", payload.picKtpUrl],
  ];

  for (const [name, value] of urlFields) {
    if (value.trim() && !isValidHttpUrl(value.trim())) {
      errors.push(`${name} must be a valid http/https URL.`);
    }
  }

  const requiredDocFieldByType: Record<DocumentType, keyof VendorIntakePayload> = {
    company_profile: "companyProfileUrl",
    catalog: "catalogUrl",
    npwp_scan: "npwpScanUrl",
    owner_ktp: "ownerKtpUrl",
    nib: "nibUrl",
    invoice_sample: "invoiceSampleUrl",
    pkp_certificate: "pkpCertificateUrl",
    nda: "ndaUrl",
    pic_ktp: "picKtpUrl",
  };

  for (const type of requiredTypes) {
    const fieldKey = requiredDocFieldByType[type];
    const value = payload[fieldKey] as string;
    if (!value.trim()) {
      errors.push(`${DOCUMENT_LABELS[type]} is required for ${payload.legalStatus}.`);
    }
  }

  return errors;
}

async function readWorkbookRows() {
  const fileBuffer = await readFile(SOURCE_PATH);
  const workbook = XLSX.read(fileBuffer, {
    type: "buffer",
    cellDates: true,
  });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(sheet, {
    header: 1,
    raw: false,
    defval: "",
  });

  const [headerRow, ...dataRows] = rows;
  const headers = (headerRow ?? []).map((header) => stringValue(header));

  return dataRows.map((cells, index) => {
    const rawSource = Object.fromEntries(
      headers.map((header, columnIndex) => [header, stringValue(cells[columnIndex])]),
    );

    return {
      rowNumber: index + 2,
      rawSource,
    };
  });
}

async function importSpreadsheetRows(): Promise<ImportedRow[]> {
  if (!existsSync(SOURCE_PATH)) {
    return [];
  }

  const rows = await readWorkbookRows();

  return rows
    .filter(({ rawSource }) => rawSource["Nama Vendor/Supplier/Partner"])
    .map<ImportedRow>(({ rowNumber, rawSource }) => {
      const timestamp = rawSource["Timestamp"] || nowIso();
      const vendorName = rawSource["Nama Vendor/Supplier/Partner"];
      const email = rawSource["Email"] || rawSource["Email address"] || "";
      const legalStatus = normalizeLegalStatus(rawSource["Status Legalitas "]);
      const taxStatus = normalizeTaxStatus(rawSource["Status "]);
      const vendorKey = `${slug(vendorName)}-${slug(email || rawSource["Nomor HP/WA PIC"] || String(rowNumber))}`;
      const vendorId = randomUUID();
      const rowHash = hashRow(rawSource);
      const importedAt = nowIso();
      const requiredTypes = requiredDocumentTypes(legalStatus);

      const vendor: Vendor = {
        id: vendorId,
        vendorKey,
        name: vendorName,
        portalUsername: email || rawSource["Nomor HP/WA PIC"] || "",
        emailVerifiedAt: "",
        phoneVerifiedAt: "",
        displayType: rawSource["Partner"],
        classification: inferClassification(splitServices(rawSource["Partner"])),
        legalStatus,
        taxStatus,
        coverageArea: rawSource["Lokasi"],
        email,
        bankName: rawSource["Nama Bank"],
        bankAccountNumber: rawSource["Nomor Rekening : "] || rawSource["Nomor Rekening :"] || rawSource["Nomor Rekening"],
        bankAccountHolder: rawSource["Nama Rekening :"] || rawSource["Nama Rekening : "],
        npwpNumber: rawSource["Nomor Pokok Wajib Pajak (NPWP)"],
        websiteUrl: rawSource["Website"],
        instagramUrl: rawSource["Instagram"],
        tiktokUrl: rawSource["TikTok"],
        linkedinUrl: rawSource["LinkedIn"],
        businessAddress: rawSource["Alamat Usaha"] || "",
        documentsFolderUrl: rawSource["Link Folder Dokumen"] || "",
        sourceTimestamp: timestamp,
        sourceRowHash: rowHash,
        rawSource,
        createdAt: importedAt,
        updatedAt: importedAt,
      };

      const contacts: VendorContact[] = [
        {
          id: randomUUID(),
          vendorId,
          name: rawSource["Nama PIC"],
          title: rawSource["Jabatan PIC"],
          phone: rawSource["Nomor HP/WA PIC"],
          email: rawSource["Email PIC"],
          createdAt: importedAt,
          updatedAt: importedAt,
        },
      ].filter((contact) => contact.name || contact.email || contact.phone);

      const documentCandidates = [
        createDocument(vendorId, "company_profile", rawSource["Upload Compro/Item Pricelist/Catalog"], requiredTypes),
        createDocument(vendorId, "catalog", rawSource["Upload Compro/Item Pricelist/Catalog 2"], requiredTypes),
        createDocument(vendorId, "catalog", rawSource["Upload Compro/Item Pricelist/Catalog 3"], requiredTypes),
        createDocument(vendorId, "catalog", rawSource["Upload Compro/Item Pricelist/Catalog 4"], requiredTypes),
        createDocument(vendorId, "npwp_scan", rawSource["Upload Scan NPWP (PDF/JPG) "], requiredTypes),
        createDocument(vendorId, "owner_ktp", rawSource["Upload Scan KTP Pemilik (PDF/JPG)"], requiredTypes),
        createDocument(vendorId, "nib", rawSource["Upload NIB (untuk PT/CV)"], requiredTypes),
        createDocument(vendorId, "invoice_sample", rawSource["Upload Invoice (Optional jika sudah pernah bekerja sama dengan EO lain) "], requiredTypes),
        createDocument(
          vendorId,
          "pkp_certificate",
          rawSource["Upload Surat Tanda PKP/ Surat Keterangan Non-PKP"] ||
          rawSource["Upload Surat Tanda PKP/ Surat Keterangan Non-PKP 2"],
          requiredTypes,
        ),
        createDocument(vendorId, "nda", rawSource["Upload NDA"], requiredTypes),
        createDocument(vendorId, "pic_ktp", rawSource["Upload KTP PIC"], requiredTypes),
      ];
      const documents: VendorDocument[] = documentCandidates.flatMap((document) =>
        document ? [document] : [],
      );

      const services: VendorService[] = splitServices(rawSource["Partner"]).map((serviceName) => ({
        id: randomUUID(),
        vendorId,
        name: serviceName,
      }));

      const sourceRow: ImportSourceRow = {
        id: randomUUID(),
        vendorId,
        rowHash,
        rowNumber,
        sourceTimestamp: timestamp,
        importedAt,
        rawSource,
      };

      return { rowNumber, rowHash, vendorKey, vendor, contacts, services, documents, sourceRow };
    });
}

async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

async function readState() {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase!.from('vendor_state').select('data').limit(1).single();
    if (!error && data) {
      return data.data as VendorState;
    }
    // If not found in Supabase, we might want to seed it later or return empty
  }

  await ensureDataDir();

  if (!existsSync(STATE_PATH)) {
    return structuredClone(EMPTY_STATE);
  }

  const content = await readFile(STATE_PATH, "utf8");
  return JSON.parse(content) as VendorState;
}

async function writeState(state: VendorState) {
  if (isSupabaseConfigured()) {
    await supabase!.from('vendor_state').upsert({ id: 'current', data: state });
    return;
  }

  await ensureDataDir();
  await writeFile(STATE_PATH, JSON.stringify(state, null, 2));
}

export async function syncFromSource() {
  const state = await readState();
  const startedAt = nowIso();
  const errorMessages: string[] = [];
  let createdVendors = 0;
  let updatedVendors = 0;
  let skippedRows = 0;
  let importedRows: ImportedRow[] = [];

  if (existsSync(SOURCE_PATH)) {
    try {
      importedRows = await importSpreadsheetRows();
    } catch (error) {
      errorMessages.push(
        error instanceof Error ? error.message : `Failed to read source spreadsheet: ${SOURCE_PATH}`,
      );
    }
  }

  for (const imported of importedRows) {
    const existingSourceRow = state.importSourceRows.find((row) => row.rowHash === imported.rowHash);

    if (existingSourceRow) {
      skippedRows += 1;
      continue;
    }

    const existingVendor = state.vendors.find((vendor) => vendor.vendorKey === imported.vendorKey);

    if (existingVendor) {
      updatedVendors += 1;
      existingVendor.name = imported.vendor.name;
      existingVendor.portalUsername = existingVendor.portalUsername || imported.vendor.portalUsername;
      existingVendor.emailVerifiedAt = existingVendor.emailVerifiedAt || imported.vendor.emailVerifiedAt;
      existingVendor.phoneVerifiedAt = existingVendor.phoneVerifiedAt || imported.vendor.phoneVerifiedAt;
      existingVendor.displayType = imported.vendor.displayType;
      existingVendor.classification = imported.vendor.classification;
      existingVendor.legalStatus = imported.vendor.legalStatus;
      existingVendor.taxStatus = imported.vendor.taxStatus;
      existingVendor.coverageArea = imported.vendor.coverageArea;
      existingVendor.email = imported.vendor.email;
      existingVendor.bankName = imported.vendor.bankName;
      existingVendor.bankAccountNumber = imported.vendor.bankAccountNumber;
      existingVendor.bankAccountHolder = imported.vendor.bankAccountHolder;
      existingVendor.npwpNumber = imported.vendor.npwpNumber;
      existingVendor.websiteUrl = imported.vendor.websiteUrl;
      existingVendor.instagramUrl = imported.vendor.instagramUrl;
      existingVendor.tiktokUrl = imported.vendor.tiktokUrl;
      existingVendor.linkedinUrl = imported.vendor.linkedinUrl;
      existingVendor.sourceTimestamp = imported.vendor.sourceTimestamp;
      existingVendor.sourceRowHash = imported.rowHash;
      existingVendor.rawSource = imported.vendor.rawSource;
      existingVendor.updatedAt = nowIso();

      state.vendorContacts = state.vendorContacts.filter((contact) => contact.vendorId !== existingVendor.id);
      state.vendorServices = state.vendorServices.filter((service) => service.vendorId !== existingVendor.id);
      state.vendorDocuments = state.vendorDocuments.filter((document) => document.vendorId !== existingVendor.id);

      state.vendorContacts.push(
        ...imported.contacts.map((contact) => ({ ...contact, vendorId: existingVendor.id })),
      );
      state.vendorServices.push(
        ...imported.services.map((service) => ({ ...service, vendorId: existingVendor.id })),
      );
      state.vendorDocuments.push(
        ...imported.documents.map((document) => ({ ...document, vendorId: existingVendor.id })),
      );
      state.importSourceRows.push({ ...imported.sourceRow, vendorId: existingVendor.id });
      continue;
    }

    createdVendors += 1;
    state.vendors.push(imported.vendor);
    state.vendorContacts.push(...imported.contacts);
    state.vendorServices.push(...imported.services);
    state.vendorDocuments.push(...imported.documents);
    state.importSourceRows.push(imported.sourceRow);
    state.vendorReviews.push({
      id: randomUUID(),
      vendorId: imported.vendor.id,
      status: "new",
      note: "",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
  }

  if (!existsSync(SOURCE_PATH)) {
    errorMessages.push(`Source spreadsheet not found: ${SOURCE_PATH}`);
  }

  const importRun: ImportRun = {
    id: randomUUID(),
    sourceLabel: SOURCE_LABEL,
    startedAt,
    finishedAt: nowIso(),
    createdVendors,
    updatedVendors,
    skippedRows,
    errorCount: errorMessages.length,
    errorMessages,
  };

  state.importRuns.unshift(importRun);
  await writeState(state);

  return { state, importRun };
}

async function ensureSeededState() {
  const state = await readState();

  if (state.vendors.length > 0 || !existsSync(SOURCE_PATH)) {
    return state;
  }

  const seeded = await syncFromSource();
  return seeded.state;
}

function getLatestReview(vendorId: string, reviews: VendorReview[]) {
  return (
    reviews
      .filter((review) => review.vendorId === vendorId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null
  );
}

function getDocumentCompletion(vendor: Vendor, documents: VendorDocument[]) {
  const requiredTypes = requiredDocumentTypes(vendor.legalStatus);
  const requiredDocuments = requiredTypes.map((type) =>
    documents.find((document) => document.vendorId === vendor.id && document.type === type),
  );
  const missingLabels = requiredDocuments
    .map((document, index) => (!document ? DOCUMENT_LABELS[requiredTypes[index]] : null))
    .filter((label): label is string => Boolean(label));

  return {
    complete: requiredTypes.length - missingLabels.length,
    required: requiredTypes.length,
    missingLabels,
    isComplete: missingLabels.length === 0,
  };
}

function averageScore(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1));
}

function buildPerformanceSummary(vendorId: string, opsState: Awaited<ReturnType<typeof getVendorOpsState>>) {
  const scorecards = opsState.scorecards.filter((item) => item.vendorId === vendorId);

  return {
    average: averageScore(
      scorecards.map((item) => (item.quality + item.reliability + item.pricing + item.communication + item.onTime) / 5),
    ),
    quality: averageScore(scorecards.map((item) => item.quality)),
    reliability: averageScore(scorecards.map((item) => item.reliability)),
    pricing: averageScore(scorecards.map((item) => item.pricing)),
    communication: averageScore(scorecards.map((item) => item.communication)),
    onTime: averageScore(scorecards.map((item) => item.onTime)),
    totalReviews: scorecards.length,
  };
}

function buildComplianceSummary(
  vendorId: string,
  opsState: Awaited<ReturnType<typeof getVendorOpsState>>,
  documents: VendorDocument[],
): VendorComplianceSummary {
  const items = opsState.compliance
    .filter((item) => item.vendorId === vendorId)
    .map((item) => {
      const hasDocument = documents.some((document) => document.type === item.documentType);
      if (!hasDocument) {
        return { ...item, status: "missing" as const };
      }

      if (!item.expiresAt) {
        return { ...item, status: "valid" as const };
      }

      const today = new Date();
      const expiry = new Date(item.expiresAt);
      const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) return { ...item, status: "expired" as const };
      if (diffDays <= 30) return { ...item, status: "expiring" as const };
      return { ...item, status: item.status === "missing" ? "valid" as const : item.status };
    });

  const expiredCount = items.filter((item) => item.status === "expired").length;
  const expiringCount = items.filter((item) => item.status === "expiring").length;
  const missingCount = items.filter((item) => item.status === "missing").length;
  const nextExpiry =
    items
      .filter((item) => item.expiresAt)
      .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt))[0]?.expiresAt ?? "";

  return {
    status: expiredCount > 0 || missingCount > 0 ? "critical" : expiringCount > 0 ? "attention" : "ok",
    expiredCount,
    expiringCount,
    missingCount,
    nextExpiry,
    items,
  };
}

function buildVendorSummary(
  state: VendorState,
  vendor: Vendor,
  opsState: Awaited<ReturnType<typeof getVendorOpsState>>,
): VendorSummary {
  const documents = state.vendorDocuments.filter((document) => document.vendorId === vendor.id);
  const latestReview = getLatestReview(vendor.id, state.vendorReviews);
  const profile = opsState.profiles.find((item) => item.vendorId === vendor.id);

  return {
    id: vendor.id,
    name: vendor.name,
    portalUsername: vendor.portalUsername,
    registrationCode: profile?.registrationCode ?? "",
    emailVerifiedAt: vendor.emailVerifiedAt,
    phoneVerifiedAt: vendor.phoneVerifiedAt,
    legalStatus: vendor.legalStatus,
    taxStatus: vendor.taxStatus,
    coverageArea: vendor.coverageArea,
    email: vendor.email,
    classification: vendor.classification || "Unknown",
    serviceNames: Array.from(
      new Set(
        state.vendorServices
          .filter((service) => service.vendorId === vendor.id)
          .map((service) => normalizeServiceName(service.name)),
      ),
    ).sort(),
    reviewStatus: latestReview?.status ?? "new",
    lifecycleStatus: profile?.lifecycleStatus ?? "submitted",
    latestReviewNote: latestReview?.note ?? "",
    documentCompletion: getDocumentCompletion(vendor, documents),
    performance: buildPerformanceSummary(vendor.id, opsState),
    compliance: buildComplianceSummary(vendor.id, opsState, documents),
    cities: profile?.cities ?? [],
    rateCardNotes: profile?.rateCardNotes ?? "",
    availabilityNotes: profile?.availabilityNotes ?? "",
    accountManager: profile?.accountManager ?? "",
    sourceTimestamp: vendor.sourceTimestamp,
    linkedProjects: [],
  };
}

function buildVendorDetail(
  state: VendorState,
  vendor: Vendor,
  opsState: Awaited<ReturnType<typeof getVendorOpsState>>,
): VendorDetail {
  const summary = buildVendorSummary(state, vendor, opsState);

  return {
    ...summary,
    displayType: vendor.displayType,
    bankName: vendor.bankName,
    bankAccountNumber: vendor.bankAccountNumber,
    bankAccountHolder: vendor.bankAccountHolder,
    npwpNumber: vendor.npwpNumber,
    websiteUrl: vendor.websiteUrl,
    instagramUrl: vendor.instagramUrl,
    tiktokUrl: vendor.tiktokUrl,
    linkedinUrl: vendor.linkedinUrl,
    businessAddress: vendor.businessAddress,
    documentsFolderUrl: vendor.documentsFolderUrl,
    rawSource: vendor.rawSource,
    contacts: state.vendorContacts.filter((contact) => contact.vendorId === vendor.id),
    documents: state.vendorDocuments.filter((document) => document.vendorId === vendor.id),
    reviews: state.vendorReviews
      .filter((review) => review.vendorId === vendor.id)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    auditLog: opsState.auditLog.filter((entry) => entry.vendorId === vendor.id).slice(0, 12),
    scorecards: opsState.scorecards.filter((entry) => entry.vendorId === vendor.id).slice(0, 12),
    activeRevisionRequest:
      opsState.revisionRequests.find((request) => request.vendorId === vendor.id && request.status === "open") ?? null,
    notifications: opsState.notifications.filter((item) => item.vendorId === vendor.id).slice(0, 20),
  };
}

function buildRawSourceFromPayload(payload: VendorIntakePayload, timestamp: string, extra: Record<string, string> = {}) {
  return {
    Timestamp: timestamp,
    "Nama Vendor/Supplier/Partner": payload.vendorName,
    Partner: payload.services.map((service) => service.trim()).filter(Boolean).join(", "),
    Lokasi: payload.coverageArea,
    Email: payload.email,
    "Nama Bank": payload.bankName,
    "Nomor Rekening : ": payload.bankAccountNumber,
    "Nama Rekening :": payload.bankAccountHolder,
    "Nomor Pokok Wajib Pajak (NPWP)": payload.npwpNumber,
    Website: payload.websiteUrl,
    Instagram: payload.instagramUrl,
    TikTok: payload.tiktokUrl,
    LinkedIn: payload.linkedinUrl,
    "Status Legalitas ": payload.legalStatus,
    "Status ": payload.taxStatus,
    "Nama PIC": payload.picName,
    "Jabatan PIC": payload.picTitle,
    "Nomor HP/WA PIC": payload.picPhone,
    "Email PIC": payload.picEmail,
    "Alamat Usaha": payload.businessAddress,
    "Link Folder Dokumen": payload.documentsFolderUrl,
    "Upload Compro/Item Pricelist/Catalog": payload.companyProfileUrl,
    "Upload Compro/Item Pricelist/Catalog 2": payload.catalogUrl,
    "Upload Scan NPWP (PDF/JPG) ": payload.npwpScanUrl,
    "Upload Scan KTP Pemilik (PDF/JPG)": payload.ownerKtpUrl,
    "Upload NIB (untuk PT/CV)": payload.nibUrl,
    "Upload Invoice (Optional jika sudah pernah bekerja sama dengan EO lain) ": payload.invoiceSampleUrl,
    "Upload Surat Tanda PKP/ Surat Keterangan Non-PKP": payload.pkpCertificateUrl,
    "Upload NDA": payload.ndaUrl,
    "Upload KTP PIC": payload.picKtpUrl,
    ...extra,
  };
}

function vendorSortKey(name: string) {
  const normalized = name.trim().replace(/\s+/g, " ");
  const withoutBusinessPrefix = normalized.replace(/^(PT|CV)\.?\s*/i, "");

  return withoutBusinessPrefix.toLowerCase();
}

export async function getDashboardData(): Promise<DashboardData> {
  const state = await ensureSeededState();
  const opsState = await ensureVendorOpsState(state.vendors);
  const vendors = state.vendors
    .slice()
    .sort((a, b) => vendorSortKey(a.name).localeCompare(vendorSortKey(b.name)))
    .map((vendor) => buildVendorSummary(state, vendor, opsState));
  const vendorDetails = state.vendors
    .slice()
    .sort((a, b) => vendorSortKey(a.name).localeCompare(vendorSortKey(b.name)))
    .map((vendor) => buildVendorDetail(state, vendor, opsState));
  const registrationByVendorId = new Map(opsState.profiles.map((item) => [item.vendorId, item.registrationCode]));
  const nameByVendorId = new Map(state.vendors.map((item) => [item.id, item.name]));

  return {
    vendors,
    vendorDetails,
    reviewQueue: vendors
      .filter((vendor) => vendor.reviewStatus === "new" || vendor.reviewStatus === "needs_revision")
      .sort((a, b) => a.sourceTimestamp.localeCompare(b.sourceTimestamp)),
    notificationFeed: opsState.notifications.slice(0, 200).map((item) => ({
      ...item,
      vendorName: nameByVendorId.get(item.vendorId) ?? "Unknown vendor",
      registrationCode: registrationByVendorId.get(item.vendorId) ?? "-",
    })),
    importRuns: state.importRuns.slice(0, 10),
    services: Array.from(
      new Set(state.vendorServices.map((service) => normalizeServiceName(service.name))),
    ).sort(),
    locations: Array.from(new Set(state.vendors.map((vendor) => vendor.coverageArea).filter(Boolean))).sort(),
    sourcePath: SOURCE_PATH,
    sourceAvailable: existsSync(SOURCE_PATH),
  };
}

export async function getVendorStatusByRegistration(registrationCode: string, email = "") {
  const state = await ensureSeededState();
  const opsState = await ensureVendorOpsState(state.vendors);
  const profile = opsState.profiles.find(
    (item) =>
      item.registrationCode.toLowerCase() === registrationCode.trim().toLowerCase(),
  );

  if (!profile) {
    return null;
  }

  const vendor = state.vendors.find((item) => item.id === profile.vendorId);
  if (!vendor) {
    return null;
  }

  if (email.trim() && vendor.email && vendor.email.toLowerCase() !== email.trim().toLowerCase()) {
    return null;
  }

  return buildVendorDetail(state, vendor, opsState);
}

export async function requestVendorPortalMagicLink(
  registrationCode: string,
  identifier: { email?: string; phone?: string },
) {
  const state = await ensureSeededState();
  const opsState = await ensureVendorOpsState(state.vendors);
  const profile = opsState.profiles.find(
    (item) => item.registrationCode.toLowerCase() === registrationCode.trim().toLowerCase(),
  );

  if (!profile) {
    throw new Error("Vendor submission not found.");
  }

  const vendor = state.vendors.find((item) => item.id === profile.vendorId);
  if (!vendor) {
    throw new Error("Vendor submission not found.");
  }

  const contact = state.vendorContacts.find((item) => item.vendorId === vendor.id);
  const email = identifier.email?.trim().toLowerCase() ?? "";
  const phone = normalizePhoneToWhatsApp(identifier.phone ?? "");
  const vendorPhone = normalizePhoneToWhatsApp(contact?.phone ?? "");
  const vendorEmail = (contact?.email || vendor.email).toLowerCase();

  const emailMatches = email ? vendorEmail === email : false;
  const phoneMatches = phone ? vendorPhone === phone : false;
  if (!emailMatches && !phoneMatches) {
    throw new Error("Email/phone tidak cocok dengan data vendor.");
  }

  const access = await createVendorPortalAccessToken(vendor.id);
  const linkPath = `/vendor/my/${access.token}`;

  if (vendorEmail) {
    await queueVendorNotification({
      vendorId: vendor.id,
      audience: "vendor",
      channel: "email",
      subject: "Magic link akses status vendor",
      message: `Link akses status vendor: ${linkPath} (berlaku sampai ${access.expiresAt}).`,
      recipient: vendorEmail,
    });
  }

  if (vendorPhone) {
    await queueVendorNotification({
      vendorId: vendor.id,
      audience: "vendor",
      channel: "whatsapp",
      subject: "Magic link status vendor",
      message: `Buka link berikut untuk melihat status: ${linkPath}`,
      recipient: vendorPhone,
    });
  }

  return {
    linkPath,
    expiresAt: access.expiresAt,
    vendorName: vendor.name,
    registrationCode: profile.registrationCode,
  };
}

export async function getVendorByPortalToken(token: string) {
  const access = await getVendorPortalAccessToken(token);
  if (!access) {
    return null;
  }

  const state = await ensureSeededState();
  const opsState = await ensureVendorOpsState(state.vendors);
  const vendor = state.vendors.find((item) => item.id === access.vendorId);
  if (!vendor) {
    return null;
  }

  return {
    vendor: buildVendorDetail(state, vendor, opsState),
    expiresAt: access.expiresAt,
  };
}

export async function getVendorByRevisionToken(token: string) {
  const state = await ensureSeededState();
  const opsState = await ensureVendorOpsState(state.vendors);
  const revision = await getVendorRevisionByToken(token);
  if (!revision) {
    return null;
  }

  const vendor = state.vendors.find((item) => item.id === revision.vendorId);
  if (!vendor) {
    return null;
  }

  return {
    vendor: buildVendorDetail(state, vendor, opsState),
    revision,
  };
}

export async function exportVendorsCsv(filters?: {
  service?: string;
  location?: string;
  reviewStatus?: ReviewStatus;
  classification?: "manpower" | "goods" | "services" | "talent";
  search?: string;
}) {
  const dashboard = await getDashboardData();
  const detailsById = new Map(dashboard.vendorDetails.map((item) => [item.id, item]));

  const filteredVendors = dashboard.vendors.filter((vendor) => {
    if (filters?.service && !vendor.serviceNames.includes(filters.service)) return false;
    if (filters?.location && vendor.coverageArea !== filters.location) return false;
    if (filters?.reviewStatus && vendor.reviewStatus !== filters.reviewStatus) return false;
    if (filters?.search) {
      const haystack = `${vendor.name} ${vendor.email} ${vendor.serviceNames.join(" ")}`.toLowerCase();
      if (!haystack.includes(filters.search.toLowerCase())) return false;
    }
    if (filters?.classification) {
      const text = `${vendor.name} ${vendor.serviceNames.join(" ")}`.toLowerCase();
      const manpower =
        /(floor team|team|security|crowd|dancer|choreo|photographer|videographer|designer|talent|mc |general affair|crew|manpower|usher|singer|band|model|mua|stylist)/.test(
          text,
        );
      const goods =
        /(booth|rigging|stage|logistic|transportation|shuttle|catering|waste|genset|material|equipment|rental|construction)/.test(
          text,
        );
      const classified = manpower ? "talent" : goods ? "goods" : "services";
      if (classified !== filters.classification) return false;
    }
    return true;
  });

  const header = [
    "Registration Code",
    "Vendor Name",
    "Lifecycle Status",
    "Review Status",
    "Services",
    "Coverage Area",
    "Email",
    "WhatsApp",
    "Average Score",
    "Compliance Status",
    "Missing Documents",
  ];

  const rows = filteredVendors.map((vendorSummary) => {
    const vendor = detailsById.get(vendorSummary.id);
    if (!vendor) return null;
    return [
      vendor.registrationCode,
      vendor.name,
      vendor.lifecycleStatus,
      vendor.reviewStatus,
      vendor.serviceNames.join(" | "),
      vendor.coverageArea,
      vendor.email,
      vendor.contacts[0]?.phone || "",
      String(vendor.performance.average),
      vendor.compliance.status,
      vendor.documentCompletion.missingLabels.join(" | "),
    ];
  }).filter((row): row is string[] => Array.isArray(row));

  return [header, ...rows]
    .map((row) =>
      row
        .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
        .join(","),
    )
    .join("\n");
}

export async function updateVendorReview(vendorId: string, status: ReviewStatus, note: string) {
  const state = await ensureSeededState();
  const timestamp = nowIso();

  state.vendorReviews.push({
    id: randomUUID(),
    vendorId,
    status,
    note: note.trim(),
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  await writeState(state);
  await appendVendorAuditEntry(vendorId, "review_updated", `Review updated to ${status}${note.trim() ? `: ${note.trim()}` : "."}`);
  const opsState = await ensureVendorOpsState(state.vendors);

  return buildVendorDetail(state, state.vendors.find((vendor) => vendor.id === vendorId)!, opsState);
}

export async function updateVendorIdentity(
  vendorId: string,
  updates: {
    name?: string;
    email?: string;
    classification?: VendorClassification;
    coverageArea?: string;
    websiteUrl?: string;
    serviceNames?: string[];
    businessAddress?: string;
    documentsFolderUrl?: string;
  },
) {
  const state = await ensureSeededState();
  const vendor = state.vendors.find((item) => item.id === vendorId);
  if (!vendor) {
    throw new Error("Vendor not found");
  }

  const timestamp = nowIso();

  if (updates.name !== undefined) vendor.name = updates.name;
  if (updates.email !== undefined) vendor.email = updates.email;
  if (updates.classification !== undefined) vendor.classification = updates.classification;
  if (updates.coverageArea !== undefined) vendor.coverageArea = updates.coverageArea;
  if (updates.websiteUrl !== undefined) vendor.websiteUrl = updates.websiteUrl;
  if (updates.businessAddress !== undefined) vendor.businessAddress = updates.businessAddress;
  if (updates.documentsFolderUrl !== undefined) vendor.documentsFolderUrl = updates.documentsFolderUrl;

  if (updates.serviceNames !== undefined) {
    // Replace services
    state.vendorServices = state.vendorServices.filter((item) => item.vendorId !== vendorId);
    state.vendorServices.push(
      ...updates.serviceNames.map((serviceName) => ({
        id: randomUUID(),
        vendorId,
        name: normalizeServiceName(serviceName),
      })),
    );
    // Update displayType summary
    vendor.displayType = updates.serviceNames.join(", ");
  }

  vendor.updatedAt = timestamp;
  await writeState(state);
  
  const opsState = await ensureVendorOpsState(state.vendors);
  await appendVendorAuditEntry(vendorId, "identity_updated", "Vendor identity manually adjusted by admin.");
  
  return buildVendorDetail(state, vendor, opsState);
}

export async function submitVendorIntake(payload: VendorIntakePayload) {
  const validationErrors = validateVendorIntakePayload(payload);
  if (validationErrors.length > 0) {
    throw new Error(validationErrors[0]);
  }

  const state = await ensureSeededState();
  const timestamp = nowIso();
  const normalizedServices = payload.services.map((service) => service.trim()).filter(Boolean);
  const vendorKey = `${slug(payload.vendorName)}-${slug(payload.email || payload.picPhone || timestamp)}`;
  const duplicateVendor = state.vendors.find((vendor) => vendor.vendorKey === vendorKey);

  if (duplicateVendor) {
    throw new Error("Vendor already submitted");
  }

  const vendorId = randomUUID();
  const rawSource = buildRawSourceFromPayload(payload, timestamp, {
    "Submission Source": "Self-service portal",
  });
  const rowHash = hashRow(rawSource);
  const requiredTypes = requiredDocumentTypes(payload.legalStatus);

  const vendor: Vendor = {
    id: vendorId,
    vendorKey,
    name: payload.vendorName,
    portalUsername: payload.email || payload.picPhone,
    emailVerifiedAt: "",
    phoneVerifiedAt: "",
    displayType: normalizedServices.join(", "),
    classification: inferClassification(normalizedServices),
    legalStatus: payload.legalStatus,
    taxStatus: payload.taxStatus,
    coverageArea: payload.coverageArea,
    email: payload.email,
    businessAddress: payload.businessAddress,
    bankName: payload.bankName,
    bankAccountNumber: payload.bankAccountNumber,
    bankAccountHolder: payload.bankAccountHolder,
    npwpNumber: payload.npwpNumber,
    websiteUrl: payload.websiteUrl,
    instagramUrl: payload.instagramUrl,
    tiktokUrl: payload.tiktokUrl,
    linkedinUrl: payload.linkedinUrl,
    documentsFolderUrl: payload.documentsFolderUrl,
    sourceTimestamp: timestamp,
    sourceRowHash: rowHash,
    rawSource,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const contacts: VendorContact[] = [
    {
      id: randomUUID(),
      vendorId,
      name: payload.picName,
      title: payload.picTitle,
      phone: payload.picPhone,
      email: payload.picEmail,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ].filter((contact) => contact.name || contact.email || contact.phone);

  const documents: VendorDocument[] = [
    createDocument(vendorId, "company_profile", payload.companyProfileUrl, requiredTypes),
    createDocument(vendorId, "catalog", payload.catalogUrl, requiredTypes),
    createDocument(vendorId, "npwp_scan", payload.npwpScanUrl, requiredTypes),
    createDocument(vendorId, "owner_ktp", payload.ownerKtpUrl, requiredTypes),
    createDocument(vendorId, "nib", payload.nibUrl, requiredTypes),
    createDocument(vendorId, "invoice_sample", payload.invoiceSampleUrl, requiredTypes),
    createDocument(vendorId, "pkp_certificate", payload.pkpCertificateUrl, requiredTypes),
    createDocument(vendorId, "nda", payload.ndaUrl, requiredTypes),
    createDocument(vendorId, "pic_ktp", payload.picKtpUrl, requiredTypes),
  ].flatMap((document) => (document ? [document] : []));

  const services: VendorService[] = normalizedServices.map((serviceName) => ({
    id: randomUUID(),
    vendorId,
    name: serviceName,
  }));

  state.vendors.push(vendor);
  state.vendorContacts.push(...contacts);
  state.vendorDocuments.push(...documents);
  state.vendorServices.push(...services);
  state.vendorReviews.push({
    id: randomUUID(),
    vendorId,
    status: "new",
    note: "Submitted by vendor portal",
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  state.importSourceRows.push({
    id: randomUUID(),
    vendorId,
    rowHash,
    rowNumber: 0,
    sourceTimestamp: timestamp,
    importedAt: timestamp,
    rawSource,
  });

  await writeState(state);
  const opsState = await ensureVendorOpsState(state.vendors);
  await appendVendorAuditEntry(vendorId, "portal_submission", "Vendor submitted profile through self-service portal.", "Vendor Portal");
  await queueVendorNotification({
    vendorId,
    audience: "admin",
    channel: "email",
    subject: `Vendor submission baru: ${payload.vendorName}`,
    message: `Vendor baru masuk. Nama: ${payload.vendorName}. Service: ${normalizedServices.join(", ")}. PIC: ${payload.picName}. Review di dashboard admin.`,
    recipient: process.env.ADMIN_EMAIL ?? "admin@juara.local",
  });
  await queueVendorNotification({
    vendorId,
    audience: "admin",
    channel: "whatsapp",
    subject: "Vendor submission baru",
    message: `Vendor baru masuk: ${payload.vendorName}. PIC ${payload.picName}. Buka dashboard admin untuk review.`,
    recipient: process.env.ADMIN_PHONE ?? "admin-whatsapp",
  });

  return buildVendorDetail(state, vendor, opsState);
}

export async function requestVendorRevision(
  vendorId: string,
  input: {
    generalNote: string;
    items: { fieldKey: string; label: string; note: string; section: "identity" | "contact" | "documents" | "finance" | "services" }[];
  },
) {
  const state = await ensureSeededState();
  const vendor = state.vendors.find((item) => item.id === vendorId);
  if (!vendor) {
    throw new Error("Vendor not found");
  }

  const contact = state.vendorContacts.find((item) => item.vendorId === vendorId);
  const revision = await createVendorRevisionRequest(
    vendorId,
    {
      generalNote: input.generalNote,
      items: input.items.map((item) => ({
        id: randomUUID(),
        fieldKey: item.fieldKey,
        label: item.label,
        note: item.note,
        section: item.section,
      })),
    },
    {
      email: contact?.email || vendor.email,
      phone: contact?.phone || "",
      name: contact?.name || vendor.name,
    },
  );

  state.vendorReviews.push({
    id: randomUUID(),
    vendorId,
    status: "needs_revision",
    note: input.generalNote || "Vendor needs revision.",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
  await writeState(state);

  return revision;
}

export async function resubmitVendorRevision(token: string, payload: VendorIntakePayload) {
  const validationErrors = validateVendorIntakePayload(payload);
  if (validationErrors.length > 0) {
    throw new Error(validationErrors[0]);
  }

  const revisionData = await getVendorByRevisionToken(token);
  if (!revisionData) {
    throw new Error("Revision link is invalid or expired.");
  }

  const state = await ensureSeededState();
  const vendor = state.vendors.find((item) => item.id === revisionData.vendor.id);
  if (!vendor) {
    throw new Error("Vendor not found.");
  }

  const timestamp = nowIso();
  const normalizedServices = payload.services.map((service) => service.trim()).filter(Boolean);
  const rowHash = hashRow(buildRawSourceFromPayload(payload, timestamp, { "Submission Source": "Revision portal" }));
  const requiredTypes = requiredDocumentTypes(payload.legalStatus);

  vendor.name = payload.vendorName;
  vendor.displayType = normalizedServices.join(", ");
  vendor.legalStatus = payload.legalStatus;
  vendor.taxStatus = payload.taxStatus;
  vendor.coverageArea = payload.coverageArea;
  vendor.email = payload.email;
  vendor.businessAddress = payload.businessAddress;
  vendor.bankName = payload.bankName;
  vendor.bankAccountNumber = payload.bankAccountNumber;
  vendor.bankAccountHolder = payload.bankAccountHolder;
  vendor.npwpNumber = payload.npwpNumber;
  vendor.websiteUrl = payload.websiteUrl;
  vendor.instagramUrl = payload.instagramUrl;
  vendor.tiktokUrl = payload.tiktokUrl;
  vendor.linkedinUrl = payload.linkedinUrl;
  vendor.documentsFolderUrl = payload.documentsFolderUrl;
  vendor.sourceTimestamp = timestamp;
  vendor.sourceRowHash = rowHash;
  vendor.rawSource = buildRawSourceFromPayload(payload, timestamp, { "Submission Source": "Revision portal" });
  vendor.updatedAt = timestamp;

  state.vendorContacts = state.vendorContacts.filter((item) => item.vendorId !== vendor.id);
  state.vendorServices = state.vendorServices.filter((item) => item.vendorId !== vendor.id);
  state.vendorDocuments = state.vendorDocuments.filter((item) => item.vendorId !== vendor.id);

  state.vendorContacts.push({
    id: randomUUID(),
    vendorId: vendor.id,
    name: payload.picName,
    title: payload.picTitle,
    phone: payload.picPhone,
    email: payload.picEmail,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  state.vendorServices.push(
    ...normalizedServices.map((serviceName) => ({ id: randomUUID(), vendorId: vendor.id, name: serviceName })),
  );
  state.vendorDocuments.push(
    ...[
      createDocument(vendor.id, "company_profile", payload.companyProfileUrl, requiredTypes),
      createDocument(vendor.id, "catalog", payload.catalogUrl, requiredTypes),
      createDocument(vendor.id, "npwp_scan", payload.npwpScanUrl, requiredTypes),
      createDocument(vendor.id, "owner_ktp", payload.ownerKtpUrl, requiredTypes),
      createDocument(vendor.id, "nib", payload.nibUrl, requiredTypes),
      createDocument(vendor.id, "invoice_sample", payload.invoiceSampleUrl, requiredTypes),
      createDocument(vendor.id, "pkp_certificate", payload.pkpCertificateUrl, requiredTypes),
      createDocument(vendor.id, "nda", payload.ndaUrl, requiredTypes),
      createDocument(vendor.id, "pic_ktp", payload.picKtpUrl, requiredTypes),
    ].flatMap((document) => (document ? [document] : [])),
  );

  state.vendorReviews.push({
    id: randomUUID(),
    vendorId: vendor.id,
    status: "in_review",
    note: "Vendor resubmitted revision.",
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  state.importSourceRows.push({
    id: randomUUID(),
    vendorId: vendor.id,
    rowHash,
    rowNumber: 0,
    sourceTimestamp: timestamp,
    importedAt: timestamp,
    rawSource: vendor.rawSource,
  });

  await writeState(state);
  await resolveVendorRevisionRequest(vendor.id);
  await queueVendorNotification({
    vendorId: vendor.id,
    audience: "admin",
    channel: "email",
    subject: `Vendor resubmission: ${vendor.name}`,
    message: `Vendor ${vendor.name} telah mengirim revisi dan siap direview ulang.`,
    recipient: process.env.ADMIN_EMAIL ?? "admin@juara.local",
  });

  const opsState = await ensureVendorOpsState(state.vendors);
  return buildVendorDetail(state, vendor, opsState);
}
