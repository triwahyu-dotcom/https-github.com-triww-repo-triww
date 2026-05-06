import { existsSync } from "node:fs";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { 
  ProjectRecord, 
  ProjectDashboardData, 
  ProjectSection, 
  StageSummary, 
  WorkflowStage, 
  WorkflowSuggestion,
  CRMClient,
} from "@/lib/project/types";
import { getManPowerData } from "@/lib/manpower/store";
import { getDashboardData as getVendorDashboardData } from "@/lib/vendor/store";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const DEFAULT_SOURCE_PATHS = [
  path.join(process.cwd(), "data", "source", "JUARA TRACKER -  2026 (BUSINESS) (1).csv"),
  path.join(process.cwd(), "data", "source", "JUARA TRACKER -  2026 (BUSINESS).csv"),
];

const SOURCE_PATH = DEFAULT_SOURCE_PATHS.find(p => existsSync(p)) || DEFAULT_SOURCE_PATHS[0];
const DATA_DIR = path.join(process.cwd(), "data");
const PROJECTS_PATH = path.join(DATA_DIR, "projects.json");
const CLIENTS_PATH = path.join(DATA_DIR, "clients.json");

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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

async function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    try {
      await mkdir(DATA_DIR, { recursive: true });
    } catch (e) {
      console.warn("Could not create data directory", e);
    }
  }
}

export async function getJsonProjects(): Promise<ProjectRecord[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase!
        .from('projects')
        .select('data')
        .order('updated_at', { ascending: false });
      
      if (!error && data && data.length > 0) {
        const projects = data.map(item => item.data as ProjectRecord);
        return projects.map(project => normalizeProjectSection(project));
      }
    } catch (e) {
      console.warn("Failed to fetch projects from Supabase, falling back to JSON", e);
    }
  }

  if (!existsSync(PROJECTS_PATH)) {
    return [];
  }
  try {
    const content = await readFile(PROJECTS_PATH, "utf-8");
    const rawProjects = JSON.parse(content) as ProjectRecord[];
    
    // Ensure every project has a section even if not explicitly stored
    return rawProjects.map(project => normalizeProjectSection(project));
  } catch (e) {
    console.error("Error reading projects:", e);
    return [];
  }
}

function normalizeProjectSection(project: ProjectRecord): ProjectRecord {
  let section = project.section;
  if (!section) {
    if (["lead", "pitching"].includes(project.currentStage)) section = "leads";
    else if (["negotiation", "execution", "reporting", "finance"].includes(project.currentStage)) section = "ongoing";
    else if (project.currentStage === "completed") section = "billed";
    else if (project.currentStage === "lost") section = "failed";
    else section = "uncategorized";
  }
  return { ...project, section };
}

export async function getJsonClients(): Promise<CRMClient[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase!
        .from('clients')
        .select('data')
        .order('updated_at', { ascending: false });
      
      if (!error && data && data.length > 0) {
        return data.map(item => item.data as CRMClient);
      }
    } catch (e) {
      console.warn("Failed to fetch clients from Supabase, falling back to JSON", e);
    }
  }

  if (!existsSync(CLIENTS_PATH)) return [];
  try {
    const content = await readFile(CLIENTS_PATH, "utf-8");
    return JSON.parse(content);
  } catch (e) {
    console.error("Error reading clients:", e);
    return [];
  }
}

export async function saveProjects(projects: ProjectRecord[]) {
  // If Supabase is configured, we usually update individual projects.
  // But for full compatibility with the existing code that calls saveProjects(allProjects),
  // we could try to sync everything, though that's inefficient.
  // We'll prioritize the individual updateJsonProject instead.
  
  try {
    await ensureDataDir();
    await writeFile(PROJECTS_PATH, JSON.stringify(projects, null, 2));
  } catch (e) {
    if (!isSupabaseConfigured()) {
      console.warn("Failed to save projects locally and Supabase not configured", e);
    }
  }
}

export async function saveClients(clients: CRMClient[]) {
  try {
    await ensureDataDir();
    await writeFile(CLIENTS_PATH, JSON.stringify(clients, null, 2));
  } catch (e) {
    if (!isSupabaseConfigured()) {
      console.warn("Failed to save clients locally and Supabase not configured", e);
    }
  }
}

export async function updateJsonClient(client: Partial<CRMClient>): Promise<CRMClient> {
  const now = new Date().toISOString();
  let updatedClient: CRMClient;

  const clients = await getJsonClients();
  const index = clients.findIndex(c => c.id === client.id);
  
  if (index === -1) {
    updatedClient = {
      ...client,
      id: client.id || `cli_${Date.now()}`,
      name: client.name || "Unknown Client",
      contactPerson: client.contactPerson || "",
      email: client.email || "",
      createdAt: now,
      updatedAt: now,
    } as CRMClient;
    clients.push(updatedClient);
  } else {
    updatedClient = {
      ...clients[index],
      ...client,
      updatedAt: now,
    } as CRMClient;
    clients[index] = updatedClient;
  }

  // Persist to Supabase as primary source
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase!
        .from('clients')
        .upsert({
          id: updatedClient.id,
          data: updatedClient,
          updated_at: now
        }, { onConflict: 'id' });
      
      if (error) {
        console.error("Supabase client upsert error:", error);
        throw new Error(`Gagal menyimpan ke database: ${error.message}`);
      }
    } catch (e) {
      console.error("Failed to save client to Supabase", e);
      throw e; // Rethrow to let the UI know about the failure
    }
  }

  // Fallback to local JSON (will fail silently on Vercel)
  await saveClients(clients);
  return updatedClient;
}

export async function deleteJsonClient(id: string) {
  if (isSupabaseConfigured()) {
    try {
      await supabase!.from('clients').delete().eq('id', id);
    } catch (e) {
      console.error("Failed to delete client from Supabase", e);
    }
  }
  const clients = await getJsonClients();
  const filtered = clients.filter(c => c.id !== id);
  await saveClients(filtered);
}

export async function deleteJsonProject(id: string) {
  if (isSupabaseConfigured()) {
    try {
      await supabase!.from('projects').delete().eq('id', id);
    } catch (e) {
      console.error("Failed to delete project from Supabase", e);
    }
  }
  const projects = await getJsonProjects();
  const filtered = projects.filter(p => p.id !== id);
  await saveProjects(filtered);
}

export async function updateJsonProject(project: Partial<ProjectRecord>): Promise<ProjectRecord> {
  const now = new Date().toISOString();
  let updatedProject: ProjectRecord;

  const projects = await getJsonProjects();
  const index = projects.findIndex(p => p.id === project.id);
  
  if (index === -1) {
    updatedProject = {
      ...project,
      id: project.id || Math.random().toString(36).substring(7),
      createdAt: now,
      updatedAt: now,
      documents: project.documents || [],
      owners: project.owners || [],
    } as ProjectRecord;
    projects.unshift(updatedProject);
  } else {
    updatedProject = {
      ...projects[index],
      ...project,
      updatedAt: now,
    } as ProjectRecord;
    projects[index] = updatedProject;
  }

  // Persist to Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase!
        .from('projects')
        .upsert({
          id: updatedProject.id,
          data: updatedProject,
          updated_at: now
        }, { onConflict: 'id' });
      
      if (error) {
        console.error("Supabase project upsert error:", error);
        // We throw so the API handler can catch it and return 500
        throw new Error(`Failed to save to database: ${error.message}`);
      }
    } catch (e) {
      console.error("Supabase integration error:", e);
      throw e; // Rethrow to trigger the 'Gagal memperbarui' alert
    }
  }

  // Fallback/Parallel save to JSON (will fail silently on Vercel)
  await saveProjects(projects);
  
  return updatedProject;
}

export async function getProjectDashboardData(): Promise<ProjectDashboardData> {
  const [projects, clients] = await Promise.all([
    getJsonProjects(),
    getJsonClients()
  ]);

  const clientsMap = new Map(clients.map(c => [c.id, c]));
  const totalPipelineValue = projects.reduce((sum, project) => sum + project.projectValue, 0);
  const allDocuments = projects.flatMap((project) => project.documents);
  const sectionOrder: ProjectSection[] = ["leads", "ongoing", "billed", "failed"];

  return {
    projects,
    sourcePath: SOURCE_PATH,
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
        valueLabel: formatCurrency(items.reduce((sum, project) => sum + project.projectValue, 0)),
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
