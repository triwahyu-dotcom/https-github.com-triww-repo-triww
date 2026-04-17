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
  // Registration Portal
  businessIdentity: { id: "Identitas Bisnis", en: "Business Identity" },
  vendorName: { id: "Nama Vendor", en: "Vendor Name" },
  businessEmail: { id: "Email Bisnis", en: "Business Email" },
  servicesOffered: { id: "Layanan yang Ditawarkan", en: "Services Offered" },
  servicesPlaceholder: { id: "cth. Dekorasi Panggung, Sound System, Katering", en: "e.g. Stage Decoration, Sound System, Catering" },
  legalStatus: { id: "Status Legal", en: "Legal Status" },
  taxStatus: { id: "Status Pajak", en: "Tax Status" },
  coverageArea: { id: "Area Layanan", en: "Coverage Area" },
  businessAddress: { id: "Alamat Usaha", en: "Business Address" },
  bankName: { id: "Nama Bank", en: "Bank Name" },
  bankAccountNumber: { id: "Nomor Rekening", en: "Account Number" },
  bankAccountHolder: { id: "Nama Pemilik Rekening", en: "Account Holder" },
  npwpNumber: { id: "Nomor NPWP", en: "NPWP Number" },
  onlinePresence: { id: "Kehadiran Online", en: "Online Presence" },
  website: { id: "Situs Web", en: "Website" },
  primaryContact: { id: "Kontak Utama", en: "Primary Contact" },
  picName: { id: "Nama PIC", en: "PIC Name" },
  picTitle: { id: "Jabatan PIC", en: "PIC Title" },
  picPhone: { id: "No. WA PIC", en: "PIC Phone / WhatsApp" },
  picEmail: { id: "Email PIC", en: "PIC Email" },
  documentsAndLinks: { id: "Dokumen & Link", en: "Documents & Links" },
  documentsFolderUrl: { id: "Link Folder Dokumen (Drive/Dropbox)", en: "Document Folder Link (Drive/Dropbox)" },
  documentsFolderHint: { id: "Masukkan satu link folder yang berisi: Company Profile, Katalog, Scan NPWP, KTP Pemilik, NIB, Contoh Invoice, dan NDA/Non-PKP.", en: "Provide one folder link containing: Company Profile, Catalog, NPWP Scan, Owner KTP, NIB, Invoice Sample, and NDA/Non-PKP." },
  downloadTemplates: { id: "Unduh Template Dokumen", en: "Download Document Templates" },
  downloadNDA: { id: "Unduh Template NDA", en: "Download NDA Template" },
  downloadNonPKP: { id: "Unduh Template Non-PKP", en: "Download Non-PKP Statement" },
  submitVendorProfile: { id: "Daftarkan Vendor", en: "Create Vendor Profile" },
  updateVendorProfile: { id: "Perbarui Profil", en: "Update Profile" },
  submitting: { id: "Sedang Mengirim...", en: "Submitting..." },
  registrationCode: { id: "KODE PENDAFTARAN ANDA", en: "YOUR REGISTRATION CODE" },
  successNew: { id: "Data berhasil dikirim. Tim admin kami akan meninjau profil Anda.", en: "Submission sent successfully. Our admin team will review your vendor profile." },
  successRevision: { id: "Revisi berhasil dikirim. Tim admin kami akan meninjau data terbaru.", en: "Revision submitted successfully. Our admin team will review the updated data." },
  itemsToRevise: { id: "Item yang perlu direvisi", en: "Items to revise" },
  revisionProgress: { id: "Progres Revisi", en: "Revision Progress" },
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
