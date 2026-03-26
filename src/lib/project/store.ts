import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

import {
  ProjectActivity,
  ProjectDashboardData,
  ProjectDocument,
  ProjectMilestone,
  ProjectPhase,
  ProjectPhaseItem,
  ProjectPhaseKey,
  ProjectRecord,
  ProjectSection,
  ProjectTask,
  StageSummary,
  WorkflowStage,
  WorkflowSuggestion,
  CRMClient,
} from "@/lib/project/types";

const DEFAULT_SOURCE_PATHS = [
  path.join(process.cwd(), "data", "source", "JUARA TRACKER -  2026 (BUSINESS) (1).csv"),
  path.join(process.cwd(), "data", "source", "JUARA TRACKER -  2026 (BUSINESS).csv"),
];

const JSON_PROJECTS_PATH = path.join(process.cwd(), "data", "projects.json");
const JSON_CLIENTS_PATH = path.join(process.cwd(), "data", "clients.json");

const SOURCE_PATH =
  process.env.PROJECT_TRACKER_SOURCE_PATH ?? DEFAULT_SOURCE_PATHS.find((path) => existsSync(path)) ?? DEFAULT_SOURCE_PATHS[0];

export async function readJsonProjects(): Promise<ProjectRecord[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase!.from('projects').select('data');
    if (!error && data) {
      return data.map(item => item.data);
    }
  }

  if (existsSync(JSON_PROJECTS_PATH)) {
    try {
      return JSON.parse(readFileSync(JSON_PROJECTS_PATH, "utf-8"));
    } catch {
      return [];
    }
  }
  return [];
}

function sectionFromStage(stage: WorkflowStage): ProjectSection {
  if (stage === "lost") return "failed";
  if (stage === "completed") return "billed";
  if (["execution", "reporting", "finance"].includes(stage)) return "ongoing";
  return "leads";
}

function buildDefaultPhases(): ProjectPhase[] {
  return [
    buildPhase("brief", [
      { label: "Brief Status", value: "" },
      { label: "TOR / Brief Deck", value: "" },
      { label: "Document A", value: "" },
    ]),
    buildPhase("pitching", [
      { label: "Pitching Status", value: "" },
      { label: "Pitching Deadline", value: "" },
      { label: "Proposal", value: "" },
      { label: "Quotation", value: "" },
      { label: "Presentation", value: "" },
    ]),
    buildPhase("revision", [
      { label: "Revision Status", value: "" },
      { label: "Revision Deadline", value: "" },
      { label: "Revision Proposal", value: "" },
      { label: "Revision Quotation", value: "" },
    ]),
    buildPhase("execution", [
      { label: "Execution Status", value: "" },
      { label: "Contract / SPK Client", value: "" },
      { label: "PO to Vendor", value: "" },
      { label: "Manpower Contract", value: "" },
      { label: "Checklist", value: "" },
      { label: "Manual Book", value: "" },
    ]),
    buildPhase("reporting", [
      { label: "Reporting Status", value: "" },
      { label: "BAST", value: "" },
      { label: "Report Documentation", value: "" },
    ]),
    buildPhase("finance", [
      { label: "Finance Status", value: "" },
      { label: "COGS", value: "" },
      { label: "PPN", value: "" },
      { label: "Amount at Contract", value: "" },
      { label: "Invoice", value: "" },
      { label: "P & L Document", value: "" },
    ]),
  ];
}

export function normalizeProject(project: Partial<ProjectRecord>): ProjectRecord {
  const currentStage = project.currentStage || "lead";
  const section = project.section || sectionFromStage(currentStage);
  const status = project.status || "-";
  const progress = project.progress || "-";
  const phases = (project.phases && project.phases.length > 0) ? project.phases : buildDefaultPhases();
  const client = project.client || "Unknown Client";
  const projectName = project.projectName || "Untitled Project";
  const projectValue = project.projectValue || 0;

  const normalized: ProjectRecord = {
    id: project.id || Date.now().toString(),
    numberLabel: project.numberLabel || "",
    client,
    projectName,
    contactPerson: project.contactPerson || "",
    relation: project.relation || "",
    category: project.category || "",
    owners: project.owners || [],
    eventDate: project.eventDate || "",
    projectValue,
    projectValueLabel: formatCurrency(projectValue),
    serviceLine: project.serviceLine || "-",
    status,
    progress,
    credentials: project.credentials || "",
    remark: project.remark || "",
    section,
    sectionLabel: SECTION_LABELS[section],
    health: project.health || deriveHealth(section, status, progress, phases),
    currentStage,
    currentStageLabel: STAGE_LABELS[currentStage],
    financeStatus: project.financeStatus || "-",
    resultLabel: project.resultLabel || (currentStage === "lost" ? "Lost" : currentStage === "completed" ? "Completed" : "In progress"),
    phaseLabel: project.phaseLabel || derivePhaseLabel(phases),
    phases,
    tasks: (project.tasks && project.tasks.length > 0) ? project.tasks : deriveTasks(phases),
    documents: (project.documents && project.documents.length > 0) ? project.documents : deriveDocuments(phases),
    milestones: (project.milestones && project.milestones.length > 0) ? project.milestones : deriveMilestones(phases, project.eventDate || "", currentStage),
    activity: (project.activity && project.activity.length > 0) ? project.activity : deriveActivity(currentStage, status, progress),
    searchableText: "",
    assignedVendors: project.assignedVendors || [],
    vendorShortlist: project.vendorShortlist || [],
    vendorRequirements: project.vendorRequirements || [],
    mainFolder: project.mainFolder || ""
  };

  normalized.searchableText = [
    normalized.client,
    normalized.projectName,
    normalized.contactPerson,
    normalized.relation,
    normalized.category,
    normalized.owners.join(" "),
    normalized.serviceLine,
    normalized.status,
    normalized.progress,
    normalized.currentStageLabel,
  ]
    .join(" ")
    .toLowerCase();

  return normalized;
}

export async function updateJsonProject(project: ProjectRecord) {
  const normalized = normalizeProject(project);

  const existing = await readJsonProjects();
  const index = existing.findIndex((p: ProjectRecord) => p.id === normalized.id);
  if (index !== -1) {
    existing[index] = normalized;
  } else {
    existing.push(normalized);
  }
  
  // Write local
  writeFileSync(JSON_PROJECTS_PATH, JSON.stringify(existing, null, 2));

  // Write Supabase
  if (isSupabaseConfigured()) {
    const { error } = await supabase!.from('projects').upsert({ id: normalized.id, data: normalized });
    if (error) {
      console.error("Supabase project update error:", error.message);
      throw new Error(`Supabase update failed: ${error.message}`);
    }
  }
}

export async function getJsonProjects(): Promise<ProjectRecord[]> {
  return readJsonProjects();
}

export async function deleteJsonProject(id: string) {
  // 1. Delete locally to ensure sync
  const existing = await readJsonProjects();
  const filtered = existing.filter((p: ProjectRecord) => p.id !== id);
  writeFileSync(JSON_PROJECTS_PATH, JSON.stringify(filtered, null, 2));

  // 2. Delete from Supabase
  if (isSupabaseConfigured()) {
    const { error } = await supabase!.from('projects').delete().eq('id', id);
    if (error) {
      console.error("Supabase project deletion error:", error.message);
      throw new Error(`Supabase deletion failed: ${error.message}`);
    }
  }
}

async function readJsonClients(): Promise<CRMClient[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase!.from('clients').select('data');
    if (!error && data) {
      return data.map(item => item.data);
    }
  }

  if (existsSync(JSON_CLIENTS_PATH)) {
    try {
      return JSON.parse(readFileSync(JSON_CLIENTS_PATH, "utf-8"));
    } catch {
      return [];
    }
  }
  return [];
}

export async function getJsonClients(): Promise<CRMClient[]> {
  return readJsonClients();
}

export async function updateJsonClient(client: CRMClient) {
  const existing = await readJsonClients();
  const index = existing.findIndex((c: CRMClient) => c.id === client.id);
  if (index !== -1) {
    existing[index] = client;
  } else {
    existing.push(client);
  }
  
  // Write local
  writeFileSync(JSON_CLIENTS_PATH, JSON.stringify(existing, null, 2));

  // Write Supabase
  if (isSupabaseConfigured()) {
    const { error } = await supabase!.from('clients').upsert({ id: client.id, data: client });
    if (error) {
      console.error("Supabase client update error:", error.message);
      throw new Error(`Supabase update failed: ${error.message}`);
    }
  }
}

const SECTION_LABELS: Record<ProjectSection, string> = {
  leads: "Leads Projects",
  ongoing: "Ongoing Projects",
  billed: "Billed Projects",
  failed: "Failed Projects",
  uncategorized: "Uncategorized",
};

const PHASE_LABELS: Record<ProjectPhaseKey, string> = {
  brief: "Project Brief",
  pitching: "Pitching Process",
  revision: "Revision / Negotiation",
  execution: "Execution",
  reporting: "Reporting",
  finance: "Finance",
};

const STAGE_LABELS: Record<WorkflowStage, string> = {
  lead: "Lead",
  pitching: "Pitching",
  negotiation: "Negotiation",
  execution: "Execution",
  reporting: "Reporting",
  finance: "Finance",
  completed: "Completed",
  lost: "Lost",
};

const STAGE_ORDER: WorkflowStage[] = [
  "lead",
  "pitching",
  "negotiation",
  "execution",
  "reporting",
  "finance",
  "completed",
  "lost",
];

const WORKFLOW_SUGGESTIONS: WorkflowSuggestion[] = [
  {
    stage: "lead",
    label: "Lead",
    summary: "Masuk dari hasil networking, repeat client, atau import tracker.",
    rules: ["Isi client, nama project, service line, dan owner", "Tambahkan estimasi tanggal event bila sudah ada", "Masukkan brief status bila sudah ada"],
  },
  {
    stage: "pitching",
    label: "Pitching",
    summary: "Fase deck, proposal, quotation, dan presentasi.",
    rules: ["Proposal dan quotation idealnya sudah ada link", "Kalau presentasi belum siap tetap boleh move dengan note"],
  },
  {
    stage: "negotiation",
    label: "Negotiation",
    summary: "Revisi proposal/quotation dan final alignment sebelum eksekusi.",
    rules: ["Catat deadline revisi", "Gunakan note saat move manual kalau syarat belum lengkap"],
  },
  {
    stage: "execution",
    label: "Execution",
    summary: "Operasional berjalan: kontrak, vendor PO, manpower, checklist, manual book.",
    rules: ["SPK atau kontrak sebaiknya sudah tercatat", "Checklist dan manual book dipantau per project"],
  },
  {
    stage: "reporting",
    label: "Reporting",
    summary: "Penutupan after-event: BAST dan report documentation.",
    rules: ["BAST/report bisa reference dulu", "Jangan tunggu sempurna untuk move, cukup beri catatan"],
  },
  {
    stage: "finance",
    label: "Finance",
    summary: "COGS, PPN, invoice, amount at contract, dan P&L.",
    rules: ["Invoice link sebaiknya sudah tersedia", "Finance bisa monitor partial payment secara terpisah"],
  },
];

function stringValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function slug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function parseCurrency(value: string) {
  const digits = value.replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

function normalizeSection(value: string): ProjectSection {
  const key = value.toLowerCase();

  if (key.includes("leads")) return "leads";
  if (key.includes("ongoing")) return "ongoing";
  if (key.includes("billed")) return "billed";
  if (key.includes("failed")) return "failed";
  return "uncategorized";
}

function parseOwners(value: string) {
  return value
    .split(/\n+/)
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function isUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function hashRow(values: string[]) {
  return createHash("sha1").update(JSON.stringify(values)).digest("hex");
}

function buildPhase(key: ProjectPhaseKey, items: ProjectPhaseItem[]) {
  const populated = items.filter((item) => item.value);
  const status = populated[0]?.value ?? "";
  const completion = items.length === 0 ? 0 : Math.round((populated.length / items.length) * 100);

  return {
    key,
    label: PHASE_LABELS[key],
    status,
    items,
    completion,
  } satisfies ProjectPhase;
}

function deriveStage(section: ProjectSection, phases: ProjectPhase[], status: string, progress: string): WorkflowStage {
  const text = `${status} ${progress}`.toLowerCase();
  const financeReady = phases.find((phase) => phase.key === "finance")?.items.some((item) => item.value);
  const reportingReady = phases.find((phase) => phase.key === "reporting")?.items.some((item) => item.value);
  const executionReady = phases.find((phase) => phase.key === "execution")?.items.some((item) => item.value);
  const revisionReady = phases.find((phase) => phase.key === "revision")?.items.some((item) => item.value);
  const pitchingReady = phases.find((phase) => phase.key === "pitching")?.items.some((item) => item.value);
  const briefReady = phases.find((phase) => phase.key === "brief")?.items.some((item) => item.value);

  if (section === "failed" || text.includes("lost")) return "lost";
  if (text.includes("paid") || text.includes("bast") || section === "billed") {
    return financeReady ? "completed" : "finance";
  }
  if (financeReady) return "finance";
  if (reportingReady) return "reporting";
  if (executionReady || text.includes("order")) return "execution";
  if (revisionReady) return "negotiation";
  if (pitchingReady) return "pitching";
  return "lead";
}

function derivePhaseLabel(phases: ProjectPhase[]) {
  const activePhase = [...phases].reverse().find((phase) => phase.items.some((item) => item.value));
  return activePhase?.label ?? "Discovery";
}

function deriveHealth(section: ProjectSection, status: string, progress: string, phases: ProjectPhase[]) {
  const stateText = `${status} ${progress}`.toLowerCase();
  if (section === "failed") return "stuck";
  if (stateText.includes("waiting") || stateText.includes("lead")) return "watch";
  if (stateText.includes("done") || stateText.includes("paid") || stateText.includes("proceed")) return "on_track";

  const emptyPhaseCount = phases.filter((phase) => phase.completion === 0).length;
  return emptyPhaseCount >= 5 ? "watch" : "on_track";
}

function deriveDocuments(phases: ProjectPhase[]) {
  const stageByPhase: Record<ProjectPhaseKey, WorkflowStage> = {
    brief: "lead",
    pitching: "pitching",
    revision: "negotiation",
    execution: "execution",
    reporting: "reporting",
    finance: "finance",
  };

  return phases.flatMap((phase) =>
    phase.items.map((item, index) => {
      const url = isUrl(item.value) ? item.value : "";
      const status = item.value ? (url ? "available" : "reference") : "missing";

      return {
        id: `${phase.key}-${slug(item.label)}-${index}`,
        title: item.label,
        stage: stageByPhase[phase.key],
        phaseKey: phase.key,
        value: item.value,
        url,
        status,
      } satisfies ProjectDocument;
    }),
  );
}

function taskStatus(value: string) {
  return value ? "done" : "pending";
}

function deriveTasks(phases: ProjectPhase[]) {
  return phases.flatMap((phase) =>
    phase.items.map((item, index) => ({
      id: `${phase.key}-task-${index}`,
      title: item.label,
      stage:
        phase.key === "brief"
          ? "lead"
          : phase.key === "pitching"
            ? "pitching"
            : phase.key === "revision"
              ? "negotiation"
              : phase.key,
      status: taskStatus(item.value),
      required:
        !item.label.toLowerCase().includes("deadline") &&
        !item.label.toLowerCase().includes("ppn") &&
        !item.label.toLowerCase().includes("cogs"),
    })) satisfies ProjectTask[],
  );
}

function deriveActivity(currentStage: WorkflowStage, status: string, progress: string) {
  const activity: ProjectActivity[] = [
    {
      id: "imported",
      type: "imported",
      message: "Project diimpor dari tracker CSV 2026.",
      timestampLabel: "Imported",
    },
  ];

  if (status) {
    activity.push({
      id: "status",
      type: "note",
      message: `Status terakhir: ${status}.`,
      timestampLabel: "Current status",
    });
  }

  if (progress) {
    activity.push({
      id: "progress",
      type: "note",
      message: `Progress monitoring: ${progress}.`,
      timestampLabel: "Current progress",
    });
  }

  activity.push({
    id: "stage",
    type: "stage_change",
    message: `Project saat ini berada di stage ${STAGE_LABELS[currentStage]}.`,
    timestampLabel: "Workflow",
  });

  return activity;
}

function deriveMilestones(phases: ProjectPhase[], eventDate: string, currentStage: WorkflowStage) {
  const phaseValue = (key: ProjectPhaseKey, index: number) => phases.find((phase) => phase.key === key)?.items[index]?.value ?? "";

  return [
    {
      id: "brief-received",
      label: "Brief Received",
      value: phaseValue("brief", 0) || phaseValue("brief", 1),
      done: Boolean(phaseValue("brief", 0) || phaseValue("brief", 1)),
    },
    {
      id: "proposal-sent",
      label: "Proposal Sent",
      value: phaseValue("pitching", 2),
      done: Boolean(phaseValue("pitching", 2)),
    },
    {
      id: "quotation-sent",
      label: "Quotation Sent",
      value: phaseValue("pitching", 3),
      done: Boolean(phaseValue("pitching", 3)),
    },
    {
      id: "contract-signed",
      label: "Contract Signed",
      value: phaseValue("execution", 1),
      done: Boolean(phaseValue("execution", 1)),
    },
    {
      id: "event-day",
      label: "Event Day",
      value: eventDate,
      done: currentStage === "reporting" || currentStage === "finance" || currentStage === "completed",
    },
    {
      id: "report-delivered",
      label: "Report Delivered",
      value: phaseValue("reporting", 2),
      done: Boolean(phaseValue("reporting", 2)),
    },
    {
      id: "invoice-sent",
      label: "Invoice Sent",
      value: phaseValue("finance", 4),
      done: Boolean(phaseValue("finance", 4)),
    },
    {
      id: "payment-received",
      label: "Payment Received",
      value: phaseValue("finance", 0),
      done: currentStage === "completed",
    },
  ] satisfies ProjectMilestone[];
}

function workbookRows() {
  const buffer = readFileSync(SOURCE_PATH);
  const workbook = XLSX.read(buffer, { type: "buffer", raw: false, cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(sheet, {
    header: 1,
    raw: false,
    defval: "",
  });
}

function parseProjectsFromRows(rows: (string | number | Date | null)[][]) {
  const projects: ProjectRecord[] = [];
  let currentSection: ProjectSection = "uncategorized";

  for (let index = 6; index < rows.length; index += 1) {
    const cells = rows[index].map((cell) => stringValue(cell));
    const marker = cells[1];

    if (marker && !cells[2] && !cells[3]) {
      currentSection = normalizeSection(marker);
      continue;
    }

    if (!cells[2] && !cells[3]) {
      continue;
    }

    const phases = [
      buildPhase("brief", [
        { label: "Brief Status", value: cells[14] },
        { label: "TOR / Brief Deck", value: cells[15] },
        { label: "Document A", value: cells[16] },
      ]),
      buildPhase("pitching", [
        { label: "Pitching Status", value: cells[17] },
        { label: "Pitching Deadline", value: cells[18] },
        { label: "Proposal", value: cells[19] },
        { label: "Quotation", value: cells[20] },
        { label: "Presentation", value: cells[21] },
      ]),
      buildPhase("revision", [
        { label: "Revision Status", value: cells[22] },
        { label: "Revision Deadline", value: cells[23] },
        { label: "Revision Proposal", value: cells[24] },
        { label: "Revision Quotation", value: cells[25] },
      ]),
      buildPhase("execution", [
        { label: "Execution Status", value: cells[26] },
        { label: "Contract / SPK Client", value: cells[27] },
        { label: "PO to Vendor", value: cells[28] },
        { label: "Manpower Contract", value: cells[29] },
        { label: "Checklist", value: cells[30] },
        { label: "Manual Book", value: cells[31] },
      ]),
      buildPhase("reporting", [
        { label: "Reporting Status", value: cells[32] },
        { label: "BAST", value: cells[33] },
        { label: "Report Documentation", value: cells[34] },
      ]),
      buildPhase("finance", [
        { label: "Finance Status", value: cells[35] },
        { label: "COGS", value: cells[36] },
        { label: "PPN", value: cells[37] },
        { label: "Amount at Contract", value: cells[38] },
        { label: "Invoice", value: cells[39] },
        { label: "P & L Document", value: cells[40] },
      ]),
    ];

    const status = cells[11] || cells[17] || cells[22] || cells[26] || cells[32] || cells[35];
    const progress = cells[12];
    const currentStage = deriveStage(currentSection, phases, status, progress);
    const projectValue = parseCurrency(cells[9]);
    const client = cells[2] || "Unknown Client";
    const projectName = cells[3] || "Untitled Project";
    const id = `${slug(client)}-${slug(projectName)}-${hashRow(cells).slice(0, 8)}`;
    const documents = deriveDocuments(phases);
    const tasks = deriveTasks(phases);

    projects.push({
      id,
      numberLabel: cells[1],
      client,
      projectName,
      contactPerson: cells[4],
      relation: cells[5],
      category: cells[6],
      owners: parseOwners(cells[7]),
      eventDate: cells[8],
      projectValue,
      projectValueLabel: projectValue ? formatCurrency(projectValue) : "-",
      serviceLine: cells[10] || "-",
      status,
      progress,
      credentials: cells[13],
      remark: cells[41],
      section: currentSection,
      sectionLabel: SECTION_LABELS[currentSection],
      health: deriveHealth(currentSection, status, progress, phases),
      currentStage,
      currentStageLabel: STAGE_LABELS[currentStage],
      financeStatus: cells[35] || "-",
      resultLabel: currentStage === "lost" ? "Lost" : currentStage === "completed" ? "Completed" : "In progress",
      phaseLabel: derivePhaseLabel(phases),
      phases,
      tasks,
      documents,
      milestones: deriveMilestones(phases, cells[8], currentStage),
      activity: deriveActivity(currentStage, status, progress),
      searchableText: [
        client,
        projectName,
        cells[4],
        cells[5],
        cells[6],
        cells[7],
        cells[10],
        status,
        progress,
        STAGE_LABELS[currentStage],
      ]
        .join(" ")
        .toLowerCase(),
    });
  }

  return projects;
}

export async function getProjectDashboardData(): Promise<ProjectDashboardData> {
  if (!existsSync(SOURCE_PATH)) {
    return {
      projects: [],
      sourcePath: SOURCE_PATH,
      sourceAvailable: false,
      summary: {
        totalProjects: 0,
        activeProjects: 0,
        leadsProjects: 0,
        totalPipelineValue: 0,
        totalPipelineValueLabel: formatCurrency(0),
        averageDealSizeLabel: formatCurrency(0),
        documentsAvailable: 0,
        documentsMissing: 0,
      },
      sections: [],
      stages: [],
      workflowSuggestions: WORKFLOW_SUGGESTIONS,
      serviceLines: [],
      categories: [],
      availableVendors: [],
    };
  }

  const jsonProjects = await readJsonProjects();
  let projects: ProjectRecord[] = [];

  if (jsonProjects.length > 0) {
    projects = jsonProjects.map((p: ProjectRecord) => normalizeProject(p));
  } else {
    const csvProjects = workbookRows() ? parseProjectsFromRows(workbookRows()) : [];
    projects = csvProjects.map((p: ProjectRecord) => normalizeProject(p));
  }

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
  };
}
