export type ProjectSection = "leads" | "ongoing" | "billed" | "failed" | "uncategorized";

export type WorkflowStage =
  | "lead"
  | "qualified"
  | "pitching"
  | "negotiation"
  | "execution"
  | "reporting"
  | "finance"
  | "completed"
  | "lost";

export type ProjectPhaseKey =
  | "brief"
  | "pitching"
  | "revision"
  | "execution"
  | "reporting"
  | "finance";

export type TaskStatus = "done" | "pending";
export type DocumentStatus = "available" | "reference" | "missing";

export interface ProjectPhaseItem {
  label: string;
  value: string;
}

export interface ProjectPhase {
  key: ProjectPhaseKey;
  label: string;
  status: string;
  items: ProjectPhaseItem[];
  completion: number;
}

export interface ProjectTask {
  id: string;
  title: string;
  stage: WorkflowStage;
  status: TaskStatus;
  required: boolean;
}

export interface ProjectDocument {
  id: string;
  title: string;
  stage: WorkflowStage;
  phaseKey: ProjectPhaseKey;
  value: string;
  url: string;
  status: DocumentStatus;
}

export interface ProjectActivity {
  id: string;
  type: "imported" | "stage_change" | "note";
  message: string;
  timestampLabel: string;
}

export interface ProjectMilestone {
  id: string;
  label: string;
  value: string;
  done: boolean;
}

export interface ProjectRecord {
  id: string;
  numberLabel: string;
  client: string;
  projectName: string;
  contactPerson: string;
  relation: string;
  category: string;
  owners: string[];
  eventDate: string;
  projectValue: number;
  projectValueLabel: string;
  serviceLine: string;
  status: string;
  progress: string;
  credentials: string;
  remark: string;
  section: ProjectSection;
  sectionLabel: string;
  health: "on_track" | "watch" | "stuck";
  currentStage: WorkflowStage;
  currentStageLabel: string;
  financeStatus: string;
  resultLabel: string;
  phaseLabel: string;
  phases: ProjectPhase[];
  tasks: ProjectTask[];
  documents: ProjectDocument[];
  milestones: ProjectMilestone[];
  activity: ProjectActivity[];
  searchableText: string;
  assignedVendors?: {
    linkId: string;
    vendorId: string;
    vendorName: string;
    vendorType: string;
    coverageArea: string;
    whatsappPhone: string;
    averageScore: number;
  }[];
  vendorShortlist?: {
    linkId: string;
    vendorId: string;
    vendorName: string;
    vendorType: string;
    coverageArea: string;
    whatsappPhone: string;
    averageScore: number;
    serviceLine: string;
    status: "shortlisted" | "contacted" | "quoted" | "selected";
    note: string;
    quotedPrice: number;
  }[];
  vendorRequirements?: {
    id?: string;
    label: string;
    summary: string;
    status?: "pending" | "fulfilled";
  }[];
  partnerClient?: string; // e.g., "WE DO", "SATOE"
  billingClient?: string; // Who gets the invoice
}

export type CRMClientType = "brand" | "agency" | "government" | "partner";

export interface CRMContact {
  name: string;
  role?: string;
  phone?: string;
  email?: string;
  projects: string[]; // Project IDs
}

export interface CRMClient {
  id: string;
  name: string;
  aliases?: string[];
  type: CRMClientType;
  category: string;
  industry?: string;
  address?: string;
  website?: string;
  relation: string;
  totalProjectValue: number;
  totalProjectValueLabel: string;
  projectCount: number;
  activeProjectCount: number;
  lastContactDate?: string;
  contacts: CRMContact[];
  projects: ProjectRecord[];
  health: "on_track" | "watch" | "stuck";
  status: "active" | "lead" | "inactive";
}

export interface ProjectSectionSummary {
  key: ProjectSection;
  label: string;
  count: number;
  valueLabel: string;
}

export interface StageSummary {
  key: WorkflowStage;
  label: string;
  count: number;
}

export interface WorkflowSuggestion {
  stage: WorkflowStage;
  label: string;
  summary: string;
  rules: string[];
}

export interface ProjectDashboardData {
  projects: ProjectRecord[];
  sourcePath: string;
  sourceAvailable: boolean;
  summary: {
    totalProjects: number;
    activeProjects: number;
    leadsProjects: number;
    totalPipelineValue: number;
    totalPipelineValueLabel: string;
    averageDealSizeLabel: string;
    documentsAvailable: number;
    documentsMissing: number;
  };
  sections: ProjectSectionSummary[];
  stages: StageSummary[];
  workflowSuggestions: WorkflowSuggestion[];
  serviceLines: string[];
  categories: string[];
  availableVendors: {
    id: string;
    name: string;
    serviceNames: string[];
    coverageArea: string;
    whatsappPhone: string;
    averageScore: number;
    lifecycleStatus: string;
  }[];
}

export interface CRMDashboardData {
  clients: CRMClient[];
  summary: {
    totalClients: number;
    totalLeads: number;
    activeClients: number;
    totalPortfolioValue: number;
    totalPortfolioValueLabel: string;
  };
}

