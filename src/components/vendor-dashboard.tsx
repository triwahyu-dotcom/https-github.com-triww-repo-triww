"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { Locale, reviewStatusLabel, t } from "@/lib/vendor/i18n";
import { DashboardData, ReviewStatus, VendorClassification, VendorDetail, VendorLifecycleStatus, VendorSummary } from "@/lib/vendor/types";
import { WorkspaceShell } from "./layout/workspace-shell";
import { Drawer } from "./ui/drawer";
import { SummaryCard } from "./ui/summary-card";

type ViewId =
  | "by_status"
  | "by_type"
  | "vendor_directory"
  | "all_vendors"
  | "sync_log"
  | "outbox";

type DetailMode = "summary" | "operations";

type Filters = {
  search: string;
  service: string;
  location: string;
  reviewStatus: string;
  classification: string;
};


const REVIEW_STATUSES: ReviewStatus[] = [
  "new",
  "in_review",
  "approved",
  "rejected",
  "needs_revision",
];

const LIFECYCLE_STATUSES: VendorLifecycleStatus[] = [
  "submitted",
  "screening",
  "verified",
  "approved",
  "blacklisted",
  "inactive",
];

type RevisionSection = "identity" | "contact" | "documents" | "finance" | "services";

const REVISION_FIELD_OPTIONS: { fieldKey: string; label: string; section: RevisionSection }[] = [
  { fieldKey: "vendorName", label: "Vendor name", section: "identity" },
  { fieldKey: "services", label: "Services", section: "services" },
  { fieldKey: "coverageArea", label: "Coverage area", section: "identity" },
  { fieldKey: "email", label: "Business email", section: "identity" },
  { fieldKey: "picName", label: "PIC name", section: "contact" },
  { fieldKey: "picPhone", label: "PIC phone", section: "contact" },
  { fieldKey: "bankAccountHolder", label: "Bank account holder", section: "finance" },
  { fieldKey: "npwpScanUrl", label: "NPWP scan", section: "documents" },
  { fieldKey: "ownerKtpUrl", label: "Owner KTP", section: "documents" },
  { fieldKey: "nibUrl", label: "NIB", section: "documents" },
  { fieldKey: "companyProfileUrl", label: "Company profile", section: "documents" },
];

const REVISION_TEMPLATES: {
  id: string;
  label: string;
  generalNote: string;
  items: { fieldKey: string; note: string }[];
}[] = [
  {
    id: "docs_basic",
    label: "Basic documents",
    generalNote: "Please complete the primary legality documents before we proceed with the review process.",
    items: [
      { fieldKey: "companyProfileUrl", note: "Upload latest company profile (active link)." },
      { fieldKey: "npwpScanUrl", note: "Upload clear NPWP scan." },
      { fieldKey: "ownerKtpUrl", note: "Upload valid Owner/PIC KTP." },
      { fieldKey: "nibUrl", note: "Upload latest NIB according to business legality." },
    ],
  },
  {
    id: "contact_identity",
    label: "Contact & identity",
    generalNote: "Please update identity information and PIC so our procurement team can contact you correctly.",
    items: [
      { fieldKey: "vendorName", note: "Match vendor name with legal documents." },
      { fieldKey: "email", note: "Use an active business email for official communication." },
      { fieldKey: "picName", note: "Fill in the name of the main PIC in charge." },
      { fieldKey: "picPhone", note: "Ensure the PIC's WhatsApp number is active." },
    ],
  },
  {
    id: "service_scope",
    label: "Services & area",
    generalNote: "Please update service classification so project placement is not incorrect.",
    items: [
      { fieldKey: "services", note: "Select primary services that are truly available." },
      { fieldKey: "coverageArea", note: "Fill in operational areas according to team/vendor capacity." },
    ],
  },
];

const VIEW_ORDER: { id: ViewId; label: string }[] = [
  { id: "all_vendors", label: "All Vendors" },
  { id: "by_status", label: "By Status" },
  { id: "by_type", label: "By Type" },
  { id: "vendor_directory", label: "Vendor Directory" },
];

const VIEW_ICONS: Record<ViewId, string> = {
  by_status: "✺",
  by_type: "▦",
  vendor_directory: "◫",
  all_vendors: "☰",
  sync_log: "⇵",
  outbox: "✉",
};

const VIEW_TITLES: Record<ViewId, string> = {
  by_status: "By Status",
  by_type: "By Type",
  vendor_directory: "Vendor Directory",
  all_vendors: "All Vendors",
  sync_log: "Sync Log",
  outbox: "Outbox",
};

const STORAGE_KEY = "juara-vendor-management-dashboard-v1";

function formatDate(value: string, locale: Locale) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}


function primaryType(vendor: VendorSummary) {
  return vendor.serviceNames[0] || "General";
}

function splitBusinessPrefix(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ");
  const match = normalized.match(/^(PT|CV)\.?\s*(.+)$/i);

  if (!match) {
    return { name: normalized, suffix: "" };
  }

  return {
    name: match[2].trim(),
    suffix: match[1].toUpperCase(),
  };
}

function toTitleCase(value: string) {
  return value.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatVendorName(value: string) {
  const { name, suffix } = splitBusinessPrefix(value);
  const formatted = toTitleCase(name);

  return suffix ? `${formatted}, ${suffix}` : formatted;
}

function vendorScore(vendor: VendorSummary) {
  const completionRatio =
    vendor.documentCompletion.required === 0
      ? 0
      : vendor.documentCompletion.complete / vendor.documentCompletion.required;
  const reviewBonus =
    vendor.reviewStatus === "approved"
      ? 1.2
      : vendor.reviewStatus === "in_review"
        ? 0.75
        : vendor.reviewStatus === "needs_revision"
          ? 0.45
          : vendor.reviewStatus === "new"
            ? 0.55
            : 0.2;

  return Number((completionRatio * 4 + reviewBonus).toFixed(1));
}

function shortLinkLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Open";
  }
}

function truncateText(value: string, max = 72) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function toQueryString(params: Record<string, string>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value.trim()) {
      query.set(key, value);
    }
  });
  return query.toString();
}

function normalizePhoneToWhatsApp(phone: string) {
  const digits = phone.replace(/[^\d]/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("62")) return digits;
  return digits;
}

function statusGroupLabel(locale: Locale, status: ReviewStatus) {
  return reviewStatusLabel(locale, status);
}

function statusTone(status: ReviewStatus) {
  if (status === "approved") return "approved";
  if (status === "rejected") return "rejected";
  if (status === "in_review") return "review";
  return "pending";
}

function lifecycleLabel(status: VendorLifecycleStatus) {
  if (status === "submitted") return "Submitted";
  if (status === "screening") return "Screening";
  if (status === "verified") return "Verified";
  if (status === "approved") return "Approved";
  if (status === "blacklisted") return "Blacklisted";
  return "Inactive";
}

function lifecycleTone(status: VendorLifecycleStatus) {
  if (status === "approved" || status === "verified") return "approved";
  if (status === "blacklisted") return "rejected";
  if (status === "screening") return "review";
  return "pending";
}

function complianceTone(status: VendorSummary["compliance"]["status"]) {
  if (status === "ok") return "approved";
  if (status === "attention") return "review";
  return "rejected";
}

function complianceItemTone(status: "valid" | "expiring" | "expired" | "missing") {
  if (status === "valid") return "approved";
  if (status === "expiring") return "review";
  return "rejected";
}

function documentTypeLabel(type: string) {
  const labels: Record<string, string> = {
    company_profile: "Company Profile",
    catalog: "Catalog / Pricelist",
    npwp_scan: "NPWP",
    owner_ktp: "Owner KTP",
    nib: "NIB",
    invoice_sample: "Invoice Sample",
    pkp_certificate: "PKP / Non-PKP Letter",
    nda: "NDA",
    pic_ktp: "PIC KTP",
  };

  return labels[type] ?? type.replace(/_/g, " ");
}

function clampPaneWidth(value: number) {
  return Math.min(58, Math.max(28, value));
}


function classificationLabel(classification: VendorClassification | string) {
  if (classification === "Penyedia Barang") return "Goods / Equipment";
  if (classification === "Penyedia Jasa") return "Services / Specialist";
  return classification;
}

function classificationTone(classification: VendorClassification | string) {
  if (classification === "Penyedia Barang") return "amber";
  if (classification === "Penyedia Jasa") return "blue";
  return "stone";
}

function categoryTone(type: string) {
  const key = type.toLowerCase();
  if (key.includes("stage") || key.includes("rigging")) return "rose";
  if (key.includes("security") || key.includes("crowd")) return "green";
  if (key.includes("photo") || key.includes("video") || key.includes("design")) return "purple";
  if (key.includes("floor")) return "blue";
  if (key.includes("logistic")) return "amber";
  if (key.includes("project") || key.includes("management")) return "blue";
  return "stone";
}

export function VendorDashboard({ initialData }: { initialData: DashboardData }) {
  const layoutRef = useRef<HTMLElement | null>(null);
  const initialVendor = initialData.vendorDetails[0] ?? null;
  const [locale, setLocale] = useState<Locale>("id");
  const [view, setView] = useState<ViewId>("all_vendors");
  const [detailMode, setDetailMode] = useState<DetailMode>("summary");
  const [dashboard, setDashboard] = useState(initialData);
  const [selectedVendorId, setSelectedVendorId] = useState(initialData.vendors[0]?.id ?? "");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>(initialVendor?.reviewStatus ?? "new");
  const [reviewNote, setReviewNote] = useState(initialVendor?.latestReviewNote ?? "");
  const [lifecycleStatus, setLifecycleStatus] = useState<VendorLifecycleStatus>(initialVendor?.lifecycleStatus ?? "submitted");
  const [rateCardNotes, setRateCardNotes] = useState(initialVendor?.rateCardNotes ?? "");
  const [availabilityNotes, setAvailabilityNotes] = useState(initialVendor?.availabilityNotes ?? "");
  const [cities, setCities] = useState(initialVendor?.cities.join(", ") ?? "");
  const [accountManager, setAccountManager] = useState(initialVendor?.accountManager ?? "");
  const [scorecard, setScorecard] = useState({
    projectId: "",
    quality: "4",
    reliability: "4",
    pricing: "4",
    communication: "4",
    onTime: "4",
    note: "",
  });
  const [complianceDrafts, setComplianceDrafts] = useState<Record<string, { status: string; expiresAt: string; note: string }>>(
    initialVendor
      ? Object.fromEntries(
          initialVendor.compliance.items.map((item) => [
            item.documentType,
            { status: item.status, expiresAt: item.expiresAt, note: item.note },
          ]),
        )
      : {},
  );
  const [syncPending, startSyncTransition] = useTransition();
  const [reviewPending, startReviewTransition] = useTransition();
  const [opsPending, startOpsTransition] = useTransition();
  const [revisionGeneralNote, setRevisionGeneralNote] = useState("");
  const [revisionSelections, setRevisionSelections] = useState<Record<string, string>>({});
  const [revisionTemplateId, setRevisionTemplateId] = useState("");
  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<ReviewStatus>("in_review");
  const [bulkNote, setBulkNote] = useState("");
  const [bulkRevisionTemplateId, setBulkRevisionTemplateId] = useState("docs_basic");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isEditVendorModalOpen, setIsEditVendorModalOpen] = useState(false);
  const [editVendorFormData, setEditVendorFormData] = useState<Partial<VendorDetail>>({});
  const [savedFilters, setSavedFilters] = useState<Record<string, Filters>>(() => {
    if (typeof window === "undefined") {
      return {};
    }
    try {
      const raw = localStorage.getItem("vendor_filters_v1");
      return raw ? (JSON.parse(raw) as Record<string, Filters>) : {};
    } catch {
      return {};
    }
  });
  const [filters, setFilters] = useState<Filters>(() => {
    if (typeof window === "undefined") {
      return { search: "", service: "", location: "", reviewStatus: "", classification: "" };
    }
    const currentView = new URLSearchParams(window.location.search).get("view") || "all_vendors";
    return savedFilters[currentView] ?? { search: "", service: "", location: "", reviewStatus: "", classification: "" };
  });

const matchesFilters = useCallback((vendor: VendorSummary, currentFilters: Filters) => {
    const keyword = currentFilters.search.trim().toLowerCase();

    if (keyword) {
      const detail = dashboard.vendorDetails.find((d: VendorDetail) => d.id === vendor.id);
      const picInfo = detail ? `${detail.contacts[0]?.name || ""} ${detail.contacts[0]?.phone || ""}` : "";
      const searchStr = `${vendor.name} ${vendor.email} ${vendor.serviceNames.join(" ")} ${picInfo}`.toLowerCase();

      if (!searchStr.includes(keyword)) {
        return false;
      }
    }

    if (currentFilters.service && !vendor.serviceNames.includes(currentFilters.service)) {
      return false;
    }

    if (currentFilters.location && vendor.coverageArea !== currentFilters.location) {
      return false;
    }

    if (currentFilters.reviewStatus && vendor.reviewStatus !== currentFilters.reviewStatus) {
      return false;
    }

    if (currentFilters.classification && vendor.classification !== currentFilters.classification) {
      return false;
    }

    return true;
  }, [dashboard.vendorDetails]);

  const filteredVendors = useMemo(
    () => dashboard.vendors.filter((vendor) => matchesFilters(vendor, filters)),
    [dashboard.vendors, filters, matchesFilters],
  );
  const selectedVendors = useMemo(
    () => filteredVendors.filter((vendor) => selectedVendorIds.includes(vendor.id)),
    [filteredVendors, selectedVendorIds],
  );

  const vendorSummary = useMemo(() => ({
    total: dashboard.vendors.length,
    approved: dashboard.vendors.filter(v => v.reviewStatus === 'approved').length,
    inReview: dashboard.vendors.filter(v => v.reviewStatus === 'in_review').length,
    jasaCount: dashboard.vendors.filter(v => v.classification === 'Penyedia Jasa').length,
    barangCount: dashboard.vendors.filter(v => v.classification === 'Penyedia Barang').length,
    highPerformance: dashboard.vendors.filter(v => vendorScore(v) >= 4.5).length,
  }), [dashboard.vendors]);

  const selectedVendor =
    dashboard.vendorDetails.find((vendor) => vendor.id === selectedVendorId) ??
    dashboard.vendorDetails[0] ??
    null;

  const vendorsByStatus = useMemo(
    () =>
      REVIEW_STATUSES.map((status) => ({
        status,
        items: filteredVendors.filter((vendor) => vendor.reviewStatus === status),
      })),
    [filteredVendors],
  );

  const vendorsByType = useMemo(() => {
    const grouped = new Map<string, VendorSummary[]>();

    filteredVendors.forEach((vendor) => {
      const type = primaryType(vendor);
      grouped.set(type, [...(grouped.get(type) ?? []), vendor]);
    });

    return [...grouped.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .map(([type, items]) => ({ type, items }));
  }, [filteredVendors]);

  const directorySections = useMemo(
    () =>
      vendorsByStatus.map((group) => ({
        title: statusGroupLabel(locale, group.status),
        status: group.status,
        items: group.items,
      })),
    [locale, vendorsByStatus],
  );
  const activeListCount =
    view === "sync_log"
      ? dashboard.importRuns.length
      : view === "outbox"
        ? dashboard.notificationFeed.length
        : filteredVendors.length;
  const isVendorListView = view === "all_vendors";

  async function handleSync() {
    startSyncTransition(async () => {
      const response = await fetch("/api/vendors/sync", { method: "POST" });
      const payload = (await response.json()) as { dashboard: DashboardData };
      setDashboard(payload.dashboard);
    });
  }

  async function handleReviewSave() {
    if (!selectedVendor) return;

    startReviewTransition(async () => {
      const response = await fetch(`/api/vendors/${selectedVendor.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: reviewStatus, note: reviewNote }),
      });
      const payload = (await response.json()) as { vendorDetail: VendorDetail };

      setDashboard((current) => {
        const vendorDetails = current.vendorDetails.map((item) =>
          item.id === payload.vendorDetail.id
            ? { ...payload.vendorDetail, linkedProjects: item.linkedProjects ?? [] }
            : item,
        );
        const vendors = current.vendors.map((item) =>
          item.id === payload.vendorDetail.id
            ? {
                ...item,
                reviewStatus: payload.vendorDetail.reviewStatus,
                latestReviewNote: payload.vendorDetail.latestReviewNote,
                documentCompletion: payload.vendorDetail.documentCompletion,
                linkedProjects: item.linkedProjects ?? [],
              }
            : item,
        );

        return {
          ...current,
          vendorDetails,
          vendors,
          reviewQueue: vendors.filter(
            (vendor) => vendor.reviewStatus === "new" || vendor.reviewStatus === "needs_revision",
          ),
        };
      });
    });
  }

  function openVendor(vendor: VendorSummary) {
    setIsDrawerOpen(true);
    setSelectedVendorId(vendor.id);
    setReviewStatus(vendor.reviewStatus);
    setReviewNote(vendor.latestReviewNote);
    const detail = dashboard.vendorDetails.find((item) => item.id === vendor.id);
    if (!detail) return;
    setLifecycleStatus(detail.lifecycleStatus);
    setRateCardNotes(detail.rateCardNotes);
    setAvailabilityNotes(detail.availabilityNotes);
    setCities(detail.cities.join(", "));
    setAccountManager(detail.accountManager);
    setComplianceDrafts(
      Object.fromEntries(
        detail.compliance.items.map((item) => [
          item.documentType,
          { status: item.status, expiresAt: item.expiresAt, note: item.note },
        ]),
      ),
    );
    setRevisionGeneralNote(detail.activeRevisionRequest?.generalNote ?? "");
    setRevisionTemplateId("");
    setRevisionSelections(
      Object.fromEntries(
        (detail.activeRevisionRequest?.items ?? []).map((item) => [item.fieldKey, item.note]),
      ),
    );
  }

  function refreshAfterMutation() {
    window.location.reload();
  }

  async function handleLifecycleSave() {
    if (!selectedVendor) return;

    startOpsTransition(async () => {
      await fetch(`/api/vendors/${selectedVendor.id}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lifecycleStatus }),
      });
      refreshAfterMutation();
    });
  }

  async function handleOpsProfileSave() {
    if (!selectedVendor) return;

    startOpsTransition(async () => {
      await fetch(`/api/vendors/${selectedVendor.id}/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rateCardNotes, availabilityNotes, cities, accountManager }),
      });
      refreshAfterMutation();
    });
  }

  async function handleScorecardSave() {
    if (!selectedVendor) return;

    startOpsTransition(async () => {
      await fetch(`/api/vendors/${selectedVendor.id}/scorecards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: scorecard.projectId,
          quality: Number(scorecard.quality),
          reliability: Number(scorecard.reliability),
          pricing: Number(scorecard.pricing),
          communication: Number(scorecard.communication),
          onTime: Number(scorecard.onTime),
          note: scorecard.note,
        }),
      });
      refreshAfterMutation();
    });
  }

  async function handleComplianceSave(documentType: string) {
    if (!selectedVendor) return;
    const draft = complianceDrafts[documentType];
    if (!draft) return;

    startOpsTransition(async () => {
      await fetch(`/api/vendors/${selectedVendor.id}/compliance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentType,
          status: draft.status,
          expiresAt: draft.expiresAt,
          note: draft.note,
        }),
      });
      refreshAfterMutation();
    });
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  async function handleRequestRevision() {
    if (!selectedVendor) return;
    const items = Object.entries(revisionSelections)
      .filter(([, note]) => note.trim())
      .map(([fieldKey, note]) => {
        const option = REVISION_FIELD_OPTIONS.find((item) => item.fieldKey === fieldKey);
        return option
          ? {
              fieldKey,
              label: option.label,
              note: note.trim(),
              section: option.section,
            }
          : null;
      })
      .filter(Boolean) as { fieldKey: string; label: string; note: string; section: RevisionSection }[];

    if (items.length === 0) return;

    startOpsTransition(async () => {
      await fetch(`/api/vendors/${selectedVendor.id}/revision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generalNote: revisionGeneralNote,
          items,
        }),
      });
      refreshAfterMutation();
    });
  }

  function applyRevisionTemplate(templateId: string) {
    setRevisionTemplateId(templateId);
    if (!templateId) {
      return;
    }

    const template = REVISION_TEMPLATES.find((item) => item.id === templateId);
    if (!template) {
      return;
    }

    setRevisionGeneralNote(template.generalNote);
    setRevisionSelections(
      Object.fromEntries(template.items.map((item) => [item.fieldKey, item.note])),
    );
  }

  function clearRevisionDraft() {
    setRevisionTemplateId("");
    setRevisionGeneralNote("");
    setRevisionSelections({});
  }

  function toggleVendorSelection(vendorId: string) {
    setSelectedVendorIds((current) =>
      current.includes(vendorId) ? current.filter((item) => item !== vendorId) : [...current, vendorId],
    );
  }

  function toggleSelectAllFiltered() {
    setSelectedVendorIds((current) => {
      const filteredIds = filteredVendors.map((vendor) => vendor.id);
      const allFilteredSelected = filteredIds.every((id) => current.includes(id));
      if (allFilteredSelected) {
        return current.filter((id) => !filteredIds.includes(id));
      }
      return Array.from(new Set([...current, ...filteredIds]));
    });
  }

  function handleExportFiltered() {
    const query = toQueryString({
      search: filters.search,
      service: filters.service,
      location: filters.location,
      reviewStatus: filters.reviewStatus,
      classification: filters.classification,
    });
    window.location.href = `/api/vendors/export${query ? `?${query}` : ""}`;
  }

  async function handleBulkReviewSave() {
    const targetIds = selectedVendors.map((item) => item.id);
    if (targetIds.length === 0) return;
    startOpsTransition(async () => {
      for (const vendorId of targetIds) {
        await fetch(`/api/vendors/${vendorId}/review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: bulkStatus, note: bulkNote }),
        });
      }
      refreshAfterMutation();
    });
  }

  async function handleBulkRequestRevision() {
    const targetIds = selectedVendors.map((item) => item.id);
    if (targetIds.length === 0) return;
    const template = REVISION_TEMPLATES.find((item) => item.id === bulkRevisionTemplateId) ?? REVISION_TEMPLATES[0];
    const items = template.items
      .map((item) => {
        const option = REVISION_FIELD_OPTIONS.find((opt) => opt.fieldKey === item.fieldKey);
        if (!option) return null;
        return {
          fieldKey: option.fieldKey,
          label: option.label,
          note: item.note,
          section: option.section,
        };
      })
      .filter(Boolean) as { fieldKey: string; label: string; note: string; section: RevisionSection }[];
    if (items.length === 0) return;

    startOpsTransition(async () => {
      for (const vendorId of targetIds) {
        await fetch(`/api/vendors/${vendorId}/revision`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            generalNote: template.generalNote,
            items,
          }),
        });
      }
      refreshAfterMutation();
    });
  }

  function saveCurrentFilter(slot: "slot1" | "slot2" | "slot3") {
    const next = { ...savedFilters, [slot]: filters };
    setSavedFilters(next);
    localStorage.setItem("vendor_filters_v1", JSON.stringify(next));
  }

  const whatsappNumber = normalizePhoneToWhatsApp(selectedVendor?.contacts[0]?.phone || "");
  const socialLinks = selectedVendor
    ? [
        { label: "Website", url: selectedVendor.websiteUrl },
        { label: "Instagram", url: selectedVendor.instagramUrl },
        { label: "TikTok", url: selectedVendor.tiktokUrl },
        { label: "LinkedIn", url: selectedVendor.linkedinUrl },
      ].filter((item) => item.url)
    : [];

  // Theme handled by WorkspaceShell
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dashboard));
  }, [dashboard]);



  const headerActions = (
    <>
      <div className="locale-switch locale-dark">
        <button className={locale === "id" ? "active" : ""} onClick={() => setLocale("id")} type="button">
          ID
        </button>
        <button className={locale === "en" ? "active" : ""} onClick={() => setLocale("en")} type="button">
          EN
        </button>
      </div>
      <button className="ghost-button" onClick={() => setView("sync_log")} type="button">
        Sync Log
      </button>
      <button className="ghost-button" onClick={() => setView("outbox")} type="button">
        Outbox
      </button>
      <button className="primary-button" style={{ borderRadius: '8px', padding: '0 16px', height: '36px' }} onClick={handleSync} type="button">
        {syncPending ? "..." : t(locale, "syncNow")}
      </button>
      <button className="ghost-button" onClick={handleLogout} type="button">
        Logout
      </button>
    </>
  );

  return (
    <WorkspaceShell
      title="Supplier/Vendor Management"
      eyebrow={dashboard.sourceAvailable ? "DATABASE READY" : "SOURCE MISSING"}
      actions={headerActions}
    >
      <div className="summary-deck" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <SummaryCard 
          label="Total Vendors" 
          value={String(vendorSummary.total)} 
          description="Registered suppliers"
          icon="⌘" 
        />
        <SummaryCard 
          label="Penyedia Jasa" 
          value={String(vendorSummary.jasaCount)} 
          description="Service providers"
          icon="🛠️" 
        />
        <SummaryCard 
          label="Penyedia Barang" 
          value={String(vendorSummary.barangCount)} 
          description="Equipment/Goods"
          icon="📦" 
        />
        <SummaryCard 
          label="Approved" 
          value={String(vendorSummary.approved)} 
          description="Verified and ready"
          icon="✅" 
        />
        <SummaryCard 
          label="Top Rated" 
          value={String(vendorSummary.highPerformance)} 
          description="Score >= 4.5"
          icon="⭐" 
        />
      </div>
      <div className="toolbar-panel" style={{ marginTop: '24px' }}>
        <div className="database-header">
          <div className="database-tabs">
            {VIEW_ORDER.map((item) => (
              <button
                key={item.id}
                className={`chip ${view === item.id ? "active" : ""}`}
                onClick={() => setView(item.id)}
                type="button"
              >
                <span style={{ marginRight: '6px' }}>{VIEW_ICONS[item.id]}</span>
                {item.label}
              </button>
            ))}
          </div>
          <div className="workspace-actions">
            <button className="primary-button" style={{ borderRadius: '8px' }} onClick={() => {/* TODO: Add Vendor Logic */}} type="button">
              + Add New Vendor
            </button>
          </div>
        </div>

        <div className="control-bar" style={{ marginTop: '16px', background: 'var(--panel-soft)', padding: '8px 16px', borderRadius: '12px', border: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', gap: '12px', flex: 1, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                value={filters.search}
                placeholder="Search name, service, or PIC..."
                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                style={{ width: '100%', paddingLeft: '36px', height: '40px', background: 'transparent', border: 'none' }}
              />
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
            </div>
            <select
              value={filters.classification}
              onChange={(event) => setFilters((current) => ({ ...current, classification: event.target.value }))}
              style={{ background: 'transparent', border: 'none', borderLeft: '1px solid var(--line)', borderRadius: 0, padding: '0 12px', height: '24px' }}
            >
              <option value="">All Classification</option>
              <option value="Penyedia Jasa">Penyedia Jasa</option>
              <option value="Penyedia Barang">Penyedia Barang</option>
            </select>
            <select
              value={filters.service}
              onChange={(event) => setFilters((current) => ({ ...current, service: event.target.value }))}
              style={{ background: 'transparent', border: 'none', borderLeft: '1px solid var(--line)', borderRadius: 0, padding: '0 12px', height: '24px' }}
            >
              <option value="">All Services</option>
              {dashboard.services.map((service) => (
                <option key={service} value={service}>{service}</option>
              ))}
            </select>
            <select
              value={filters.location}
              onChange={(event) => setFilters((current) => ({ ...current, location: event.target.value }))}
              style={{ background: 'transparent', border: 'none', borderLeft: '1px solid var(--line)', borderRadius: 0, padding: '0 12px', height: '24px' }}
            >
              <option value="">All Locations</option>
              {dashboard.locations.map((location) => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>
            <button 
              className={`ghost-button ${showAdvanced ? "active-ghost" : ""}`} 
              onClick={() => setShowAdvanced((current) => !current)}
              style={{ fontSize: '0.8rem', padding: '0 12px' }}
            >
              Options
            </button>
          </div>
        </div>

        {showAdvanced && (
          <div className="advanced-panel" style={{ marginTop: '12px', padding: '16px', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span className="mini-meta" style={{ marginTop: 0 }}>Review:</span>
              <select
                value={filters.reviewStatus}
                onChange={(event) => setFilters((current) => ({ ...current, reviewStatus: event.target.value }))}
                style={{ background: 'var(--panel-soft)', border: '1px solid var(--line)', borderRadius: '8px', padding: '4px 8px', fontSize: '0.8rem' }}
              >
                <option value="">Any Status</option>
                {REVIEW_STATUSES.map((status) => (
                  <option key={status} value={status}>{reviewStatusLabel(locale, status)}</option>
                ))}
              </select>
            </div>
            <div className="saved-filter-buttons" style={{ display: 'flex', gap: '8px' }}>
              <button className="ghost-button" style={{ fontSize: '0.75rem' }} onClick={() => saveCurrentFilter("slot1")}>Save Filter</button>
              <button className="ghost-button" style={{ fontSize: '0.75rem' }} onClick={handleExportFiltered}>Export CSV</button>
            </div>
          </div>
        )}
      </div>

      {(view === "all_vendors" || view === "sync_log" || view === "outbox") && (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          <div className={`notion-list ${isVendorListView ? "vendor-list-view" : ""}`} style={{ width: '100%', flex: 1, overflow: 'auto' }}>
            <div className="panel-section-header">
              <div>
                <p className="panel-label">Vendor Directory</p>
                <h3>{VIEW_TITLES[view]}</h3>
              </div>
              <span className="panel-count">{activeListCount} item(s)</span>
            </div>
            
            {view === "all_vendors" ? (
              <div className="bulk-actions-panel">
                <div className="bulk-actions-row">
                  <button className="ghost-button" onClick={toggleSelectAllFiltered} type="button">
                    {selectedVendors.length === filteredVendors.length && filteredVendors.length > 0 ? "Unselect all" : "Select all"}
                  </button>
                  <span>{selectedVendors.length} selected</span>
                </div>
                <div className="bulk-actions-row">
                  <select value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value as ReviewStatus)}>
                    {REVIEW_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {reviewStatusLabel(locale, status)}
                      </option>
                    ))}
                  </select>
                  <input value={bulkNote} onChange={(event) => setBulkNote(event.target.value)} placeholder="Bulk review note" />
                  <button className="ghost-button" onClick={handleBulkReviewSave} type="button" disabled={selectedVendors.length === 0}>
                    {opsPending ? "..." : "Apply status"}
                  </button>
                </div>
                <div className="bulk-actions-row">
                  <select value={bulkRevisionTemplateId} onChange={(event) => setBulkRevisionTemplateId(event.target.value)}>
                    {REVISION_TEMPLATES.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.label}
                      </option>
                    ))}
                  </select>
                  <button className="ghost-button" onClick={handleBulkRequestRevision} type="button" disabled={selectedVendors.length === 0}>
                    {opsPending ? "..." : "Request revision (bulk)"}
                  </button>
                </div>
              </div>
            ) : null}

            <div className="notion-items">
              {view === "all_vendors" &&
                filteredVendors.map((vendor) => (
                  <button
                    className={`notion-item project-card ${selectedVendorId === vendor.id ? "active" : ""}`}
                    key={vendor.id}
                    onClick={() => openVendor(vendor)}
                    type="button"
                    style={{ textAlign: 'left', width: '100%' }}
                  >
                    <div className="notion-item-checkbox" onClick={(e) => { e.stopPropagation(); toggleVendorSelection(vendor.id); }}>
                      <input type="checkbox" checked={selectedVendorIds.includes(vendor.id)} readOnly />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <em className="eyebrow">{primaryType(vendor)}</em>
                          <h3>{formatVendorName(vendor.name)}</h3>
                        </div>
                        <strong className="text-main">{vendorScore(vendor)}</strong>
                      </div>
                      <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                        <span className={`status-dot tone-${statusTone(vendor.reviewStatus)}`}>
                          {reviewStatusLabel(locale, vendor.reviewStatus)}
                        </span>
                        <em className={`category-pill tone-${classificationTone(vendor.classification)}`}>
                          {classificationLabel(vendor.classification)}
                        </em>
                        {vendor.coverageArea && <span className="text-dim">· {vendor.coverageArea}</span>}
                      </div>
                      <div style={{ marginTop: "12px", display: "flex", gap: "12px", fontSize: "0.75rem" }}>
                        <span>
                          Docs: <strong>{vendor.documentCompletion.complete}/{vendor.documentCompletion.required}</strong>
                        </span>
                        <span>
                          Compliance: <strong className={`tone-${complianceTone(vendor.compliance.status)}`}>{vendor.compliance.status.toUpperCase()}</strong>
                        </span>
                      </div>
                    </div>
                  </button>
                ))}

              {view === "sync_log" &&
                dashboard.importRuns.map((run) => (
                  <article className="log-item" key={run.id}>
                    <div className="log-header">
                      <strong>{formatDate(run.finishedAt, locale)}</strong>
                      <span className={`status-dot tone-${run.createdVendors > 0 ? "approved" : "rejected"}`}>
                        {run.createdVendors > 0 ? "Success" : "Checked"}
                      </span>
                    </div>
                    <p>Imported {run.createdVendors} new vendors, updated {run.updatedVendors}.</p>
                    <small>Provider: {run.sourceLabel} · Skipped: {run.skippedRows}</small>
                  </article>
                ))}

              {view === "outbox" &&
                dashboard.notificationFeed.map((item) => (
                  <article
                    className={`notion-item outbox-item ${selectedVendorId === item.vendorId ? "active" : ""}`}
                    key={item.id}
                    onClick={() => {
                      const v = dashboard.vendors.find((v) => v.id === item.vendorId);
                      if (v) openVendor(v);
                    }}
                  >
                    <span>{item.registrationCode}</span>
                    <span>{item.audience} · {item.channel} · {formatDate(item.createdAt, locale)}</span>
                    <p>{truncateText(item.subject, 90)}</p>
                    <p>{truncateText(item.message, 160)}</p>
                    <small>To: {item.recipient}</small>
                  </article>
                ))}

              {view !== "sync_log" && view !== "outbox" && filteredVendors.length === 0 && (
                <p className="empty-state">{t(locale, "noData")}</p>
              )}
              {view === "outbox" && dashboard.notificationFeed.length === 0 && (
                <p className="empty-state">No notifications yet.</p>
              )}
            </div>
          </div>
          
          <Drawer 
            isOpen={isDrawerOpen} 
            onClose={() => setIsDrawerOpen(false)} 
            title={view === "outbox" ? "Outbox Summary" : (selectedVendor ? formatVendorName(selectedVendor.name) : "Vendor Detail")}
            width="500px"
          >
            <aside className="notion-detail" style={{ border: 'none', height: '100%', padding: '0 24px 40px' }}>
              {view === "outbox" ? (
                <p className="empty-state" style={{ marginTop: '20px' }}>Outbox displays email/WhatsApp notification logs for admins and vendors.</p>
              ) : null}
              {view !== "outbox" && selectedVendor ? (
                <>
                  <div className="detail-tabs">
                    <button className={`detail-tab ${detailMode === "summary" ? "active" : ""}`} onClick={() => setDetailMode("summary")}>
                      Summary
                    </button>
                    <button className={`detail-tab ${detailMode === "operations" ? "active" : ""}`} onClick={() => setDetailMode("operations")}>
                      Operations
                    </button>
                  </div>

                  {detailMode === "operations" && (
                    <div className="detail-scroll-area">
                      <section className="detail-section">
                        <div className="section-title-row">
                          <h4>Performance Scorecard</h4>
                          <button className="primary-button" onClick={handleScorecardSave} disabled={opsPending} style={{ fontSize: '0.75rem', padding: '4px 8px', height: 'auto' }}>
                            Save Score
                          </button>
                        </div>
                        <div className="scorecard-grid">
                          <div className="score-input">
                            <label>Quality</label>
                            <input type="number" min="1" max="5" value={scorecard.quality} onChange={e => setScorecard(s => ({ ...s, quality: e.target.value }))} />
                          </div>
                          <div className="score-input">
                            <label>Reliability</label>
                            <input type="number" min="1" max="5" value={scorecard.reliability} onChange={e => setScorecard(s => ({ ...s, reliability: e.target.value }))} />
                          </div>
                          <div className="score-input">
                            <label>Pricing</label>
                            <input type="number" min="1" max="5" value={scorecard.pricing} onChange={e => setScorecard(s => ({ ...s, pricing: e.target.value }))} />
                          </div>
                          <div className="score-input">
                            <label>Communication</label>
                            <input type="number" min="1" max="5" value={scorecard.communication} onChange={e => setScorecard(s => ({ ...s, communication: e.target.value }))} />
                          </div>
                        </div>
                      </section>
                      
                      <section className="detail-section">
                        <h4>Internal Notes</h4>
                        <div className="notes-group">
                          <label>Availability & Capacity</label>
                          <textarea value={availabilityNotes} onChange={e => setAvailabilityNotes(e.target.value)} placeholder="e.g. Busy until June, special rates for Bali..." />
                          
                          <label>Rate Card Details</label>
                          <textarea value={rateCardNotes} onChange={e => setRateCardNotes(e.target.value)} placeholder="e.g. IDR 10jt/day, negotiable for long projects..." />
                          
                          <button className="ghost-button" onClick={handleOpsProfileSave} disabled={opsPending}>
                            {opsPending ? "Saving..." : "Update internal notes"}
                          </button>
                        </div>
                      </section>
                    </div>
                  )}
                  
                  {detailMode === "summary" && (
                    <div className="detail-scroll-area">

                      {/* ══ SELALU TAMPIL: PERBANKAN ══ */}
                      <section style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: '8px', padding: '12px 14px', marginBottom: '2px' }}>
                        <p style={{ margin: '0 0 10px', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--blue)' }}>🏦 Perbankan</p>
                        {selectedVendor.bankAccountNumber || selectedVendor.bankName ? (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            {selectedVendor.bankName && (
                              <div>
                                <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--muted-soft)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Bank</p>
                                <p style={{ margin: '2px 0 0', fontWeight: 600, fontSize: '0.88rem' }}>{selectedVendor.bankName}</p>
                              </div>
                            )}
                            {selectedVendor.bankAccountNumber && (
                              <div>
                                <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--muted-soft)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>No. Rekening</p>
                                <p style={{ margin: '2px 0 0', fontWeight: 700, fontSize: '0.95rem', fontFamily: 'monospace', color: 'var(--blue)' }}>{selectedVendor.bankAccountNumber}</p>
                              </div>
                            )}
                            {selectedVendor.bankAccountHolder && (
                              <div style={{ gridColumn: '1 / -1', paddingTop: '6px', borderTop: '1px solid var(--line)' }}>
                                <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--muted-soft)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Atas Nama</p>
                                <p style={{ margin: '2px 0 0', fontWeight: 600, fontSize: '0.88rem' }}>{selectedVendor.bankAccountHolder}</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p style={{ color: 'var(--muted-soft)', fontSize: '0.8rem', margin: 0, fontStyle: 'italic' }}>Belum ada data perbankan</p>
                        )}
                      </section>

                      {/* ══ SELALU TAMPIL: KONTAK & NPWP ══ */}
                      <section style={{ padding: '10px 0', borderBottom: '1px solid var(--line)', marginBottom: '4px' }}>
                        <p style={{ margin: '0 0 8px', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-soft)' }}>👤 Kontak & Identitas</p>
                        <div style={{ display: 'grid', gap: '0' }}>
                          {selectedVendor.contacts?.[0]?.name && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid var(--line)', fontSize: '0.82rem' }}>
                              <span style={{ color: 'var(--muted-soft)' }}>PIC</span>
                              <strong>{selectedVendor.contacts[0].name}</strong>
                            </div>
                          )}
                          {selectedVendor.contacts?.[0]?.phone && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid var(--line)', fontSize: '0.82rem' }}>
                              <span style={{ color: 'var(--muted-soft)' }}>No. WA</span>
                              <a href={`https://wa.me/${normalizePhoneToWhatsApp(selectedVendor.contacts[0].phone)}`} target="_blank" rel="noreferrer" style={{ fontWeight: 600, color: 'var(--green)', fontSize: '0.82rem' }}>
                                {selectedVendor.contacts[0].phone}
                              </a>
                            </div>
                          )}
                          {selectedVendor.email && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid var(--line)', fontSize: '0.82rem' }}>
                              <span style={{ color: 'var(--muted-soft)' }}>Email</span>
                              <strong style={{ fontSize: '0.8rem' }}>{selectedVendor.email}</strong>
                            </div>
                          )}
                          {selectedVendor.npwpNumber && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid var(--line)', fontSize: '0.82rem' }}>
                              <span style={{ color: 'var(--muted-soft)' }}>NPWP</span>
                              <strong style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{selectedVendor.npwpNumber}</strong>
                            </div>
                          )}
                          {selectedVendor.coverageArea && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', fontSize: '0.82rem' }}>
                              <span style={{ color: 'var(--muted-soft)' }}>Area</span>
                              <strong>{selectedVendor.coverageArea}</strong>
                            </div>
                          )}
                        </div>
                      </section>

                      {/* ══ COLLAPSIBLE: SEMUA SECTION ADMIN ══ */}

                      <details className="detail-disclosure">
                        <summary>
                          <span>📊 Klasifikasi & Status</span>
                          <em className={`category-pill tone-${classificationTone(selectedVendor.classification)}`} style={{ marginLeft: 'auto', fontSize: '0.7rem' }}>
                            {classificationLabel(selectedVendor.classification)}
                          </em>
                        </summary>
                        <div style={{ paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="text-dim" style={{ fontSize: '0.78rem' }}>Terdaftar {formatDate(selectedVendor.sourceTimestamp, locale)}</span>
                          <button 
                            className="ghost-button" 
                            style={{ fontSize: '0.72rem', padding: '3px 8px', height: 'auto' }}
                            onClick={() => {
                              const detail = dashboard.vendorDetails.find(d => d.id === selectedVendor.id);
                              setEditVendorFormData(detail ? { ...detail } : { ...selectedVendor });
                              setIsEditVendorModalOpen(true);
                            }}
                          >
                            Manual Adjust
                          </button>
                        </div>
                      </details>

                      <details className="detail-disclosure">
                        <summary>
                          <span>📁 Dokumen & Compliance</span>
                          <span className={`status-dot small tone-${complianceTone(selectedVendor.compliance.status)}`} style={{ marginLeft: 'auto' }}>
                            {selectedVendor.compliance.status.toUpperCase()}
                          </span>
                        </summary>
                        <div style={{ paddingTop: '10px' }}>
                          <div className="compliance-summary">
                            {selectedVendor.compliance.items.map((item) => (
                              <div className="compliance-item" key={item.documentType}>
                                <div className="compliance-item-left" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                  <strong>{documentTypeLabel(item.documentType)}</strong>
                                  <span className={`status-dot small tone-${complianceItemTone(item.status)}`}>{item.status.toUpperCase()}</span>
                                </div>
                                <p className="detail-client">{item.note}</p>
                                {item.expiresAt && <small style={{ display: 'block', marginTop: '4px' }}>Expires: {formatDate(item.expiresAt, locale)}</small>}
                              </div>
                            ))}
                          </div>
                          <details className="detail-disclosure" style={{ marginTop: '8px' }}>
                            <summary style={{ fontSize: '0.75rem', color: 'var(--muted-soft)' }}>⚙️ Manage Compliance (Admin)</summary>
                            <div className="compliance-editor" style={{ paddingTop: '8px' }}>
                              {selectedVendor.compliance.items.map((item) => (
                                <div className="compliance-edit-row" key={item.documentType}>
                                  <label>{documentTypeLabel(item.documentType)}</label>
                                  <div className="edit-controls" style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                    <select
                                      value={complianceDrafts[item.documentType]?.status || item.status}
                                      onChange={(e) => setComplianceDrafts((prev) => ({ ...prev, [item.documentType]: { ...prev[item.documentType], status: e.target.value } }))}
                                    >
                                      <option value="missing">Missing</option>
                                      <option value="valid">Valid</option>
                                      <option value="expiring">Expiring</option>
                                      <option value="expired">Expired</option>
                                    </select>
                                    <input
                                      type="date"
                                      value={complianceDrafts[item.documentType]?.expiresAt?.split("T")[0] || item.expiresAt?.split("T")[0] || ""}
                                      onChange={(e) => setComplianceDrafts((prev) => ({ ...prev, [item.documentType]: { ...prev[item.documentType], expiresAt: e.target.value } }))}
                                    />
                                    <button className="ghost-button" onClick={() => {
                                      const draft = complianceDrafts[item.documentType];
                                      if (!draft) return;
                                      startOpsTransition(async () => {
                                        await fetch(`/api/vendors/${selectedVendor.id}/compliance`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentType: item.documentType, status: draft.status, expiresAt: draft.expiresAt, note: draft.note || item.note }) });
                                        refreshAfterMutation();
                                      });
                                    }}>Update</button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </details>
                        </div>
                      </details>

                      <details className="detail-disclosure">
                        <summary>
                          <span>✅ Review & Verifikasi</span>
                          <span className={`status-dot small tone-${statusTone(selectedVendor.reviewStatus)}`} style={{ marginLeft: 'auto' }}>
                            {reviewStatusLabel(locale, selectedVendor.reviewStatus)}
                          </span>
                        </summary>
                        <div style={{ paddingTop: '10px', display: 'grid', gap: '10px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <select value={reviewStatus} onChange={(event) => setReviewStatus(event.target.value as ReviewStatus)} style={{ flex: 1 }}>
                              {REVIEW_STATUSES.map((status) => (
                                <option key={status} value={status}>{reviewStatusLabel(locale, status)}</option>
                              ))}
                            </select>
                            <button className="primary-button" onClick={handleReviewSave} disabled={reviewPending}>
                              {reviewPending ? "..." : "Save"}
                            </button>
                          </div>
                          <textarea 
                            value={reviewNote} 
                            onChange={(event) => setReviewNote(event.target.value)} 
                            placeholder="Internal review notes..." 
                            style={{ width: '100%', minHeight: '60px', borderRadius: '4px', padding: '8px' }}
                          />
                        </div>
                      </details>

                      <details className="detail-disclosure">
                        <summary>
                          <span>📝 Request Revisi Profil</span>
                          {selectedVendor.activeRevisionRequest && (
                            <span className="status-dot small tone-review" style={{ marginLeft: 'auto' }}>ACTIVE</span>
                          )}
                        </summary>
                        <div style={{ paddingTop: '10px', display: 'grid', gap: '10px' }}>
                          <div className="revision-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                            {REVISION_FIELD_OPTIONS.map((field) => (
                              <label className="revision-checkbox-item" key={field.fieldKey} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                                <input
                                  checked={!!revisionSelections[field.fieldKey]}
                                  onChange={(e) => setRevisionSelections((prev) => { const next = { ...prev }; if (e.target.checked) next[field.fieldKey] = ""; else delete next[field.fieldKey]; return next; })}
                                  type="checkbox"
                                />
                                <span>{field.label}</span>
                              </label>
                            ))}
                          </div>
                          <textarea
                            onChange={(e) => setRevisionGeneralNote(e.target.value)}
                            placeholder="Instruksi untuk vendor..."
                            value={revisionGeneralNote}
                            style={{ width: '100%', minHeight: '70px', borderRadius: '4px', padding: '8px', fontSize: '0.82rem' }}
                          />
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {REVISION_TEMPLATES.map((tpl) => (
                              <button className="chip" key={tpl.id} onClick={() => { setRevisionGeneralNote(tpl.generalNote); const next: Record<string, string> = {}; tpl.items.forEach((it) => (next[it.fieldKey] = it.note)); setRevisionSelections(next); }} type="button">
                                {tpl.label}
                              </button>
                            ))}
                          </div>
                          <button className="ghost-button" onClick={handleRequestRevision} type="button" style={{ width: '100%' }}>
                            {opsPending ? "..." : "Kirim Permintaan Revisi"}
                          </button>
                          {selectedVendor.activeRevisionRequest && (
                            <div style={{ padding: '8px', background: 'var(--panel-soft)', border: '1px solid var(--line)', borderRadius: '4px', fontSize: '0.78rem' }}>
                              <p style={{ wordBreak: 'break-all', margin: '0 0 4px' }}>
                                Active: /vendor/revise/{selectedVendor.activeRevisionRequest.editToken}
                              </p>
                              <small>Expires: {formatDate(selectedVendor.activeRevisionRequest.editTokenExpiresAt, locale)}</small>
                            </div>
                          )}
                        </div>
                      </details>

                      {socialLinks.length > 0 && (
                        <details className="detail-disclosure">
                          <summary>Social media</summary>
                          <div className="notion-links">
                            {socialLinks.map((item) => (
                              <a href={item.url} key={item.label} rel="noreferrer" target="_blank">
                                <span>{item.label}</span>
                                <strong>{shortLinkLabel(item.url)}</strong>
                              </a>
                            ))}
                          </div>
                        </details>
                      )}

                      <details className="detail-disclosure">
                        <summary>Communication templates</summary>
                        <div className="notion-links">
                          {whatsappNumber ? (
                            <a href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Halo ${selectedVendor.contacts[0]?.name || "Tim Vendor"}, kami dari JUARA ingin follow up profil vendor ${formatVendorName(selectedVendor.name)}.`)}`} rel="noreferrer" target="_blank">
                              <span>WhatsApp follow-up</span>
                              <strong>Open template</strong>
                            </a>
                          ) : null}
                          {selectedVendor.email ? (
                            <a href={`mailto:${selectedVendor.email}?subject=${encodeURIComponent(`Follow up vendor ${formatVendorName(selectedVendor.name)}`)}`}>
                              <span>Email follow-up</span>
                              <strong>{selectedVendor.email}</strong>
                            </a>
                          ) : null}
                        </div>
                      </details>

                      <details className="detail-disclosure">
                        <summary>Audit log</summary>
                        <div className="audit-list">
                          {selectedVendor.auditLog.length > 0 ? (
                            selectedVendor.auditLog.map((entry) => (
                              <div className="audit-row" key={entry.id}>
                                <strong>{entry.action}</strong>
                                <span>{entry.message}</span>
                                <small>{entry.actor} • {formatDate(entry.createdAt, locale)}</small>
                              </div>
                            ))
                          ) : (
                            <p className="empty-state">No audit entries yet.</p>
                          )}
                        </div>
                      </details>
                    </div>
                  )}
                </>
              ) : (
                <p className="empty-state" style={{ marginTop: '40px' }}>{view === "outbox" ? "Pilih vendor view lain untuk melihat detail." : t(locale, "selectVendor")}</p>
              )}
            </aside>
          </Drawer>
        </div>
      )}

      {view === "by_type" && (
        <section className="type-board">
          {vendorsByType.map((group) => (
            <div className="type-column" key={group.type}>
              <div className="type-column-header">{group.type}</div>
              <div className="type-card-list">
                {group.items.map((vendor) => (
                  <button className="project-card" key={vendor.id} onClick={() => openVendor(vendor)} type="button" style={{ textAlign: 'left', width: '100%', border: '1px solid var(--line)' }}>
                    <div style={{ marginBottom: '12px' }}>
                      <em className="eyebrow" style={{ display: 'block', marginBottom: '4px' }}>{vendor.serviceNames[0]}</em>
                      <h3 style={{ margin: 0, fontSize: '1rem' }}>{formatVendorName(vendor.name)}</h3>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <em className={`category-pill tone-${classificationTone(vendor.classification)}`}>{classificationLabel(vendor.classification)}</em>
                        <span className={`status-dot tone-${statusTone(vendor.reviewStatus)}`}>
                          {reviewStatusLabel(locale, vendor.reviewStatus)}
                        </span>
                      </div>
                      <strong className="text-main">{vendorScore(vendor)}</strong>
                    </div>
                    <div style={{ marginTop: '8px', opacity: 0.6, fontSize: '0.75rem' }}>
                      Documents: {vendor.documentCompletion.complete}/{vendor.documentCompletion.required}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {view === "by_status" && (
        <section className="status-sections">
          {directorySections.map((section) => (
            <div className="status-section" key={section.status}>
              <div className="status-section-header">
                <span className={`status-dot tone-${statusTone(section.status)}`}>{section.title}</span>
              </div>
              <div className="directory-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {section.items.map((vendor) => (
                  <button className="project-card" key={vendor.id} onClick={() => openVendor(vendor)} type="button" style={{ textAlign: 'left', width: '100%', border: '1px solid var(--line)' }}>
                    <div style={{ marginBottom: '12px' }}>
                      <em className="eyebrow" style={{ display: 'block', marginBottom: '4px' }}>{primaryType(vendor)}</em>
                      <h3 style={{ margin: 0, fontSize: '1rem' }}>{formatVendorName(vendor.name)}</h3>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <em className={`category-pill tone-${classificationTone(vendor.classification)}`}>{classificationLabel(vendor.classification)}</em>
                        <span className={`status-dot tone-${statusTone(vendor.reviewStatus)}`}>
                          {reviewStatusLabel(locale, vendor.reviewStatus)}
                        </span>
                      </div>
                      <strong className="text-main">{vendorScore(vendor)}</strong>
                    </div>
                    <div style={{ marginTop: '8px', opacity: 0.6, fontSize: '0.75rem' }}>
                      {vendor.coverageArea || "No location data"}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {view === "vendor_directory" && (
        <section className="status-sections">
          {directorySections.map((section) => (
            <div className="status-section" key={section.status}>
              <div className="status-section-header">
                <span className={`status-dot tone-${statusTone(section.status)}`}>{section.title}</span>
              </div>
              <div className="directory-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {section.items.slice(0, 8).map((vendor) => (
                  <button className="project-card" key={vendor.id} onClick={() => openVendor(vendor)} type="button" style={{ textAlign: 'left', width: '100%', border: '1px solid var(--line)' }}>
                    <div style={{ marginBottom: '12px' }}>
                      <em className="eyebrow" style={{ display: 'block', marginBottom: '4px' }}>{vendor.serviceNames[0]}</em>
                      <h3 style={{ margin: 0, fontSize: '1rem' }}>{formatVendorName(vendor.name)}</h3>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <em className={`category-pill tone-${classificationTone(vendor.classification)}`}>{classificationLabel(vendor.classification)}</em>
                        <span className={`status-dot tone-${statusTone(vendor.reviewStatus)}`}>
                          {reviewStatusLabel(locale, vendor.reviewStatus)}
                        </span>
                      </div>
                      <strong className="text-main">{vendorScore(vendor)}</strong>
                    </div>
                    <div style={{ marginTop: '8px', opacity: 0.6, fontSize: '0.75rem' }}>
                      {vendor.coverageArea || "No location data"}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}
      {isEditVendorModalOpen && selectedVendor && (
        <div className="modal-overlay modal-backdrop">
          <div className="modal-content wide-modal modal-card">
            <h2 style={{ marginBottom: '24px' }}>Adjust Vendor Information</h2>
            <div className="form-stack">
              <div className="form-section-title">Identity & Contact</div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="eyebrow" style={{ display: 'block', marginBottom: '6px' }}>Vendor Name</label>
                  <input 
                    className="control-bar-input" 
                    style={{ width: '100%' }}
                    value={editVendorFormData.name || ''} 
                    onChange={(e) => setEditVendorFormData({ ...editVendorFormData, name: e.target.value })} 
                    placeholder="Legal name..." 
                  />
                </div>
                <div className="form-group">
                  <label className="eyebrow" style={{ display: 'block', marginBottom: '6px' }}>Business Email</label>
                  <input 
                    className="control-bar-input" 
                    style={{ width: '100%' }}
                    value={editVendorFormData.email || ''} 
                    onChange={(e) => setEditVendorFormData({ ...editVendorFormData, email: e.target.value })} 
                    placeholder="official@company.com" 
                  />
                </div>
              </div>

              <div className="form-grid-2" style={{ marginTop: '20px' }}>
                <div className="form-group">
                  <label className="eyebrow" style={{ display: 'block', marginBottom: '6px' }}>Classification</label>
                  <select 
                    className="control-bar-select" 
                    style={{ width: '100%' }}
                    value={editVendorFormData.classification || ''} 
                    onChange={(e) => setEditVendorFormData({ ...editVendorFormData, classification: e.target.value as VendorClassification })}
                  >
                    <option value="Penyedia Barang">Penyedia Barang (Goods/Equipment)</option>
                    <option value="Penyedia Jasa">Penyedia Jasa (Services/Specialist)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="eyebrow" style={{ display: 'block', marginBottom: '6px' }}>Coverage Area</label>
                  <input 
                    className="control-bar-input" 
                    style={{ width: '100%' }}
                    value={editVendorFormData.coverageArea || ''} 
                    onChange={(e) => setEditVendorFormData({ ...editVendorFormData, coverageArea: e.target.value })} 
                    placeholder="e.g. Nasional, Jakarta, etc." 
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '20px' }}>
                <label className="eyebrow" style={{ display: 'block', marginBottom: '6px' }}>Services (Comma-separated)</label>
                <input 
                  className="control-bar-input" 
                  style={{ width: '100%' }}
                  value={(editVendorFormData as { serviceNames?: string[] }).serviceNames?.join(', ') || ''} 
                  onChange={(e) => {
                    const serviceNames = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                    setEditVendorFormData({ ...editVendorFormData, serviceNames } as typeof editVendorFormData);
                  }} 
                  placeholder="e.g. Advertising, Stage Show Management..." 
                />
                <div style={{ fontSize: '0.7rem', opacity: 0.5, marginTop: '4px' }}>
                  Typos like &quot;ADVERTISTING&quot; will be automatically corrected on save.
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '20px' }}>
                <label className="eyebrow" style={{ display: 'block', marginBottom: '6px' }}>Website / Profile URL</label>
                <input 
                  className="control-bar-input" 
                  style={{ width: '100%' }}
                  value={editVendorFormData.websiteUrl || ''} 
                  onChange={(e) => setEditVendorFormData({ ...editVendorFormData, websiteUrl: e.target.value })} 
                  placeholder="https://..." 
                />
              </div>
            </div>

            <div style={{ marginTop: '32px', display: 'flex', gap: '16px', justifyContent: 'flex-end', alignItems: 'center' }}>
              <button className="ghost-button" onClick={() => setIsEditVendorModalOpen(false)}>Cancel</button>
              <button 
                className="primary-button" 
                onClick={async () => {
                  startOpsTransition(async () => {
                    const response = await fetch(`/api/vendors/${selectedVendor.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(editVendorFormData),
                    });
                    if (response.ok) {
                      setIsEditVendorModalOpen(false);
                      window.location.reload();
                    } else {
                      alert("Gagal menyimpan perubahan.");
                    }
                  });
                }}
              >
                {opsPending ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </WorkspaceShell>
  );
}
