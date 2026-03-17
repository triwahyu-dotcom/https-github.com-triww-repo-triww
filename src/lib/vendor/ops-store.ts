import { createHash, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

import {
  DocumentType,
  Vendor,
  VendorAuditEntry,
  VendorComplianceItem,
  VendorLifecycleStatus,
  VendorNotification,
  VendorPortalAccessToken,
  VendorOpsProfile,
  VendorOpsState,
  VendorRevisionRequest,
  VendorScorecard,
} from "@/lib/vendor/types";

const DATA_DIR = path.join(process.cwd(), "data");
const OPS_STATE_PATH = path.join(DATA_DIR, "vendor-ops-state.json");

const EMPTY_OPS_STATE: VendorOpsState = {
  profiles: [],
  scorecards: [],
  compliance: [],
  auditLog: [],
  revisionRequests: [],
  notifications: [],
  portalAccessTokens: [],
};

function nowIso() {
  return new Date().toISOString();
}

function registrationCodeForVendor(vendor: Vendor) {
  const hash = createHash("sha1").update(vendor.vendorKey || vendor.id).digest("hex").slice(0, 8).toUpperCase();
  return `VND-${hash}`;
}

function defaultLifecycleStatus(vendor: Vendor): VendorLifecycleStatus {
  return vendor.createdAt === vendor.updatedAt ? "submitted" : "screening";
}

function inferExpiry(type: DocumentType) {
  const base = new Date();

  if (type === "nib" || type === "npwp_scan") {
    base.setFullYear(base.getFullYear() + 2);
    return base.toISOString();
  }

  if (type === "owner_ktp" || type === "pic_ktp" || type === "pkp_certificate") {
    base.setFullYear(base.getFullYear() + 1);
    return base.toISOString();
  }

  return "";
}

function defaultComplianceItems(vendor: Vendor): VendorComplianceItem[] {
  const docTypes: DocumentType[] = [
    "company_profile",
    "catalog",
    "npwp_scan",
    "owner_ktp",
    "nib",
    "invoice_sample",
    "pkp_certificate",
    "nda",
    "pic_ktp",
  ];

  return docTypes.map((documentType) => ({
    id: randomUUID(),
    vendorId: vendor.id,
    documentType,
    status: "missing",
    expiresAt: inferExpiry(documentType),
    note: "",
    updatedAt: vendor.updatedAt,
  }));
}

async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

async function readOpsState() {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase!.from('vendor_ops_state').select('data').limit(1).single();
    if (!error && data) {
      const parsed = data.data as Partial<VendorOpsState>;
      return {
        profiles: parsed.profiles ?? [],
        scorecards: parsed.scorecards ?? [],
        compliance: parsed.compliance ?? [],
        auditLog: parsed.auditLog ?? [],
        revisionRequests: parsed.revisionRequests ?? [],
        notifications: parsed.notifications ?? [],
        portalAccessTokens: parsed.portalAccessTokens ?? [],
      } satisfies VendorOpsState;
    }
  }

  await ensureDataDir();

  if (!existsSync(OPS_STATE_PATH)) {
    return structuredClone(EMPTY_OPS_STATE);
  }

  const content = await readFile(OPS_STATE_PATH, "utf8");
  const parsed = JSON.parse(content) as Partial<VendorOpsState>;

  return {
    profiles: parsed.profiles ?? [],
    scorecards: parsed.scorecards ?? [],
    compliance: parsed.compliance ?? [],
    auditLog: parsed.auditLog ?? [],
    revisionRequests: parsed.revisionRequests ?? [],
    notifications: parsed.notifications ?? [],
    portalAccessTokens: parsed.portalAccessTokens ?? [],
  } satisfies VendorOpsState;
}

async function writeOpsState(state: VendorOpsState) {
  if (isSupabaseConfigured()) {
    await supabase!.from('vendor_ops_state').upsert({ id: 'current', data: state });
    return;
  }

  await ensureDataDir();
  await writeFile(OPS_STATE_PATH, JSON.stringify(state, null, 2));
}

export async function ensureVendorOpsState(vendors: Vendor[]) {
  const state = await readOpsState();
  let changed = false;

  for (const vendor of vendors) {
    if (!state.profiles.find((profile) => profile.vendorId === vendor.id)) {
      const profile: VendorOpsProfile = {
        vendorId: vendor.id,
        registrationCode: registrationCodeForVendor(vendor),
        lifecycleStatus: defaultLifecycleStatus(vendor),
        rateCardNotes: "",
        availabilityNotes: "",
        cities: vendor.coverageArea ? [vendor.coverageArea] : [],
        accountManager: "",
        emailNotifications: true,
        whatsappNotifications: true,
        createdAt: vendor.createdAt,
        updatedAt: vendor.updatedAt,
      };
      state.profiles.push(profile);
      changed = true;
    }

    const hasCompliance = state.compliance.some((item) => item.vendorId === vendor.id);
    if (!hasCompliance) {
      state.compliance.push(...defaultComplianceItems(vendor));
      changed = true;
    }
  }

  if (changed) {
    await writeOpsState(state);
  }

  return state;
}

export async function appendVendorAuditEntry(vendorId: string, action: string, message: string, actor = "Admin") {
  const state = await readOpsState();
  const entry: VendorAuditEntry = {
    id: randomUUID(),
    vendorId,
    action,
    actor,
    message,
    createdAt: nowIso(),
  };

  state.auditLog.unshift(entry);
  await writeOpsState(state);
  return entry;
}

export async function queueVendorNotification(notification: Omit<VendorNotification, "id" | "createdAt">) {
  const state = await readOpsState();
  const item: VendorNotification = {
    id: randomUUID(),
    createdAt: nowIso(),
    ...notification,
  };

  state.notifications.unshift(item);
  await writeOpsState(state);
  return item;
}

export async function updateVendorLifecycleStatus(vendorId: string, lifecycleStatus: VendorLifecycleStatus, actor = "Admin") {
  const state = await readOpsState();
  const profile = state.profiles.find((item) => item.vendorId === vendorId);
  if (!profile) {
    throw new Error("Vendor profile not found");
  }

  profile.lifecycleStatus = lifecycleStatus;
  profile.updatedAt = nowIso();
  state.auditLog.unshift({
    id: randomUUID(),
    vendorId,
    action: "lifecycle_updated",
    actor,
    message: `Lifecycle status changed to ${lifecycleStatus}.`,
    createdAt: profile.updatedAt,
  });

  await writeOpsState(state);
  return profile;
}

export async function createVendorRevisionRequest(
  vendorId: string,
  input: {
    generalNote: string;
    items: VendorRevisionRequest["items"];
  },
  contact: { email: string; phone: string; name: string },
  actor = "Admin",
) {
  const state = await readOpsState();
  const now = new Date();
  const revision: VendorRevisionRequest = {
    id: randomUUID(),
    vendorId,
    status: "open",
    generalNote: input.generalNote.trim(),
    items: input.items,
    editToken: randomUUID(),
    editTokenExpiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: nowIso(),
    resolvedAt: "",
  };

  state.revisionRequests = state.revisionRequests.filter((item) => !(item.vendorId === vendorId && item.status === "open"));
  state.revisionRequests.unshift(revision);
  state.auditLog.unshift({
    id: randomUUID(),
    vendorId,
    action: "revision_requested",
    actor,
    message: `Revision requested for ${input.items.length} item(s).`,
    createdAt: revision.createdAt,
  });

  if (contact.email) {
    state.notifications.unshift({
      id: randomUUID(),
      vendorId,
      audience: "vendor",
      channel: "email",
      subject: "Perlu revisi data vendor",
      message: `Halo ${contact.name || "Vendor"}, data vendor Anda perlu direvisi. Catatan: ${revision.generalNote || "Silakan cek item revisi."} Link revisi: /vendor/revise/${revision.editToken}`,
      recipient: contact.email,
      createdAt: revision.createdAt,
    });
  }

  if (contact.phone) {
    state.notifications.unshift({
      id: randomUUID(),
      vendorId,
      audience: "vendor",
      channel: "whatsapp",
      subject: "Vendor revision request",
      message: `Pendaftaran vendor perlu revisi. Buka link: /vendor/revise/${revision.editToken}`,
      recipient: contact.phone,
      createdAt: revision.createdAt,
    });
  }

  await writeOpsState(state);
  return revision;
}

export async function getVendorRevisionByToken(token: string) {
  const state = await readOpsState();
  const revision = state.revisionRequests.find(
    (item) => item.editToken === token && item.status === "open" && new Date(item.editTokenExpiresAt).getTime() > Date.now(),
  );
  return revision ?? null;
}

export async function createVendorPortalAccessToken(vendorId: string) {
  const state = await readOpsState();
  const tokenRecord: VendorPortalAccessToken = {
    id: randomUUID(),
    vendorId,
    token: randomUUID(),
    createdAt: nowIso(),
    expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    lastAccessedAt: "",
  };

  state.portalAccessTokens = state.portalAccessTokens.filter(
    (item) => !(item.vendorId === vendorId && new Date(item.expiresAt).getTime() < Date.now()),
  );
  state.portalAccessTokens.unshift(tokenRecord);
  await writeOpsState(state);
  return tokenRecord;
}

export async function getVendorPortalAccessToken(token: string) {
  const state = await readOpsState();
  const item = state.portalAccessTokens.find(
    (entry) => entry.token === token && new Date(entry.expiresAt).getTime() > Date.now(),
  );
  if (!item) {
    return null;
  }

  item.lastAccessedAt = nowIso();
  await writeOpsState(state);
  return item;
}

export async function resolveVendorRevisionRequest(vendorId: string, actor = "Vendor Portal") {
  const state = await readOpsState();
  const revision = state.revisionRequests.find((item) => item.vendorId === vendorId && item.status === "open");
  if (!revision) return null;

  revision.status = "resolved";
  revision.resolvedAt = nowIso();
  state.auditLog.unshift({
    id: randomUUID(),
    vendorId,
    action: "revision_resubmitted",
    actor,
    message: "Vendor submitted revision response.",
    createdAt: revision.resolvedAt,
  });
  await writeOpsState(state);
  return revision;
}

export async function addVendorScorecard(
  vendorId: string,
  input: Omit<VendorScorecard, "id" | "vendorId" | "createdAt" | "updatedAt">,
  actor = "Admin",
) {
  const state = await readOpsState();
  const timestamp = nowIso();
  const scorecard: VendorScorecard = {
    id: randomUUID(),
    vendorId,
    projectId: input.projectId,
    quality: input.quality,
    reliability: input.reliability,
    pricing: input.pricing,
    communication: input.communication,
    onTime: input.onTime,
    note: input.note,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  state.scorecards.unshift(scorecard);
  state.auditLog.unshift({
    id: randomUUID(),
    vendorId,
    action: "scorecard_added",
    actor,
    message: `New scorecard added with average ${(
      (input.quality + input.reliability + input.pricing + input.communication + input.onTime) /
      5
    ).toFixed(1)}.`,
    createdAt: timestamp,
  });
  await writeOpsState(state);
  return scorecard;
}

export async function updateVendorCompliance(
  vendorId: string,
  documentType: DocumentType,
  patch: Pick<VendorComplianceItem, "status" | "expiresAt" | "note">,
  actor = "Admin",
) {
  const state = await readOpsState();
  const item = state.compliance.find((entry) => entry.vendorId === vendorId && entry.documentType === documentType);
  if (!item) {
    throw new Error("Compliance item not found");
  }

  item.status = patch.status;
  item.expiresAt = patch.expiresAt;
  item.note = patch.note;
  item.updatedAt = nowIso();
  state.auditLog.unshift({
    id: randomUUID(),
    vendorId,
    action: "compliance_updated",
    actor,
    message: `${documentType} compliance updated to ${patch.status}.`,
    createdAt: item.updatedAt,
  });
  await writeOpsState(state);
  return item;
}

export async function upsertVendorOpsProfile(
  vendorId: string,
  patch: Partial<Pick<VendorOpsProfile, "rateCardNotes" | "availabilityNotes" | "cities" | "accountManager">>,
  actor = "Admin",
) {
  const state = await readOpsState();
  const profile = state.profiles.find((item) => item.vendorId === vendorId);
  if (!profile) {
    throw new Error("Vendor profile not found");
  }

  if (patch.rateCardNotes !== undefined) profile.rateCardNotes = patch.rateCardNotes;
  if (patch.availabilityNotes !== undefined) profile.availabilityNotes = patch.availabilityNotes;
  if (patch.cities !== undefined) profile.cities = patch.cities;
  if (patch.accountManager !== undefined) profile.accountManager = patch.accountManager;
  profile.updatedAt = nowIso();

  state.auditLog.unshift({
    id: randomUUID(),
    vendorId,
    action: "ops_profile_updated",
    actor,
    message: "Vendor operational profile updated.",
    createdAt: profile.updatedAt,
  });
  await writeOpsState(state);
  return profile;
}

export async function getVendorOpsState(vendors: Vendor[]) {
  return ensureVendorOpsState(vendors);
}
