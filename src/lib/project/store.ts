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
  if (!existsSync(PROJECTS_PATH)) {
    return [];
  }
  try {
    const content = await readFile(PROJECTS_PATH, "utf-8");
    const rawProjects = JSON.parse(content) as ProjectRecord[];
    
    // Ensure every project has a section even if not explicitly stored
    return rawProjects.map(project => {
      let section = project.section;
      if (!section) {
        if (["lead", "pitching"].includes(project.currentStage)) section = "leads";
        else if (["negotiation", "execution", "reporting", "finance"].includes(project.currentStage)) section = "ongoing";
        else if (project.currentStage === "completed") section = "billed";
        else if (project.currentStage === "lost") section = "failed";
        else section = "uncategorized";
      }
      return { ...project, section };
    });
  } catch (e) {
    console.error("Error reading projects:", e);
    return [];
  }
}

export async function getJsonClients(): Promise<CRMClient[]> {
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
  await ensureDataDir();
  await writeFile(PROJECTS_PATH, JSON.stringify(projects, null, 2));
}

export async function updateJsonProject(project: Partial<ProjectRecord>): Promise<ProjectRecord> {
  const projects = await getJsonProjects();
  const index = projects.findIndex(p => p.id === project.id);
  
  const now = new Date().toISOString();
  
  if (index === -1) {
    const newProject = {
      ...project,
      id: project.id || Math.random().toString(36).substring(7),
      createdAt: now,
      updatedAt: now,
      documents: project.documents || [],
      owners: project.owners || [],
    } as ProjectRecord;
    projects.unshift(newProject);
    await saveProjects(projects);
    return newProject;
  } else {
    const updated = {
      ...projects[index],
      ...project,
      updatedAt: now,
    } as ProjectRecord;
    projects[index] = updated;
    await saveProjects(projects);
    return updated;
  }
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
