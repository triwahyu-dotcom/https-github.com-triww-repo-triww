import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { ProjectRecord, CRMClient, CRMDashboardData, CRMContact } from "@/lib/project/types";

const CLIENTS_DB_PATH = path.join(process.cwd(), "data/clients.json");

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function getOfficialClient(clientName: string, officialClients: CRMClient[]): CRMClient | null {
  const normalizedSearch = clientName.toLowerCase().trim();
  return officialClients.find(c => 
    c.name.toLowerCase() === normalizedSearch || 
    c.aliases?.some(alias => alias.toLowerCase() === normalizedSearch)
  ) || null;
}

export async function getCRMDashboardData(projects: ProjectRecord[]): Promise<CRMDashboardData> {
  let officialClients: CRMClient[] = [];
  if (existsSync(CLIENTS_DB_PATH)) {
    try {
      officialClients = JSON.parse(readFileSync(CLIENTS_DB_PATH, "utf-8"));
    } catch (e) {
      console.error("Error loading clients.json", e);
    }
  }

  const clientsMap = new Map<string, CRMClient>();

  // Pre-populate with all official clients from clients.json
  officialClients.forEach(official => {
    clientsMap.set(official.name, {
      ...official,
      health: official.health || "on_track",
      status: official.status || "active",
      totalProjectValue: 0,
      totalProjectValueLabel: "",
      projectCount: 0,
      activeProjectCount: 0,
      contacts: official.contacts || [],
      projects: [],
      relation: official.relation || "Brand",
    });
  });

  const getOrCreateClient = (name: string, project: ProjectRecord): CRMClient => {
    const official = getOfficialClient(name, officialClients);
    const key = official ? official.name : name;

    const existing = clientsMap.get(key);
    if (existing) return existing;

    const newClient: CRMClient = official ? {
      ...official,
      category: official.category || project.category,
      health: official.health || "on_track",
      status: official.status || "active",
      totalProjectValue: 0,
      totalProjectValueLabel: "",
      projectCount: 0,
      activeProjectCount: 0,
      contacts: [],
      projects: [],
      relation: official.relation || project.relation,
    } : {
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name: name,
      type: "brand",
      category: project.category,
      relation: project.relation,
      totalProjectValue: 0,
      totalProjectValueLabel: "",
      projectCount: 0,
      activeProjectCount: 0,
      contacts: [],
      projects: [],
      health: "on_track",
      status: "active",
    };
    
    clientsMap.set(key, newClient);
    return newClient;
  };

  projects.forEach((project) => {
    const brandName = project.client || "Other";
    const brand = getOrCreateClient(brandName, project);
    
    let partnerClient: CRMClient | null = null;
    if (brandName.toUpperCase().includes("WE DO")) {
      partnerClient = getOrCreateClient("WE DO", project);
    } else if (brandName.toUpperCase().includes("SATOE")) {
      partnerClient = getOrCreateClient("SATOE", project);
    }
    
    // Brand stays as End Client
    brand.projects.push(project);
    brand.projectCount += 1;
    brand.totalProjectValue += project.projectValue;
    if (["execution", "reporting", "finance"].includes(project.currentStage)) {
      brand.activeProjectCount += 1;
    }

    // Partner gets Agency treatment
    if (partnerClient && partnerClient.name !== brand.name) {
      partnerClient.projects.push(project);
      partnerClient.projectCount += 1;
      partnerClient.totalProjectValue += project.projectValue;
      if (["execution", "reporting", "finance"].includes(project.currentStage)) {
        partnerClient.activeProjectCount += 1;
      }
      partnerClient.type = "agency";
    }

    if (project.contactPerson) {
      const target = partnerClient || brand;
      const contactExists = target.contacts.find((c) => c.name === project.contactPerson);
      if (!contactExists) {
        target.contacts.push({ name: project.contactPerson, projects: [project.id] });
      } else {
        contactExists.projects.push(project.id);
      }
    }
  });

  const clients = Array.from(clientsMap.values()).map((c) => ({
    ...c,
    totalProjectValueLabel: formatCurrency(c.totalProjectValue),
  }));

  const totalPortfolioValue = clients.reduce((acc, c) => acc + c.totalProjectValue, 0);

  return {
    clients,
    summary: {
      totalClients: clients.filter(c => c.status === "active").length,
      totalLeads: clients.filter(c => c.status === "lead").length,
      activeClients: clients.filter(c => c.activeProjectCount > 0).length,
      totalPortfolioValue,
      totalPortfolioValueLabel: formatCurrency(totalPortfolioValue),
    },
  };
}
