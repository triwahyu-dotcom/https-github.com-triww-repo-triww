"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { Locale, reviewStatusLabel, t } from "@/lib/vendor/i18n";
import { DashboardData, ReviewStatus, VendorClassification, VendorDetail, VendorLifecycleStatus, VendorSummary } from "@/lib/vendor/types";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { SummaryCard } from "@/components/ui/summary-card";
import { 
  Users, 
  Wrench, 
  Package, 
  CheckCircle, 
  Star, 
  Search, 
  Settings, 
  Gavel, 
  LayoutGrid, 
  List, 
  BookOpen, 
  ArrowUpDown, 
  Mail,
  Activity,
  PieChart,
  ShieldCheck,
  CreditCard,
  FileText,
  Files,
  History,
  User,
  Tag,
  Landmark,
  FolderOpen,
  TrendingUp,
  BarChart3,
  MapPin
} from "lucide-react";

type ViewId =
  | "by_status"
  | "by_type"
  | "vendor_directory"
  | "all_vendors"
  | "sync_log"
  | "outbox";

type DetailMode = "overview" | "finance" | "docs" | "ops" | "audit";

type SortKey = "name" | "date" | "status" | "score";
type SortOrder = "asc" | "desc";

type Filters = {
  search: string;
  service: string;
  location: string;
  reviewStatus: string;
  classification: string;
  sortKey: SortKey;
  sortOrder: SortOrder;
  showOnlyNew: boolean;
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
  { fieldKey: "businessAddress", label: "Business address", section: "identity" },
  { fieldKey: "email", label: "Business email", section: "identity" },
  { fieldKey: "picName", label: "PIC name", section: "contact" },
  { fieldKey: "picPhone", label: "PIC phone", section: "contact" },
  { fieldKey: "bankAccountHolder", label: "Bank account holder", section: "finance" },
  { fieldKey: "documentsFolderUrl", label: "Link Folder Dokumen", section: "documents" },
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
    generalNote: "Please complete the primary legality documents in your folder before we proceed with the review process.",
    items: [
      { fieldKey: "documentsFolderUrl", note: "Upload or update all required documents (Compro, NPWP, NIB, etc.) in the provided folder link." },
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
      { fieldKey: "businessAddress", note: "Provide the detailed business address for administrative purposes." },
    ],
  },
];

const VIEW_ORDER: { id: ViewId; label: string }[] = [
  { id: "all_vendors", label: "All Vendors" },
  { id: "by_status", label: "By Status" },
  { id: "by_type", label: "By Type" },
  { id: "vendor_directory", label: "Vendor Directory" },
];

const VIEW_ICONS: Record<ViewId, React.ReactNode> = {
  by_status: <PieChart size={14} />,
  by_type: <LayoutGrid size={14} />,
  vendor_directory: <BookOpen size={14} />,
  all_vendors: <List size={14} />,
  sync_log: <ArrowUpDown size={14} />,
  outbox: <Mail size={14} />,
};

const VIEW_TITLES: Record<ViewId, string> = {
  by_status: "Status",
  by_type: "Type",
  vendor_directory: "Directory",
  all_vendors: "All Vendors",
  sync_log: "Sync Log",
  outbox: "Outbox",
};

const STORAGE_KEY = "juara-vendor-management-dashboard-v1";

function isRecent(value: string | undefined) {
  if (!value) return false;
  try {
    const date = new Date(value);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    return diff < 48 * 60 * 60 * 1000; // 48 hours
  } catch {
    return false;
  }
}

function formatDate(value: string, locale: Locale) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatNPWP(value: string) {
  if (!value) return "-";
  // Remove non-digits
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 15) return value; // Return as is if not standard length
  // Format: 00.000.000.0-000.000
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}.${digits.slice(8, 9)}-${digits.slice(9, 12)}.${digits.slice(12, 15)}`;
}

function formatBankAccount(value: string) {
  if (!value) return "-";
  const digits = value.replace(/\D/g, "");
  if (digits.length < 5) return value;
  // Basic grouping for readability
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}

function normalizePhoneToWhatsApp(value: string) {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("62")) return digits;
  return digits;
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
  if (status === "critical") return "critical";
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
  const [detailMode, setDetailMode] = useState<DetailMode>("overview");
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
  const [showAuditLog, setShowAuditLog] = useState(false);
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
  const [density, setDensity] = useState<"compact" | "spacious">("spacious");
  const [filters, setFilters] = useState<Filters>(() => {
    if (typeof window === "undefined") {
      return { 
        search: "", service: "", location: "", reviewStatus: "", classification: "",
        sortKey: "date", sortOrder: "desc", showOnlyNew: false 
      };
    }
    const currentView = new URLSearchParams(window.location.search).get("view") || "all_vendors";
    const saved = savedFilters[currentView] ?? { 
      search: "", service: "", location: "", reviewStatus: "", classification: "",
      sortKey: "date", sortOrder: "desc", showOnlyNew: false 
    };
    return saved;
  });

const matchesFilters = useCallback((vendor: VendorSummary, currentFilters: Filters) => {
    const keyword = currentFilters.search.trim().toLowerCase();

    if (keyword) {
      const detail = dashboard.vendorDetails.find((d: VendorDetail) => d.id === vendor.id);
      const picInfo = detail ? `${detail.contacts[0]?.name || ""} ${detail.contacts[0]?.phone || ""}` : "";
      const searchStr = `${vendor.name} ${vendor.email} ${vendor.serviceNames.join(" ")} ${vendor.businessAddress || ""} ${picInfo}`.toLowerCase();

      if (!searchStr.includes(keyword)) {
        return false;
      }
    }

    if (currentFilters.service && !vendor.serviceNames.includes(currentFilters.service)) {
      return false;
    }

    if (currentFilters.location && !vendor.businessAddress?.toLowerCase().includes(currentFilters.location.toLowerCase())) {
      return false;
    }

    if (currentFilters.reviewStatus && vendor.reviewStatus !== currentFilters.reviewStatus) {
      return false;
    }

    if (currentFilters.classification && vendor.classification !== currentFilters.classification) {
      return false;
    }

    if (currentFilters.showOnlyNew && !isRecent(vendor.sourceTimestamp)) {
      return false;
    }

    return true;
  }, [dashboard.vendorDetails]);

  const filteredVendors = useMemo(() => {
    const list = dashboard.vendors.filter((vendor) => matchesFilters(vendor, filters));
    
    return list.sort((a, b) => {
      const order = filters.sortOrder === "asc" ? 1 : -1;
      
      switch (filters.sortKey) {
        case "name":
          return a.name.localeCompare(b.name) * order;
        case "date": {
          const dA = new Date(a.sourceTimestamp || 0).getTime();
          const dB = new Date(b.sourceTimestamp || 0).getTime();
          return (dA - dB) * order;
        }
        case "status":
          return a.reviewStatus.localeCompare(b.reviewStatus) * order;
        case "score":
          return (vendorScore(a) - vendorScore(b)) * order;
        default:
          return 0;
      }
    });
  }, [dashboard.vendors, filters, matchesFilters]);
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

  const toggleSort = (key: SortKey) => {
    setFilters(curr => ({
      ...curr,
      sortKey: key,
      sortOrder: curr.sortKey === key && curr.sortOrder === "desc" ? "asc" : "desc"
    }));
  };

  const renderSortIcon = (key: SortKey) => {
    if (filters.sortKey !== key) return null;
    return filters.sortOrder === "asc" ? " ↑" : " ↓";
  };

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
    setDetailMode("overview");
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
          icon={<Users size={18} />} 
        />
        <SummaryCard 
          label="Penyedia Jasa" 
          value={String(vendorSummary.jasaCount)} 
          description="Service providers"
          icon={<Wrench size={18} />} 
        />
        <SummaryCard 
          label="Penyedia Barang" 
          value={String(vendorSummary.barangCount)} 
          description="Equipment/Goods"
          icon={<Package size={18} />} 
        />
        <SummaryCard 
          label="Approved" 
          value={String(vendorSummary.approved)} 
          description="Verified and ready"
          icon={<CheckCircle size={18} />} 
        />
        <SummaryCard 
          label="Top Rated" 
          value={String(vendorSummary.highPerformance)} 
          description="Score >= 4.5"
          icon={<Star size={18} />} 
        />
      </div>
      <div className="unified-toolbar" style={{ position: 'relative' }}>
        <div className="database-tabs" style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
          {VIEW_ORDER.map((item) => (
            <button
              key={item.id}
              className={`chip ${view === item.id ? "active" : ""}`}
              onClick={() => setView(item.id)}
              type="button"
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
            >
              <span style={{ marginRight: '6px', display: 'flex', alignItems: 'center' }}>{VIEW_ICONS[item.id]}</span>
              {VIEW_TITLES[item.id]}
            </button>
          ))}
        </div>

        <div className="toolbar-divider"></div>

        <div className="search-wrapper">
          <input
            value={filters.search}
            placeholder="Search vendor..."
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
          />
          <span className="search-icon" style={{ display: 'flex', alignItems: 'center' }}><Search size={14} /></span>
        </div>

        <div className="toolbar-divider"></div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <select
            className="filter-select"
            value={filters.classification}
            onChange={(event) => setFilters((current) => ({ ...current, classification: event.target.value }))}
            style={{ fontSize: '0.7rem' }}
          >
            <option value="">Classification</option>
            <option value="Penyedia Jasa">Jasa</option>
            <option value="Penyedia Barang">Barang</option>
          </select>
          <select
            className="filter-select"
            value={filters.service}
            onChange={(event) => setFilters((current) => ({ ...current, service: event.target.value }))}
            style={{ fontSize: '0.7rem', maxWidth: '100px' }}
          >
            <option value="">Services</option>
            {dashboard.services.map((service) => (
              <option key={service} value={service}>{service}</option>
            ))}
          </select>
          <button 
            className={`ghost-button ${showAdvanced ? "active-ghost" : ""}`} 
            onClick={() => setShowAdvanced((current) => !current)}
            style={{ fontSize: '0.7rem', padding: '0 8px', height: '26px', borderRadius: '6px' }}
          >
            Options
          </button>
        </div>

        <div className="toolbar-divider"></div>

        <div className="workspace-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ textAlign: 'right', marginRight: '4px' }}>
            <div style={{ fontSize: '0.65rem', opacity: 0.5, fontWeight: 700, lineHeight: 1 }}>{activeListCount}</div>
            <div style={{ fontSize: '0.55rem', opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Items</div>
          </div>
          <button 
            className={`ghost-button ${filters.showOnlyNew ? "active-ghost" : ""}`} 
            onClick={() => setFilters(curr => ({ ...curr, showOnlyNew: !curr.showOnlyNew }))}
            style={{ fontSize: '0.7rem', borderRadius: '8px', padding: '0 10px', height: '28px' }}
          >
            🆕 Baru
          </button>
          <button className="primary-button" style={{ borderRadius: '8px', height: '28px', fontSize: '0.7rem', padding: '0 12px' }} onClick={() => {/* TODO: Add Vendor Logic */}} type="button">
            + New
          </button>
        </div>

        {showAdvanced && (
          <div className="advanced-panel" style={{ position: 'absolute', top: '100%', right: '16px', marginTop: '8px', padding: '16px', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '12px', display: 'flex', gap: '16px', alignItems: 'center', zIndex: 100, boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
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
            <div className="density-toggle" style={{ display: 'flex', background: 'var(--panel-soft)', padding: '2px', borderRadius: '6px', border: '1px solid var(--line)' }}>
              <button 
                onClick={() => setDensity("compact")} 
                style={{ padding: '2px 8px', fontSize: '0.7rem', borderRadius: '4px', border: 'none', cursor: 'pointer', background: density === "compact" ? "var(--panel)" : "transparent", color: density === "compact" ? "var(--text)" : "var(--muted)" }}
              >
                Compact
              </button>
              <button 
                onClick={() => setDensity("spacious")} 
                style={{ padding: '2px 8px', fontSize: '0.7rem', borderRadius: '4px', border: 'none', cursor: 'pointer', background: density === "spacious" ? "var(--panel)" : "transparent", color: density === "spacious" ? "var(--text)" : "var(--muted)" }}
              >
                Normal
              </button>
            </div>
            <div className="saved-filter-buttons" style={{ display: 'flex', gap: '8px' }}>
              <button className="ghost-button" style={{ fontSize: '0.75rem' }} onClick={() => saveCurrentFilter("slot1")}>Save Filter</button>
              <button className="ghost-button" style={{ fontSize: '0.75rem' }} onClick={handleExportFiltered}>Export CSV</button>
            </div>
          </div>
        )}
      </div>

      {(view === "all_vendors" || view === "sync_log" || view === "outbox") && (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', marginTop: '16px' }}>
          <div className={`notion-list ${isVendorListView ? "vendor-list-view" : ""}`} style={{ width: '100%', flex: 1, overflow: 'auto' }}>
            
            {view === "all_vendors" && (
              <div className="finder-sort-header">
                <div style={{ width: '56px' }}></div> {/* Checkbox spacer */}
                <button 
                  onClick={() => toggleSort('name')} 
                  className={`sort-column ${filters.sortKey === 'name' ? 'active' : ''}`}
                  style={{ flex: 1 }}
                >
                  Nama Vendor {renderSortIcon('name')}
                </button>
                <button 
                  onClick={() => toggleSort('status')} 
                  className={`sort-column ${filters.sortKey === 'status' ? 'active' : ''}`}
                  style={{ width: '120px' }}
                >
                  Status {renderSortIcon('status')}
                </button>
                <button 
                  onClick={() => toggleSort('date')} 
                  className={`sort-column ${filters.sortKey === 'date' ? 'active' : ''}`}
                  style={{ width: '140px' }}
                >
                  Tanggal Daftar {renderSortIcon('date')}
                </button>
                <button 
                  onClick={() => toggleSort('score')} 
                  className={`sort-column ${filters.sortKey === 'score' ? 'active' : ''}`}
                  style={{ width: '60px', textAlign: 'right', paddingRight: '12px' }}
                >
                  Score {renderSortIcon('score')}
                </button>
              </div>
            )}

            <div className="notion-items">
              {view === "all_vendors" &&
                filteredVendors.map((vendor) => (
                  <button
                    className={`notion-item project-card ${selectedVendorId === vendor.id ? "active" : ""} ${density === "compact" ? "density-compact" : ""}`}
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <em className="eyebrow">{primaryType(vendor)}</em>
                            {isRecent(vendor.sourceTimestamp) && (
                              <span className="badge-new-pulsing">BARU</span>
                            )}
                          </div>
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
                        {vendor.businessAddress && (
                          <span className="text-dim" title={vendor.businessAddress}>
                            · {truncateText(vendor.businessAddress, 25)}
                          </span>
                        )}
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
          
          {isDrawerOpen && selectedVendor && (
            <div className="detail-modal-backdrop" onClick={() => setIsDrawerOpen(false)}>
              <div className="panel detail-panel detail-modal-card" onClick={(event) => event.stopPropagation()}>
                <div className="detail-head">
                  <div>
                    <p className="panel-kicker">{primaryType(selectedVendor)}</p>
                    <h2>{formatVendorName(selectedVendor.name)}</h2>
                    <p className="detail-client">{selectedVendor.classification} · Score {vendorScore(selectedVendor)}</p>
                  </div>
                  <div className="action-row">
                    <div className={`status-pill tone-${statusTone(selectedVendor.reviewStatus)}`}>
                      {reviewStatusLabel(locale, selectedVendor.reviewStatus)}
                    </div>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => {
                        setEditVendorFormData(selectedVendor);
                        setIsEditVendorModalOpen(true);
                      }}
                    >
                      Edit Vendor
                    </button>
                    <button type="button" className="ghost-button" onClick={() => setIsDrawerOpen(false)}>
                      Close
                    </button>
                  </div>
                </div>

                <div className="detail-tabs">
                  <button 
                    className={`detail-tab-item ${detailMode === "overview" ? "is-active" : ""}`}
                    onClick={() => setDetailMode("overview")}
                  >
                    <span>👤</span> Profile
                  </button>
                  <button 
                    className={`detail-tab-item ${detailMode === "finance" ? "is-active" : ""}`}
                    onClick={() => setDetailMode("finance")}
                  >
                    <span>🏦</span> Finance
                  </button>
                  <button 
                    className={`detail-tab-item ${detailMode === "docs" ? "is-active" : ""}`}
                    onClick={() => setDetailMode("docs")}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', marginRight: '8px' }}><Files size={14} /></span> Docs
                  </button>
                  <button 
                    className={`detail-tab-item ${detailMode === "ops" ? "is-active" : ""}`}
                    onClick={() => setDetailMode("ops")}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', marginRight: '8px' }}><Settings size={14} /></span> Operations
                  </button>
                  <button 
                    className={`detail-tab-item ${detailMode === "audit" ? "is-active" : ""}`}
                    onClick={() => setDetailMode("audit")}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', marginRight: '8px' }}><History size={14} /></span> Audit
                  </button>
                </div>

                <div className="detail-body-paginated">
                  {detailMode === "overview" && (
                    <div className="tab-content-fade">
                      <section className="detail-card">
                        <div className="detail-card-header">
                          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><User size={18} /> Kontak & Identitas</h3>
                        </div>
                        <div className="detail-card-content">
                          <div className="detail-row">
                            <span className="detail-label">Nama PIC</span>
                            <span className="detail-value">{selectedVendor.contacts?.[0]?.name || "-"}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">WhatsApp PIC</span>
                            <span className="detail-value">
                              {selectedVendor.contacts?.[0]?.phone ? (
                                <a href={`https://wa.me/${normalizePhoneToWhatsApp(selectedVendor.contacts[0].phone)}`} target="_blank" rel="noreferrer" style={{ color: 'var(--green)', fontWeight: 700 }}>
                                  {selectedVendor.contacts[0].phone}
                                </a>
                              ) : "-"}
                            </span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Business Email</span>
                            <span className="detail-value">{selectedVendor.email || "-"}</span>
                          </div>
                          <div className="detail-row" style={{ borderBottom: 'none', paddingTop: '12px' }}>
                            <div style={{ width: '100%' }}>
                              <span className="detail-label" style={{ marginBottom: '8px', display: 'block' }}>Alamat Usaha</span>
                              <p style={{ margin: 0, fontSize: '0.8rem', lineHeight: 1.5, color: 'var(--muted)' }}>{selectedVendor.businessAddress || "-"}</p>
                            </div>
                          </div>
                        </div>
                      </section>
                      <section className="detail-card" style={{ marginTop: '16px' }}>
                        <div className="detail-card-header">
                          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><BarChart3 size={18} /> Klasifikasi</h3>
                        </div>
                        <div className="detail-card-content">
                          <div className="detail-row">
                            <span className="detail-label">Tipe Bisnis</span>
                            <span className={`category-pill tone-${classificationTone(selectedVendor.classification)}`}>
                              {classificationLabel(selectedVendor.classification)}
                            </span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Registration Date</span>
                            <span className="detail-value">{formatDate(selectedVendor.sourceTimestamp, locale)}</span>
                          </div>
                        </div>
                      </section>
                    </div>
                  )}

                  {detailMode === "finance" && (
                    <div className="tab-content-fade">
                      {selectedVendor.bankName || selectedVendor.bankAccountNumber ? (
                        <div className="banking-gradient-card">
                          <div className="banking-header">
                            <Landmark size={20} color="rgba(255,255,255,0.6)" />
                            <span>PERBANKAN VENDOR</span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.25fr', gap: '20px' }}>
                            <div>
                              <span style={{ display: 'block', fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' }}>BANK</span>
                              <strong style={{ fontSize: '1.1rem', color: '#fff', letterSpacing: '-0.01em' }}>{selectedVendor.bankName || "-"}</strong>
                            </div>
                            <div>
                              <span style={{ display: 'block', fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' }}>NO. REKENING</span>
                              <strong style={{ fontSize: '1.1rem', color: 'var(--blue)', fontFamily: 'var(--font-mono)' }}>{formatBankAccount(selectedVendor.bankAccountNumber!)}</strong>
                            </div>
                          </div>
                          <div style={{ marginTop: '18px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            <span style={{ display: 'block', fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' }}>ATAS NAMA REKENING</span>
                            <strong style={{ fontSize: '0.94rem', color: '#fff' }}>{selectedVendor.bankAccountHolder || "-"}</strong>
                          </div>
                        </div>
                      ) : (
                        <div className="detail-card" style={{ padding: '24px', textAlign: 'center', opacity: 0.5 }}>
                          <p style={{ margin: 0, fontSize: '0.8rem' }}>Data rekening belum tersedia</p>
                        </div>
                      )}

                      <section className="detail-card" style={{ marginTop: '24px' }}>
                        <div className="detail-card-header">
                          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Gavel size={18} /> Legal & Pajak</h3>
                        </div>
                        <div className="detail-card-content">
                          <div className="detail-row">
                            <span className="detail-label">Status Pajak</span>
                            <span className={`status-pill tone-${selectedVendor.taxStatus === "PKP" ? "green" : "amber"}`}>
                              {selectedVendor.taxStatus}
                            </span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Legalitas Utama</span>
                            <span className="detail-value">{selectedVendor.legalStatus}</span>
                          </div>
                          <div className="detail-row" style={{ borderBottom: 'none', paddingTop: '12px' }}>
                            <span className="detail-label">NPWP (Tax ID)</span>
                            <span className="detail-value mono" style={{ fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
                              {formatNPWP(selectedVendor.npwpNumber!)}
                            </span>
                          </div>
                        </div>
                      </section>
                    </div>
                  )}

                  {detailMode === "docs" && (
                    <div className="tab-content-fade">
                      <section className="detail-card">
                        <div className="detail-card-header">
                          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Files size={18} /> Dokumen & Compliance</h3>
                          <span className={`status-pill tone-${complianceTone(selectedVendor.compliance.status)}`}>
                            {selectedVendor.compliance.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="detail-card-content">
                          {selectedVendor.documentsFolderUrl ? (
                            <div style={{ marginBottom: '24px' }}>
                              <a href={selectedVendor.documentsFolderUrl} target="_blank" rel="noreferrer" className="primary-button" style={{ width: '100%', borderRadius: '12px', justifyContent: 'center', height: '42px', fontWeight: 600 }}>
                                <FolderOpen size={16} style={{ marginRight: '8px' }} /> Buka Folder Dokumen
                              </a>
                            </div>
                          ) : (
                            <div style={{ marginBottom: '24px', padding: '16px', border: '1px dashed var(--line-strong)', borderRadius: '12px', textAlign: 'center' }}>
                              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted)' }}>Link folder dokumen belum diatur.</p>
                            </div>
                          )}

                          <div className="detail-block">
                            <p className="mini-meta" style={{ marginBottom: '16px' }}>Detail Checklist Dokumen:</p>
                            <div className="task-stack compact-task-stack">
                              {selectedVendor.compliance.items.map((item) => (
                                <div key={item.documentType} className="task-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '0.85rem' }}>{documentTypeLabel(item.documentType)}</span>
                                  </div>
                                  <span className={`status-pill tone-${complianceItemTone(item.status)}`} style={{ fontSize: '0.65rem' }}>
                                    {item.status.toUpperCase()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </section>
                    </div>
                  )}

                  {detailMode === "ops" && (
                    <div className="tab-content-fade">
                      <section className="detail-card">
                        <div className="detail-card-header">
                          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><TrendingUp size={18} /> Performance & Rating</h3>
                          <button 
                            className="primary-button" 
                            onClick={handleScorecardSave} 
                            disabled={opsPending} 
                            style={{ fontSize: '0.65rem', padding: '4px 10px', height: 'auto', borderRadius: '6px' }}
                          >
                            {opsPending ? "..." : "Save Scores"}
                          </button>
                        </div>
                        <div className="detail-card-content">
                          <div className="scorecard-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div className="score-input">
                              <label style={{ fontSize: '0.72rem', color: 'var(--muted-soft)', display: 'block', marginBottom: '4px' }}>Quality</label>
                              <input type="number" min="1" max="5" value={scorecard.quality} onChange={e => setScorecard(s => ({ ...s, quality: e.target.value }))} style={{ width: '100%', background: 'var(--panel-soft)', border: '1px solid var(--line)', borderRadius: '6px', padding: '6px' }} />
                            </div>
                            <div className="score-input">
                              <label style={{ fontSize: '0.72rem', color: 'var(--muted-soft)', display: 'block', marginBottom: '4px' }}>Reliability</label>
                              <input type="number" min="1" max="5" value={scorecard.reliability} onChange={e => setScorecard(s => ({ ...s, reliability: e.target.value }))} style={{ width: '100%', background: 'var(--panel-soft)', border: '1px solid var(--line)', borderRadius: '6px', padding: '6px' }} />
                            </div>
                            <div className="score-input">
                              <label style={{ fontSize: '0.72rem', color: 'var(--muted-soft)', display: 'block', marginBottom: '4px' }}>Pricing</label>
                              <input type="number" min="1" max="5" value={scorecard.pricing} onChange={e => setScorecard(s => ({ ...s, pricing: e.target.value }))} style={{ width: '100%', background: 'var(--panel-soft)', border: '1px solid var(--line)', borderRadius: '6px', padding: '6px' }} />
                            </div>
                            <div className="score-input">
                              <label style={{ fontSize: '0.72rem', color: 'var(--muted-soft)', display: 'block', marginBottom: '4px' }}>Communication</label>
                              <input type="number" min="1" max="5" value={scorecard.communication} onChange={e => setScorecard(s => ({ ...s, communication: e.target.value }))} style={{ width: '100%', background: 'var(--panel-soft)', border: '1px solid var(--line)', borderRadius: '6px', padding: '6px' }} />
                            </div>
                          </div>
                        </div>
                      </section>
                      
                      <section className="detail-card" style={{ marginTop: '16px' }}>
                        <div className="detail-card-header">
                          <h3>📋 Review Status</h3>
                        </div>
                        <div className="detail-card-content">
                          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                            <select 
                              value={reviewStatus} 
                              onChange={(event) => setReviewStatus(event.target.value as ReviewStatus)} 
                              style={{ flex: 1, background: 'var(--panel-soft)', border: '1px solid var(--line)', borderRadius: '8px', padding: '8px', fontSize: '0.8rem' }}
                            >
                              {REVIEW_STATUSES.map((status) => (
                                <option key={status} value={status}>{reviewStatusLabel(locale, status)}</option>
                              ))}
                            </select>
                            <button className="primary-button" onClick={handleReviewSave} disabled={reviewPending} style={{ borderRadius: '8px' }}>
                              {reviewPending ? "..." : "Update"}
                            </button>
                          </div>
                          <textarea 
                            value={reviewNote} 
                            onChange={(event) => setReviewNote(event.target.value)} 
                            placeholder="Tinggalkan catatan review internal..." 
                            style={{ width: '100%', minHeight: '80px', background: 'var(--panel-soft)', border: '1px solid var(--line)', borderRadius: '8px', padding: '12px', fontSize: '0.82rem' }}
                          />
                        </div>
                      </section>

                      <section className="detail-card" style={{ marginTop: '16px' }}>
                        <div className="detail-card-header">
                          <h3>📒 Internal Notes & Capacity</h3>
                          <button className="ghost-button" onClick={handleOpsProfileSave} disabled={opsPending} style={{ fontSize: '0.65rem', padding: '4px 10px', height: 'auto' }}>
                            {opsPending ? "..." : "Save"}
                          </button>
                        </div>
                        <div className="detail-card-content">
                          <label style={{ fontSize: '0.72rem', color: 'var(--muted-soft)', display: 'block', marginBottom: '4px' }}>Availability Details</label>
                          <textarea value={availabilityNotes} onChange={e => setAvailabilityNotes(e.target.value)} placeholder="e.g. Tidak tersedia di bulan Agustus..." style={{ width: '100%', minHeight: '60px', background: 'var(--panel-soft)', border: '1px solid var(--line)', borderRadius: '8px', padding: '10px', fontSize: '0.82rem', marginBottom: '12px' }} />
                          
                          <label style={{ fontSize: '0.72rem', color: 'var(--muted-soft)', display: 'block', marginBottom: '4px' }}>Pricing Insight</label>
                          <textarea value={rateCardNotes} onChange={e => setRateCardNotes(e.target.value)} placeholder="e.g. Harga spesial untuk repeat order..." style={{ width: '100%', minHeight: '60px', background: 'var(--panel-soft)', border: '1px solid var(--line)', borderRadius: '8px', padding: '10px', fontSize: '0.82rem' }} />
                        </div>
                      </section>
                    </div>
                  )}

                  {detailMode === "audit" && (
                    <div className="tab-content-fade">
                      <section className="detail-card">
                        <div className="detail-card-header">
                          <h3>📝 Audit Trail</h3>
                        </div>
                        <div className="detail-card-content">
                          <div className="audit-list" style={{ display: 'grid', gap: '12px' }}>
                            {selectedVendor.auditLog.map((entry) => (
                              <div key={entry.id} style={{ padding: '10px', background: 'var(--panel-soft)', borderRadius: '8px', fontSize: '0.75rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                  <strong>{entry.action}</strong>
                                  <span style={{ color: 'var(--muted-soft)' }}>{formatDate(entry.createdAt, locale)}</span>
                                </div>
                                <p style={{ margin: 0, color: 'var(--muted)' }}>{entry.message}</p>
                                <small style={{ marginTop: '4px', display: 'block', opacity: 0.6 }}>Oleh: {entry.actor}</small>
                              </div>
                            ))}
                          </div>
                        </div>
                      </section>

                      {socialLinks.length > 0 && (
                        <section className="detail-card" style={{ marginTop: '16px' }}>
                          <div className="detail-card-header">
                            <h3>🌐 Social Media & Links</h3>
                          </div>
                          <div className="detail-card-content">
                            <div className="notion-links">
                              {socialLinks.map((item) => (
                                <a href={item.url} key={item.label} rel="noreferrer" target="_blank" className="detail-row" style={{ textDecoration: 'none' }}>
                                  <span className="detail-label">{item.label}</span>
                                  <strong className="detail-value" style={{ color: 'var(--blue)' }}>{shortLinkLabel(item.url)}</strong>
                                </a>
                              ))}
                            </div>
                          </div>
                        </section>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
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
                      {vendor.businessAddress || "No address data"}
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
                      {vendor.businessAddress || "No address data"}
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
                    value={editVendorFormData.businessAddress || ''} 
                    onChange={(e) => setEditVendorFormData({ ...editVendorFormData, businessAddress: e.target.value })} 
                    placeholder="e.g. Nasional, Jakarta, etc." 
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '20px' }}>
                <label className="eyebrow" style={{ display: 'block', marginBottom: '6px' }}>Business Address</label>
                <textarea 
                  className="control-bar-input" 
                  style={{ width: '100%', minHeight: '60px' }}
                  value={editVendorFormData.businessAddress || ''} 
                  onChange={(e) => setEditVendorFormData({ ...editVendorFormData, businessAddress: e.target.value })} 
                />
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

              <div className="form-group" style={{ marginTop: '20px' }}>
                <label className="eyebrow" style={{ display: 'block', marginBottom: '6px' }}>Documents Folder Link</label>
                <input 
                  className="control-bar-input" 
                  style={{ width: '100%' }}
                  value={editVendorFormData.documentsFolderUrl || ''} 
                  onChange={(e) => setEditVendorFormData({ ...editVendorFormData, documentsFolderUrl: e.target.value })} 
                  placeholder="https://drive.google.com/..." 
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
