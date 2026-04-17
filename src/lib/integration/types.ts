export interface ProjectVendorLink {
  id: string;
  projectId: string;
  vendorId: string;
  assignedAt: string;
  note: string;
}

export interface ProjectVendorShortlist {
  id: string;
  projectId: string;
  vendorId: string;
  serviceLine: string;
  status: "shortlisted" | "contacted" | "quoted" | "selected";
  note: string;
  quotedPrice: number;
  createdAt: string;
  updatedAt: string;
}

export interface LinkedProjectSummary {
  projectId: string;
  projectName: string;
  client: string;
  stageLabel: string;
}

export interface AssignedVendorSummary {
  vendorId: string;
  vendorName: string;
  vendorType: string;
  businessAddress: string;
  whatsappPhone: string;
  averageScore: number;
}

export interface ProjectVendorOption {
  id: string;
  name: string;
  serviceNames: string[];
  businessAddress: string;
  whatsappPhone: string;
  averageScore: number;
  lifecycleStatus: string;
}

export interface ProjectVendorShortlistSummary {
  linkId: string;
  vendorId: string;
  vendorName: string;
  vendorType: string;
  businessAddress: string;
  whatsappPhone: string;
  averageScore: number;
  serviceLine: string;
  status: "shortlisted" | "contacted" | "quoted" | "selected";
  note: string;
  quotedPrice: number;
}
