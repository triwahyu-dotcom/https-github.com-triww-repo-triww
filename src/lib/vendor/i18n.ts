import { ReviewStatus } from "@/lib/vendor/types";

export type Locale = "id" | "en";

type Dictionary = {
  [key: string]: {
    id: string;
    en: string;
  };
};

export const dictionary: Dictionary = {
  appTitle: {
    id: "Vendor Management System",
    en: "Vendor Management System",
  },
  appSubtitle: {
    id: "Dashboard onboarding vendor untuk event organizer",
    en: "Vendor onboarding dashboard for event organizers",
  },
  sourceStatusReady: {
    id: "Sumber spreadsheet terhubung",
    en: "Spreadsheet source connected",
  },
  sourceStatusMissing: {
    id: "Sumber spreadsheet tidak ditemukan",
    en: "Spreadsheet source not found",
  },
  syncNow: {
    id: "Sinkronkan sekarang",
    en: "Sync now",
  },
  vendors: {
    id: "Vendor",
    en: "Vendors",
  },
  reviewQueue: {
    id: "Antrian review",
    en: "Review queue",
  },
  syncLog: {
    id: "Riwayat sinkronisasi",
    en: "Sync log",
  },
  search: {
    id: "Cari vendor atau email",
    en: "Search vendors or email",
  },
  service: {
    id: "Layanan",
    en: "Service",
  },
  location: {
    id: "Lokasi",
    en: "Location",
  },
  legalStatus: {
    id: "Legalitas",
    en: "Legal status",
  },
  reviewStatus: {
    id: "Status review",
    en: "Review status",
  },
  completeness: {
    id: "Kelengkapan dokumen",
    en: "Document completeness",
  },
  all: {
    id: "Semua",
    en: "All",
  },
  selectVendor: {
    id: "Pilih vendor untuk melihat detail.",
    en: "Select a vendor to view details.",
  },
  contact: {
    id: "PIC",
    en: "Contact",
  },
  documents: {
    id: "Dokumen",
    en: "Documents",
  },
  rawData: {
    id: "Data sumber",
    en: "Source data",
  },
  reviewNotes: {
    id: "Catatan review",
    en: "Review notes",
  },
  saveReview: {
    id: "Simpan review",
    en: "Save review",
  },
  noRuns: {
    id: "Belum ada riwayat sinkronisasi.",
    en: "No sync runs yet.",
  },
  updatedAt: {
    id: "Diperbarui",
    en: "Updated",
  },
  source: {
    id: "Sumber",
    en: "Source",
  },
  missing: {
    id: "Kurang",
    en: "Missing",
  },
  complete: {
    id: "Lengkap",
    en: "Complete",
  },
  synced: {
    id: "Tersinkron",
    en: "Synced",
  },
  view: {
    id: "Tampilan",
    en: "View",
  },
  overview: {
    id: "Overview",
    en: "Overview",
  },
  table: {
    id: "Tabel",
    en: "Table",
  },
  board: {
    id: "Board",
    en: "Board",
  },
  openLink: {
    id: "Buka link",
    en: "Open link",
  },
  rawLink: {
    id: "Link sumber",
    en: "Source link",
  },
  noData: {
    id: "Belum ada data.",
    en: "No data yet.",
  },
  services: {
    id: "Layanan vendor",
    en: "Vendor services",
  },
};

const reviewStatusLabels: Record<ReviewStatus, { id: string; en: string }> = {
  new: { id: "Baru", en: "New" },
  in_review: { id: "Sedang direview", en: "In review" },
  approved: { id: "Disetujui", en: "Approved" },
  rejected: { id: "Ditolak", en: "Rejected" },
  needs_revision: { id: "Perlu revisi", en: "Needs revision" },
};

export function t(locale: Locale, key: keyof typeof dictionary) {
  return dictionary[key][locale];
}

export function reviewStatusLabel(locale: Locale, status: ReviewStatus) {
  return reviewStatusLabels[status][locale];
}
