"use client";

import Link from "next/link";
import { CSSProperties, WheelEvent, useEffect, useState, useTransition, useCallback } from "react";

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
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { SummaryCard } from "@/components/ui/summary-card";
import { 
  Activity, 
  ListChecks, 
  Users, 
  HardHat, 
  FileText, 
  PieChart,
  Calendar,
  DollarSign,
  Search,
  Plus,
  Trash2,
  Edit,
  ArrowRight,
  ChevronDown,
  Target,
  Zap,
  BarChart3,
  Coins,
  FolderOpen,
  Palette
} from "lucide-react";

type ViewMode = "overview" | "list" | "table" | "board" | "documents";

const VIEW_OPTIONS: { id: ViewMode; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "list", label: "List" },
  { id: "table", label: "Table" },
  { id: "board", label: "Board" },
  { id: "documents", label: "Documents" },
];

const STAGE_OPTIONS: { key: WorkflowStage; label: string }[] = [
  { key: "lead", label: "Lead / Prospect" },
  { key: "pitching", label: "Pitching / Preparation" },
  { key: "negotiation", label: "Negotiation" },
  { key: "execution", label: "Execution" },
  { key: "reporting", label: "Reporting" },
  { key: "finance", label: "Finance / Billing" },
  { key: "completed", label: "Completed" },
  { key: "lost", label: "Cancelled" },
];

const STORAGE_KEY = "juara-project-tracker-projects-v2";

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
  if (value === "watch") return "Needs monitoring";
  return "Needs attention";
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

function mergeProjectsWithInitial(local: ProjectRecord[], server: ProjectRecord[]) {
  // Source of truth is the SERVER. 
  // We only use local data to supplement existing projects (e.g. local unsaved edits if any).
  // Projects that are NOT in the server list should NOT be shown.
  return server.map((srv) => {
    const localMatch = local.find((l) => l.id === srv.id);
    if (!localMatch) return srv;

    return {
      ...srv,
      ...localMatch,
      milestones: localMatch.milestones ?? srv.milestones,
      tasks: localMatch.tasks ?? srv.tasks,
      documents: localMatch.documents ?? srv.documents,
      activity: localMatch.activity ?? srv.activity,
      phases: localMatch.phases ?? srv.phases,
      assignedVendors: localMatch.assignedVendors ?? srv.assignedVendors,
      vendorShortlist: localMatch.vendorShortlist ?? srv.vendorShortlist,
      vendorRequirements: localMatch.vendorRequirements ?? srv.vendorRequirements,
    };
  });
}

export function ProjectDashboard({ initialData }: { initialData: ProjectDashboardData }) {
  const [projects, setProjects] = useState<ProjectRecord[]>(initialData.projects);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as ProjectRecord[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setProjects(mergeProjectsWithInitial(parsed, initialData.projects));
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [initialData.projects]);
  const [view, setView] = useState<ViewMode>("overview");
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<WorkflowStage | "all">("all");
  const [selectedProjectId, setSelectedProjectId] = useState(initialData.projects[0]?.id ?? "");
  const [moveTargetStage, setMoveTargetStage] = useState<WorkflowStage>("pitching");
  const [moveNote, setMoveNote] = useState("");
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [dragMoveProjectId, setDragMoveProjectId] = useState<string | null>(null);
  const [draggingProjectId, setDraggingProjectId] = useState<string | null>(null);
  const [dragMoveTargetStage, setDragMoveTargetStage] = useState<WorkflowStage>("lead");
  const [dragMoveOpen, setDragMoveOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState<"overview" | "tasks" | "docs" | "vendors" | "execution" | "manpower">("overview");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showAllMilestones, setShowAllMilestones] = useState(false);
  const [showAllFocusProjects, setShowAllFocusProjects] = useState(false);
  const [boardZoom, setBoardZoom] = useState(1);
  const [editMode, setEditMode] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
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
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deletingProject, setDeletingProject] = useState<Partial<ProjectRecord> | null>(null);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      alert("Project Name and Client Name are required.");
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

  const handleDeleteProject = (projectToDelete?: Partial<ProjectRecord>) => {
    const target = projectToDelete || projectFormData;
    if (!target.id) return;
    setDeletingProject(target);
    setIsDeleteConfirmOpen(true);
  };

  const executeDeleteProject = async () => {
    if (!deletingProject || !deletingProject.id) return;

    try {
      const res = await fetch(`/api/projects/${deletingProject.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        // Update local state and storage to ensure immediate consistency
        const nextProjects = projects.filter(p => p.id !== deletingProject.id);
        setProjects(nextProjects);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextProjects));

        setIsDeleteConfirmOpen(false);
        setIsProjectModalOpen(false);
        setDetailOpen(false);
        window.location.reload();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(`Gagal menghapus proyek: ${errData.error || res.statusText}`);
      }
    } catch (err) {
      console.error("Delete error caught", err);
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
  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }, [projects]);

  const filteredProjects = projects.filter((project) => matchesProject(project, query, stageFilter));

  const [sortKey, setSortKey] = useState<string>("projectName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    let aVal: string | number = "";
    let bVal: string | number = "";
    if (sortKey === "projectName") { aVal = a.projectName || ""; bVal = b.projectName || ""; }
    else if (sortKey === "client") { aVal = a.client || ""; bVal = b.client || ""; }
    else if (sortKey === "currentStage") { aVal = a.currentStage || ""; bVal = b.currentStage || ""; }
    else if (sortKey === "owners") { aVal = (a.owners && a.owners[0]) || ""; bVal = (b.owners && b.owners[0]) || ""; }
    else if (sortKey === "eventDate") { aVal = a.eventDate || ""; bVal = b.eventDate || ""; }
    else if (sortKey === "projectValue") { aVal = a.projectValue || 0; bVal = b.projectValue || 0; }
    else if (sortKey === "docs") {
      aVal = a.documents.filter((d) => d.status === "available").length;
      bVal = b.documents.filter((d) => d.status === "available").length;
    }
    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    }
    return sortDir === "asc"
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal));
  });
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
    leadsProjects: projects.filter((project) => ["lead", "pitching"].includes(project.currentStage)).length,
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

  const applyStageMove = useCallback((projectId: string, targetStage: WorkflowStage, note?: string) => {
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
  }, [projects]);

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
                  businessAddress: selectedOption.businessAddress,
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
                  businessAddress: selectedOption.businessAddress,
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
          icon={<BarChart3 size={18} />}
        />
        <SummaryCard
          label="Active Projects"
          value={String(summary.activeProjects)}
          description="In execution/finance"
          icon={<Zap size={18} />}
        />
        <SummaryCard
          label="Leads"
          value={String(summary.leadsProjects)}
          description="New opportunities"
          icon={<Target size={18} />}
        />
        <SummaryCard
          label="Total Value"
          value={summary.totalValueLabel}
          description="Account worth"
          icon={<Coins size={18} />}
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
              placeholder="Search client, project, PIC, service, status, or stage"
            />
            <select value={stageFilter} onChange={(event) => setStageFilter(event.target.value as WorkflowStage | "all")}>
              <option value="all">All stages</option>
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
                    <span>Total Projects</span>
                    <strong>{summary.totalProjects}</strong>
                    <small>Active projects in workspace</small>
                  </article>
                  <article className="summary-card">
                    <span>Needs Attention</span>
                    <strong>{projects.filter((project) => project.health !== "on_track").length}</strong>
                    <small>Needs follow up or quick decision</small>
                  </article>
                  <article className="summary-card">
                    <span>Pipeline Value</span>
                    <strong>{summary.totalValueLabel}</strong>
                    <small>Estimated value of entire pipeline</small>
                  </article>
                  <article className="summary-card">
                    <span>Linked Docs</span>
                    <strong>{summary.documentsAvailable}</strong>
                    <small>Ready to open directly</small>
                  </article>
                </div>

                <article className="feature-panel">
                  {!mounted ? (
                    <p className="panel-kicker">Focus Projects</p>
                  ) : (
                    <div className="feature-panel-header">
                      <p className="panel-kicker">Focus Projects</p>
                      <button className="ghost-button" style={{ fontSize: '0.7rem' }} onClick={() => setShowAllFocusProjects(!showAllFocusProjects)}>
                        {showAllFocusProjects ? "Show Less" : "View All"}
                      </button>
                    </div>
                  )}
                  <div className="project-list compact-list">
                    {(showAllFocusProjects ? filteredProjects : filteredProjects.slice(0, 5)).map((project) => (
                      <button
                        key={project.id}
                        type="button"
                        className={`${project.id === selectedProject?.id ? "project-card active-card" : "project-card"} focus-project-card`}
                        onClick={() => selectProject(project.id, true)}
                      >
                        <div className="project-card-top">
                          <span className="section-pill">{project.currentStageLabel}</span>
                          <span className={`status-pill ${toneClass(project.health)}`}>{toneLabel(project.health)}</span>
                        </div>
                        <h3>{project.projectName}</h3>
                        <p className="client-line">{project.client}</p>
                        <div className="mini-meta">
                          <span>{project.eventDate || "No date yet"}</span>
                          <span>{project.projectValueLabel}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </article>

                <article className="feature-panel">
                  {!mounted ? (
                    <p className="panel-kicker">Upcoming Milestones</p>
                  ) : (
                    <div className="feature-panel-header">
                      <p className="panel-kicker">Upcoming Milestones</p>
                      <button className="ghost-button" style={{ fontSize: '0.7rem' }} onClick={() => setShowAllMilestones(!showAllMilestones)}>
                        {showAllMilestones ? "Show Less" : "View All"}
                      </button>
                    </div>
                  )}
                  <div className="timeline-list">
                    {(showAllMilestones ? timelineMilestones : timelineMilestones.slice(0, 5)).map((milestone) => (
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
                    {([
                      { label: "Project", key: "projectName" },
                      { label: "Client", key: "client" },
                      { label: "Stage", key: "currentStage" },
                      { label: "PIC", key: "owners" },
                      { label: "Event", key: "eventDate" },
                      { label: "Value", key: "projectValue" },
                      { label: "Docs", key: "docs" },
                    ] as const).map(({ label, key }) => (
                      <span
                        key={key}
                        onClick={() => handleSort(key)}
                        style={{ cursor: "pointer", userSelect: "none", display: "flex", alignItems: "center", gap: "4px" }}
                      >
                        {label}
                        {sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : " ↕"}
                      </span>
                    ))}
                  </div>
                  {sortedProjects.map((project) => (
                    <div
                      key={project.id}
                      className={project.id === selectedProject?.id ? "table-row active-table-row clickable-row" : "table-row clickable-row"}
                      onClick={() => openEditProjectModal(project)}
                      title="Click to edit project data"
                    >
                      <span className="table-text" style={{ fontWeight: 600, fontSize: '0.95rem' }}>{project.projectName}</span>
                      <span className="table-text">{project.client}</span>
                      <div onClick={(e) => e.stopPropagation()}>
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
                      </div>
                      <span className="table-text">{(project.owners && project.owners[0]) || "-"}</span>
                      <span className="table-text">{project.eventDate || "-"}</span>
                      <span className="table-text" style={{ fontFamily: 'monospace' }}>{project.projectValueLabel}</span>
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
                  <small>Pinch trackpad to zoom in/out</small>
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
                    <p className="document-value">{document.value || "No link or reference yet."}</p>
                    <div className="document-actions">
                      {document.url ? (
                        <Link href={document.url} target="_blank" rel="noreferrer" className="doc-link">
                          Open link
                        </Link>
                      ) : (
                        <span className="doc-muted">No active URL yet</span>
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

            <div className="detail-tabs">
              <button 
                className={`detail-tab-item ${activeDetailTab === "overview" ? "is-active" : ""}`}
                onClick={() => setActiveDetailTab("overview")}
              >
                <PieChart size={16} /> Overview
              </button>
              <button 
                className={`detail-tab-item ${activeDetailTab === "tasks" ? "is-active" : ""}`}
                onClick={() => setActiveDetailTab("tasks")}
              >
                <ListChecks size={16} /> Checklist
              </button>
              <button 
                className={`detail-tab-item ${activeDetailTab === "docs" ? "is-active" : ""}`}
                onClick={() => setActiveDetailTab("docs")}
              >
                <FileText size={16} /> Documents
              </button>
              <button 
                className={`detail-tab-item ${activeDetailTab === "vendors" ? "is-active" : ""}`}
                onClick={() => setActiveDetailTab("vendors")}
              >
                <Users size={16} /> Vendors
              </button>
              <button 
                className={`detail-tab-item ${activeDetailTab === "execution" ? "is-active" : ""}`}
                onClick={() => setActiveDetailTab("execution")}
              >
                <Activity size={16} /> Execution
              </button>
              <button 
                className={`detail-tab-item ${activeDetailTab === "manpower" ? "is-active" : ""}`}
                onClick={() => setActiveDetailTab("manpower")}
              >
                <HardHat size={16} /> Manpower
              </button>
            </div>

            <div className="detail-body-paginated">
              {activeDetailTab === "overview" && (
                <div className="tab-content-fade">
                  <div className="move-panel">
                    <div>
                      <p className="panel-kicker">Manual Stage Move</p>
                      <strong>{selectedProject.currentStageLabel || "No Stage"}</strong>
                      <p className="detail-client">Move stage manually with task and document warnings.</p>
                    </div>
                    <div className="action-row">
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => openEditProjectModal(selectedProject)}
                      >
                        Edit Project Data
                      </button>
                      <button type="button" className="primary-button" onClick={() => openMoveModal(selectedProject)}>
                        Move stage
                      </button>
                    </div>
                  </div>

                  <div className="properties-panel" style={{ marginTop: '24px' }}>
                    <div className="detail-block">
                      <h3>Properties</h3>
                      <div className="property-list">
                        <PropertyRow label="Client" value={selectedProject.client || "-"} />
                        <PropertyRow label="Project" value={selectedProject.projectName || "-"} />
                        <PropertyRow label="Stage" value={selectedProject.currentStageLabel || "-"} />
                        <PropertyRow label="Event Date" value={selectedProject.eventDate || "-"} />
                        <PropertyRow label="Project Value" value={selectedProject.projectValueLabel || "-"} />
                        <PropertyRow label="PIC Internal" value={(selectedProject.owners || []).join(", ") || "-"} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeDetailTab === "tasks" && (
                <div className="tab-content-fade">
                  <div className="detail-columns">
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
                          <div className="empty-inline">No mandatory checklist for this stage.</div>
                        )}
                      </div>
                    </div>

                    <div className="detail-block">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3>Milestones</h3>
                        <button
                          type="button"
                          className={editMode ? "primary-button" : "ghost-button"}
                          style={{ fontSize: '0.75rem', padding: '4px 12px', minHeight: '32px' }}
                          onClick={() => setEditMode(!editMode)}
                        >
                          {editMode ? "Save / Close" : "Edit Milestones"}
                        </button>
                      </div>
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
                                placeholder="Enter date, link, or milestone notes"
                              />
                            ) : (
                              <strong>{milestone.value || "-"}</strong>
                            )}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeDetailTab === "docs" && (
                <div className="tab-content-fade">
                  <div className="detail-block">
                    <h3>Project Documents</h3>
                    <p className="mini-meta" style={{ marginBottom: '16px' }}>Semua dokumen proyek tersentralisasi dalam satu folder utama.</p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {selectedProject.mainFolder ? (
                        <a 
                          href={selectedProject.mainFolder} 
                          target="_blank" 
                          rel="noreferrer"
                          className="activity-card"
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '16px', 
                            padding: '16px', 
                            textDecoration: 'none',
                            background: 'rgba(99, 102, 241, 0.05)',
                            border: '1px solid var(--line-strong)',
                            borderRadius: '12px',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <div style={{ 
                            width: '48px', 
                            height: '48px', 
                            borderRadius: '10px', 
                            background: 'var(--panel-soft)', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            fontSize: '1.5rem',
                            border: '1px solid var(--line)'
                          }}>
                            <FolderOpen size={24} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <strong style={{ display: 'block', fontSize: '0.95rem', color: 'var(--text)', marginBottom: '2px' }}>
                              Google Drive Project Folder
                            </strong>
                            <span style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block' }}>
                              Buka folder untuk mengakses brief, proposal, dan aset lainnya.
                            </span>
                          </div>
                          <div style={{ color: 'var(--blue)', fontSize: '1.2rem' }}>↗</div>
                        </a>
                      ) : (
                        <div className="empty-inline" style={{ padding: '20px', borderRadius: '12px', border: '1px dashed var(--line)' }}>
                          <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem' }}>Link Google Drive belum diatur.</p>
                          <button 
                            onClick={() => openEditProjectModal(selectedProject)}
                            className="secondary-button" 
                            style={{ width: '100%', fontSize: '0.8rem', padding: '8px' }}
                          >
                            + Tambahkan Link Folder
                          </button>
                        </div>
                      )}

                      {selectedProject.proposalUrl && (
                        <a 
                          href={selectedProject.proposalUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="activity-card"
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '16px', 
                            padding: '16px', 
                            textDecoration: 'none',
                            background: 'rgba(56, 189, 248, 0.05)',
                            border: '1px solid var(--line-strong)',
                            borderRadius: '12px',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <div style={{ 
                            width: '48px', 
                            height: '48px', 
                            borderRadius: '10px', 
                            background: 'var(--panel-soft)', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            fontSize: '1.5rem',
                            border: '1px solid var(--line)'
                          }}>
                            <Palette size={24} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <strong style={{ display: 'block', fontSize: '0.95rem', color: 'var(--text)', marginBottom: '2px' }}>
                              Pitch Deck / Proposal (Canva)
                            </strong>
                            <span style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block' }}>
                              Klik untuk melihat progress deck atau proposal.
                            </span>
                          </div>
                          <div style={{ color: 'var(--blue)', fontSize: '1.2rem' }}>↗</div>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeDetailTab === "vendors" && (
                <div className="tab-content-fade">
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
                                  {vendor.vendorType} • {vendor.businessAddress || "-"} • Score {vendor.averageScore || "-"}
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
                          <div className="empty-inline">No vendors assigned to this project yet.</div>
                        )}
                      </div>

                      <div className="assignment-controls">
                        <select value={activeAssignmentVendorId} onChange={(event) => setAssignmentVendorId(event.target.value)}>
                          <option value="">Select vendor</option>
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
                                  {vendor.vendorType} • {vendor.businessAddress || "-"} • Score {vendor.averageScore || "-"}
                                </p>
                                <p className="detail-client">
                                  {vendor.status} • {vendor.quotedPrice ? formatCurrency(vendor.quotedPrice) : "No quote yet"}
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
                          <div className="empty-inline">No vendor shortlist for this project yet.</div>
                        )}
                      </div>

                      <div className="assignment-controls">
                        <select value={activeShortlistVendorId} onChange={(event) => setShortlistVendorId(event.target.value)}>
                          <option value="">Select shortlist vendor</option>
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
                  </div>
                </div>
              )}

              {activeDetailTab === "execution" && (
                <div className="tab-content-fade">
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
              )}

              {activeDetailTab === "manpower" && (
                <div className="tab-content-fade">
                  <div className="detail-columns">
                    <div className="detail-block">
                      <h3>Assigned Manpower</h3>
                      <p className="mini-meta" style={{ marginBottom: '16px' }}>Tim freelancer yang ditugaskan untuk proyek ini.</p>
                      
                      <div className="task-stack">
                        {selectedProject.assignedFreelancers && selectedProject.assignedFreelancers.length > 0 ? (
                          selectedProject.assignedFreelancers.map((f) => (
                            <div key={f.id} className="activity-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <strong>{f.name}</strong>
                                <div className="mini-meta">{f.position}</div>
                              </div>
                              <div className="mini-meta">{f.phone}</div>
                            </div>
                          ))
                        ) : (
                          <div className="empty-inline">Belum ada tim yang ditugaskan.</div>
                        )}
                      </div>
                    </div>

                    <div className="detail-block">
                      <h3>Available Resources</h3>
                      <p className="mini-meta" style={{ marginBottom: '16px' }}>Cari dan pilih freelancer dari database Man Power.</p>
                      
                      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        <div className="project-list" style={{ gap: '8px' }}>
                          {(initialData.availableFreelancers || []).slice(0, 10).map((f) => (
                            <div key={f.id} className="document-card" style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{f.nama}</div>
                                <div className="mini-stage">{f.posisi_utama.join(", ")}</div>
                              </div>
                              <button className="primary-button" style={{ scale: '0.8' }}>Assign</button>
                            </div>
                          ))}
                          {(initialData.availableFreelancers || []).length > 10 && (
                            <Link href="/manpower/freelancer" className="ghost-button" style={{ textAlign: 'center', width: '100%', fontSize: '0.8rem' }}>
                              View all {(initialData.availableFreelancers || []).length} freelancers
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

              <div className="detail-block" style={{ marginTop: '24px', borderTop: '1px solid var(--line)', paddingTop: '24px', opacity: 0.7 }}>
                <h3>Activity Log</h3>
                <div className="activity-stack">
                  {(selectedProject.activity || []).map((item) => (
                    <article key={item.id} className="activity-card" style={{ padding: '8px 0' }}>
                      <strong style={{ fontSize: '0.7rem' }}>{item.timestampLabel}</strong>
                      <p style={{ fontSize: '0.85rem' }}>{item.message}</p>
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
        <div className="modal-overlay modal-backdrop">
          <div className="modal-content wide-modal modal-card">
            <h2 style={{ marginBottom: '24px' }}>{projectModalMode === 'add' ? 'Add New Project' : 'Edit Project'}</h2>
            <div className="form-stack">
              <div className="form-section-title">Core Information</div>
              <div className="form-grid-3">
                <div className="form-group">
                  <label className="eyebrow" style={{ display: 'block', marginBottom: '6px' }}>Project Name</label>
                  <input className="control-bar-input" style={{ width: '100%' }}
                    value={projectFormData.projectName || ''} onChange={(e) => setProjectFormData({ ...projectFormData, projectName: e.target.value })} placeholder="Project title..." />
                </div>
                <div className="form-group">
                  <label className="eyebrow" style={{ display: 'block', marginBottom: '6px' }}>Project Initial (for PO)</label>
                  <input className="control-bar-input" style={{ width: '100%' }}
                    value={projectFormData.projectInitial || ''} onChange={(e) => setProjectFormData({ ...projectFormData, projectInitial: e.target.value.toUpperCase() })} placeholder="e.g. DM" />
                </div>
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label className="eyebrow" style={{ margin: 0 }}>Client Name</label>
                    <button
                      type="button"
                      onClick={() => {
                        setClientFormData({ status: "active", type: "brand", category: "BRAND", contacts: [], projects: [] });
                        setIsAddClientModalOpen(true);
                      }}
                      className="ghost-button"
                      style={{ padding: '0 8px', minHeight: '24px', fontSize: '0.75rem' }}
                    >
                      + Add New Client
                    </button>
                  </div>
                  <select
                    className="control-bar-select"
                    style={{ width: '100%' }}
                    value={projectFormData.client || ''}
                    onChange={(e) => setProjectFormData({ ...projectFormData, client: e.target.value })}
                  >
                    <option value="">-- Select Client --</option>
                    {/* Deduplicate by ID to prevent "duplicate key" console errors */}
                    {Array.from(new Map(clients.map(c => [c.id, c])).values())
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="form-grid-3" style={{ marginTop: '20px' }}>
                <div className="form-group">
                  <label className="eyebrow" style={{ display: 'block', marginBottom: '6px' }}>Service Line</label>
                  <select
                    className="control-bar-select"
                    style={{ width: '100%' }}
                    value={projectFormData.serviceLine || ''}
                    onChange={(e) => setProjectFormData({ ...projectFormData, serviceLine: e.target.value })}
                  >
                    <option value="">-- Select Service --</option>
                    {Array.from(new Set((initialData.serviceLines.length > 0 ? initialData.serviceLines : ['Event Management', 'Digital Activation', 'Creative & Design', 'Video Production', 'KOL Management', 'PR & Media', 'Lainnya']).map(sl => sl.trim()))).map(sl => (
                      <option key={sl} value={sl}>{sl}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="eyebrow" style={{ display: 'block', marginBottom: '6px' }}>Stage</label>
                  <select className="control-bar-select" style={{ width: '100%' }}
                    value={projectFormData.currentStage || 'lead'} onChange={(e) => setProjectFormData({ ...projectFormData, currentStage: e.target.value as WorkflowStage })}>
                    {STAGE_OPTIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="eyebrow" style={{ display: 'block', marginBottom: '6px' }}>Event Date</label>
                  <input
                    type="date"
                    className="control-bar-input"
                    style={{ width: '100%' }}
                    value={projectFormData.eventDate || ''}
                    onChange={(e) => setProjectFormData({ ...projectFormData, eventDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-section-title">Financials & Assignment</div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="eyebrow" style={{ display: 'block', marginBottom: '6px' }}>Project Value (IDR)</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: '0.9rem' }}>Rp</span>
                    <input
                      type="text"
                      className="control-bar-input"
                      style={{ width: '100%', paddingLeft: '40px' }}
                      value={projectFormData.projectValue ? new Intl.NumberFormat('id-ID').format(projectFormData.projectValue) : ''}
                      onChange={(e) => {
                        const rawValue = e.target.value.replace(/\D/g, '');
                        setProjectFormData({ ...projectFormData, projectValue: rawValue ? Number(rawValue) : 0 });
                      }}
                      placeholder="e.g., 500.000.000"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="eyebrow" style={{ display: 'block', marginBottom: '6px' }}>PIC / Owners</label>
                  <input className="control-bar-input" style={{ width: '100%' }}
                    value={(projectFormData.owners || []).join(', ')} onChange={(e) => setProjectFormData({ ...projectFormData, owners: e.target.value ? e.target.value.split(',').map(s => s.trim()).filter(Boolean) : [] })} placeholder="e.g., John, Jane (separate with commas)" />
                </div>
              </div>

              <div className="form-section-title">Additional Context</div>
              <div className="form-group">
                <label className="eyebrow" style={{ display: 'block', marginBottom: '6px' }}>Main Project Folder (Google Drive / Link)</label>
                <input className="control-bar-input" style={{ width: '100%' }}
                  value={projectFormData.mainFolder || ''} onChange={(e) => setProjectFormData({ ...projectFormData, mainFolder: e.target.value })} placeholder="https://drive.google.com/..." />
              </div>
              <div className="form-group" style={{ marginTop: '16px' }}>
                <label className="eyebrow" style={{ display: 'block', marginBottom: '6px' }}>Proposal / Deck Link (Canva / etc)</label>
                <input className="control-bar-input" style={{ width: '100%' }}
                  value={projectFormData.proposalUrl || ''} onChange={(e) => setProjectFormData({ ...projectFormData, proposalUrl: e.target.value })} placeholder="https://canva.com/..." />
              </div>
              <div className="form-group" style={{ marginTop: '16px' }}>
                <label className="eyebrow" style={{ display: 'block', marginBottom: '6px' }}>Remark / Notes</label>
                <textarea className="control-bar-input" style={{ width: '100%', height: '100px', resize: 'vertical' }}
                  value={projectFormData.remark || ''} onChange={(e) => setProjectFormData({ ...projectFormData, remark: e.target.value })} placeholder="Strategic notes, constraints, or key objectives..." />
              </div>
            </div>
            <div style={{ marginTop: '32px', display: 'flex', gap: '16px', justifyContent: 'flex-end', alignItems: 'center' }}>
              {projectModalMode === "edit" && (
                <button
                  className="primary-button"
                  style={{ background: 'var(--red)', marginRight: 'auto' }}
                  onClick={() => handleDeleteProject()}
                >
                  Delete Project
                </button>
              )}
              <button className="ghost-button" onClick={() => setIsProjectModalOpen(false)}>Cancel</button>
              <button className="primary-button" onClick={handleSaveProject}>Save Project</button>
            </div>
          </div>
        </div>
      )}

      {isAddClientModalOpen && (
        <div className="modal-overlay modal-backdrop">
          <div className="modal-content wide-modal modal-card">
            <h2 style={{ marginBottom: '24px' }}>Add New Client</h2>
            <div className="form-stack">
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="eyebrow" style={{ display: 'block', marginBottom: '6px' }}>Company Name</label>
                  <input className="control-bar-input" style={{ width: '100%' }}
                    value={clientFormData.name || ''} onChange={(e) => setClientFormData({ ...clientFormData, name: e.target.value })} placeholder="e.g., Acme Corp" />
                </div>
                <div className="form-group">
                  <label className="eyebrow" style={{ display: 'block', marginBottom: '6px' }}>Client Type</label>
                  <select className="control-bar-select" style={{ width: '100%' }}
                    value={clientFormData.type || 'brand'} onChange={(e) => setClientFormData({ ...clientFormData, type: e.target.value as "brand" | "agency" | "government" | "partner" })}>
                    <option value="brand">Brand</option>
                    <option value="agency">Agency</option>
                    <option value="government">Government</option>
                    <option value="partner">Partner</option>
                  </select>
                </div>
              </div>
            </div>
            <div style={{ marginTop: '32px', display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
              <button className="ghost-button" onClick={() => setIsAddClientModalOpen(false)}>Cancel</button>
              <button className="primary-button" onClick={handleSaveNewClient}>Register Client</button>
            </div>
          </div>
        </div>
      )}
      {isDeleteConfirmOpen && (
        <div className="modal-overlay modal-backdrop">
          <div className="modal-content modal-card" style={{ maxWidth: '450px', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', backgroundColor: 'var(--red)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2m-6 9l4-4m0 4l-4-4" />
              </svg>
            </div>
            <h2 style={{ marginBottom: '16px' }}>Delete Project?</h2>
            <p className="detail-client" style={{ marginBottom: '32px' }}>
              Are you sure you want to delete project <strong>&quot;{deletingProject?.projectName}&quot;</strong>?
              <br />This action is permanent and cannot be undone.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <button
                className="ghost-button"
                onClick={() => {
                  setIsDeleteConfirmOpen(false);
                  setDeletingProject(null);
                }}
              >
                Cancel
              </button>
              <button
                className="primary-button"
                style={{ background: 'var(--red)', color: 'white' }}
                onClick={executeDeleteProject}
              >
                Yes, Delete Project
              </button>
            </div>
          </div>
        </div>
      )}
    </WorkspaceShell>
  );
}
