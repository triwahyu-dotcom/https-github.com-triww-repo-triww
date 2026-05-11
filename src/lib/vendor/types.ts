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

export type EntityType = "business" | "individual";

export type RelationshipType =
  | "vendor_rental"      // Sewa peralatan: sound, lighting, LED, rigging, tenda, furniture, kendaraan
  | "vendor_service"     // Jasa skill-based: security, catering, cleaning, legal
  | "vendor_supply"      // Jual barang habis pakai: merchandise, konsumsi
  | "eo_partner"         // EO Partner (bisa business atau individual)
  | "talent_agency"      // Manajemen artis (selalu business)
  | "talent"             // Performer individu (MC, artis, dancer)
  | "crew_lead"          // Pemimpin tim event yang bawa tim sendiri
  | "crew_individual"    // Crew satuan (Floor Manager, LO, Operator teknis)
  | "freelance";         // Creative freelance (designer, photographer)

export type RentalCategory =
  | "sound_system"
  | "lighting"
  | "led_video_wall"
  | "rigging_truss"
  | "stage_booth"
  | "tent_decoration"
  | "furniture"
  | "genset_power"
  | "communication"
  | "vehicle"
  | "other";

export type PricingModel = "bundled" | "unbundled" | "hybrid";

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
  is_eo?: boolean;

  // === NEW FIELDS for v2 form ===
  entityType?: EntityType;
  relationshipType?: RelationshipType;
  relationshipTypes?: RelationshipType[]; // for vendors with multiple relationships
  
  // For business: legal entity details
  legalEntityForm?: "PT" | "CV" | "UD" | "Lainnya";
  establishedYear?: string;
  nibNumber?: string; // Nomor Induk Berusaha
  
  // For individual: personal details
  nikNumber?: string; // KTP number
  personalNpwpNumber?: string; // NPWP pribadi (different from npwpNumber which is for business)
  stageBrandName?: string; // for talent or freelance brand name
  
  // For vendor_rental
  rentalCategories?: RentalCategory[];
  rentalSubcategories?: string[];
  withOperator?: "always" | "optional" | "dry_hire_only";
  includedServices?: string[];   // services included in rental price
  addonServices?: string[];      // services available as add-on
  pricingModel?: PricingModel;
  capacityNotes?: string;
  
  // For vendor_supply
  minimumOrderQty?: string;
  leadTime?: string;
  supplyCategory?: string;
  
  // For talent
  performerType?: string;
  genre?: string;
  experienceCount?: string;
  languages?: string;
  riderNotes?: string;
  talentSpecialty?: string;
  
  // For crew_lead
  crewLeadRole?: string;
  teamComposition?: string;
  teamSize?: string;
  teamExperience?: string;
  teamDayRate?: string;
  teamResponsibilityAccepted?: boolean; // crew lead accepts payment responsibility for team
  
  // For crew_individual
  crewRole?: string;
  crewSpecialty?: string;
  dayRate?: string;
  certifications?: string;
  
  // For freelance
  creativeSpecialty?: string;
  softwareSkills?: string;
  ratePerProject?: string;
  turnaroundTime?: string;
  workingStyle?: "remote" | "on_site" | "hybrid";
  
  // V2: services list
  services?: string[];
  subServices?: string[];
  
  // Common: operating cities (replaces cities field but optional)
  operatingCities?: string[];
  
  // Additional Identity / Contact Fields
  phone?: string;
  npwpName?: string;
  npwpAddress?: string;
  bankAccountName?: string;
  picName?: string;
  picRole?: string;
  picPhone?: string;
  picEmail?: string;
  notes?: string;
  status?: string;

  // Submission metadata for spam detection
  submissionMetadata?: {
    formVersion: string;       // "v2.0" for new form
    submittedAt: string;
    completionTimeSeconds?: number;
  };
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
  vendorId?: string;
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

  // V2 Fields for Dashboard
  entityType?: EntityType;
  relationshipType?: RelationshipType;
  submissionMetadata?: {
    formVersion: string;
    submittedAt: string;
    completionTimeSeconds?: number;
  };
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

  // New fields for summary/filtering
  phone?: string;
  npwpName?: string;
  npwpAddress?: string;
  bankAccountName?: string;
  picName?: string;
  picRole?: string;
  picPhone?: string;
  picEmail?: string;
  notes?: string;
  status?: string;
  supplyCategory?: string;
  talentSpecialty?: string;
  crewLeadRole?: string;
  crewSpecialty?: string;
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

  // V2 Granular Details
  rentalCategories?: RentalCategory[];
  rentalSubcategories?: string[];
  withOperator?: "always" | "optional" | "dry_hire_only";
  includedServices?: string[];
  addonServices?: string[];
  pricingModel?: PricingModel;
  capacityNotes?: string;
  minimumOrderQty?: string;
  leadTime?: string;
  performerType?: string;
  genre?: string;
  experienceCount?: string;
  languages?: string;
  riderNotes?: string;
  teamComposition?: string;
  teamSize?: string;
  teamExperience?: string;
  teamDayRate?: string;
  teamResponsibilityAccepted?: boolean;
  crewRole?: string;
  dayRate?: string;
  certifications?: string;
  creativeSpecialty?: string;
  softwareSkills?: string;
  ratePerProject?: string;
  turnaroundTime?: string;
  workingStyle?: "remote" | "on_site" | "hybrid";
  services?: string[];
  subServices?: string[];
  operatingCities?: string[];
  
  // New granular details
  phone?: string;
  npwpName?: string;
  npwpAddress?: string;
  bankAccountName?: string;
  picName?: string;
  picRole?: string;
  picPhone?: string;
  picEmail?: string;
  notes?: string;
  status?: string;
  supplyCategory?: string;
  talentSpecialty?: string;
  crewLeadRole?: string;
  crewSpecialty?: string;
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

export interface VendorIntakeV2Payload {
  // Step 1: Type selection
  entityType: EntityType;
  relationshipType: RelationshipType;
  is_eo?: boolean;
  
  // Step 2: Identity (varies by entity type)
  name: string;
  stageBrandName?: string;
  legalEntityForm?: "PT" | "CV" | "UD" | "Lainnya";
  establishedYear?: string;
  nikNumber?: string;
  nibNumber?: string;
  npwpNumber?: string;        // for business
  personalNpwpNumber?: string; // for individual
  taxStatus?: TaxStatus;
  
  // Step 3: Capability (varies by relationship type)
  // Rental
  rentalCategories?: RentalCategory[];
  rentalSubcategories?: string[];
  withOperator?: "always" | "optional" | "dry_hire_only";
  includedServices?: string[];
  addonServices?: string[];
  pricingModel?: PricingModel;
  // Service / EO Partner
  services?: string[];
  subServices?: string[];
  capacityNotes?: string;
  // Supply
  productList?: string;
  minimumOrderQty?: string;
  leadTime?: string;
  // Talent
  performerType?: string;
  genre?: string;
  experienceCount?: string;
  languages?: string;
  riderNotes?: string;
  // Crew Lead
  crewLeadRole?: string;
  teamComposition?: string;
  teamSize?: string;
  teamExperience?: string;
  teamDayRate?: string;
  teamResponsibilityAccepted?: boolean;
  // Crew Individual
  crewRole?: string;
  dayRate?: string;
  certifications?: string;
  // Freelance
  creativeSpecialty?: string;
  softwareSkills?: string;
  ratePerProject?: string;
  turnaroundTime?: string;
  workingStyle?: "remote" | "on_site" | "hybrid";
  
  operatingCities?: string[];
  
  // Step 4: Contact
  email: string;
  businessAddress?: string;
  officePhone?: string;
  picName?: string;
  picTitle?: string;
  picPhone: string;       // for individual, this is their personal phone
  picEmail?: string;
  picBackupName?: string;
  picBackupPhone?: string;
  domicileCity?: string; // for individual
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  
  // Step 5: Bank
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  
  // Step 6: Documents
  documentsFolderUrl: string;
  declaredDocuments?: string[]; // checklist of documents user confirms exist in folder
  
  // Social media (optional, for any type)
  websiteUrl?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  linkedinUrl?: string;
  
  // Metadata
  submissionMetadata?: {
    formVersion: string;
    submittedAt: string;
    completionTimeSeconds?: number;
  };
}
