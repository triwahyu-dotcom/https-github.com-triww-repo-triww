import { supabase } from '@/lib/supabase';
import { 
  ProjectRecord, 
  CRMClient, 
  ProjectDashboardData, 
  ProjectSection, 
  StageSummary,
  WorkflowStage,
  WorkflowSuggestion
} from './types';

// --- CONSTANTS (Restored from original) ---

const STAGE_ORDER: WorkflowStage[] = ["lead", "pitching", "negotiation", "execution", "reporting", "finance", "completed", "lost"];
const STAGE_LABELS: Record<WorkflowStage, string> = {
  lead: "Lead / Prospect",
  pitching: "Pitching / Preparation",
  negotiation: "Negotiation",
  execution: "Execution",
  reporting: "Reporting",
  finance: "Finance / Billing",
  completed: "Completed",
  lost: "Cancelled",
};

const SECTION_LABELS: Record<ProjectSection, string> = {
  leads: "Leads & Prospects",
  ongoing: "Active Projects",
  billed: "Billed / Done",
  failed: "Lost / Cancelled",
  uncategorized: "Other / Uncategorized",
};

const WORKFLOW_SUGGESTIONS: WorkflowSuggestion[] = [
  {
    stage: "negotiation",
    label: "Update Negotiation Status",
    summary: "Check projects in 'Negotiation' stage that haven't been updated in 3 days.",
    rules: ["Inactive for 3 days", "High priority client"],
  },
  {
    stage: "finance",
    label: "Billed Projects Review",
    summary: "Review projects in 'Finance' stage for final payment verification.",
    rules: ["Payment pending", "Due this week"],
  }
];

// Helper: Supabase Admin Client (Service Role)
async function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return supabase!;
  }

  const { createClient } = await import('@supabase/supabase-js');
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false }
  });
}

// Helper: Format Mata Uang
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// --- CLIENTS CRUD ---

export async function readClients(): Promise<CRMClient[]> {
  const client = await getAdminClient();
  const { data, error } = await client
    .from('clients')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw new Error(`Gagal membaca data klien: ${error.message}`);
  return (data || []).map(row => row.data as CRMClient);
}

export async function createClient(newClient: CRMClient): Promise<CRMClient> {
  const client = await getAdminClient();
  const now = new Date().toISOString();
  
  const payload = { ...newClient, createdAt: now, updatedAt: now };

  const { data, error } = await client
    .from('clients')
    .insert({
      id: payload.id,
      data: payload,
      updated_at: now
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') throw new Error("ID Klien sudah terdaftar.");
    throw new Error(`Gagal membuat klien: ${error.message}`);
  }
  return data.data as CRMClient;
}

export async function updateClient(updates: Partial<CRMClient> & { id: string }): Promise<CRMClient> {
  const client = await getAdminClient();
  const now = new Date().toISOString();

  const allClients = await readClients();
  const existing = allClients.find(c => c.id === updates.id);
  if (!existing) throw new Error("Klien tidak ditemukan.");

  // FIX TS Errors: Properti contactPerson dan email divalidasi dengan casting aman ke any
  // karena interface CRMClient asli tidak memiliki properti ini namun digunakan secara legacy
  const updatedData: any = {
    ...existing,
    ...updates,
    updatedAt: now
  };

  const { error } = await client
    .from('clients')
    .update({
      data: updatedData,
      updated_at: now
    })
    .eq('id', updates.id);

  if (error) throw new Error(`Gagal memperbarui klien: ${error.message}`);
  return updatedData as CRMClient;
}

export async function deleteClient(id: string): Promise<void> {
  const client = await getAdminClient();
  const { error } = await client.from('clients').delete().eq('id', id);
  if (error) throw new Error(`Gagal menghapus klien: ${error.message}`);
}

// --- PROJECTS CRUD ---

export async function readProjects(): Promise<ProjectRecord[]> {
  const client = await getAdminClient();
  const { data, error } = await client
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw new Error(`Gagal membaca data proyek: ${error.message}`);
  return (data || []).map(row => row.data as ProjectRecord);
}

export async function createProject(newProject: ProjectRecord): Promise<ProjectRecord> {
  const client = await getAdminClient();
  const now = new Date().toISOString();
  
  const payload = { ...newProject, createdAt: now, updatedAt: now };

  const { data, error } = await client
    .from('projects')
    .insert({
      id: payload.id,
      data: payload,
      updated_at: now
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') throw new Error("ID Proyek sudah terdaftar.");
    throw new Error(`Gagal membuat proyek: ${error.message}`);
  }
  return data.data as ProjectRecord;
}

export async function updateProject(updates: Partial<ProjectRecord> & { id: string }): Promise<ProjectRecord> {
  const client = await getAdminClient();
  const now = new Date().toISOString();

  const allProjects = await readProjects();
  const existing = allProjects.find(p => p.id === updates.id);
  if (!existing) throw new Error("Proyek tidak ditemukan.");

  const updatedData: ProjectRecord = {
    ...existing,
    ...updates,
    updatedAt: now
  };

  const { error } = await client
    .from('projects')
    .update({
      data: updatedData,
      updated_at: now
    })
    .eq('id', updates.id);

  if (error) throw new Error(`Gagal memperbarui proyek: ${error.message}`);
  return updatedData;
}

export async function deleteProject(id: string): Promise<void> {
  const client = await getAdminClient();
  const { error } = await client.from('projects').delete().eq('id', id);
  if (error) throw new Error(`Gagal menghapus proyek: ${error.message}`);
}

// --- DASHBOARD AGGREGATOR ---

export async function getProjectDashboardData(): Promise<ProjectDashboardData> {
  const [projects, clients] = await Promise.all([
    readProjects(),
    readClients()
  ]);

  const totalPipelineValue = projects.reduce((sum, project) => sum + (project.projectValue || 0), 0);
  const allDocuments = projects.flatMap((project) => project.documents || []);
  const sectionOrder: ProjectSection[] = ["leads", "ongoing", "billed", "failed"];

  return {
    projects,
    sourcePath: "Supabase Admin (Cloud)",
    sourceAvailable: true,
    summary: {
      totalProjects: projects.length,
      activeProjects: projects.filter((project) =>
        ["execution", "reporting", "finance"].includes(project.currentStage),
      ).length,
      leadsProjects: projects.filter((project) => ["lead", "pitching"].includes(project.currentStage))
        .length,
      totalPipelineValue,
      totalPipelineValueLabel: formatCurrency(totalPipelineValue),
      averageDealSizeLabel: formatCurrency(projects.length > 0 ? totalPipelineValue / projects.length : 0),
      documentsAvailable: allDocuments.filter((document) => document.status === "available").length,
      documentsMissing: allDocuments.filter((document) => document.status === "missing").length,
    },
    sections: sectionOrder.map((section) => {
      const items = projects.filter((project) => project.section === section);
      return {
        key: section,
        label: SECTION_LABELS[section],
        count: items.length,
        valueLabel: formatCurrency(items.reduce((sum, project) => sum + (project.projectValue || 0), 0)),
      };
    }),
    stages: STAGE_ORDER.map(
      (stage) =>
        ({
          key: stage,
          label: STAGE_LABELS[stage],
          count: projects.filter((project) => project.currentStage === stage).length,
        }) satisfies StageSummary,
    ),
    workflowSuggestions: WORKFLOW_SUGGESTIONS,
    serviceLines: [...new Set(projects.map((project) => project.serviceLine).filter((item) => item && item !== "-"))]
      .sort(),
    categories: [...new Set(projects.map((project) => project.category).filter(Boolean))].sort(),
    availableVendors: [],
    availableFreelancers: [],
  };
}
