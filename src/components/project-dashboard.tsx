"use client";

import Link from "next/link";
import { CSSProperties, WheelEvent, useEffect, useState, useTransition } from "react";

import {
  ProjectDashboardData,
  ProjectDocument,
  ProjectMilestone,
  ProjectPhase,
  ProjectRecord,
  ProjectTask,
  WorkflowStage,
  CRMClient,
} from "@/lib/project/types";
import { WorkspaceShell } from "./layout/workspace-shell";
import { SummaryCard } from "./ui/summary-card";
import { StatusPill } from "./ui/status-pill";

type ViewMode = "overview" | "list" | "table" | "board" | "documents";
type EditableField =
  | "projectName"
  | "client"
  | "eventDate"
  | "contactPerson"
  | "progress"
  | "status"
  | "serviceLine"
  | "remark";

const VIEW_OPTIONS: { id: ViewMode; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "list", label: "List" },
  { id: "table", label: "Table" },
  { id: "board", label: "Board" },
  { id: "documents", label: "Documents" },
];

const STAGE_OPTIONS: { key: WorkflowStage; label: string }[] = [
  { key: "lead", label: "Lead" },
  { key: "qualified", label: "Qualified" },
  { key: "pitching", label: "Pitching" },
  { key: "negotiation", label: "Negotiation" },
  { key: "execution", label: "Execution" },
  { key: "reporting", label: "Reporting" },
  { key: "finance", label: "Finance" },
  { key: "completed", label: "Completed" },
  { key: "lost", label: "Lost" },
];

const STORAGE_KEY = "juara-project-tracker-projects-v2";
const THEME_STORAGE_KEY = "juara-project-tracker-theme";

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

function toneClass(value: ProjectRecord["health"]) {
  if (value === "on_track") return "tone-green";
  if (value === "watch") return "tone-amber";
  return "tone-red";
}

function toneLabel(value: ProjectRecord["health"]) {
  if (value === "on_track") return "On track";
  if (value === "watch") return "Perlu dipantau";
  return "Butuh atensi";
}

function docTone(status: ProjectDocument["status"]) {
  if (status === "available") return "tone-green";
  if (status === "reference") return "tone-amber";
  return "tone-red";
}

function docLabel(status: ProjectDocument["status"]) {
  if (status === "available") return "Link ready";
  if (status === "reference") return "Reference only";
  return "Missing";
}

function phaseTone(phase: ProjectPhase) {
  if (phase.completion >= 75) return "tone-green";
  if (phase.completion > 0) return "tone-amber";
  return "tone-slate";
}

function matchesProject(project: ProjectRecord, query: string, stage: WorkflowStage | "all") {
  const normalized = query.trim().toLowerCase();
  if (stage !== "all" && project.currentStage !== stage) return false;
  if (!normalized) return true;
  return (project.searchableText || "").includes(normalized);
}

function sectionFromStage(stage: WorkflowStage): ProjectRecord["section"] {
  if (stage === "lost") return "failed";
  if (stage === "completed") return "billed";
  if (["execution", "reporting", "finance"].includes(stage)) return "ongoing";
  return "leads";
}

function resultLabelFromStage(stage: WorkflowStage) {
  if (stage === "lost") return "Lost";
  if (stage === "completed") return "Completed";
  return "In progress";
}

function pendingTaskWarnings(project: ProjectRecord, targetStage: WorkflowStage) {
  return (project.tasks || []).filter((task) => task.stage === targetStage && task.required && task.status !== "done");
}

function pendingDocumentWarnings(project: ProjectRecord, targetStage: WorkflowStage) {
  return (project.documents || []).filter((document) => document.stage === targetStage && document.status !== "available");
}

function BoardCard({
  project,
  active,
  onSelect,
}: {
  project: ProjectRecord;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button type="button" className={active ? "board-card active-card" : "board-card"} onClick={onSelect}>
      <div className="project-card-top">
        <span className="mini-stage">{project.currentStageLabel || "No Stage"}</span>
        <span className={`status-pill ${toneClass(project.health || "on_track")}`}>
          {toneLabel(project.health || "on_track")}
        </span>
      </div>
      <h3>{project.projectName || "Unnamed Project"}</h3>
      <p className="client-line">{project.client || "No Client"}</p>
      <div className="mini-meta">
        <span>{project.eventDate || "Tanggal belum ada"}</span>
        <span>{project.projectValueLabel || "-"}</span>
      </div>
    </button>
  );
}

function PropertyRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="property-row">
      <span>{label}</span>
      <strong>{value || "-"}</strong>
    </div>
  );
}

function mergeProjectsWithInitial(source: ProjectRecord[], fallback: ProjectRecord[]) {
  return source.map((project) => {
    const initialMatch = fallback.find((item) => item.id === project.id);
    if (!initialMatch) return project;

    return {
      ...initialMatch,
      ...project,
      milestones: project.milestones ?? initialMatch.milestones,
      tasks: project.tasks ?? initialMatch.tasks,
      documents: project.documents ?? initialMatch.documents,
      activity: project.activity ?? initialMatch.activity,
      phases: project.phases ?? initialMatch.phases,
      assignedVendors: initialMatch.assignedVendors ?? project.assignedVendors,
      vendorShortlist: initialMatch.vendorShortlist ?? project.vendorShortlist,
      vendorRequirements: initialMatch.vendorRequirements ?? project.vendorRequirements,
    };
  });
}

export function ProjectDashboard({ initialData }: { initialData: ProjectDashboardData }) {
  const [projects, setProjects] = useState(() => {
    if (typeof window === "undefined") {
      return initialData.projects;
    }

    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return initialData.projects;
    }

    try {
      const parsed = JSON.parse(saved) as ProjectRecord[];
      return Array.isArray(parsed) && parsed.length > 0
        ? mergeProjectsWithInitial(parsed, initialData.projects)
        : initialData.projects;
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      return initialData.projects;
    }
  });
  const [view, setView] = useState<ViewMode>("overview");
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<WorkflowStage | "all">("all");
  const [selectedProjectId, setSelectedProjectId] = useState(initialData.projects[0]?.id ?? "");
  const [moveTargetStage, setMoveTargetStage] = useState<WorkflowStage>("qualified");
  const [moveNote, setMoveNote] = useState("");
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [dragMoveProjectId, setDragMoveProjectId] = useState<string | null>(null);
  const [dragMoveTargetStage, setDragMoveTargetStage] = useState<WorkflowStage>("lead");
  const [dragMoveOpen, setDragMoveOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [draggingProjectId, setDraggingProjectId] = useState<string | null>(null);
  const [boardZoom, setBoardZoom] = useState(1);
  const [boardDense, setBoardDense] = useState(true);
  const [assignmentVendorId, setAssignmentVendorId] = useState(initialData.availableVendors[0]?.id ?? "");
  const [shortlistVendorId, setShortlistVendorId] = useState(initialData.availableVendors[0]?.id ?? "");
  const [shortlistNote, setShortlistNote] = useState("");
  const [shortlistQuotedPrice, setShortlistQuotedPrice] = useState("");
  const [assignmentPending, startAssignmentTransition] = useTransition();
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectModalMode, setProjectModalMode] = useState<"add" | "edit">("add");
  const [projectFormData, setProjectFormData] = useState<Partial<ProjectRecord>>({});
  const [clients, setClients] = useState<CRMClient[]>([]);
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [clientFormData, setClientFormData] = useState<Partial<CRMClient>>({
    status: "active",
    type: "brand",
    category: "BRAND",
    contacts: [],
    projects: []
  });

  const fetchClients = async () => {
    try {
      const res = await fetch("/api/clients");
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (err) {
      console.error("Fetch clients error", err);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleSaveNewClient = async () => {
    if (!clientFormData.name) {
      alert("Nama Perusahaan wajib diisi.");
      return;
    }

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clientFormData),
      });
      if (res.ok) {
        const result = await res.json();
        await fetchClients();
        setIsAddClientModalOpen(false);
        if (result.client) {
          setProjectFormData(prev => ({ ...prev, client: result.client.name }));
        }
      } else {
        alert("Gagal menyimpan klien.");
      }
    } catch (err) {
      console.error("Save client error", err);
      alert("Terjadi kesalahan teknis saat menyimpan klien.");
    }
  };

  const handleSaveProject = async () => {
    if (!projectFormData.projectName || !projectFormData.client) {
      alert("Nama Proyek dan Nama Client wajib diisi.");
      return;
    }

    const endpoint = "/api/projects";
    const method = projectModalMode === "add" ? "POST" : "PUT";
    
    try {
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectFormData),
      });
      if (res.ok) {
        setIsProjectModalOpen(false);
        window.location.reload(); 
      } else {
        alert("Gagal menyimpan proyek. Silakan coba lagi.");
      }
    } catch (err) {
      console.error("Save error", err);
      alert("Terjadi kesalahan teknis saat menyimpan.");
    }
  };

  const handleDeleteProject = async (projectToDelete?: Partial<ProjectRecord>) => {
    const target = projectToDelete || projectFormData;
    if (!target.id) return;
    
    if (!confirm(`Apakah Anda yakin ingin menghapus proyek "${target.projectName}"? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/projects/${target.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setIsProjectModalOpen(false);
        setDetailOpen(false);
        window.location.reload();
      } else {
        alert("Gagal menghapus proyek.");
      }
    } catch (err) {
      console.error("Delete error", err);
      alert("Terjadi kesalahan teknis saat menghapus.");
    }
  };

  const openAddProjectModal = () => {
    setProjectModalMode("add");
    setProjectFormData({ 
      currentStage: "lead", 
      status: "lead", 
      projectValue: 0, 
      owners: [], 
      tasks: [], 
      documents: [], 
      activity: [], 
      milestones: [] 
    });
    setIsProjectModalOpen(true);
  };

  const openEditProjectModal = (project: ProjectRecord) => {
    setProjectModalMode("edit");
    setProjectFormData(project);
    setIsProjectModalOpen(true);
  };
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") {
      return "dark";
    }

    return window.localStorage.getItem(THEME_STORAGE_KEY) === "light" ? "light" : "dark";
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const filteredProjects = projects.filter((project) => matchesProject(project, query, stageFilter));
  const selectedProject =
    projects.find((project) => project.id === selectedProjectId) ??
    filteredProjects[0] ??
    projects[0] ??
    null;

  const documents = filteredProjects.flatMap((project) =>
    project.documents.map((document) => ({
      ...document,
      projectId: project.id,
      projectName: project.projectName,
      client: project.client,
    })),
  );

  const timelineMilestones = [...projects]
    .flatMap((project) =>
      (project.milestones ?? []).map((milestone) => ({
        ...milestone,
        projectId: project.id,
        projectName: project.projectName,
        client: project.client,
      })),
    )
    .filter((milestone) => milestone.value)
    .slice(0, 12);

  const stageStats = STAGE_OPTIONS.map((stage) => ({
    ...stage,
    count: projects.filter((project) => project.currentStage === stage.key).length,
  }));

  const summary = {
    totalProjects: projects.length,
    activeProjects: projects.filter((project) => ["execution", "reporting", "finance"].includes(project.currentStage))
      .length,
    leadsProjects: projects.filter((project) => ["lead", "qualified", "pitching"].includes(project.currentStage)).length,
    totalValue: projects.reduce((sum, project) => sum + project.projectValue, 0),
    totalValueLabel: new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(projects.reduce((sum, project) => sum + project.projectValue, 0)),
    documentsAvailable: projects.flatMap((project) => project.documents).filter((item) => item.status === "available")
      .length,
  };

  const moveWarnings = selectedProject ? pendingTaskWarnings(selectedProject, moveTargetStage) : [];
  const documentWarnings = selectedProject ? pendingDocumentWarnings(selectedProject, moveTargetStage) : [];
  const dragMoveProject = dragMoveProjectId ? projects.find((project) => project.id === dragMoveProjectId) ?? null : null;
  const dragTaskWarnings =
    dragMoveProject && dragMoveOpen ? pendingTaskWarnings(dragMoveProject, dragMoveTargetStage) : [];
  const dragDocumentWarnings =
    dragMoveProject && dragMoveOpen ? pendingDocumentWarnings(dragMoveProject, dragMoveTargetStage) : [];
  const activeStageTasks = selectedProject
    ? selectedProject.tasks.filter((task) => task.required && task.stage === selectedProject.currentStage)
    : [];
  const assignableVendors = initialData.availableVendors.filter(
    (vendor) => !selectedProject?.assignedVendors?.some((item) => item.vendorId === vendor.id),
  );
  const shortlistableVendors = initialData.availableVendors.filter(
    (vendor) => !selectedProject?.vendorShortlist?.some((item) => item.vendorId === vendor.id),
  );
  const activeAssignmentVendorId = assignableVendors.some((vendor) => vendor.id === assignmentVendorId)
    ? assignmentVendorId
    : (assignableVendors[0]?.id ?? "");
  const activeShortlistVendorId = shortlistableVendors.some((vendor) => vendor.id === shortlistVendorId)
    ? shortlistVendorId
    : (shortlistableVendors[0]?.id ?? "");

  function toggleTask(projectId: string, taskId: string) {
    setProjects((current) =>
      current.map((project) =>
        project.id !== projectId
          ? project
          : {
              ...project,
              tasks: project.tasks.map((task) =>
                task.id === taskId ? { ...task, status: task.status === "done" ? "pending" : "done" } : task,
              ),
            },
      ),
    );
  }

  function updateProjectField(projectId: string, field: EditableField, value: string) {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    
    const updated = {
      ...project,
      [field]: value
    };

    // Update local state and storage
    setProjects((current) => current.map((p) => p.id === projectId ? updated : p));
    
    // Persist to API
    fetch("/api/projects", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
  }

  function updateProjectMeta(projectId: string, key: "owners" | "projectValue", value: string) {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    let updated: ProjectRecord;
    if (key === "owners") {
      const owners = value.split(",").map((item) => item.trim()).filter(Boolean);
      updated = { ...project, owners };
    } else {
      const projectValue = parseCurrency(value);
      updated = { ...project, projectValue, projectValueLabel: projectValue ? formatCurrency(projectValue) : "-" };
    }

    setProjects((current) => current.map((p) => p.id === projectId ? updated : p));

    fetch("/api/projects", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
  }

  function updateDocument(projectId: string, documentId: string, value: string) {
    setProjects((current) =>
      current.map((project) =>
        project.id !== projectId
          ? project
          : {
              ...project,
              documents: project.documents.map((document) =>
                document.id !== documentId
                  ? document
                  : {
                      ...document,
                      value,
                      url: /^https?:\/\//i.test(value) ? value : "",
                      status: value ? (/^https?:\/\//i.test(value) ? "available" : "reference") : "missing",
                    }
              ),
            },
      ),
    );
  }

  function updateMilestone(projectId: string, milestoneId: string, field: "value" | "done", value: string | boolean) {
    setProjects((current) =>
      current.map((project) =>
        project.id !== projectId
          ? project
          : {
              ...project,
              milestones: (project.milestones ?? []).map((milestone) =>
                milestone.id !== milestoneId ? milestone : { ...milestone, [field]: value },
              ),
            },
      ),
    );
  }

  function openMoveModal(project: ProjectRecord) {
    setSelectedProjectId(project.id);
    setMoveTargetStage(project.currentStage);
    setMoveNote("");
    setMoveModalOpen(true);
  }

  function selectProject(projectId: string, openDetail = false) {
    setSelectedProjectId(projectId);
    if (openDetail) setDetailOpen(true);
  }

  function applyStageMove(projectId: string, targetStage: WorkflowStage, note?: string) {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const nextLabel = STAGE_OPTIONS.find((item) => item.key === targetStage)?.label ?? targetStage;
    const updated: ProjectRecord = {
      ...project,
      currentStage: targetStage,
      currentStageLabel: nextLabel,
      section: sectionFromStage(targetStage),
      sectionLabel:
        targetStage === "lost"
          ? "Failed Projects"
          : targetStage === "completed"
            ? "Billed Projects"
            : ["execution", "reporting", "finance"].includes(targetStage)
              ? "Ongoing Projects"
              : "Leads Projects",
      resultLabel: resultLabelFromStage(targetStage),
      activity: [
        {
          id: `move-${Date.now()}`,
          type: "stage_change",
          message: `${note ?? `Manual move ke stage ${nextLabel}.`}`,
          timestampLabel: "Just now",
        },
        ...project.activity,
      ],
    };

    setProjects((current) => current.map((p) => p.id === projectId ? updated : p));

    fetch("/api/projects", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
  }

  function handleBoardDrop(targetStage: WorkflowStage) {
    if (!draggingProjectId) return;
    setDragMoveProjectId(draggingProjectId);
    setDragMoveTargetStage(targetStage);
    setDragMoveOpen(true);
    setDraggingProjectId(null);
  }

  function confirmDragMove() {
    if (!dragMoveProjectId) return;
    const nextLabel = STAGE_OPTIONS.find((item) => item.key === dragMoveTargetStage)?.label ?? dragMoveTargetStage;
    applyStageMove(dragMoveProjectId, dragMoveTargetStage, `Drag & drop ke stage ${nextLabel}.`);
    setDragMoveOpen(false);
    setDragMoveProjectId(null);
  }

  function cancelDragMove() {
    setDragMoveOpen(false);
    setDragMoveProjectId(null);
  }

  function handleBoardWheel(event: WheelEvent<HTMLDivElement>) {
    if (!(event.ctrlKey || event.metaKey)) return;
    event.preventDefault();
    const nextZoom = Math.min(1.4, Math.max(0.75, boardZoom - event.deltaY * 0.0015));
    setBoardZoom(Number(nextZoom.toFixed(2)));
  }

  function confirmMoveStage() {
    if (!selectedProject) return;
    const nextLabel = STAGE_OPTIONS.find((item) => item.key === moveTargetStage)?.label ?? moveTargetStage;
    applyStageMove(
      selectedProject.id,
      moveTargetStage,
      `Manual move ke stage ${nextLabel}${moveNote ? ` dengan catatan: ${moveNote}` : "."}`,
    );
    setMoveModalOpen(false);
  }

  function assignVendor(projectId: string) {
    if (!activeAssignmentVendorId) return;

    startAssignmentTransition(async () => {
      const response = await fetch("/api/project-vendor-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          vendorId: activeAssignmentVendorId,
        }),
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as { link: { id: string } };

      const selectedOption = initialData.availableVendors.find((vendor) => vendor.id === activeAssignmentVendorId);
      if (!selectedOption) return;

      setProjects((current) =>
        current.map((project) =>
          project.id !== projectId
            ? project
            : {
                ...project,
                assignedVendors: [
                  ...(project.assignedVendors ?? []).map((vendor) => ({
                    ...vendor,
                    averageScore: vendor.averageScore ?? 0,
                  })),
                  {
                    linkId: payload.link.id,
                    vendorId: selectedOption.id,
                    vendorName: selectedOption.name,
                    vendorType: selectedOption.serviceNames[0] || "-",
                    coverageArea: selectedOption.coverageArea,
                    whatsappPhone: selectedOption.whatsappPhone,
                    averageScore: selectedOption.averageScore,
                  },
                ],
              },
        ),
      );
    });
  }

  function removeAssignedVendor(projectId: string, linkId: string) {
    startAssignmentTransition(async () => {
      await fetch("/api/project-vendor-links", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkId }),
      });

      setProjects((current) =>
        current.map((project) =>
          project.id !== projectId
            ? project
            : {
                ...project,
                assignedVendors: (project.assignedVendors ?? []).filter((vendor) => vendor.linkId !== linkId),
              },
        ),
      );
    });
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  function shortlistVendor(projectId: string) {
    if (!activeShortlistVendorId || !selectedProject) return;

    startAssignmentTransition(async () => {
      const response = await fetch("/api/project-vendor-shortlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          vendorId: activeShortlistVendorId,
          serviceLine: selectedProject.serviceLine,
          note: shortlistNote,
          quotedPrice: parseCurrency(shortlistQuotedPrice),
        }),
      });

      if (!response.ok) return;

      const payload = (await response.json()) as { shortlist: { id: string } };
      const selectedOption = initialData.availableVendors.find((vendor) => vendor.id === activeShortlistVendorId);
      if (!selectedOption) return;

      setProjects((current) =>
        current.map((project) =>
          project.id !== projectId
            ? project
            : {
                ...project,
                vendorShortlist: [
                  ...(project.vendorShortlist ?? []).map((vendor) => ({
                    ...vendor,
                    averageScore: vendor.averageScore ?? 0,
                  })),
                  {
                    linkId: payload.shortlist.id,
                    vendorId: selectedOption.id,
                    vendorName: selectedOption.name,
                    vendorType: selectedOption.serviceNames[0] || "-",
                    coverageArea: selectedOption.coverageArea,
                    whatsappPhone: selectedOption.whatsappPhone,
                    averageScore: selectedOption.averageScore,
                    serviceLine: selectedProject.serviceLine,
                    status: "shortlisted",
                    note: shortlistNote,
                    quotedPrice: parseCurrency(shortlistQuotedPrice),
                  },
                ],
              },
        ),
      );
      setShortlistNote("");
      setShortlistQuotedPrice("");
    });
  }

  function updateShortlist(shortlistId: string, status: "shortlisted" | "contacted" | "quoted" | "selected") {
    startAssignmentTransition(async () => {
      const response = await fetch("/api/project-vendor-shortlists", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shortlistId, status }),
      });
      if (!response.ok) return;

      setProjects((current) =>
        current.map((project) => ({
          ...project,
          vendorShortlist: (project.vendorShortlist ?? []).map((vendor) =>
            vendor.linkId === shortlistId ? { ...vendor, status } : vendor,
          ),
        })),
      );
    });
  }

  function removeShortlist(shortlistId: string) {
    startAssignmentTransition(async () => {
      const response = await fetch("/api/project-vendor-shortlists", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shortlistId }),
      });
      if (!response.ok) return;

      setProjects((current) =>
        current.map((project) => ({
          ...project,
          vendorShortlist: (project.vendorShortlist ?? []).filter((vendor) => vendor.linkId !== shortlistId),
        })),
      );
    });
  }

  const headerActions = (
    <>
      <button type="button" className="ghost-button" onClick={() => setDetailOpen(true)} disabled={!selectedProject}>
        Open detail
      </button>
      <button type="button" className="primary-button" style={{ borderRadius: '8px', padding: '0 16px', height: '36px' }} onClick={openAddProjectModal}>
        + Add Project
      </button>
      <button
        type="button"
        className="ghost-button"
        onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
      >
        {theme === "dark" ? "Light" : "Dark"}
      </button>
      <button type="button" className="ghost-button" onClick={logout}>
        Logout
      </button>
    </>
  );

  return (
    <WorkspaceShell
      title="JUARA'S PROJECTS 2026"
      eyebrow={initialData.sourceAvailable ? "DATABASE READY" : "SOURCE MISSING"}
      actions={headerActions}
    >
      <div className="summary-deck" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <SummaryCard 
          label="Total Projects" 
          value={String(summary.totalProjects)} 
          description="Projects in workspace"
          icon="📊" 
        />
        <SummaryCard 
          label="Active Projects" 
          value={String(summary.activeProjects)} 
          description="In execution/finance"
          icon="⚡" 
        />
        <SummaryCard 
          label="Leads" 
          value={String(summary.leadsProjects)} 
          description="New opportunities"
          icon="🎯" 
        />
        <SummaryCard 
          label="Total Value" 
          value={summary.totalValueLabel} 
          description="Account worth"
          icon="💰" 
        />
      </div>

      <section className="pm-toolbar panel">

        <section className="pm-toolbar panel">
          <div className="database-header">
            <div className="view-switch database-tabs">
              {VIEW_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={view === option.id ? "chip active" : "chip"}
                  onClick={() => setView(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="database-tools">
              <span>{summary.totalProjects} projects</span>
              <span>{summary.totalValueLabel}</span>
              <span>{summary.documentsAvailable} linked docs</span>
            </div>
          </div>

          <div className="control-bar">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari client, project, PIC, service, status, atau stage"
            />
            <select value={stageFilter} onChange={(event) => setStageFilter(event.target.value as WorkflowStage | "all")}>
              <option value="all">Semua stage</option>
              {STAGE_OPTIONS.map((stage) => (
                <option key={stage.key} value={stage.key}>
                  {stage.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="pm-stage-strip">
          {stageStats.map((item) => (
            <article key={item.key} className="pm-stage-cell">
              <span>{item.label}</span>
              <strong>{item.count}</strong>
            </article>
          ))}
        </section>

        <section className="pm-content">
          <div className="panel main-panel">
          {view === "overview" ? (
            <div className="view-stack">
              <div className="summary-grid">
                <article className="summary-card">
                  <span>Total Project</span>
                  <strong>{summary.totalProjects}</strong>
                  <small>Project aktif di workspace</small>
                </article>
                <article className="summary-card">
                  <span>Need Attention</span>
                  <strong>{projects.filter((project) => project.health !== "on_track").length}</strong>
                  <small>Perlu follow up atau keputusan cepat</small>
                </article>
                <article className="summary-card">
                  <span>Pipeline Value</span>
                  <strong>{summary.totalValueLabel}</strong>
                  <small>Estimasi nilai seluruh pipeline</small>
                </article>
                <article className="summary-card">
                  <span>Linked Docs</span>
                  <strong>{summary.documentsAvailable}</strong>
                  <small>Sudah bisa dibuka langsung</small>
                </article>
              </div>

              <article className="feature-panel">
                <p className="panel-kicker">Focus Projects</p>
                <div className="project-list compact-list">
                  {filteredProjects.slice(0, 8).map((project) => (
                    <button
                      key={project.id}
                      type="button"
                      className={project.id === selectedProject?.id ? "project-card active-card" : "project-card"}
                      onClick={() => selectProject(project.id, true)}
                    >
                      <div className="project-card-top">
                        <span className="section-pill">{project.currentStageLabel}</span>
                        <span className={`status-pill ${toneClass(project.health)}`}>{toneLabel(project.health)}</span>
                      </div>
                      <h3>{project.projectName}</h3>
                      <p className="client-line">{project.client}</p>
                      <div className="mini-meta">
                        <span>{project.eventDate || "Tanggal belum ada"}</span>
                        <span>{project.projectValueLabel}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </article>

              <article className="feature-panel">
                <p className="panel-kicker">Upcoming Milestones</p>
                <div className="timeline-list">
                  {timelineMilestones.map((milestone) => (
                    <article key={`${milestone.projectId}-${milestone.id}`} className="timeline-item">
                      <span>{milestone.label}</span>
                      <strong>{milestone.value}</strong>
                      <small>
                        {milestone.projectName} • {milestone.client}
                      </small>
                    </article>
                  ))}
                </div>
              </article>
            </div>
          ) : null}

          {view === "list" ? (
            <div className="project-list">
              {filteredProjects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  className={project.id === selectedProject?.id ? "project-card active-card" : "project-card"}
                  onClick={() => selectProject(project.id, true)}
                >
                  <div className="project-card-top">
                    <span className="section-pill">{project.currentStageLabel}</span>
                    <span className={`status-pill ${toneClass(project.health)}`}>{toneLabel(project.health)}</span>
                  </div>
                  <h3>{project.projectName}</h3>
                  <p className="client-line">{project.client}</p>
                  <dl className="meta-grid">
                    <div>
                      <dt>PIC</dt>
                      <dd>{project.owners[0] || "-"}</dd>
                    </div>
                    <div>
                      <dt>Stage</dt>
                      <dd>{project.currentStageLabel}</dd>
                    </div>
                    <div>
                      <dt>Event</dt>
                      <dd>{project.eventDate || "-"}</dd>
                    </div>
                    <div>
                      <dt>Value</dt>
                      <dd>{project.projectValueLabel}</dd>
                    </div>
                  </dl>
                </button>
              ))}
            </div>
          ) : null}

          {view === "table" ? (
            <div className="table-shell">
              <div className="project-table">
                <div className="table-row table-head">
                  <span>Project</span>
                  <span>Client</span>
                  <span>Stage</span>
                  <span>PIC</span>
                  <span>Event</span>
                  <span>Value</span>
                  <span>Docs</span>
                </div>
                {filteredProjects.map((project) => (
                  <div key={project.id} className={project.id === selectedProject?.id ? "table-row active-table-row" : "table-row"}>
                    <input
                      value={project.projectName}
                      onFocus={() => setSelectedProjectId(project.id)}
                      onChange={(event) => updateProjectField(project.id, "projectName", event.target.value)}
                    />
                    <input value={project.client} onChange={(event) => updateProjectField(project.id, "client", event.target.value)} />
                    <select
                      value={project.currentStage}
                      onChange={(event) => {
                        setSelectedProjectId(project.id);
                        setMoveTargetStage(event.target.value as WorkflowStage);
                        setMoveNote("Updated from table");
                        setMoveModalOpen(true);
                      }}
                    >
                      {STAGE_OPTIONS.map((stage) => (
                        <option key={stage.key} value={stage.key}>
                          {stage.label}
                        </option>
                      ))}
                    </select>
                    <input value={project.owners[0] || ""} onChange={(event) => updateProjectMeta(project.id, "owners", event.target.value)} />
                    <input value={project.eventDate} onChange={(event) => updateProjectField(project.id, "eventDate", event.target.value)} />
                    <input
                      value={project.projectValue ? String(project.projectValue) : ""}
                      onChange={(event) => updateProjectMeta(project.id, "projectValue", event.target.value)}
                    />
                    <span className="table-doc-count">{project.documents.filter((item) => item.status === "available").length}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {view === "board" ? (
            <div className="board-view-wrap">
              <div className="board-zoom-toolbar">
                <span>Board zoom</span>
                <button type="button" className="ghost-button" onClick={() => setBoardZoom((current) => Math.max(0.75, current - 0.1))}>
                  -
                </button>
                <strong>{Math.round(boardZoom * 100)}%</strong>
                <button type="button" className="ghost-button" onClick={() => setBoardZoom((current) => Math.min(1.4, current + 0.1))}>
                  +
                </button>
                <button type="button" className="ghost-button" onClick={() => setBoardZoom(1)}>
                  Reset
                </button>
                <small>Pinch trackpad untuk zoom in/out</small>
              </div>
              <button
                type="button"
                className={boardDense ? "ghost-button active-ghost" : "ghost-button"}
                onClick={() => setBoardDense((current) => !current)}
              >
                {boardDense ? "Dense on" : "Dense off"}
              </button>
              <div className="board-zoom-shell" onWheel={handleBoardWheel}>
                <div
                  className={boardDense ? "board-grid board-grid-dense" : "board-grid"}
                  style={{ "--board-scale": boardZoom } as CSSProperties}
                >
                  {STAGE_OPTIONS.map((stage) => {
                    const stageProjects = filteredProjects.filter((project) => project.currentStage === stage.key);

                    return (
                      <section
                        key={stage.key}
                        className={`board-column stage-${stage.key}`}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => handleBoardDrop(stage.key)}
                      >
                        <div className="board-column-head">
                          <strong>{stage.label}</strong>
                          <span>{stageProjects.length}</span>
                        </div>
                        <div className="board-column-body">
                          {stageProjects.map((project) => (
                            <div
                              key={project.id}
                              draggable
                              className={draggingProjectId === project.id ? "board-draggable is-dragging" : "board-draggable"}
                              onDragStart={() => setDraggingProjectId(project.id)}
                              onDragEnd={() => setDraggingProjectId(null)}
                            >
                              <BoardCard
                                project={project}
                                active={project.id === selectedProject?.id}
                                onSelect={() => selectProject(project.id, true)}
                              />
                            </div>
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}

          {view === "documents" ? (
            <div className="documents-grid">
              {documents.map((document) => (
                <article key={`${document.projectId}-${document.id}`} className="document-card">
                  <div className="project-card-top">
                    <span className={`status-pill ${docTone(document.status)}`}>{docLabel(document.status)}</span>
                    <span className="section-pill">{document.stage}</span>
                  </div>
                  <h3>{document.title}</h3>
                  <p className="client-line">
                    {document.client} • {document.projectName}
                  </p>
                  <p className="document-value">{document.value || "Belum ada link atau reference."}</p>
                  <div className="document-actions">
                    {document.url ? (
                      <Link href={document.url} target="_blank" rel="noreferrer" className="doc-link">
                        Open link
                      </Link>
                    ) : (
                      <span className="doc-muted">Belum ada URL aktif</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </div>

        </section>
      </section>

      {detailOpen && selectedProject ? (
        <div className="detail-modal-backdrop" onClick={() => setDetailOpen(false)}>
          <div className="panel detail-panel detail-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="detail-head">
              <div>
                <p className="panel-kicker">{selectedProject.currentStageLabel || "No Stage"}</p>
                <h2>{selectedProject.projectName || "Unnamed Project"}</h2>
                <p className="detail-client">{selectedProject.client || "No Client"}</p>
              </div>
              <div className="action-row">
                <div className={`status-pill ${toneClass(selectedProject.health || "on_track")}`}>
                  {toneLabel(selectedProject.health || "on_track")}
                </div>
                <button 
                  type="button" 
                  className="ghost-button" 
                  style={{ color: '#ef4444', fontWeight: 600 }} 
                  onClick={() => handleDeleteProject(selectedProject)}
                >
                  Delete Project
                </button>
                <button type="button" className="ghost-button" onClick={() => setDetailOpen(false)}>
                  Close
                </button>
              </div>
            </div>

            <div className="move-panel">
              <div>
                <p className="panel-kicker">Manual Stage Move</p>
                <strong>{selectedProject.currentStageLabel || "No Stage"}</strong>
                <p className="detail-client">Pindahkan stage secara manual dengan warning task dan dokumen.</p>
              </div>
              <div className="action-row">
                <button
                  type="button"
                  className={editMode ? "ghost-button active-ghost" : "ghost-button"}
                  onClick={() => setEditMode((current) => !current)}
                >
                  {editMode ? "Done editing" : "Edit data"}
                </button>
                <button type="button" className="primary-button" onClick={() => openMoveModal(selectedProject)}>
                  Move stage
                </button>
              </div>
            </div>

            <div className="properties-panel">
              <div className="detail-block">
                <h3>Properties</h3>
                {editMode ? (
                  <div className="editor-grid">
                    <label>
                      <span>Project</span>
                      <input
                        value={selectedProject.projectName || ""}
                        onChange={(event) => updateProjectField(selectedProject.id, "projectName", event.target.value)}
                      />
                    </label>
                    <label>
                      <span>Client</span>
                      <input
                        value={selectedProject.client}
                        onChange={(event) => updateProjectField(selectedProject.id, "client", event.target.value)}
                      />
                    </label>
                    <label>
                      <span>Stage</span>
                      <select
                        value={selectedProject.currentStage}
                        onChange={(event) => {
                          setMoveTargetStage(event.target.value as WorkflowStage);
                          setSelectedProjectId(selectedProject.id);
                          setMoveNote("Updated from properties");
                          setMoveModalOpen(true);
                        }}
                      >
                        {STAGE_OPTIONS.map((stage) => (
                          <option key={stage.key} value={stage.key}>
                            {stage.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>PIC Internal</span>
                      <input
                        value={(selectedProject.owners || []).join(", ")}
                        onChange={(event) => updateProjectMeta(selectedProject.id, "owners", event.target.value)}
                      />
                    </label>
                    <label>
                      <span>Event Date</span>
                      <input
                        value={selectedProject.eventDate}
                        onChange={(event) => updateProjectField(selectedProject.id, "eventDate", event.target.value)}
                      />
                    </label>
                    <label>
                      <span>Project Value</span>
                      <input
                        value={selectedProject.projectValue ? String(selectedProject.projectValue) : ""}
                        onChange={(event) => updateProjectMeta(selectedProject.id, "projectValue", event.target.value)}
                      />
                    </label>
                  </div>
                ) : (
                  <div className="property-list">
                    <PropertyRow label="Client" value={selectedProject.client || "-"} />
                    <PropertyRow label="Project" value={selectedProject.projectName || "-"} />
                    <PropertyRow label="Stage" value={selectedProject.currentStageLabel || "-"} />
                    <PropertyRow label="Event Date" value={selectedProject.eventDate || "-"} />
                    <PropertyRow label="Project Value" value={selectedProject.projectValueLabel || "-"} />
                    <PropertyRow label="PIC Internal" value={(selectedProject.owners || []).join(", ") || "-"} />
                  </div>
                )}
              </div>
            </div>

            <div className="detail-columns">
              <div className="detail-block">
                <h3>Assigned Vendors</h3>
                <div className="assignment-stack">
                  {(selectedProject.assignedVendors || []).length > 0 ? (
                    (selectedProject.assignedVendors || []).map((vendor) => (
                      <div className="assignment-row" key={vendor.linkId}>
                        <div>
                          <strong>{vendor.vendorName}</strong>
                          <p className="detail-client">
                            {vendor.vendorType} • {vendor.coverageArea || "-"} • Score {vendor.averageScore || "-"}
                          </p>
                        </div>
                        <div className="action-row">
                          {vendor.whatsappPhone ? (
                            <Link href={`https://wa.me/${vendor.whatsappPhone}`} target="_blank" rel="noreferrer" className="ghost-button">
                              WhatsApp
                            </Link>
                          ) : null}
                          <button
                            type="button"
                            className="ghost-button"
                            onClick={() => removeAssignedVendor(selectedProject.id, vendor.linkId)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-inline">Belum ada vendor yang di-assign ke project ini.</div>
                  )}
                </div>

                <div className="assignment-controls">
                  <select value={activeAssignmentVendorId} onChange={(event) => setAssignmentVendorId(event.target.value)}>
                    <option value="">Pilih vendor</option>
                    {assignableVendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.name} • {vendor.serviceNames[0] || "-"}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="primary-button"
                    disabled={!activeAssignmentVendorId}
                    onClick={() => assignVendor(selectedProject.id)}
                  >
                    {assignmentPending ? "Saving..." : "Assign vendor"}
                  </button>
                </div>
              </div>

              <div className="detail-block">
                <h3>Vendor shortlist</h3>
                <div className="assignment-stack">
                  {(selectedProject.vendorShortlist || []).length > 0 ? (
                    (selectedProject.vendorShortlist || []).map((vendor) => (
                      <div className="assignment-row" key={vendor.linkId}>
                        <div>
                          <strong>{vendor.vendorName}</strong>
                          <p className="detail-client">
                            {vendor.vendorType} • {vendor.coverageArea || "-"} • Score {vendor.averageScore || "-"}
                          </p>
                          <p className="detail-client">
                            {vendor.status} • {vendor.quotedPrice ? formatCurrency(vendor.quotedPrice) : "Belum ada quote"}
                          </p>
                        </div>
                        <div className="action-row">
                          <select value={vendor.status} onChange={(event) => updateShortlist(vendor.linkId, event.target.value as "shortlisted" | "contacted" | "quoted" | "selected")}>
                            {["shortlisted", "contacted", "quoted", "selected"].map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                          {vendor.whatsappPhone ? (
                            <Link href={`https://wa.me/${vendor.whatsappPhone}`} target="_blank" rel="noreferrer" className="ghost-button">
                              WhatsApp
                            </Link>
                          ) : null}
                          <button type="button" className="ghost-button" onClick={() => removeShortlist(vendor.linkId)}>
                            Remove
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-inline">Belum ada shortlist vendor untuk project ini.</div>
                  )}
                </div>

                <div className="assignment-controls">
                  <select value={activeShortlistVendorId} onChange={(event) => setShortlistVendorId(event.target.value)}>
                    <option value="">Pilih vendor shortlist</option>
                    {shortlistableVendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.name} • {vendor.serviceNames[0] || "-"} • Score {vendor.averageScore || "-"}
                      </option>
                    ))}
                  </select>
                  <input value={shortlistQuotedPrice} onChange={(event) => setShortlistQuotedPrice(event.target.value)} placeholder="Quoted price (optional)" />
                  <input value={shortlistNote} onChange={(event) => setShortlistNote(event.target.value)} placeholder="Shortlist note" />
                  <button type="button" className="primary-button" disabled={!activeShortlistVendorId} onClick={() => shortlistVendor(selectedProject.id)}>
                    {assignmentPending ? "Saving..." : "Add shortlist"}
                  </button>
                </div>
              </div>

              <div className="detail-block">
                <h3>Vendor requirements</h3>
                <div className="timeline-list">
                  {(selectedProject.vendorRequirements ?? []).map((item) => (
                    <article key={item.label} className="timeline-item">
                      <span>{item.label}</span>
                      <strong>{item.summary}</strong>
                    </article>
                  ))}
                </div>
              </div>

              <div className="detail-block">
                <h3>Stage Checklist</h3>
                <div className="task-stack compact-task-stack">
                  {activeStageTasks.length > 0 ? (
                    activeStageTasks.map((task: ProjectTask) => (
                      <label key={task.id} className="task-row">
                        <input type="checkbox" checked={task.status === "done"} onChange={() => toggleTask(selectedProject.id, task.id)} />
                        <span>{task.title}</span>
                        <small>{task.stage}</small>
                      </label>
                    ))
                  ) : (
                    <div className="empty-inline">Tidak ada checklist wajib untuk stage ini.</div>
                  )}
                </div>
              </div>

              <div className="detail-block">
                <h3>Linked Documents</h3>
                <div className="document-stack">
                  {(selectedProject.documents || [])
                    .filter((document) => editMode || document.status !== "missing")
                    .map((document) => (
                      <article key={document.id} className="linked-doc-card">
                        <div className="project-card-top">
                          <strong>{document.title}</strong>
                          <span className={`status-pill ${docTone(document.status)}`}>{docLabel(document.status)}</span>
                        </div>
                        {editMode ? (
                          <input
                            className="document-input"
                            value={document.value}
                            onChange={(event) => updateDocument(selectedProject.id, document.id, event.target.value)}
                            placeholder="Tempel link atau catatan dokumen"
                          />
                        ) : (
                          <p className="document-value">{document.value || "Belum tersedia."}</p>
                        )}
                        {document.url ? (
                          <Link href={document.url} target="_blank" rel="noreferrer" className="doc-link">
                            Open document
                          </Link>
                        ) : null}
                      </article>
                    ))}
                </div>
              </div>
            </div>

            <div className="detail-columns">
              <div className="detail-block">
                <h3>Milestones</h3>
                <div className="milestone-list">
                  {(selectedProject.milestones || []).map((milestone: ProjectMilestone) => (
                    <label key={milestone.id} className="milestone-row">
                      <input
                        type="checkbox"
                        checked={milestone.done}
                        onChange={(event) => updateMilestone(selectedProject.id, milestone.id, "done", event.target.checked)}
                      />
                      <span>{milestone.label}</span>
                      {editMode ? (
                        <input
                          value={milestone.value}
                          onChange={(event) => updateMilestone(selectedProject.id, milestone.id, "value", event.target.value)}
                          placeholder="Isi tanggal, link, atau catatan milestone"
                        />
                      ) : (
                        <strong>{milestone.value || "-"}</strong>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              <div className="detail-block">
                <h3>Activity</h3>
                <div className="activity-stack">
                  {(selectedProject.activity || []).map((item) => (
                    <article key={item.id} className="activity-card">
                      <strong>{item.timestampLabel}</strong>
                      <p>{item.message}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>

            <div className="detail-block">
              <h3>Phase Progress</h3>
              <div className="phase-stack compact-phase-stack">
                {(selectedProject.phases || []).map((phase: ProjectPhase) => (
                  <article key={phase.key} className="phase-card compact-phase-card">
                    <div className="phase-head">
                      <strong>{phase.label}</strong>
                      <span className={`status-pill ${phaseTone(phase)}`}>{phase.completion}%</span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {moveModalOpen && selectedProject ? (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="detail-head">
              <div>
                <p className="panel-kicker">Move Stage</p>
                <h2>{selectedProject.projectName}</h2>
                <p className="detail-client">{selectedProject.client}</p>
              </div>
              <button type="button" className="ghost-button" onClick={() => setMoveModalOpen(false)}>
                Close
              </button>
            </div>

            <div className="modal-controls">
              <select value={moveTargetStage} onChange={(event) => setMoveTargetStage(event.target.value as WorkflowStage)}>
                {STAGE_OPTIONS.map((stage) => (
                  <option key={stage.key} value={stage.key}>
                    {stage.label}
                  </option>
                ))}
              </select>
              <textarea
                value={moveNote}
                onChange={(event) => setMoveNote(event.target.value)}
                placeholder="Catatan manual move, misalnya alasan pindah stage walau dokumen belum lengkap"
              />
            </div>

            <div className="warning-grid">
              <article className="warning-card">
                <strong>Pending tasks</strong>
                <ul className="bullet-list">
                  {moveWarnings.length > 0 ? moveWarnings.map((task) => <li key={task.id}>{task.title}</li>) : <li>Tidak ada warning task wajib.</li>}
                </ul>
              </article>
              <article className="warning-card">
                <strong>Pending documents</strong>
                <ul className="bullet-list">
                  {documentWarnings.length > 0 ? (
                    documentWarnings.map((document) => <li key={document.id}>{document.title}</li>)
                  ) : (
                    <li>Tidak ada warning dokumen.</li>
                  )}
                </ul>
              </article>
            </div>

            <div className="modal-actions">
              <button type="button" className="ghost-button" onClick={() => setMoveModalOpen(false)}>
                Cancel
              </button>
              <button type="button" className="primary-button" onClick={confirmMoveStage}>
                Move anyway
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {dragMoveOpen && dragMoveProject ? (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="detail-head">
              <div>
                <p className="panel-kicker">Drag & Drop Confirmation</p>
                <h2>{dragMoveProject.projectName}</h2>
                <p className="detail-client">
                  {dragMoveProject.currentStageLabel} →{" "}
                  {STAGE_OPTIONS.find((item) => item.key === dragMoveTargetStage)?.label ?? dragMoveTargetStage}
                </p>
              </div>
              <button type="button" className="ghost-button" onClick={cancelDragMove}>
                Close
              </button>
            </div>

            <div className="warning-grid">
              <article className="warning-card">
                <strong>Pending tasks</strong>
                <ul className="bullet-list">
                  {dragTaskWarnings.length > 0 ? (
                    dragTaskWarnings.map((task) => <li key={task.id}>{task.title}</li>)
                  ) : (
                    <li>Tidak ada warning task wajib.</li>
                  )}
                </ul>
              </article>
              <article className="warning-card">
                <strong>Pending documents</strong>
                <ul className="bullet-list">
                  {dragDocumentWarnings.length > 0 ? (
                    dragDocumentWarnings.map((document) => <li key={document.id}>{document.title}</li>)
                  ) : (
                    <li>Tidak ada warning dokumen.</li>
                  )}
                </ul>
              </article>
            </div>

            <div className="modal-actions">
              <button type="button" className="ghost-button" onClick={cancelDragMove}>
                Cancel
              </button>
              <button type="button" className="primary-button" onClick={confirmDragMove}>
                Move anyway
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {isProjectModalOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" style={{ backgroundColor: '#1a1a1a', padding: '32px', borderRadius: '20px', width: '100%', maxWidth: '600px', border: '1px solid #333', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '24px' }}>{projectModalMode === 'add' ? 'Add New Project' : 'Edit Project'}</h2>
            <div className="form-stack" style={{ display: 'grid', gap: '20px' }}>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '6px', color: '#888' }}>Project Name</label>
                <input style={{ width: '100%', background: '#222', border: '1px solid #333', padding: '10px', color: 'white', borderRadius: '8px' }} 
                   value={projectFormData.projectName || ''} onChange={(e) => setProjectFormData({...projectFormData, projectName: e.target.value})} placeholder="Project title..." />
              </div>
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.8rem', color: '#888' }}>Client Name</label>
                  <button 
                    type="button" 
                    onClick={() => {
                      setClientFormData({ status: "active", type: "brand", category: "BRAND", contacts: [], projects: [] });
                      setIsAddClientModalOpen(true);
                    }}
                    style={{ background: 'none', border: 'none', color: '#5b8cff', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}
                  >
                    + Add New Client
                  </button>
                </div>
                <select 
                  style={{ width: '100%', background: '#222', border: '1px solid #333', padding: '10px', color: 'white', borderRadius: '8px' }} 
                  value={projectFormData.client || ''} 
                  onChange={(e) => setProjectFormData({...projectFormData, client: e.target.value})}
                >
                  <option value="">-- Select Client --</option>
                  {clients.sort((a, b) => a.name.localeCompare(b.name)).map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                 <div className="form-group">
                    <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '6px', color: '#888' }}>
                      Service Line
                    </label>
                    <select 
                      style={{ width: '100%', background: '#222', border: '1px solid #333', padding: '10px', color: 'white', borderRadius: '8px' }} 
                      value={projectFormData.serviceLine || ''} 
                      onChange={(e) => setProjectFormData({...projectFormData, serviceLine: e.target.value})}
                    >
                      <option value="">-- Pilih Service Line --</option>
                      {Array.from(new Set((initialData.serviceLines.length > 0 ? initialData.serviceLines : ['Event Management', 'Digital Activation', 'Creative & Design', 'Video Production', 'KOL Management', 'PR & Media', 'Other']).map(sl => sl.trim()))).map(sl => (
                        <option key={sl} value={sl}>{sl}</option>
                      ))}
                    </select>
                 </div>
                 <div className="form-group">
                    <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '6px', color: '#888' }}>Stage</label>
                    <select style={{ width: '100%', background: '#222', border: '1px solid #333', padding: '10px', color: 'white', borderRadius: '8px' }} 
                       value={projectFormData.currentStage || 'lead'} onChange={(e) => setProjectFormData({...projectFormData, currentStage: e.target.value as any})}>
                       {STAGE_OPTIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                 </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                 <div className="form-group">
                    <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '6px', color: '#888' }}>
                      Project Value (IDR)
                      <span style={{ fontSize: '0.7rem', color: '#666', marginLeft: '8px' }}>(Otomatis format titik)</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#888' }}>Rp</span>
                      <input 
                        type="text" 
                        style={{ width: '100%', background: '#222', border: '1px solid #333', padding: '10px 10px 10px 35px', color: 'white', borderRadius: '8px' }} 
                        value={projectFormData.projectValue ? new Intl.NumberFormat('id-ID').format(projectFormData.projectValue) : ''} 
                        onChange={(e) => {
                          const rawValue = e.target.value.replace(/\D/g, '');
                          setProjectFormData({...projectFormData, projectValue: rawValue ? Number(rawValue) : 0});
                        }} 
                        placeholder="Contoh: 100000" 
                      />
                    </div>
                 </div>
                 <div className="form-group">
                    <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '6px', color: '#888' }}>
                      Event Date
                      <span style={{ fontSize: '0.7rem', color: '#666', marginLeft: '8px' }}>(Bulan / Hari / Tahun)</span>
                    </label>
                    <input 
                      type="date" 
                      style={{ width: '100%', background: '#222', border: '1px solid #333', padding: '10px', color: 'white', borderRadius: '8px' }} 
                      value={projectFormData.eventDate || ''} 
                      onChange={(e) => setProjectFormData({...projectFormData, eventDate: e.target.value})} 
                    />
                 </div>
              </div>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '6px', color: '#888' }}>
                  PIC / Owners
                  <span style={{ fontSize: '0.7rem', color: '#666', marginLeft: '8px', display: 'block', marginTop: '2px' }}>(Person In Charge: Tim Internal/Karyawan yang bertanggung jawab memegang project ini. Pisahkan nama dengan koma)</span>
                </label>
                <input style={{ width: '100%', background: '#222', border: '1px solid #333', padding: '10px', color: 'white', borderRadius: '8px' }} 
                   value={(projectFormData.owners || []).join(', ')} onChange={(e) => setProjectFormData({...projectFormData, owners: e.target.value ? e.target.value.split(',').map(s => s.trim()).filter(Boolean) : []})} placeholder="Contoh: Yudi, Anto..." />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '6px', color: '#888' }}>Remark</label>
                <textarea style={{ width: '100%', background: '#222', border: '1px solid #333', padding: '10px', color: 'white', borderRadius: '8px', height: '80px' }} 
                   value={projectFormData.remark || ''} onChange={(e) => setProjectFormData({...projectFormData, remark: e.target.value})} placeholder="Notes..." />
              </div>
            </div>
            <div style={{ marginTop: '32px', display: 'flex', gap: '16px', justifyContent: 'flex-end', alignItems: 'center' }}>
              {projectModalMode === "edit" && (
                <button 
                  className="primary-button" 
                  style={{ background: '#450a0a', border: '1px solid #7f1d1d', color: '#f87171', marginRight: 'auto' }} 
                  onClick={() => handleDeleteProject()}
                >
                  Delete Project
                </button>
              )}
              <button className="primary-button" style={{ background: 'none', border: '1px solid #333' }} onClick={() => setIsProjectModalOpen(false)}>Cancel</button>
              <button className="primary-button" onClick={handleSaveProject}>Save Project</button>
            </div>
          </div>
        </div>
      )}

      {isAddClientModalOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(15px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" style={{ backgroundColor: '#111', padding: '32px', borderRadius: '20px', width: '100%', maxWidth: '500px', border: '1px solid #333' }}>
            <h2 style={{ marginBottom: '24px' }}>Add New Client</h2>
            <div className="form-stack" style={{ display: 'grid', gap: '20px' }}>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '6px', color: '#888' }}>Company Name</label>
                <input style={{ width: '100%', background: '#222', border: '1px solid #333', padding: '10px', color: 'white', borderRadius: '8px' }} 
                   value={clientFormData.name || ''} onChange={(e) => setClientFormData({...clientFormData, name: e.target.value})} placeholder="e.g., PT Djarum" />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '6px', color: '#888' }}>Type</label>
                <select style={{ width: '100%', background: '#222', border: '1px solid #333', padding: '10px', color: 'white', borderRadius: '8px' }} 
                   value={clientFormData.type || 'brand'} onChange={(e) => setClientFormData({...clientFormData, type: e.target.value as any})}>
                   <option value="brand">Brand</option>
                   <option value="agency">Agency</option>
                   <option value="government">Government</option>
                   <option value="partner">Partner</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: '32px', display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
              <button className="primary-button" style={{ background: 'none', border: '1px solid #333' }} onClick={() => setIsAddClientModalOpen(false)}>Cancel</button>
              <button className="primary-button" onClick={handleSaveNewClient}>Create Client</button>
            </div>
          </div>
        </div>
      )}
    </WorkspaceShell>
  );
}
