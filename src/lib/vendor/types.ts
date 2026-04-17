export type ReviewStatus =
  | "new"
  | "in_review"
  | "approved"
  | "rejected"
  | "needs_revision";

export type VendorLifecycleStatus =
  | "submitted"
  | "screening"
  | "verified"
  | "approved"
  | "blacklisted"
  | "inactive";

export type VendorClassification = "Penyedia Jasa" | "Penyedia Barang" | "Talent/Manpower" | "Unknown";

export type LegalStatus = "PT/CV" | "Freelance/Perorangan" | "Lainnya" | "Unknown";
export type TaxStatus = "PKP" | "Non-PKP" | "Unknown";

export type DocumentType =
  | "company_profile"
  | "catalog"
  | "npwp_scan"
  | "owner_ktp"
  | "nib"
  | "invoice_sample"
  | "pkp_certificate"
  | "nda"
  | "pic_ktp";

export interface Vendor {
  id: string;
  vendorKey: string;
  name: string;
  portalUsername: string;
  emailVerifiedAt: string;
  phoneVerifiedAt: string;
  displayType: string;
  classification: VendorClassification;
  legalStatus: LegalStatus;
  taxStatus: TaxStatus;
  email: string;
  businessAddress: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  npwpNumber: string;
  websiteUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  linkedinUrl: string;
  documentsFolderUrl: string;
  sourceTimestamp: string;
  sourceRowHash: string;
  rawSource: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface VendorContact {
  id: string;
  vendorId: string;
  name: string;
  title: string;
  phone: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface VendorService {
  id: string;
  vendorId: string;
  name: string;
}

export interface VendorDocument {
  id: string;
  vendorId: string;
  type: DocumentType;
  label: string;
  url: string;
  isRequired: boolean;
  isVerified: boolean;
}

export interface VendorReview {
  id: string;
  vendorId: string;
  status: ReviewStatus;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface ImportSourceRow {
  id: string;
  vendorId: string;
  rowHash: string;
  rowNumber: number;
  sourceTimestamp: string;
  importedAt: string;
  rawSource: Record<string, string>;
}

export interface ImportRun {
  id: string;
  sourceLabel: string;
  startedAt: string;
  finishedAt: string;
  createdVendors: number;
  updatedVendors: number;
  skippedRows: number;
  errorCount: number;
  errorMessages: string[];
}

export interface VendorState {
  vendors: Vendor[];
  vendorContacts: VendorContact[];
  vendorServices: VendorService[];
  vendorDocuments: VendorDocument[];
  vendorReviews: VendorReview[];
  importRuns: ImportRun[];
  importSourceRows: ImportSourceRow[];
}

export interface VendorScorecard {
  id: string;
  vendorId: string;
  projectId: string;
  quality: number;
  reliability: number;
  pricing: number;
  communication: number;
  onTime: number;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface VendorComplianceItem {
  id: string;
  vendorId: string;
  documentType: DocumentType;
  status: "valid" | "expiring" | "expired" | "missing";
  expiresAt: string;
  note: string;
  updatedAt: string;
}

export interface VendorOpsProfile {
  vendorId: string;
  registrationCode: string;
  lifecycleStatus: VendorLifecycleStatus;
  rateCardNotes: string;
  availabilityNotes: string;
  cities: string[];
  accountManager: string;
  emailNotifications: boolean;
  whatsappNotifications: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VendorAuditEntry {
  id: string;
  vendorId: string;
  action: string;
  actor: string;
  message: string;
  createdAt: string;
}

export interface VendorRevisionItem {
  id: string;
  fieldKey: string;
  label: string;
  note: string;
  section: "identity" | "contact" | "documents" | "finance" | "services";
}

export interface VendorRevisionRequest {
  id: string;
  vendorId: string;
  status: "open" | "resolved";
  generalNote: string;
  items: VendorRevisionItem[];
  editToken: string;
  editTokenExpiresAt: string;
  createdAt: string;
  resolvedAt: string;
}

export interface VendorNotification {
  id: string;
  vendorId: string;
  audience: "admin" | "vendor";
  channel: "email" | "whatsapp";
  subject: string;
  message: string;
  recipient: string;
  createdAt: string;
}

export interface VendorPortalAccessToken {
  id: string;
  vendorId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
  lastAccessedAt: string;
}

export interface VendorOpsState {
  profiles: VendorOpsProfile[];
  scorecards: VendorScorecard[];
  compliance: VendorComplianceItem[];
  auditLog: VendorAuditEntry[];
  revisionRequests: VendorRevisionRequest[];
  notifications: VendorNotification[];
  portalAccessTokens: VendorPortalAccessToken[];
}

export interface VendorPerformanceSummary {
  average: number;
  quality: number;
  reliability: number;
  pricing: number;
  communication: number;
  onTime: number;
  totalReviews: number;
}

export interface VendorComplianceSummary {
  status: "ok" | "attention" | "critical";
  expiredCount: number;
  expiringCount: number;
  missingCount: number;
  nextExpiry: string;
  items: VendorComplianceItem[];
}

export interface VendorSummary {
  id: string;
  name: string;
  portalUsername: string;
  registrationCode: string;
  emailVerifiedAt: string;
  phoneVerifiedAt: string;
  legalStatus: LegalStatus;
  taxStatus: TaxStatus;
  businessAddress: string;
  email: string;
  classification: VendorClassification;
  serviceNames: string[];
  reviewStatus: ReviewStatus;
  lifecycleStatus: VendorLifecycleStatus;
  latestReviewNote: string;
  documentCompletion: {
    complete: number;
    required: number;
    missingLabels: string[];
    isComplete: boolean;
  };
  performance: VendorPerformanceSummary;
  compliance: VendorComplianceSummary;
  cities: string[];
  rateCardNotes: string;
  availabilityNotes: string;
  accountManager: string;
  sourceTimestamp: string;
  linkedProjects?: {
    linkId: string;
    projectId: string;
    projectName: string;
    client: string;
    stageLabel: string;
  }[];
}

export interface VendorDetail extends VendorSummary {
  displayType: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  npwpNumber: string;
  websiteUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  linkedinUrl: string;
  businessAddress: string;
  documentsFolderUrl: string;
  rawSource: Record<string, string>;
  contacts: VendorContact[];
  documents: VendorDocument[];
  reviews: VendorReview[];
  auditLog: VendorAuditEntry[];
  scorecards: VendorScorecard[];
  activeRevisionRequest: VendorRevisionRequest | null;
  notifications: VendorNotification[];
}

export interface DashboardData {
  vendors: VendorSummary[];
  vendorDetails: VendorDetail[];
  reviewQueue: VendorSummary[];
  notificationFeed: (VendorNotification & { vendorName: string; registrationCode: string })[];
  importRuns: ImportRun[];
  services: string[];
  locations: string[];
  sourcePath: string;
  sourceAvailable: boolean;
}
