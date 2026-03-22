"use client";

import Link from "next/link";
import { CSSProperties, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { Locale, reviewStatusLabel, t } from "@/lib/vendor/i18n";
import { DashboardData, ReviewStatus, VendorClassification, VendorDetail, VendorLifecycleStatus, VendorSummary } from "@/lib/vendor/types";
import { WorkspaceShell } from "./layout/workspace-shell";
import { SplitPane } from "./ui/split-pane";
import { SummaryCard } from "./ui/summary-card";
import { StatusPill } from "./ui/status-pill";

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

const THEME_STORAGE_KEY = "juara-project-tracker-theme";

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
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") {
      return "dark";
    }
    return window.localStorage.getItem(THEME_STORAGE_KEY) === "light" ? "light" : "dark";
  });
  const [listPaneWidth, setListPaneWidth] = useState(54);
  const [isResizing, setIsResizing] = useState(false);
  const [dashboard, setDashboard] = useState(initialData);
  const [selectedVendorId, setSelectedVendorId] = useState(initialData.vendors[0]?.id ?? "");
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

  const matchesFilters = (vendor: VendorSummary, currentFilters: Filters) => {
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
  };

  const filteredVendors = useMemo(
    () => dashboard.vendors.filter((vendor) => matchesFilters(vendor, filters)),
    [dashboard.vendors, filters],
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

  function applySavedFilter(slot: "slot1" | "slot2" | "slot3") {
    const saved = savedFilters[slot];
    if (!saved) return;
    setFilters(saved);
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

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (!isResizing) {
      return;
    }

    function handlePointerMove(event: PointerEvent) {
      const layout = layoutRef.current;
      if (!layout) return;

      const rect = layout.getBoundingClientRect();
      const nextWidth = ((event.clientX - rect.left) / rect.width) * 100;
      setListPaneWidth(clampPaneWidth(nextWidth));
    }

    function stopResize() {
      setIsResizing(false);
    }

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResize);
    };
  }, [isResizing]);

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
      <button className="ghost-button" onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))} type="button">
        {theme === "dark" ? "Light" : "Dark"}
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
        <SplitPane
          initialWidth={listPaneWidth}
          left={
            <div className={`notion-list ${isVendorListView ? "vendor-list-view" : ""}`}>
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

                <div className="vms-list-stack vendor-stack">
                  <div className="vms-list-grid vms-list-header">
                    <div />
                    <span>Vendor Name</span>
                    <span>Type</span>
                    <span>Location</span>
                    <span>Primary Service</span>
                  </div>
                  {view === "all_vendors" &&
                    filteredVendors.map((vendor) => (
                  <button
                    className={`vms-list-grid ${selectedVendorId === vendor.id ? "active" : ""}`}
                    key={vendor.id}
                    onClick={() => openVendor(vendor)}
                    type="button"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <input
                        checked={selectedVendorIds.includes(vendor.id)}
                        onChange={(event) => {
                          event.stopPropagation();
                          toggleVendorSelection(vendor.id);
                        }}
                        onClick={(event) => event.stopPropagation()}
                        type="checkbox"
                      />
                    </div>
                    <div className="vendor-main-info" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontWeight: 600, color: 'inherit' }}>{formatVendorName(vendor.name)}</span>
                      <small className="mini-meta" style={{ color: 'inherit', opacity: 0.7 }}>{vendor.email}</small>
                    </div>
                    
                    <div>
                      <em className={`category-pill tone-${classificationTone(vendor.classification)}`}>{classificationLabel(vendor.classification)}</em>
                    </div>
 
                    <div className="text-muted" style={{ fontSize: 'var(--text-small)' }}>
                      {vendor.coverageArea || "-"}
                    </div>
 
                    <div>
                      <em className={`category-pill tone-${categoryTone(primaryType(vendor))}`}>{primaryType(vendor)}</em>
                    </div>
                  </button>
                ))}

            {view === "sync_log" &&
              dashboard.importRuns.map((run) => (
                <article className="sync-card" key={run.id}>
                  <strong>{formatDate(run.finishedAt, locale)}</strong>
                  <span>{run.sourceLabel}</span>
                  <span>+{run.createdVendors} · ~{run.updatedVendors} · ={run.skippedRows}</span>
                  {run.errorMessages.map((message) => (
                    <p key={message}>{message}</p>
                  ))}
                </article>
              ))}

            {view === "outbox" &&
              dashboard.notificationFeed.map((item) => (
                <article className="sync-card notification-feed-card" key={item.id}>
                  <strong>{item.vendorName}</strong>
                  <span>{item.registrationCode}</span>
                  <span>{item.audience} · {item.channel} · {formatDate(item.createdAt, locale)}</span>
                  <p>{truncateText(item.subject, 90)}</p>
                  <p>{truncateText(item.message, 160)}</p>
                  <small>To: {item.recipient}</small>
                </article>
              ))}

            {view !== "sync_log" && view !== "outbox" && filteredVendors.length === 0 && <p className="empty-state">{t(locale, "noData")}</p>}
                {view === "outbox" && dashboard.notificationFeed.length === 0 && <p className="empty-state">No notifications yet.</p>}
              </div>
            </div>
          }
          right={
            <aside className="notion-detail">
              <div className="panel-section-header detail-panel-header">
                <div>
                  <p className="panel-label">Vendor Profile</p>
                  <h3>{view === "outbox" ? "Outbox Summary" : selectedVendor ? formatVendorName(selectedVendor.name) : "No vendor selected"}</h3>
                </div>
              </div>
              {view === "outbox" ? (
                <p className="empty-state">Outbox displays email/WhatsApp notification logs for admins and vendors.</p>
              ) : null}
            {view !== "outbox" && selectedVendor ? (
              <>
                <div className="detail-hero">
                  <div className="detail-title-row">
                    <div className="detail-page-icon">◫</div>
                    <div>
                      <p className="detail-meta">{primaryType(selectedVendor)}</p>
                      <h2>{formatVendorName(selectedVendor.name)}</h2>
                    </div>
                  </div>
                  <div className="detail-hero-badges">
                    <span className={`status-dot tone-${statusTone(selectedVendor.reviewStatus)}`}>{reviewStatusLabel(locale, selectedVendor.reviewStatus)}</span>
                    <span className={`status-dot tone-${lifecycleTone(selectedVendor.lifecycleStatus)}`}>{lifecycleLabel(selectedVendor.lifecycleStatus)}</span>
                    <span className={`status-dot tone-${complianceTone(selectedVendor.compliance.status)}`}>{selectedVendor.compliance.status}</span>
                  </div>
                  <div className="detail-actions">
                    {whatsappNumber ? (
                      <a className="ghost-button" href={`https://wa.me/${whatsappNumber}`} rel="noreferrer" target="_blank">
                        WhatsApp
                      </a>
                    ) : null}
                    {selectedVendor.email ? (
                      <a className="ghost-button" href={`mailto:${selectedVendor.email}`}>
                        Email
                      </a>
                    ) : null}
                    {socialLinks[0] ? (
                      <a className="ghost-button" href={socialLinks[0].url} rel="noreferrer" target="_blank">
                        Social
                      </a>
                    ) : null}
                  </div>
                </div>
                <div className="detail-mode-switch">
                  <button className={detailMode === "summary" ? "active" : ""} onClick={() => setDetailMode("summary")} type="button">
                    Summary
                  </button>
                  <button className={detailMode === "operations" ? "active" : ""} onClick={() => setDetailMode("operations")} type="button">
                    Operations
                  </button>
                </div>
                {detailMode === "summary" ? (
                  <>
                    <div className="detail-block">
                      <div className="summary-chip-grid">
                        <article className="summary-chip-card">
                          <span>Contact</span>
                          <strong>{selectedVendor.contacts[0]?.name || "-"}</strong>
                          <small>{selectedVendor.contacts[0]?.phone || selectedVendor.email || "-"}</small>
                        </article>
                        <article className="summary-chip-card">
                          <span>Coverage</span>
                          <strong>{selectedVendor.coverageArea || "-"}</strong>
                          <small>{selectedVendor.cities.join(", ") || "No city mapping"}</small>
                        </article>
                        <article className="summary-chip-card">
                          <span>Performance</span>
                          <strong>{selectedVendor.performance.average || "-"}</strong>
                          <small>{selectedVendor.performance.totalReviews} reviews</small>
                        </article>
                        <article className="summary-chip-card">
                          <span>Documents</span>
                          <strong>{selectedVendor.documentCompletion.complete}/{selectedVendor.documentCompletion.required}</strong>
                          <small>{selectedVendor.documentCompletion.missingLabels.length} missing</small>
                        </article>
                        <article className="summary-chip-card">
                          <span>Compliance</span>
                          <strong className={`status-dot tone-${complianceTone(selectedVendor.compliance.status)}`}>{selectedVendor.compliance.status}</strong>
                          <small>{selectedVendor.compliance.expiredCount} expired • {selectedVendor.compliance.expiringCount} expiring</small>
                        </article>
                        <article className="summary-chip-card">
                          <span>Registration</span>
                          <strong>{selectedVendor.registrationCode || "-"}</strong>
                          <small>{formatDate(selectedVendor.sourceTimestamp, locale)}</small>
                        </article>
                      </div>
                    </div>

                    <details className="detail-disclosure" open>
                      <summary>Overview</summary>
                      <div className="property-list compact-property-list">
                        <div><span>Vendor Type</span><strong className={`category-pill tone-${categoryTone(primaryType(selectedVendor))}`}>{primaryType(selectedVendor)}</strong></div>
                        <div><span>Classification</span><strong className={`category-pill tone-${classificationTone(selectedVendor.classification)}`}>{classificationLabel(selectedVendor.classification)}</strong></div>
                        <div><span>Category</span><strong>{selectedVendor.displayType || "-"}</strong></div>
                        <div><span>Email</span><strong>{selectedVendor.contacts[0]?.email || selectedVendor.email || "-"}</strong></div>
                        <div><span>Tax</span><strong>{selectedVendor.taxStatus}</strong></div>
                        <div><span>Account Manager</span><strong>{selectedVendor.accountManager || "-"}</strong></div>
                      </div>
                    </details>

                    <details className="detail-disclosure" open>
                      <summary>Compliance checklist</summary>
                      <div className="compact-compliance-list">
                        {selectedVendor.compliance.items.map((item) => (
                          <div className="compact-compliance-row" key={item.id}>
                            <div>
                              <strong>{documentTypeLabel(item.documentType)}</strong>
                              <small>{item.expiresAt ? formatDate(item.expiresAt, locale) : "No expiry date"}</small>
                            </div>
                            <span className={`status-dot tone-${complianceItemTone(item.status)}`}>{item.status}</span>
                          </div>
                        ))}
                      </div>
                    </details>

                    {(selectedVendor.rateCardNotes || selectedVendor.availabilityNotes) ? (
                      <details className="detail-disclosure">
                        <summary>Operational notes</summary>
                        <div className="compact-note-stack">
                          {selectedVendor.rateCardNotes ? (
                            <article>
                              <span>Rate card</span>
                              <p>{selectedVendor.rateCardNotes}</p>
                            </article>
                          ) : null}
                          {selectedVendor.availabilityNotes ? (
                            <article>
                              <span>Availability</span>
                              <p>{selectedVendor.availabilityNotes}</p>
                            </article>
                          ) : null}
                        </div>
                      </details>
                    ) : null}
                  </>
                ) : (
                  <>
                    <div className="detail-block">
                      <h3>Lifecycle & Operations</h3>
                      <div className="review-form review-dark">
                        <div className="form-grid-2">
                          <div className="form-group">
                            <label className="mini-meta">Lifecycle Status</label>
                            <select style={{ width: '100%' }} value={lifecycleStatus} onChange={(event) => setLifecycleStatus(event.target.value as VendorLifecycleStatus)}>
                              {LIFECYCLE_STATUSES.map((status) => (
                                <option key={status} value={status}>
                                  {lifecycleLabel(status)}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="form-group">
                            <label className="mini-meta">Account Manager</label>
                            <input style={{ width: '100%' }} value={accountManager} onChange={(event) => setAccountManager(event.target.value)} placeholder="AM / Owner" />
                          </div>
                        </div>
                        <div className="form-group" style={{ marginTop: '12px' }}>
                          <label className="mini-meta">Operational Cities</label>
                          <input style={{ width: '100%' }} value={cities} onChange={(event) => setCities(event.target.value)} placeholder="e.g., Jakarta, Surabaya (comma separated)" />
                        </div>
                        <div className="form-grid-2" style={{ marginTop: '12px' }}>
                          <div className="form-group">
                            <label className="mini-meta">Rate Card / Pricing Notes</label>
                            <textarea style={{ width: '100%', height: '80px' }} value={rateCardNotes} onChange={(event) => setRateCardNotes(event.target.value)} placeholder="..." />
                          </div>
                          <div className="form-group">
                            <label className="mini-meta">Availability / Blackout Dates</label>
                            <textarea style={{ width: '100%', height: '80px' }} value={availabilityNotes} onChange={(event) => setAvailabilityNotes(event.target.value)} placeholder="..." />
                          </div>
                        </div>
                        <div className="action-row" style={{ marginTop: '16px' }}>
                          <button className="ghost-button" onClick={handleLifecycleSave} type="button">
                            {opsPending ? "..." : "Save Lifecycle"}
                          </button>
                          <button className="ghost-button" onClick={handleOpsProfileSave} type="button">
                            {opsPending ? "..." : "Save Profile"}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="detail-block">
                      <h3>Performance scoring</h3>
                      <div className="property-list">
                        <div><span>Quality</span><strong>{selectedVendor.performance.quality || "-"}</strong></div>
                        <div><span>Reliability</span><strong>{selectedVendor.performance.reliability || "-"}</strong></div>
                        <div><span>Pricing</span><strong>{selectedVendor.performance.pricing || "-"}</strong></div>
                        <div><span>Communication</span><strong>{selectedVendor.performance.communication || "-"}</strong></div>
                        <div><span>On-time</span><strong>{selectedVendor.performance.onTime || "-"}</strong></div>
                        <div><span>Total reviews</span><strong>{selectedVendor.performance.totalReviews}</strong></div>
                      </div>
                      <div className="review-form review-dark">
                        <input value={scorecard.projectId} onChange={(event) => setScorecard((current) => ({ ...current, projectId: event.target.value }))} placeholder="Project ID (optional)" />
                        <div className="score-grid">
                          {(["quality", "reliability", "pricing", "communication", "onTime"] as const).map((field) => (
                            <label key={field}>
                              <span>{field}</span>
                              <select value={scorecard[field]} onChange={(event) => setScorecard((current) => ({ ...current, [field]: event.target.value }))}>
                                {[1, 2, 3, 4, 5].map((value) => (
                                  <option key={value} value={String(value)}>
                                    {value}
                                  </option>
                                ))}
                              </select>
                            </label>
                          ))}
                        </div>
                        <textarea rows={3} value={scorecard.note} onChange={(event) => setScorecard((current) => ({ ...current, note: event.target.value }))} placeholder="Performance note" />
                        <button className="ghost-button" onClick={handleScorecardSave} type="button">
                          {opsPending ? "..." : "Add scorecard"}
                        </button>
                      </div>
                    </div>

                    <div className="detail-block">
                      <h3>Compliance editor</h3>
                      <div className="property-list">
                        <div><span>Expired</span><strong>{selectedVendor.compliance.expiredCount}</strong></div>
                        <div><span>Expiring soon</span><strong>{selectedVendor.compliance.expiringCount}</strong></div>
                        <div><span>Missing</span><strong>{selectedVendor.compliance.missingCount}</strong></div>
                        <div><span>Next expiry</span><strong>{selectedVendor.compliance.nextExpiry ? formatDate(selectedVendor.compliance.nextExpiry, locale) : "-"}</strong></div>
                      </div>
                      <div className="compliance-list">
                        {selectedVendor.compliance.items.map((item) => (
                          <div className="compliance-row" key={item.id}>
                            <strong>{documentTypeLabel(item.documentType)}</strong>
                            <select
                              value={complianceDrafts[item.documentType]?.status ?? item.status}
                              onChange={(event) =>
                                setComplianceDrafts((current) => ({
                                  ...current,
                                  [item.documentType]: {
                                    status: event.target.value,
                                    expiresAt: current[item.documentType]?.expiresAt ?? item.expiresAt,
                                    note: current[item.documentType]?.note ?? item.note,
                                  },
                                }))
                              }
                            >
                              {["valid", "expiring", "expired", "missing"].map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                            <input
                              type="date"
                              value={(complianceDrafts[item.documentType]?.expiresAt ?? item.expiresAt).slice(0, 10)}
                              onChange={(event) =>
                                setComplianceDrafts((current) => ({
                                  ...current,
                                  [item.documentType]: {
                                    status: current[item.documentType]?.status ?? item.status,
                                    expiresAt: event.target.value,
                                    note: current[item.documentType]?.note ?? item.note,
                                  },
                                }))
                              }
                            />
                            <input
                              value={complianceDrafts[item.documentType]?.note ?? item.note}
                              onChange={(event) =>
                                setComplianceDrafts((current) => ({
                                  ...current,
                                  [item.documentType]: {
                                    status: current[item.documentType]?.status ?? item.status,
                                    expiresAt: current[item.documentType]?.expiresAt ?? item.expiresAt,
                                    note: event.target.value,
                                  },
                                }))
                              }
                              placeholder="Compliance note"
                            />
                            <button className="ghost-button" onClick={() => handleComplianceSave(item.documentType)} type="button">
                              Save
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="detail-block">
                      <h3>Request revision</h3>
                      <div className="review-form review-dark">
                        <div className="revision-template-row">
                          <select
                            value={revisionTemplateId}
                            onChange={(event) => applyRevisionTemplate(event.target.value)}
                          >
                            <option value="">Pilih template revisi cepat</option>
                            {REVISION_TEMPLATES.map((template) => (
                              <option key={template.id} value={template.id}>
                                {template.label}
                              </option>
                            ))}
                          </select>
                          <button className="ghost-button" onClick={clearRevisionDraft} type="button">
                            Clear
                          </button>
                        </div>
                        <textarea rows={3} value={revisionGeneralNote} onChange={(event) => setRevisionGeneralNote(event.target.value)} placeholder="General revision note for vendor" />
                        <div className="revision-grid">
                          {REVISION_FIELD_OPTIONS.map((item) => (
                            <label key={item.fieldKey}>
                              <span>{item.label}</span>
                              <input
                                value={revisionSelections[item.fieldKey] ?? ""}
                                onChange={(event) =>
                                  setRevisionSelections((current) => ({
                                    ...current,
                                    [item.fieldKey]: event.target.value,
                                  }))
                                }
                                placeholder={`Note for ${item.label}`}
                              />
                            </label>
                          ))}
                        </div>
                        <button className="ghost-button" onClick={handleRequestRevision} type="button">
                          {opsPending ? "..." : "Send revision request"}
                        </button>
                        {selectedVendor.activeRevisionRequest && (
                          <div className="active-revision-card">
                            <p className="detail-client">
                              Active revision link: /vendor/revise/{selectedVendor.activeRevisionRequest.editToken}
                            </p>
                            <small>Expired: {formatDate(selectedVendor.activeRevisionRequest.editTokenExpiresAt, locale)}</small>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

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

                {selectedVendor.linkedProjects && selectedVendor.linkedProjects.length > 0 && (
                  <details className="detail-disclosure">
                    <summary>Assigned projects</summary>
                    <div className="notion-links">
                      {selectedVendor.linkedProjects?.map((project) => (
                        <Link href="/projects" key={project.linkId}>
                          <span>
                            {project.projectName} • {project.client}
                          </span>
                          <strong>{project.stageLabel}</strong>
                        </Link>
                      ))}
                    </div>
                  </details>
                )}

                <details className="detail-disclosure">
                  <summary>Document links</summary>
                  <div className="notion-links">
                    {selectedVendor.documents.map((document) => (
                      <a href={document.url} key={document.id} rel="noreferrer" target="_blank">
                        <span>{document.label}</span>
                        <strong>{shortLinkLabel(document.url)}</strong>
                      </a>
                    ))}
                  </div>
                </details>

                <details className="detail-disclosure">
                  <summary>Notification history</summary>
                  <div className="notification-list">
                    {selectedVendor.notifications.length > 0 ? (
                      selectedVendor.notifications.map((item) => (
                        <article className="notification-row" key={item.id}>
                          <div className="notification-meta-row">
                            <span className="status-dot tone-pending">{item.audience}</span>
                            <span className="status-dot tone-review">{item.channel}</span>
                            <small>{formatDate(item.createdAt, locale)}</small>
                          </div>
                          <strong>{item.subject}</strong>
                          <p>{truncateText(item.message, 180)}</p>
                          <small>To: {truncateText(item.recipient, 52)}</small>
                        </article>
                      ))
                    ) : (
                      <p className="empty-state">No notifications yet.</p>
                    )}
                  </div>
                </details>

                <details className="detail-disclosure">
                  <summary>{t(locale, "reviewNotes")}</summary>
                  <div className="review-form review-dark">
                    <select value={reviewStatus} onChange={(event) => setReviewStatus(event.target.value as ReviewStatus)}>
                      {REVIEW_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {reviewStatusLabel(locale, status)}
                        </option>
                      ))}
                    </select>
                    <textarea
                      rows={4}
                      value={reviewNote}
                      onChange={(event) => setReviewNote(event.target.value)}
                      placeholder={t(locale, "reviewNotes")}
                    />
                  <button className="ghost-button" onClick={handleReviewSave} type="button">
                      {reviewPending ? "..." : t(locale, "saveReview")}
                    </button>
                  </div>
                </details>

                <details className="detail-disclosure">
                  <summary>Communication templates</summary>
                  <div className="notion-links">
                    {whatsappNumber ? (
                      <a
                        href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Halo ${selectedVendor.contacts[0]?.name || "Tim Vendor"}, kami dari JUARA ingin follow up profil vendor ${formatVendorName(selectedVendor.name)}.`)}`}
                        rel="noreferrer"
                        target="_blank"
                      >
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
                          <small>
                            {entry.actor} • {formatDate(entry.createdAt, locale)}
                          </small>
                        </div>
                      ))
                    ) : (
                      <p className="empty-state">No audit entries yet.</p>
                    )}
                  </div>
                </details>
              </>
              ) : (
                <p className="empty-state">{view === "outbox" ? "Pilih vendor view lain untuk melihat detail." : t(locale, "selectVendor")}</p>
              )}
                </aside>
            }
          />
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
    </WorkspaceShell>
  );
}
