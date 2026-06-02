"use client";

import Link from "next/link";
import { useEffect, useState, useTransition, useCallback } from "react";

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
  Palette,
  Check,
  PlusCircle,
  MoreVertical,
  Building2,
  Home,
  Grid,
  User,
  Layout,
  Briefcase,
  FileBarChart,
  LogOut,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Maximize2,
  Minimize2,
  Settings,
  Circle,
  X,
  Printer,
  Book,
  Menu
} from "lucide-react";
import { PresenceIndicator } from "@/components/PresenceIndicator";
import EmbeddedTaskTracker from "@/components/projects/EmbeddedTaskTracker";
import { seedTasksForProject } from "@/lib/project/defaultTasks";

type ViewMode = "overview" | "table" | "board";

const VIEW_OPTIONS: { id: ViewMode; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "table", label: "Table" },
  { id: "board", label: "Board" },
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

export function ProjectDashboard({ initialData }: { initialData: ProjectDashboardData & { clients?: CRMClient[] } }) {
  const [projects, setProjects] = useState<ProjectRecord[]>(initialData.projects);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [viewMode, setViewMode] = useState<ViewMode>("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStage, setSelectedStage] = useState<WorkflowStage | null>(null);
  const [boardZoom, setBoardZoom] = useState(100);
  const [denseMode, setDenseMode] = useState(false);
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
  const [isAssignVendorOpen, setIsAssignVendorOpen] = useState(false);
  const [vendorToAssign, setVendorToAssign] = useState<string>("");
  const [isAssignManpowerOpen, setIsAssignManpowerOpen] = useState(false);
  const [manpowerToAssign, setManpowerToAssign] = useState<string>("");
  const [selectedPositionToAssign, setSelectedPositionToAssign] = useState<string>("");
  const [customPosition, setCustomPosition] = useState<string>("");
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectClient, setNewProjectClient] = useState("");
  const [newProjectDate, setNewProjectDate] = useState("");
  const [newProjectValue, setNewProjectValue] = useState("");
  
  // Complex Add Project States
  const [newProjectInitial, setNewProjectInitial] = useState("");
  const [newProjectServiceLine, setNewProjectServiceLine] = useState("EO - Corporate");
  const [newProjectStage, setNewProjectStage] = useState<WorkflowStage>("lead");
  const [newProjectOwners, setNewProjectOwners] = useState<string[]>([]);
  const [newProjectMainFolder, setNewProjectMainFolder] = useState("");
  const [newProjectProposalLink, setNewProjectProposalLink] = useState("");
  const [newProjectRemark, setNewProjectRemark] = useState("");
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  
  // Detail States
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedProject = projects.find((p: ProjectRecord) => p.id === selectedId) || null;
  const [detailOpen, setDetailOpen] = useState(false);
  const [isDetailMaximized, setIsDetailMaximized] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState<"overview" | "tasks" | "docs" | "vendors" | "execution" | "manpower" | "billing" | "activity">("overview");
  const [expandedPhase, setExpandedPhase] = useState<WorkflowStage | null>(null);

  useEffect(() => {
    if (!detailOpen) {
      setIsDetailMaximized(false);
    }
  }, [detailOpen]);

  // Sorting
  const [sortConfig, setSortConfig] = useState<{ key: keyof ProjectRecord; direction: 'asc' | 'desc' } | null>(null);

  const [newToPLabel, setNewToPLabel] = useState("");
  const [newToPPercentage, setNewToPPercentage] = useState<number>(0);
  const [isMounted, setIsMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ name: string; role: string } | null>(null);
  const [filterClient, setFilterClient] = useState("");
  const [filterAE, setFilterAE] = useState("");

  useEffect(() => {
    setIsMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const normalizeName = (name: string) => {
    if (!name) return "";
    const n = name.trim();
    if (n.toLowerCase() === "ubaidullah" || n.toLowerCase() === "ubaid") return "Ubaid";
    return n;
  };

  const handleLogout = () => {
    document.cookie = "juara_user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
    document.cookie = "juara_user_name=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
    window.location.href = "/";
  };

  const handleAddClient = async () => {
    const name = prompt("Enter new client name:");
    if (!name) return;
    
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      if (res.ok) {
        const result = await res.json();
        setNewProjectClient(result.client.name);
        alert("Client added successfully! Please refresh to see it in the dropdown if it doesn't appear.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddLog = (project: ProjectRecord, message: string) => {
    const newLog = {
      id: `act_${Date.now()}`,
      type: "stage_change" as any,
      message,
      timestampLabel: new Date().toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    };
    return {
      ...project,
      activity: [newLog, ...(project.activity || [])]
    };
  };

  const handleExportCSV = () => {
    const headers = ["Project Name", "Client", "Stage", "Date", "Value", "PIC"];
    const rows = sortedProjects.map(p => [
      p.projectName || (p as any).name || "Untitled",
      p.client,
      p.currentStage,
      p.eventDate,
      p.projectValue,
      (p.owners || []).join(", ")
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Juara_Project_Report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    const cookies = document.cookie.split(';');
    const roleCookie = cookies.find(c => c.trim().startsWith('juara_user_role='));
    const nameCookie = cookies.find(c => c.trim().startsWith('juara_user_name='));
    
    if (roleCookie) {
      setCurrentUser({
        role: roleCookie.split('=')[1].toLowerCase(),
        name: nameCookie ? decodeURIComponent(nameCookie.split('=')[1]) : ""
      });
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const projId = params.get("projectId");
      const tab = params.get("tab");
      if (projId) {
        const found = projects.find((p: ProjectRecord) => p.id === projId);
        if (found) {
          setSelectedId(projId);
          setDetailOpen(true);
          if (tab && ["overview", "tasks", "docs", "vendors", "execution", "manpower", "billing", "activity"].includes(tab)) {
            setActiveDetailTab(tab as any);
          }
        }
      }
    }
  }, [projects]);

  const formatDate = (dateStr: string) => {
    if (!isMounted) return "...";
    if (!dateStr || dateStr === "-" || dateStr === "TBD") return dateStr || "-";
    
    // If it contains letters (e.g., "August 2026" or "30 July"), keep it as is
    if (/[a-zA-Z]/.test(dateStr) && !dateStr.includes('T')) return dateStr;

    let d = new Date(dateStr);
    
    // Special handling for DD/MM/YYYY or DD-MM-YYYY
    if (isNaN(d.getTime())) {
      const parts = dateStr.split(/[\/\-]/);
      if (parts.length === 3) {
        // Assume Indonesian format: [0] Day, [1] Month, [2] Year
        const day = parts[0].trim().padStart(2, '0');
        const month = parts[1].trim().padStart(2, '0');
        let year = parts[2].trim();
        if (year.length === 2) year = '20' + year;
        d = new Date(`${year}-${month}-${day}`);
      }
    }

    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getPaymentStatus = (p: ProjectRecord) => {
    if (!p.termOfPayment || p.termOfPayment.length === 0) return { label: "N/A", color: "#52525b", percent: 0 };
    
    const totalValue = p.projectValue || 0;
    const paidAmount = p.termOfPayment
      .reduce((sum: number, t: any) => sum + (t.amount || (t.percentage / 100 * totalValue)), 0);
    
    const paidPercent = totalValue > 0 ? Math.round((paidAmount / totalValue) * 100) : 0;
    const invoiced = p.termOfPayment.filter((t: any) => t.status === 'invoiced').length;
    const paidCount = p.termOfPayment.filter((t: any) => t.status === 'paid').length;
    const totalCount = p.termOfPayment.length;

    if (paidCount === totalCount && totalCount > 0) return { label: "PAID", color: "#5DCAA5", percent: 100 };
    if (paidAmount > 0) return { label: `PARTIAL (${paidPercent}%)`, color: "#EF9F27", percent: paidPercent };
    if (invoiced > 0) return { label: "INVOICED", color: "#378ADD", percent: 0 };
    return { label: "PENDING", color: "#71717a", percent: 0 };
  };

  const filteredProjects = projects.filter((p: ProjectRecord) => {
    const matchesSearch = searchQuery === "" ? true : 
      (p.projectName || (p as any).name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.client || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.owners || []).some((o: string) => normalizeName(o).toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStage = selectedStage ? p.currentStage === selectedStage : true;
    const matchesClient = !filterClient || p.client === filterClient;
    const matchesAE = !filterAE || (p.owners || []).some((o: string) => normalizeName(o) === filterAE);

    return matchesSearch && matchesStage && matchesClient && matchesAE;
  });

  const handlePrintReport = () => {
    window.print();
  };

  const STAGE_ORDER: Record<string, number> = {
    lead: 0, pitching: 1, negotiation: 2, execution: 3, reporting: 4, finance: 5, completed: 6, lost: 7
  };

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    
    let aVal: any = a[key];
    let bVal: any = b[key];

    if (key === 'projectValue') {
      aVal = Number(aVal) || 0;
      bVal = Number(bVal) || 0;
    } else if (key === 'eventDate') {
      const getSortableDate = (str: string) => {
        if (!str || str === "TBD" || str === "-") return 0;
        
        // Take the first part if it's a range (e.g. "14 - 16 July 2026" -> "14 July 2026")
        let datePart = str.split(/[\-\u2013\u2014]/)[0].trim();
        
        // If the first part is just a day number (e.g. "14"), try to append month/year from the rest of string
        if (datePart.length <= 2 && str.match(/[a-zA-Z]/)) {
           const monthYearMatch = str.match(/[a-zA-Z].*$/);
           if (monthYearMatch) datePart += " " + monthYearMatch[0];
        }

        let d = new Date(datePart);
        if (isNaN(d.getTime())) {
          const parts = datePart.split(/[\/\-]/);
          if (parts.length === 3) {
            const day = parts[0].trim().padStart(2, '0');
            const month = parts[1].trim().padStart(2, '0');
            let year = parts[2].trim();
            if (year.length === 2) year = '20' + year;
            d = new Date(`${year}-${month}-${day}`);
          }
        }
        return isNaN(d.getTime()) ? 0 : d.getTime();
      };
      aVal = getSortableDate(aVal);
      bVal = getSortableDate(bVal);
    } else if (key === 'currentStage') {
      aVal = STAGE_ORDER[aVal as string] ?? 99;
      bVal = STAGE_ORDER[bVal as string] ?? 99;
    } else {
      aVal = (aVal || "").toString().toLowerCase();
      bVal = (bVal || "").toString().toLowerCase();
    }

    if (aVal === bVal) return 0;
    const res = aVal > bVal ? 1 : -1;
    return direction === 'asc' ? res : -res;
  });

  const getVal = (p: ProjectRecord | any) => {
    const valStr = p.projectValue || p.value || "0";
    const val = typeof valStr === 'number' ? valStr : parseFloat(valStr.toString().replace(/[^0-9.-]+/g,"") || "0");
    return isNaN(val) ? 0 : val;
  };

  const leadsValue = projects.filter((p: ProjectRecord) => ["lead", "pitching"].includes(p.currentStage)).reduce((sum: number, p: ProjectRecord) => sum + getVal(p), 0);
  const ongoingValue = projects.filter((p: ProjectRecord) => ["negotiation", "execution", "reporting", "finance"].includes(p.currentStage)).reduce((sum: number, p: ProjectRecord) => sum + getVal(p), 0);
  const billedValue = projects.filter((p: ProjectRecord) => p.currentStage === "completed").reduce((sum: number, p: ProjectRecord) => sum + getVal(p), 0);
  const totalValue = projects.reduce((sum: number, p: ProjectRecord) => sum + getVal(p), 0);

  const stats = [
    { label: "Leads & Pitching", numericValue: leadsValue.toLocaleString('id-ID'), sub: "Potential opportunities", color: "#a78bfa", icon: <Target size={16} /> },
    { label: "On Going Projects", numericValue: ongoingValue.toLocaleString('id-ID'), sub: "Active & Finance stage", color: "#378ADD", icon: <Zap size={16} /> },
    { label: "Billed / Completed", numericValue: billedValue.toLocaleString('id-ID'), sub: "Success projects", color: "#5DCAA5", icon: <Check size={16} /> },
    { label: "Grand Total Value", numericValue: totalValue.toLocaleString('id-ID'), sub: "All historical value", color: "#EF9F27", icon: <Coins size={16} /> },
  ];

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const newLeadsThisMonth = projects.filter((p: ProjectRecord) => {
    if (!p.createdAt) return false;
    const d = new Date(p.createdAt);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;

  const pitchingCount = projects.filter((p: ProjectRecord) => p.currentStage === "pitching").length;
  const negotiationCount = projects.filter((p: ProjectRecord) => p.currentStage === "negotiation").length;
  
  const upcomingCount = projects.filter((p: ProjectRecord) => {
    if (!p.eventDate || p.eventDate === "TBD") return false;
    const parts = p.eventDate.split("/");
    if (parts.length !== 3) return false;
    const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    const diff = d.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 3600 * 24));
    return days >= 0 && days <= 7;
  }).length;

  const workloadStats = [
    { label: "Leads Masuk (Bln Ini)", value: newLeadsThisMonth, icon: <PlusCircle size={14} />, color: "#a78bfa" },
    { label: "Pitching In Progress", value: pitchingCount, icon: <Palette size={14} />, color: "#378ADD" },
    { label: "Submitted / Nego", value: negotiationCount, icon: <FileBarChart size={14} />, color: "#EF9F27" },
    { label: "Events Minggu Ini", value: upcomingCount, icon: <Calendar size={14} />, color: "#5DCAA5" },
  ];

  // AR Calculations
  const allTerms = projects.flatMap((p: ProjectRecord) => (p.termOfPayment || []).map((t: any) => ({ ...t, projectName: p.projectName, projectValue: p.projectValue })));
  const totalAR = allTerms.filter((t: any) => t.status !== 'paid').reduce((sum: number, t: any) => sum + (t.amount || (t.percentage / 100 * t.projectValue)), 0);
  const overdueAR = allTerms.filter((t: any) => {
    if (t.status !== 'invoiced' || !t.dueDate) return false;
    const due = new Date(t.dueDate);
    return due < new Date();
  }).reduce((sum: number, t: any) => sum + (t.amount || (t.percentage / 100 * t.projectValue)), 0);

  const arStats = [
    { label: "Total Outstanding AR", value: totalAR, icon: <ArrowUpRight size={14} />, color: "#378ADD" },
    { label: "Overdue (Menunggak)", value: overdueAR, icon: <X size={14} />, color: "#EF4444" },
  ];

  const aeStats = Array.from(new Set(projects.flatMap((p: ProjectRecord) => (p.owners || []).map((o: string) => normalizeName(o))))) .map(ae => {
    const aeProjects = projects.filter((p: ProjectRecord) => (p.owners || []).some((o: string) => normalizeName(o) === ae));
    const activeProjects = aeProjects.filter((p: ProjectRecord) => !['completed', 'lost'].includes(p.currentStage));
    const val = activeProjects.reduce((sum: number, p: ProjectRecord) => sum + getVal(p), 0);
    return {
      name: ae,
      total: aeProjects.length,
      active: activeProjects.length,
      value: val
    };
  }).sort((a, b) => b.value - a.value);

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "lead": case "pitching": return "#a78bfa";
      case "negotiation": return "#378ADD";
      case "execution": return "#97C459";
      case "reporting": case "finance": return "#EF9F27";
      case "completed": return "#5DCAA5";
      default: return "#71717a";
    }
  };

  const openProject = (project: ProjectRecord) => {
    setSelectedId(project.id);
    setDetailOpen(true);
  };

  const persistUpdate = async (updatedProject: ProjectRecord) => {
    try {
      const response = await fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProject)
      });
      if (response.ok) {
        const result = await response.json();
        setProjects((prev: ProjectRecord[]) => prev.map((p: ProjectRecord) => p.id === result.project.id ? result.project : p));
      }
    } catch (error) {
      console.error("Failed to persist update:", error);
    }
  };

  const toggleTask = (projectId: string, taskId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const updated = {
      ...project,
      tasks: project.tasks.map((t: ProjectTask) => t.id === taskId ? { ...t, status: (t.status === "done" ? "pending" : "done") as any } : t)
    };
    persistUpdate(updated);
  };

  const handleAssignVendor = (projectId: string) => {
    if (!vendorToAssign) return;
    const vendor = initialData.availableVendors.find((v: any) => v.id === vendorToAssign);
    const project = projects.find((p: ProjectRecord) => p.id === projectId);
    if (!vendor || !project) return;

    const newAssignment = {
      vendorId: vendor.id,
      vendorName: vendor.name,
      vendorType: (vendor as any).serviceNames?.[0] || "General",
      businessAddress: (vendor as any).businessAddress || "",
      whatsappPhone: (vendor as any).whatsappPhone || "",
      averageScore: (vendor as any).averageScore || 0,
      linkId: `lnk_${Date.now()}`,
      quotedPrice: 0,
    };
    
    const updated = {
      ...project,
      assignedVendors: [...(project.assignedVendors || []), newAssignment]
    };
    persistUpdate(updated);
    setIsAssignVendorOpen(false);
    setVendorToAssign("");
  };

  const handleRemoveVendor = (projectId: string, linkId: string) => {
    const project = projects.find((p: ProjectRecord) => p.id === projectId);
    if (!project) return;
    const updated = {
      ...project,
      assignedVendors: (project.assignedVendors || []).filter((v: any) => v.linkId !== linkId)
    };
    persistUpdate(updated);
  };

  const handleRemoveShortlist = (projectId: string, linkId: string) => {
    const project = projects.find((p: ProjectRecord) => p.id === projectId);
    if (!project) return;
    const updated = {
      ...project,
      vendorShortlist: (project.vendorShortlist || []).filter((v: any) => v.linkId !== linkId)
    };
    persistUpdate(updated);
  };

  const handleAssignManpower = (projectId: string) => {
    if (!manpowerToAssign) return;
    const mpObj = initialData.availableFreelancers?.find((f: any) => f.id === manpowerToAssign);
    if (!mpObj) return;

    const finalPosition = selectedPositionToAssign === "Custom" ? customPosition : selectedPositionToAssign;
    if (!finalPosition) return;

    const project = projects.find((p: ProjectRecord) => p.id === projectId);
    if (!project) return;

    const updated = {
      ...project,
      assignedFreelancers: [
        ...(project.assignedFreelancers || []),
        {
          id: mpObj.id,
          name: mpObj.nama,
          position: finalPosition || mpObj.posisi_utama[0] || "Crew",
          phone: mpObj.no_hp
        }
      ]
    };
    persistUpdate(updated);
    setIsAssignManpowerOpen(false);
    setManpowerToAssign("");
    setSelectedPositionToAssign("");
    setCustomPosition("");
  };

  const handleRemoveManpower = (projectId: string, freelancerId: string) => {
    const project = projects.find((p: ProjectRecord) => p.id === projectId);
    if (!project) return;
    const updated = {
      ...project,
      assignedFreelancers: (project.assignedFreelancers || []).filter((f: any) => f.id !== freelancerId)
    };
    persistUpdate(updated);
  };

  const toggleMilestone = (projectId: string, milestoneId: string) => {
    const project = projects.find((p: ProjectRecord) => p.id === projectId);
    if (!project) return;
    const updated = {
      ...project,
      milestones: (project.milestones || []).map((m: ProjectMilestone) => m.id === milestoneId ? { ...m, done: !m.done } : m)
    };
    persistUpdate(updated);
  };

  const updateMilestone = (projectId: string, milestoneId: string, value: string) => {
    const project = projects.find((p: ProjectRecord) => p.id === projectId);
    if (!project) return;
    const updated = {
      ...project,
      milestones: (project.milestones || []).map((m: ProjectMilestone) => m.id === milestoneId ? { ...m, value } : m)
    };
    persistUpdate(updated);
  };

  const addMilestone = (projectId: string, label: string) => {
    const project = projects.find((p: ProjectRecord) => p.id === projectId);
    if (!project || !label) return;
    const newM: ProjectMilestone = {
      id: `ms_${Date.now()}`,
      label,
      value: "",
      done: false
    };
    const updated = {
      ...project,
      milestones: [...(project.milestones || []), newM]
    };
    persistUpdate(updated);
  };

  const removeMilestone = (projectId: string, milestoneId: string) => {
    const project = projects.find((p: ProjectRecord) => p.id === projectId);
    if (!project) return;
    const updated = {
      ...project,
      milestones: (project.milestones || []).filter((m: ProjectMilestone) => m.id !== milestoneId)
    };
    persistUpdate(updated);
  };

  const handleSaveProject = async () => {
    if (!newProjectName || !newProjectClient) return;

    const numericValue = parseInt(newProjectValue.toString().replace(/[^0-9]/g, "")) || 0;

    const projectData: any = {
      projectName: newProjectName,
      projectInitial: newProjectInitial,
      client: newProjectClient,
      serviceLine: newProjectServiceLine,
      currentStage: newProjectStage,
      eventDate: newProjectDate || "TBD",
      projectValue: numericValue,
      owners: newProjectOwners.length > 0 ? newProjectOwners : ["Admin"],
      mainFolder: newProjectMainFolder,
      remark: newProjectRemark,
    };

    if (newProjectProposalLink) {
      projectData.documents = [
        { id: `doc_${Date.now()}`, title: 'Proposal / Deck', url: newProjectProposalLink, status: 'available', stage: 'pitching' }
      ];
    }

    // Seed default SOP tasks for new projects only
    if (!editingProjectId) {
      projectData.tasks = seedTasksForProject();
    }

    try {
      const isEdit = !!editingProjectId;
      const url = '/api/projects';
      const method = isEdit ? 'PUT' : 'POST';
      
      const payload = isEdit ? { ...projects.find((p: ProjectRecord) => p.id === editingProjectId), ...projectData } : projectData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        if (isEdit) {
          setProjects((prev: ProjectRecord[]) => prev.map((p: ProjectRecord) => p.id === editingProjectId ? result.project : p));
        } else {
          setProjects((prev: ProjectRecord[]) => [result.project, ...prev]);
        }
        
        setIsAddingProject(false);
        setEditingProjectId(null);
        
        // Reset form
        setNewProjectName("");
        setNewProjectInitial("");
        setNewProjectClient("");
        setNewProjectValue("0");
        setNewProjectOwners([]);
        setNewProjectMainFolder("");
        setNewProjectProposalLink("");
        setNewProjectRemark("");
        setNewProjectServiceLine("EO - Corporate");
        setNewProjectStage("lead");
        
        alert(isEdit ? "Project berhasil diperbarui!" : "Project berhasil ditambahkan!");
      } else {
        alert(`Gagal ${isEdit ? 'memperbarui' : 'menambahkan'} project ke database.`);
      }
    } catch (error) {
      console.error("Error saving project:", error);
      alert("Terjadi kesalahan koneksi saat menyimpan project.");
    }
  };

  const openEditModal = (project: ProjectRecord) => {
    setEditingProjectId(project.id);
    setNewProjectName(project.projectName);
    setNewProjectInitial(project.projectInitial || "");
    setNewProjectClient(project.client);
    setNewProjectDate(project.eventDate === "TBD" ? "" : project.eventDate);
    setNewProjectValue(project.projectValue?.toString() || "0");
    setNewProjectOwners(project.owners || []);
    setNewProjectMainFolder(project.mainFolder || "");
    setNewProjectServiceLine(project.serviceLine || "EO - Corporate");
    setNewProjectStage(project.currentStage);
    setNewProjectRemark(project.remark || "");
    setIsAddingProject(true);
  };

  return (
    <div className="app-layout-premium" style={{ flexDirection: isMobile ? 'column' : 'row' }}>
      {/* Sidebar Navigation */}
      <aside 
        className={`sidebar-premium ${isSidebarOpen ? 'mobile-open' : ''}`}
        style={{ display: isMobile && !isSidebarOpen ? 'none' : 'flex' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 4px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '14px' }}>J</div>
            <span style={{ fontSize: '11px', fontWeight: 500, color: '#a1a1aa', letterSpacing: '0.06em' }}>JUARA WORKSPACE</span>
          </div>
          <button className="mobile-only-close" onClick={() => setIsSidebarOpen(false)} style={{ background: 'transparent', border: 'none', color: '#71717a' }}>
            <X size={20} />
          </button>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          <Link href="/" className="sidebar-item-premium"><Home size={18} /> Workspace Hub</Link>
          <Link href="/projects" className="sidebar-item-premium active"><Grid size={18} /> Projects</Link>
          <Link href="/crm" className="sidebar-item-premium"><User size={18} /> CRM</Link>
          <Link href="/vendors" className="sidebar-item-premium"><Building2 size={18} /> Vendors</Link>
          <Link href="/manpower/freelancer" className="sidebar-item-premium"><Users size={18} /> Man Power</Link>
          <Link href="/finance" className="sidebar-item-premium"><FileText size={18} /> Finance & RFP</Link>
          <Link href="/docs" className="sidebar-item-premium"><FolderOpen size={18} /> Document Center</Link>
          <Link href="/docs/manual" className="sidebar-item-premium" style={{ color: '#85B7EB' }}><Book size={18} /> User Manual</Link>

          <div style={{ marginTop: '32px', marginBottom: '8px', padding: '0 12px' }}>
            <span style={{ fontSize: '10px', color: '#3f3f46', letterSpacing: '0.08em' }}>ACTIVE IDENTITY</span>
          </div>
          <div style={{ background: '#1f1f23', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '6px 10px', fontSize: '12px', color: '#a1a1aa', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 4px' }}>
            Project Manager (Viewer) <ChevronDown size={14} />
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="main-premium" style={{ marginLeft: 0, width: '100%' }}>
        {/* Fixed Top Header */}
        <header className="top-header-premium">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button 
                className="mobile-menu-toggle" 
                onClick={() => setIsSidebarOpen(true)}
                style={{ background: 'transparent', border: 'none', color: 'white', padding: '4px', display: isMobile ? 'block' : 'none' }}
              >
                <Menu size={24} />
              </button>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(99,153,34,0.1)', color: '#639922', padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: 600, marginBottom: '6px' }}>DATABASE READY</div>
                <h1 style={{ fontSize: '22px', fontWeight: 500, color: '#f4f4f5', margin: 0 }}>JUARA'S PROJECTS 2026</h1>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div className="desktop-only-presence">
                <PresenceIndicator 
                  currentActivity={
                    detailOpen 
                      ? (activeDetailTab === 'billing' ? `Finance: ${selectedProject?.projectName}` : `Project: ${selectedProject?.projectName}`)
                      : isAddingProject ? "Creating New Project" : "Dashboard Overview"
                  } 
                />
              </div>
              {isMounted && (
                <>
                  <button className="primary-button" style={{ fontSize: '12px', padding: '6px 14px', background: '#378ADD' }} onClick={() => setIsAddingProject(true)}>+ Add Project</button>
                  <div className="desktop-only-logout">
                    <button className="ghost-button" style={{ fontSize: '12px', color: '#71717a' }} onClick={handleLogout}>Logout</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Stat Cards Row */}
          <div className="stat-grid-premium responsive-grid-4" style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(4, 1fr)', 
            gap: '16px', 
            padding: '0 24px' 
          }}>
            {stats.map((s, idx) => (
              <div key={idx} className="section-card-premium stat-card-mobile-fix" style={{ padding: '20px', borderLeft: `4px solid ${s.color}`, background: 'rgba(255,255,255,0.01)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <span style={{ fontSize: '11px', color: '#71717a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</span>
                  <div style={{ color: s.color, opacity: 0.8 }}>{s.icon}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                   <span style={{ fontSize: '14px', fontWeight: 700, color: s.color, opacity: 0.9 }}>Rp</span>
                   <div style={{ fontSize: '20px', fontWeight: 600, color: '#f4f4f5', letterSpacing: '-0.01em' }}>
                     {mounted ? s.numericValue : "---"}
                   </div>
                </div>
                <div style={{ fontSize: '11px', color: '#52525b', marginTop: '8px', fontWeight: 500 }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Workload Activity Row */}
          <div className="responsive-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', padding: '0 24px', marginBottom: '32px' }}>
            {workloadStats.map((s, idx) => (
              <div key={idx} style={{ background: '#111113', borderRadius: '12px', padding: '12px 16px', border: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${s.color}15`, color: s.color, display: 'grid', placeItems: 'center' }}>{s.icon}</div>
                <div>
                  <div style={{ fontSize: '10px', color: '#52525b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#f4f4f5' }}>{s.value}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ padding: '0 24px', marginBottom: '32px' }}>
            <h3 style={{ fontSize: '11px', color: '#52525b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>AR Monitoring (Account Receivable)</h3>
            <div className="stat-grid-premium responsive-grid-2" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
              {arStats.map((s, idx) => (
                <div key={idx} className="section-card-premium" style={{ padding: '20px', borderLeft: `4px solid ${s.color}`, background: 'rgba(255,255,255,0.01)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span style={{ fontSize: '11px', color: '#71717a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</span>
                    <div style={{ color: s.color, opacity: 0.8 }}>{s.icon}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                     <span style={{ fontSize: '14px', fontWeight: 700, color: s.color, opacity: 0.9 }}>Rp</span>
                     <div style={{ fontSize: '20px', fontWeight: 600, color: '#f4f4f5', letterSpacing: '-0.01em' }}>
                       {mounted ? s.value.toLocaleString('id-ID') : "---"}
                     </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sticky Toolbar */}
          <div className="view-toolbar-premium">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '10px', gap: '4px' }}>
                {VIEW_OPTIONS.map(opt => (
                  <button 
                    key={opt.id}
                    onClick={() => setViewMode(opt.id)}
                    style={{ 
                      padding: '6px 16px', 
                      fontSize: '13px', 
                      borderRadius: '8px',
                      background: viewMode === opt.id ? '#378ADD' : 'transparent',
                      color: viewMode === opt.id ? 'white' : '#71717a',
                      transition: 'all 0.2s',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <span style={{ fontSize: '12px', color: '#52525b' }}>{projects.length} projects</span>
                <span style={{ fontSize: '12px', color: '#52525b' }}>Rp {totalValue.toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>

          {/* View Renderers */}
          <div style={{ padding: isMobile ? '0 16px 40px 16px' : '0 24px 40px 24px' }}>
            {viewMode === "overview" && (
              <div className="tab-content-fade">
                <div className="overview-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px' }}>
                  {/* Left Column: Projects & AE */}
                  <div>
                    <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', letterSpacing: '0.08em', color: '#52525b', fontWeight: 600 }}>FOCUS PROJECTS</span>
                      <button className="ghost-button" style={{ fontSize: '12px', color: '#378ADD' }}>View All</button>
                    </div>
                    <div className="responsive-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
                      {projects.slice(0, 2).map((p: ProjectRecord, i: number) => (
                        <div key={i} className="section-card-premium" style={{ padding: '14px 16px', cursor: 'pointer' }} onClick={() => openProject(p)}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <div className="stage-pill-premium" style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa' }}>{p.currentStage.toUpperCase()}</div>
                            <div className="urgency-badge-premium" style={{ background: 'rgba(180,115,23,0.2)', color: '#EF9F27' }}>Needs monitoring</div>
                          </div>
                          <div style={{ fontSize: '14px', fontWeight: 500, color: '#e4e4e7', marginBottom: '2px' }}>{p.projectName || (p as any).name || "Untitled Project"}</div>
                          <div style={{ fontSize: '12px', color: '#71717a', marginBottom: '12px' }}>{p.client}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', color: '#52525b' }}>{formatDate(p.eventDate)}</span>
                            <span style={{ fontSize: '12px', color: '#a1a1aa' }}>
                              {isMounted && p.projectValue > 0 ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(p.projectValue) : (p.projectValue > 0 ? "..." : "-")}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', letterSpacing: '0.08em', color: '#52525b', fontWeight: 600 }}>ACCOUNT EXECUTIVE MONITORING</span>
                    </div>
                    <div className="section-card-premium" style={{ padding: '0', overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                            <th style={{ padding: '12px 16px', textAlign: 'left', color: '#52525b', fontWeight: 600 }}>AE NAME</th>
                            <th style={{ padding: '12px 16px', textAlign: 'center', color: '#52525b', fontWeight: 600 }}>ACTIVE</th>
                            <th style={{ padding: '12px 16px', textAlign: 'center', color: '#52525b', fontWeight: 600 }}>TOTAL</th>
                            <th style={{ padding: '12px 16px', textAlign: 'right', color: '#52525b', fontWeight: 600 }}>PORTFOLIO VALUE</th>
                          </tr>
                        </thead>
                        <tbody>
                          {aeStats.map((ae: any, idx: number) => (
                            <tr key={idx} style={{ borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}>
                              <td style={{ padding: '12px 16px', color: '#f4f4f5', fontWeight: 500 }}>{ae.name}</td>
                              <td style={{ padding: '12px 16px', textAlign: 'center', color: '#378ADD', fontWeight: 600 }}>{ae.active}</td>
                              <td style={{ padding: '12px 16px', textAlign: 'center', color: '#71717a' }}>{ae.total}</td>
                              <td style={{ padding: '12px 16px', textAlign: 'right', color: '#f4f4f5', fontWeight: 600 }}>
                                Rp {isMounted ? ae.value.toLocaleString('id-ID') : "..."}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Right Column: Suggestions or Quick Stats */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="section-card-premium" style={{ padding: '20px', background: 'linear-gradient(135deg, rgba(55,138,221,0.1), transparent)' }}>
                      <h4 style={{ margin: '0 0 12px', fontSize: '13px', color: '#378ADD' }}>Smart Insights</h4>
                      <p style={{ margin: 0, fontSize: '12px', color: '#a1a1aa', lineHeight: 1.6 }}>
                        Terdapat <strong>{pitchingCount}</strong> proposal yang sedang diproses. Pastikan deadline pengumpulan tidak terlewat minggu ini.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {viewMode === "table" && (
              <div className="tab-content-fade">
                {/* TOOLBAR */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
                  <div className="search-container-premium" style={{ flex: 1, minWidth: '300px', position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#52525b' }} />
                    <input 
                      placeholder="Search projects, clients, or AEs..." 
                      className="search-input-premium"
                      style={{ paddingLeft: '44px', width: '100%', height: '42px' }}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  <div className="toolbar-actions" style={{ display: 'flex', gap: '8px' }}>
                    <select 
                      className="mini-input" 
                      style={{ height: '42px', width: '160px', borderRadius: '12px', flexShrink: 0 }}
                      value={filterClient}
                      onChange={(e) => setFilterClient(e.target.value)}
                    >
                      <option value="">All Clients</option>
                      {[...new Set(projects.map((p: ProjectRecord) => p.client))].sort().map((c: string) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>

                    <select 
                      className="mini-input" 
                      style={{ height: '42px', width: '160px', borderRadius: '12px', flexShrink: 0 }}
                      value={filterAE}
                      onChange={(e) => setFilterAE(e.target.value)}
                    >
                      <option value="">All AEs</option>
                      {[...new Set(projects.flatMap((p: ProjectRecord) => (p.owners || []).map((o: string) => normalizeName(o))))].sort().map((ae: string) => (
                        <option key={ae} value={ae}>{ae}</option>
                      ))}
                    </select>

                    <button className="primary-button" style={{ borderRadius: '12px', height: '42px', flexShrink: 0 }} onClick={() => setIsAddingProject(true)}>+ New Project</button>
                    <button className="secondary-button-premium" style={{ borderRadius: '12px', height: '42px', flexShrink: 0 }} onClick={handlePrintReport}>
                      <Printer size={14} style={{ marginRight: '8px' }} />
                      Print PDF
                    </button>
                    <button className="secondary-button-premium" style={{ borderRadius: '12px', height: '42px', flexShrink: 0 }} onClick={handleAddClient}>+ Add Client</button>
                  </div>
                </div>

                {/* Stage Filter Chips (Only in Table Mode) */}
                <div className="stage-filter-scroll" style={{ marginBottom: '24px' }}>
                  {STAGE_OPTIONS.map((stage: any) => (
                    <button 
                      key={stage.key}
                      className={`stage-chip-premium ${selectedStage === stage.key ? 'active' : ''}`}
                      onClick={() => setSelectedStage(selectedStage === stage.key ? null : stage.key)}
                    >
                      {stage.label}
                    </button>
                  ))}
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table className="table-premium">
                    <thead>
                      <tr>
                        <th onClick={() => setSortConfig({ key: 'projectName', direction: sortConfig?.key === 'projectName' && sortConfig?.direction === 'asc' ? 'desc' : 'asc' })} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>PROJECT {sortConfig?.key === 'projectName' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}</th>
                        <th onClick={() => setSortConfig({ key: 'client', direction: sortConfig?.key === 'client' && sortConfig?.direction === 'asc' ? 'desc' : 'asc' })} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>CLIENT {sortConfig?.key === 'client' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}</th>
                        <th onClick={() => setSortConfig({ key: 'currentStage', direction: sortConfig?.key === 'currentStage' && sortConfig?.direction === 'asc' ? 'desc' : 'asc' })} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>STAGE {sortConfig?.key === 'currentStage' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}</th>
                        <th onClick={() => setSortConfig({ key: 'eventDate', direction: sortConfig?.key === 'eventDate' && sortConfig?.direction === 'asc' ? 'desc' : 'asc' })} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>EVENT DATE {sortConfig?.key === 'eventDate' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}</th>
                        <th onClick={() => setSortConfig({ key: 'projectValue', direction: sortConfig?.key === 'projectValue' && sortConfig?.direction === 'asc' ? 'desc' : 'asc' })} style={{ textAlign: 'right', cursor: 'pointer', whiteSpace: 'nowrap' }}>VALUE {sortConfig?.key === 'projectValue' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}</th>
                        <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>PAYMENT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedProjects.map((p: ProjectRecord) => (
                        <tr key={p.id} className="table-row-premium" onClick={() => openProject(p)} style={{ cursor: 'pointer' }}>
                          <td style={{ padding: '16px 12px' }}>
                            <div style={{ fontWeight: 600, color: '#f4f4f5' }}>{p.projectName || (p as any).name || "Untitled Project"}</div>
                            <div style={{ fontSize: '11px', color: '#52525b', marginTop: '2px' }}>{p.serviceLine}</div>
                          </td>
                          <td>{p.client}</td>
                          <td>
                            <span className="stage-pill-premium" style={{ background: `${getStageColor(p.currentStage)}15`, color: getStageColor(p.currentStage) }}>
                              {p.currentStage.toUpperCase()}
                            </span>
                          </td>
                          <td>{p.eventDate ? formatDate(p.eventDate) : "-"}</td>
                          <td style={{ padding: '16px 12px', fontSize: '13px', color: '#f4f4f5', fontWeight: 500, whiteSpace: 'nowrap', textAlign: 'right' }}>
                            {isMounted && p.projectValue > 0 ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(p.projectValue) : (p.projectValue > 0 ? "..." : "-")}
                          </td>
                          <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                            {(() => {
                              const status = getPaymentStatus(p);
                              return (
                                <span style={{ 
                                  fontSize: '10px', 
                                  fontWeight: 700, 
                                  padding: '4px 8px', 
                                  borderRadius: '6px', 
                                  background: `${status.color}15`, 
                                  color: status.color,
                                  border: `0.5px solid ${status.color}30`
                                }}>
                                  {status.label}
                                </span>
                              );
                            })()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {viewMode === "board" && (
              <div className="tab-content-fade">
                <div className="board-zoom-controls">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '12px', color: '#71717a' }}>Board zoom</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#111113', padding: '4px 12px', borderRadius: '8px', border: '0.5px solid rgba(255,255,255,0.08)' }}>
                      <button onClick={() => setBoardZoom(z => Math.max(50, z - 10))} style={{ color: '#71717a', border: 'none', background: 'none', cursor: 'pointer' }}>-</button>
                      <span style={{ fontSize: '12px', color: '#e4e4e7', minWidth: '40px', textAlign: 'center' }}>{boardZoom}%</span>
                      <button onClick={() => setBoardZoom(z => Math.min(150, z + 10))} style={{ color: '#71717a', border: 'none', background: 'none', cursor: 'pointer' }}>+</button>
                    </div>
                    <button onClick={() => setBoardZoom(100)} style={{ fontSize: '11px', color: '#378ADD', background: 'none', border: 'none', cursor: 'pointer' }}>Reset</button>
                  </div>
                  <button 
                    onClick={() => setDenseMode(!denseMode)}
                    style={{ background: '#1f1f23', border: '0.5px solid rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', color: '#a1a1aa', cursor: 'pointer' }}
                  >
                    Dense {denseMode ? 'on' : 'off'}
                  </button>
                </div>

                <div className="kanban-wrapper-premium" style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ transform: `scale(${boardZoom/100})`, transformOrigin: 'top left', display: 'flex', gap: '16px' }}>
                    {STAGE_OPTIONS.map((col: any) => {
                      const colProjects = projects.filter((p: ProjectRecord) => p.currentStage === col.key);
                      return (
                        <div 
                          key={col.key} 
                          className="kanban-column-premium" 
                          style={{ minWidth: denseMode ? '220px' : '280px', background: 'rgba(255,255,255,0.01)', borderRadius: '12px' }}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => {
                            if (!draggedProjectId) return;
                            const targetProj = projects.find((p: ProjectRecord) => p.id === draggedProjectId);
                            if (targetProj) {
                              // Optimistic local state update for instant UI responsiveness
                              setProjects((prev: ProjectRecord[]) => prev.map((p: ProjectRecord) => 
                                p.id === draggedProjectId ? { ...p, currentStage: col.key } : p
                              ));
                              // Save to database with automatic history logging
                              const updated = handleAddLog(targetProj, `Stage changed from ${targetProj.currentStage} to ${col.key}`);
                              persistUpdate({ ...updated, currentStage: col.key });
                            }
                            setDraggedProjectId(null);
                          }}
                        >
                          <div className="kanban-header-premium" style={{ borderTopColor: getStageColor(col.key) }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '13px', fontWeight: 500, color: '#e4e4e7' }}>{col.label}</span>
                              <span style={{ background: 'rgba(255,255,255,0.06)', color: '#71717a', fontSize: '11px', padding: '2px 8px', borderRadius: '20px' }}>{colProjects.length}</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '400px' }}>
                            {colProjects.map((p: ProjectRecord) => (
                              <div 
                                key={p.id} 
                                className="section-card-premium" 
                                style={{ padding: '12px', cursor: 'grab', opacity: draggedProjectId === p.id ? 0.4 : 1 }} 
                                onClick={() => openProject(p)}
                                draggable
                                onDragStart={() => setDraggedProjectId(p.id)}
                                onDragEnd={() => setDraggedProjectId(null)}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                  <div className="stage-pill-premium" style={{ fontSize: '10px', background: 'rgba(255,255,255,0.05)', color: getStageColor(p.currentStage) }}>{p.currentStage.toUpperCase()}</div>
                                  <div style={{ display: 'flex', alignItems: 'center' }}>
                                    {p.health === 'critical' && <div className="pulse-dot" />}
                                    <div className="urgency-badge-premium" style={{ fontSize: '10px', background: p.health === 'critical' ? 'rgba(226,75,74,0.1)' : 'rgba(99,153,34,0.1)', color: p.health === 'critical' ? '#F09595' : '#97C459' }}>
                                      {p.health === 'critical' ? 'Overdue' : 'On track'}
                                    </div>
                                  </div>
                                </div>
                                <div style={{ fontSize: '13px', fontWeight: 500, color: '#e4e4e7', marginTop: '4px' }}>{p.projectName || (p as any).name || "Untitled Project"}</div>
                                <div style={{ fontSize: '12px', color: '#71717a', marginBottom: '8px' }}>{p.client}</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '8px' }}>
                                  <span style={{ color: '#52525b' }}>{formatDate(p.eventDate)}</span>
                                  <span style={{ color: '#a1a1aa' }}>
                                    {isMounted && p.projectValue > 0 ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(p.projectValue) : (p.projectValue > 0 ? "..." : "-")}
                                  </span>
                                </div>
                                {isMounted && (
                                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    {(() => {
                                      const status = getPaymentStatus(p);
                                      if (status.label === "N/A") return null;
                                      return (
                                        <div style={{ 
                                          fontSize: '9px', 
                                          fontWeight: 800, 
                                          color: status.color, 
                                          background: `${status.color}15`, 
                                          padding: '2px 6px', 
                                          borderRadius: '4px',
                                          border: `0.5px solid ${status.color}20`
                                        }}>
                                          {status.label}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Detail Overlay */}
          {detailOpen && selectedProject && (
            <div 
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}
              onClick={() => setDetailOpen(false)}
            >
              <div 
                style={{ 
                  width: isDetailMaximized ? '100%' : (isMobile ? '100%' : '750px'), 
                  background: '#18181b', 
                  height: '100%', 
                  overflowY: 'auto', 
                  borderLeft: '0.5px solid rgba(255,255,255,0.08)', 
                  transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
                  animation: 'slideIn 0.3s ease' 
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header-premium" style={{ position: 'sticky', top: 0, zIndex: 10, background: '#18181b', padding: '24px 32px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div className="stage-pill-premium" style={{ background: 'rgba(55,138,221,0.1)', color: '#378ADD', marginBottom: '8px' }}>{selectedProject.currentStage.toUpperCase()}</div>
                      <h2 style={{ fontSize: '20px', fontWeight: 500, margin: 0 }}>{selectedProject.projectName}</h2>
                      <div style={{ color: '#71717a', fontSize: '13px' }}>{selectedProject.client}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button 
                        className="secondary-button-premium" 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px', 
                          height: '32px',
                          background: '#f4f4f5',
                          color: '#18181b',
                          padding: '0 12px',
                          borderRadius: '8px',
                          border: 'none',
                          fontWeight: 600,
                          fontSize: '11px'
                        }} 
                        onClick={() => openEditModal(selectedProject)}
                      >
                        <Edit size={14} /> Edit
                      </button>
                      <select 
                        className="mini-input"
                        style={{ height: '32px', fontSize: '11px', background: 'rgba(55,138,221,0.1)', color: '#378ADD', border: '0.5px solid rgba(55,138,221,0.3)', borderRadius: '6px' }}
                        value={selectedProject.currentStage}
                        onChange={(e) => {
                          const newStage = e.target.value as WorkflowStage;
                          const updated = handleAddLog(selectedProject, `Stage changed from ${selectedProject.currentStage} to ${newStage}`);
                          persistUpdate({ ...updated, currentStage: newStage });
                        }}
                      >
                        {STAGE_OPTIONS.map((opt: any) => (
                          <option key={opt.key} value={opt.key}>{opt.label}</option>
                        ))}
                      </select>
                      <button 
                        className="secondary-button-premium" 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '6px', 
                          height: '32px',
                          background: 'rgba(255,255,255,0.05)',
                          color: '#e4e4e7',
                          padding: '0 12px',
                          borderRadius: '8px',
                          border: '0.5px solid rgba(255,255,255,0.1)',
                          fontWeight: 600,
                          fontSize: '11px',
                          cursor: 'pointer'
                        }} 
                        onClick={() => setIsDetailMaximized(!isDetailMaximized)}
                        title={isDetailMaximized ? "Minimize View" : "Fullscreen View"}
                      >
                        {isDetailMaximized ? (
                          <>
                            <Minimize2 size={13} /> Minimize
                          </>
                        ) : (
                          <>
                            <Maximize2 size={13} /> Fullscreen
                          </>
                        )}
                      </button>
                      <button 
                        className="ghost-button" 
                        onClick={() => setDetailOpen(false)}
                        style={{ height: '32px', padding: '0 12px', fontSize: '11px' }}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                  
                  <div style={{ marginTop: '24px', display: 'flex', gap: '20px', borderBottom: '0.5px solid rgba(255,255,255,0.06)', overflowX: 'auto' }}>
                    {["overview", "tasks", "docs", "vendors", "manpower", "billing", "activity"].map(tab => (
                      <button 
                        key={tab} 
                        className={`detail-tab-item ${activeDetailTab === tab ? 'is-active' : ''}`}
                        onClick={() => setActiveDetailTab(tab as any)}
                        style={{ 
                          padding: '12px 0', 
                          fontSize: '11px', 
                          fontWeight: 700, 
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: activeDetailTab === tab ? '#378ADD' : '#71717a',
                          background: 'none',
                          border: 'none',
                          borderBottom: activeDetailTab === tab ? '2px solid #378ADD' : '2px solid transparent',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div style={{ padding: '32px' }}>
                  {activeDetailTab === "overview" && (
                    <div className="tab-content-fade">
                      <div className="section-card-premium" style={{ padding: '20px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
                          <div>
                            <div style={{ fontSize: '11px', color: '#52525b', marginBottom: '4px' }}>EVENT DATE</div>
                            <div style={{ fontSize: '14px' }}>{selectedProject.eventDate || "-"}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '11px', color: '#52525b', marginBottom: '4px' }}>VALUE</div>
                            <div style={{ fontSize: '14px' }}>{isMounted && selectedProject.projectValue > 0 ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(selectedProject.projectValue) : (selectedProject.projectValue > 0 ? "..." : "-")}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '11px', color: '#52525b', marginBottom: '4px' }}>PIC</div>
                            <div style={{ fontSize: '14px' }}>{(selectedProject.owners || []).join(", ") || "-"}</div>
                          </div>
                        </div>
                      </div>
                      <div style={{ marginTop: '24px' }}>
                        <h3 style={{ fontSize: '13px', fontWeight: 500, color: '#e4e4e7', marginBottom: '16px' }}>Project Health</h3>
                        <div className="section-card-premium" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div className={`pulse-dot ${selectedProject.health === 'critical' ? 'active' : ''}`} />
                          <span style={{ fontSize: '14px' }}>{selectedProject.health === 'critical' ? 'Requires immediate action' : 'Project is on track'}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeDetailTab === "tasks" && (
                    <div className="tab-content-fade" style={{ padding: '0' }}>
                      <EmbeddedTaskTracker
                        project={selectedProject}
                        teamMembers={(initialData as any).teamMembers ?? []}
                        onUpdateProject={async (updated) => { persistUpdate(updated); }}
                        isReadOnly={false}
                      />

                      {/* Milestones — kept below the tracker */}
                      <div className="section-card-premium" style={{ margin: '16px 0 0 0' }}>
                        <div className="section-header-premium" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', fontWeight: 500 }}>Milestones</span>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                              id="new-milestone-input"
                              className="mini-input"
                              placeholder="+ Add milestone"
                              style={{ height: '26px', fontSize: '11px', width: '120px' }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  addMilestone(selectedProject.id, (e.target as HTMLInputElement).value);
                                  (e.target as HTMLInputElement).value = "";
                                }
                              }}
                            />
                          </div>
                        </div>
                        <div style={{ padding: '0 16px 16px' }}>
                          {(selectedProject.milestones || []).map((m: ProjectMilestone) => (
                            <div key={m.id} className="item-row-premium" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
                              <div
                                style={{ width: '10px', height: '10px', borderRadius: '50%', background: m.done ? '#97C459' : '#3f3f46', cursor: 'pointer', border: m.done ? 'none' : '1px solid #52525b' }}
                                onClick={() => toggleMilestone(selectedProject.id, m.id)}
                              />
                              <span style={{ fontSize: '13px', flex: 1 }}>{m.label}</span>
                              <input
                                className="mini-input"
                                value={m.value}
                                placeholder="TBD"
                                onChange={(e) => updateMilestone(selectedProject.id, m.id, e.target.value)}
                                style={{ width: '100px', height: '24px', fontSize: '11px', textAlign: 'right', border: 'none', background: 'transparent', padding: 0 }}
                              />
                              <button
                                onClick={() => removeMilestone(selectedProject.id, m.id)}
                                style={{ background: 'none', border: 'none', color: '#3f3f46', cursor: 'pointer', padding: '0 4px' }}
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeDetailTab === "execution" && (
                    <div className="tab-content-fade">
                      <div className="overall-completion-card">
                        <div style={{ fontSize: '24px', fontWeight: 500, color: '#378ADD' }}>
                          {Math.round((selectedProject.tasks.filter((t: ProjectTask) => t.status === 'done').length / (selectedProject.tasks.length || 1)) * 100)}%
                        </div>
                        <div style={{ fontSize: '12px', color: '#71717a', marginBottom: '12px' }}>Overall project completion</div>
                        <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: '#378ADD', width: `${(selectedProject.tasks.filter((t: ProjectTask) => t.status === 'done').length / (selectedProject.tasks.length || 1)) * 100}%` }} />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                        {STAGE_OPTIONS.map((stage: any) => {
                           const pTasks = selectedProject.tasks.filter((t: ProjectTask) => t.stage === stage.key);
                           const pDone = pTasks.filter((t: ProjectTask) => t.status === "done").length;
                           const pPercent = Math.round((pDone / (pTasks.length || 1)) * 100) || 0;
                           return (
                             <div key={stage.key} className="section-card-premium" style={{ padding: '16px' }}>
                               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                 <span style={{ fontSize: '13px', fontWeight: 500 }}>{stage.label}</span>
                                 <span style={{ fontSize: '11px', color: '#378ADD' }}>{pPercent}%</span>
                               </div>
                               <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                                 <div style={{ height: '100%', background: '#378ADD', width: `${pPercent}%` }} />
                               </div>
                             </div>
                           );
                        })}
                      </div>
                    </div>
                  )}

                  {activeDetailTab === "vendors" && (
                    <div className="tab-content-fade">
                      <div className="section-card-premium" style={{ marginBottom: '20px' }}>
                        <div className="section-header-premium" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', fontWeight: 500 }}>Assigned Vendors</span>
                          {!isAssignVendorOpen ? (
                            <button 
                              className="primary-button" 
                              style={{ fontSize: '11px', padding: '4px 10px' }}
                              onClick={() => setIsAssignVendorOpen(true)}
                            >
                              + Assign Vendor
                            </button>
                          ) : (
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <select 
                                className="mini-input" 
                                style={{ height: '28px', fontSize: '11px', width: '140px', background: '#111113' }}
                                value={vendorToAssign}
                                onChange={(e) => setVendorToAssign(e.target.value)}
                              >
                                <option value="">Select vendor...</option>
                                {initialData.availableVendors.map((v: any) => (
                                  <option key={v.id} value={v.id}>{v.name}</option>
                                ))}
                              </select>
                              <button 
                                className="primary-button" 
                                style={{ fontSize: '10px', padding: '2px 8px', height: '28px' }}
                                onClick={() => handleAssignVendor(selectedProject.id)}
                              >
                                Add
                              </button>
                              <button 
                                className="ghost-button" 
                                style={{ fontSize: '10px', padding: '2px 8px' }}
                                onClick={() => setIsAssignVendorOpen(false)}
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                        <div style={{ padding: '0 16px 16px' }}>
                          {(selectedProject.assignedVendors || []).map((v: any) => (
                            <div key={v.linkId} className="vendor-row-premium">
                               <div className="vendor-avatar-premium cat-management">{v.vendorName.substring(0,2)}</div>
                               <div style={{ fontSize: '13px', flex: 1 }}>{v.vendorName}</div>
                               <div className="status-pill tone-green" style={{ fontSize: '10px' }}>Confirmed</div>
                               <div style={{ textAlign: 'right', fontSize: '12px', minWidth: '100px' }}>Rp {v.quotedPrice?.toLocaleString()}</div>
                               <button 
                                style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer' }}
                                onClick={() => handleRemoveVendor(selectedProject.id, v.linkId)}
                               >
                                <Trash2 size={14} />
                               </button>
                            </div>
                          ))}
                          {(selectedProject.assignedVendors || []).length === 0 && (
                            <div style={{ padding: '32px', textAlign: 'center', color: '#52525b', fontSize: '13px' }}>No vendors assigned yet</div>
                          )}
                        </div>
                      </div>
                      
                      <div className="section-card-premium">
                        <div className="section-header-premium" style={{ padding: '16px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 500 }}>Vendor Shortlist</span>
                        </div>
                        <div style={{ padding: '0 16px 16px' }}>
                           {(selectedProject.vendorShortlist || []).map((v: any) => (
                             <div key={v.linkId} className="vendor-row-premium" style={{ gridTemplateColumns: '1fr 60px 100px 32px' }}>
                               <div style={{ fontSize: '13px' }}>{v.vendorName}</div>
                               <div style={{ fontSize: '12px', color: '#97C459' }}>{v.averageScore}</div>
                               <div style={{ textAlign: 'right', fontSize: '12px' }}>Rp {v.quotedPrice?.toLocaleString()}</div>
                               <button 
                                style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer' }}
                                onClick={() => handleRemoveShortlist(selectedProject.id, v.linkId)}
                               >
                                <Trash2 size={14} />
                               </button>
                             </div>
                           ))}
                           {(selectedProject.vendorShortlist || []).length === 0 && (
                            <div style={{ padding: '16px', textAlign: 'center', color: '#52525b', fontSize: '12px' }}>Shortlist empty</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeDetailTab === "manpower" && (
                    <div className="tab-content-fade">
                      <div className="section-card-premium" style={{ marginBottom: '20px' }}>
                        <div className="section-header-premium" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', fontWeight: 500 }}>Assigned Team / Crew</span>
                          {!isAssignManpowerOpen ? (
                            <button 
                              className="primary-button" 
                              style={{ fontSize: '11px', padding: '4px 10px' }}
                              onClick={() => setIsAssignManpowerOpen(true)}
                            >
                              + Assign Member
                            </button>
                          ) : (
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <select 
                                className="mini-input" 
                                style={{ height: '28px', fontSize: '11px', width: '140px', background: '#111113' }}
                                value={manpowerToAssign}
                                onChange={(e) => {
                                  const id = e.target.value;
                                  setManpowerToAssign(id);
                                  const mp = (initialData.availableFreelancers || []).find(f => f.id === id);
                                  if (mp) setSelectedPositionToAssign(mp.posisi_utama?.[0] || "Crew");
                                }}
                              >
                                <option value="">Select member...</option>
                                {(initialData.availableFreelancers || []).map((f: any) => (
                                  <option key={f.id} value={f.id}>{(f as any).nama || (f as any).name}</option>
                                ))}
                              </select>

                              {manpowerToAssign && (
                                <select 
                                  className="mini-input" 
                                  style={{ height: '28px', fontSize: '11px', width: '120px', background: '#111113', border: '0.5px solid #378ADD' }}
                                  value={selectedPositionToAssign}
                                  onChange={(e) => setSelectedPositionToAssign(e.target.value)}
                                >
                                  {((initialData.availableFreelancers || []).find((f: any) => f.id === manpowerToAssign)?.posisi_utama || ["Crew"]).map((pos: string) => (
                                    <option key={pos} value={pos}>{pos}</option>
                                  ))}
                                  <option value="Custom">Other Role...</option>
                                </select>
                              )}

                              {selectedPositionToAssign === "Custom" && (
                                <input 
                                  className="mini-input"
                                  placeholder="Type role..."
                                  style={{ height: '28px', fontSize: '11px', width: '100px', background: '#111113', border: '0.5px solid #EF9F27' }}
                                  value={customPosition}
                                  onChange={(e) => setCustomPosition(e.target.value)}
                                />
                              )}

                              <button 
                                className="primary-button" 
                                style={{ fontSize: '10px', padding: '2px 8px', height: '28px' }}
                                onClick={() => handleAssignManpower(selectedProject.id)}
                              >
                                Add
                              </button>
                              <button 
                                className="ghost-button" 
                                style={{ fontSize: '10px', padding: '2px 8px' }}
                                onClick={() => setIsAssignManpowerOpen(false)}
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                        <div style={{ padding: '0 16px 16px' }}>
                          {(selectedProject.assignedFreelancers || []).map((f: any) => (
                            <div key={f.id} className="vendor-row-premium" style={{ gridTemplateColumns: '32px 1fr 100px 100px 32px' }}>
                               <div className="vendor-avatar-premium" style={{ background: '#378ADD' }}>{f.name.substring(0,1)}</div>
                               <div style={{ fontSize: '13px' }}>{f.name}</div>
                               <div style={{ fontSize: '12px', color: '#71717a' }}>{f.position}</div>
                               <div style={{ fontSize: '12px', color: '#71717a' }}>{f.phone}</div>
                               <button 
                                style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer' }}
                                onClick={() => handleRemoveManpower(selectedProject.id, f.id)}
                               >
                                <Trash2 size={14} />
                               </button>
                            </div>
                          ))}
                          {(selectedProject.assignedFreelancers || []).length === 0 && (
                            <div style={{ padding: '32px', textAlign: 'center', color: '#52525b', fontSize: '13px' }}>No team members assigned yet</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeDetailTab === "billing" && (
                    <div className="tab-content-fade">
                      <div className="overall-completion-card" style={{ background: 'rgba(93,202,165,0.05)', border: '0.5px solid rgba(93,202,165,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', color: '#5DCAA5', fontWeight: 600 }}>Billing Progress</span>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#f4f4f5' }}>
                            {Math.round(((selectedProject.termOfPayment || []).filter((t: any) => t.status === 'paid').reduce((sum: number, t: any) => sum + t.percentage, 0)))}% Collected
                          </span>
                        </div>
                        <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div 
                            style={{ 
                              height: '100%', 
                              background: '#5DCAA5', 
                              width: `${(selectedProject.termOfPayment || []).filter((t: any) => t.status === 'paid').reduce((sum: number, t: any) => sum + t.percentage, 0)}%`,
                              transition: 'width 0.5s ease'
                            }} 
                          />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '11px', color: '#71717a' }}>
                          <span>Total Value: Rp {isMounted ? selectedProject.projectValue.toLocaleString('id-ID') : "..."}</span>
                          <span>Paid: Rp {isMounted ? ((selectedProject.termOfPayment || []).filter((t: any) => t.status === 'paid').reduce((sum: number, t: any) => sum + t.amount, 0)).toLocaleString('id-ID') : "..."}</span>
                        </div>
                      </div>

                      <div className="section-card-premium" style={{ marginTop: '24px' }}>
                        <div className="section-header-premium" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600 }}>Term of Payment (ToP)</span>
                          <span style={{ fontSize: '11px', color: '#71717a' }}>Define billing milestones</span>
                        </div>
                        
                        <div style={{ padding: '0 16px 16px' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                            <thead>
                              <tr style={{ borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                                <th style={{ padding: '12px 8px', textAlign: 'left', color: '#52525b' }}>LABEL</th>
                                <th style={{ padding: '12px 8px', textAlign: 'center', color: '#52525b' }}>%</th>
                                <th style={{ padding: '12px 8px', textAlign: 'right', color: '#52525b' }}>AMOUNT</th>
                                <th style={{ padding: '12px 8px', textAlign: 'center', color: '#52525b' }}>STATUS</th>
                                <th style={{ padding: '12px 8px', textAlign: 'right', color: '#52525b' }}></th>
                              </tr>
                            </thead>
                            <tbody>
                              {(selectedProject.termOfPayment || []).map((term: any) => (
                                <tr key={term.id} style={{ borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}>
                                  <td style={{ padding: '12px 8px', color: '#e4e4e7' }}>{term.label}</td>
                                  <td style={{ padding: '12px 8px', textAlign: 'center', color: '#a1a1aa' }}>{term.percentage}%</td>
                                  <td style={{ padding: '12px 8px', textAlign: 'right', color: '#f4f4f5', fontWeight: 500 }}>
                                    Rp {isMounted ? term.amount.toLocaleString('id-ID') : "..."}
                                  </td>
                                  <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                                    <select 
                                      value={term.status}
                                      onChange={(e) => {
                                        const newStatus = e.target.value as any;
                                        const updated = {
                                          ...selectedProject,
                                          termOfPayment: (selectedProject.termOfPayment || []).map((t: any) => t.id === term.id ? { ...t, status: newStatus } : t)
                                        };
                                        persistUpdate(updated);
                                      }}
                                      style={{ 
                                        background: term.status === 'paid' ? 'rgba(93,202,165,0.1)' : term.status === 'invoiced' ? 'rgba(55,138,221,0.1)' : 'rgba(255,255,255,0.05)',
                                        color: term.status === 'paid' ? '#5DCAA5' : term.status === 'invoiced' ? '#378ADD' : '#71717a',
                                        border: 'none',
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        fontSize: '10px',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                      }}
                                    >
                                      <option value="pending">PENDING</option>
                                      <option value="invoiced">INVOICED</option>
                                      <option value="paid">PAID</option>
                                    </select>
                                  </td>
                                  <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                                    <button 
                                      onClick={() => {
                                        const updated = {
                                          ...selectedProject,
                                          termOfPayment: (selectedProject.termOfPayment || []).filter((t: any) => t.id !== term.id)
                                        };
                                        persistUpdate(updated);
                                      }}
                                      style={{ background: 'none', border: 'none', color: '#3f3f46', cursor: 'pointer' }}
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>

                          <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 60px 100px 32px', gap: '8px', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                            <input 
                              className="mini-input"
                              placeholder="Term name (e.g. DP 30%)"
                              value={newToPLabel}
                              onChange={(e) => setNewToPLabel(e.target.value)}
                              style={{ height: '32px' }}
                            />
                            <input 
                              type="number"
                              className="mini-input"
                              placeholder="%"
                              value={newToPPercentage || ""}
                              onChange={(e) => setNewToPPercentage(Number(e.target.value))}
                              style={{ height: '32px', textAlign: 'center' }}
                            />
                            <div style={{ fontSize: '11px', color: '#71717a', textAlign: 'right' }}>
                              Rp {isMounted ? Math.round((selectedProject.projectValue * (newToPPercentage / 100))).toLocaleString('id-ID') : "..."}
                            </div>
                            <button 
                              className="primary-button"
                              style={{ height: '32px', width: '32px', padding: 0, display: 'grid', placeItems: 'center' }}
                              onClick={() => {
                                if (!newToPLabel || !newToPPercentage) return;
                                const newTerm = {
                                  id: `top_${Date.now()}`,
                                  label: newToPLabel,
                                  percentage: newToPPercentage,
                                  amount: Math.round(selectedProject.projectValue * (newToPPercentage / 100)),
                                  status: 'pending' as const
                                };
                                const updated = {
                                  ...selectedProject,
                                  termOfPayment: [...(selectedProject.termOfPayment || []), newTerm]
                                };
                                persistUpdate(updated);
                                setNewToPLabel("");
                                setNewToPPercentage(0);
                              }}
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div style={{ marginTop: '24px' }}>
                        <h3 style={{ fontSize: '13px', fontWeight: 500, color: '#e4e4e7', marginBottom: '16px' }}>Financial Health Rule</h3>
                        <div className="section-card-premium" style={{ padding: '16px', background: 'rgba(239,159,39,0.05)', border: '0.5px solid rgba(239,159,39,0.1)' }}>
                          <p style={{ margin: 0, fontSize: '12px', color: '#EF9F27', lineHeight: 1.5 }}>
                            <strong>Operational Insight:</strong> Aktivasi durasi panjang sangat bergantung pada cashflow. 
                            Pastikan DP minimal 30% sudah berstatus <strong>PAID</strong> sebelum memulai fase eksekusi lapangan untuk menjaga keamanan dana operasional.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeDetailTab === "activity" && (
                    <div className="tab-content-fade">
                      <div className="section-card-premium" style={{ padding: '0', overflow: 'hidden' }}>
                        <div className="section-header-premium" style={{ padding: '16px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 500 }}>Activity History</span>
                        </div>
                        <div style={{ padding: '0 16px 16px' }}>
                          {(!selectedProject.activity || selectedProject.activity.length === 0) ? (
                            <div style={{ padding: '40px 0', textAlign: 'center', color: '#52525b', fontSize: '13px' }}>
                              No activity recorded yet
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingTop: '10px' }}>
                              {selectedProject.activity.map((act: any, idx: number) => (
                                <div key={act.id || idx} style={{ display: 'flex', gap: '16px', position: 'relative' }}>
                                  {idx !== selectedProject.activity.length - 1 && (
                                    <div style={{ position: 'absolute', left: '7px', top: '20px', bottom: '-20px', width: '1px', background: 'rgba(255,255,255,0.06)' }} />
                                  )}
                                  <div style={{ width: '15px', height: '15px', borderRadius: '50%', background: '#378ADD20', border: '2px solid #378ADD', zIndex: 1, marginTop: '2px' }} />
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '13px', color: '#e4e4e7', marginBottom: '4px' }}>{act.message}</div>
                                    <div style={{ fontSize: '11px', color: '#52525b' }}>{act.timestampLabel}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Add Project Modal */}
          {isAddingProject && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
              <div style={{ background: '#1f1f23', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '16px', maxWidth: '560px', width: '100%', padding: '24px', boxShadow: '0 30px 60px -12px rgba(0,0,0,0.7)', position: 'relative' }}>
                <button onClick={() => { setIsAddingProject(false); setEditingProjectId(null); }} className="close-x-premium">
                  <X size={18} />
                </button>
                
                <h3 style={{ fontSize: '18px', fontWeight: 500, color: '#f4f4f5', margin: '0 0 20px 0' }}>{editingProjectId ? 'Edit Project' : 'Add New Project'}</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '70vh', overflowY: 'auto', paddingRight: '4px' }}>
                  
                  {/* CORE INFORMATION */}
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 500, color: '#52525b', letterSpacing: '0.08em', margin: '0 0 12px 0' }}>CORE INFORMATION</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '12px', color: '#a1a1aa', marginBottom: '5px', display: 'block' }}>Project Name</label>
                        <input 
                          className="modal-input-premium" 
                          placeholder="e.g. Annual Meeting 2026"
                          value={newProjectName}
                          onChange={e => setNewProjectName(e.target.value)}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '12px', color: '#a1a1aa', marginBottom: '5px', display: 'block' }}>Project Initial (for PO)</label>
                        <input 
                          className="modal-input-premium" 
                          placeholder="e.g. AM26"
                          value={newProjectInitial}
                          onChange={e => setNewProjectInitial(e.target.value)}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', alignItems: 'end', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '12px', color: '#a1a1aa', marginBottom: '5px', display: 'block' }}>Client Name</label>
                        <select 
                          className="modal-input-premium modal-select-premium"
                          value={newProjectClient}
                          onChange={e => setNewProjectClient(e.target.value)}
                        >
                          <option value="">Select Client</option>
                          {initialData.clients?.map((c: any, idx: number) => (
                            <option key={`${c.id}-${idx}`} value={c.name}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <button className="btn-add-client-premium" onClick={handleAddClient}>
                        + Add New Client
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '12px', color: '#a1a1aa', marginBottom: '5px', display: 'block' }}>Service Line</label>
                        <select 
                          className="modal-input-premium modal-select-premium"
                          value={newProjectServiceLine}
                          onChange={e => setNewProjectServiceLine(e.target.value)}
                        >
                          <option value="AFM">AFM</option>
                          <option value="EM">EM</option>
                          <option value="Event Management">Event Management</option>
                          <option value="Sport Event Management">Sport Event Management</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '12px', color: '#a1a1aa', marginBottom: '5px', display: 'block' }}>Stage</label>
                        <select 
                          className="modal-input-premium modal-select-premium"
                          value={newProjectStage}
                          onChange={e => setNewProjectStage(e.target.value as WorkflowStage)}
                        >
                          {STAGE_OPTIONS.map((s: any) => (
                            <option key={s.key} value={s.key}>{s.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '12px' }}>
                      <label style={{ fontSize: '12px', color: '#a1a1aa', marginBottom: '5px', display: 'block' }}>Event Date</label>
                      <input 
                        type="date"
                        className="modal-input-premium" 
                        value={newProjectDate}
                        onChange={e => setNewProjectDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <hr style={{ border: 'none', borderTop: '0.5px solid rgba(255,255,255,0.06)', margin: '20px 0' }} />

                  {/* FINANCIALS & ASSIGNMENT */}
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 500, color: '#52525b', letterSpacing: '0.08em', margin: '0 0 12px 0' }}>FINANCIALS & ASSIGNMENT</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '12px', color: '#a1a1aa', marginBottom: '5px', display: 'block' }}>Project Value (IDR)</label>
                        <input 
                          className="modal-input-premium" 
                          placeholder="e.g. 1.500.000.000"
                          value={newProjectValue}
                          onChange={e => {
                            const val = e.target.value.replace(/[^0-9]/g, "");
                            if (!val) {
                              setNewProjectValue("");
                              return;
                            }
                            const formatted = new Intl.NumberFormat("id-ID").format(parseInt(val));
                            setNewProjectValue(formatted);
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '12px', color: '#a1a1aa', marginBottom: '8px', display: 'block' }}>PIC / Owners (Multi-Select)</label>
                        <div style={{ background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '12px', maxHeight: '150px', overflowY: 'auto' }}>
                          {(initialData as any).teamMembers?.map((member: any) => (
                            <label key={member.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', cursor: 'pointer', fontSize: '13px', color: '#e4e4e7' }}>
                              <input 
                                type="checkbox" 
                                checked={newProjectOwners.includes(member.name)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setNewProjectOwners([...newProjectOwners, member.name]);
                                  } else {
                                    setNewProjectOwners(newProjectOwners.filter(n => n !== member.name));
                                  }
                                }}
                              />
                              <span style={{ flex: 1 }}>{member.name}</span>
                              <span style={{ color: '#71717a', fontSize: '10px', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>{member.role.toUpperCase()}</span>
                            </label>
                          ))}
                          {(!(initialData as any).teamMembers || (initialData as any).teamMembers.length === 0) && (
                            <div style={{ fontSize: '12px', color: '#71717a', textAlign: 'center', padding: '10px' }}>
                              No team members found in database. 
                              <br/>Please add team members to the database to see them here.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <hr style={{ border: 'none', borderTop: '0.5px solid rgba(255,255,255,0.06)', margin: '20px 0' }} />

                  {/* ADDITIONAL CONTEXT */}
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 500, color: '#52525b', letterSpacing: '0.08em', margin: '0 0 12px 0' }}>ADDITIONAL CONTEXT</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '12px', color: '#a1a1aa', marginBottom: '5px', display: 'block' }}>Main Project Folder (Google Drive / Link)</label>
                        <input 
                          className="modal-input-premium" 
                          placeholder="https://drive.google.com/..."
                          value={newProjectMainFolder}
                          onChange={e => setNewProjectMainFolder(e.target.value)}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '12px', color: '#a1a1aa', marginBottom: '5px', display: 'block' }}>Proposal / Deck Link (Canva / etc)</label>
                        <input 
                          className="modal-input-premium" 
                          placeholder="https://canva.com/..."
                          value={newProjectProposalLink}
                          onChange={e => setNewProjectProposalLink(e.target.value)}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '12px', color: '#a1a1aa', marginBottom: '5px', display: 'block' }}>Remark / Notes</label>
                        <textarea 
                          className="modal-input-premium"
                          style={{ minHeight: '100px', resize: 'vertical' }}
                          placeholder="Add any specific notes or requirements..."
                          value={newProjectRemark}
                          onChange={e => setNewProjectRemark(e.target.value)}
                        ></textarea>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px', paddingTop: '16px', borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
                  <button 
                    className="btn-cancel-premium"
                    onClick={() => setIsAddingProject(false)}
                  >
                    Cancel
                  </button>
                  <button className="btn-save-premium" onClick={handleSaveProject}>
                    {editingProjectId ? 'Update Project' : 'Create Project'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PRINT ONLY SECTION */}
          <div className="print-only-report">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px', borderBottom: '2px solid #111', paddingBottom: '20px' }}>
              <div>
                <h1 style={{ margin: 0, fontSize: '28px', color: '#000' }}>PROJECT SUMMARY REPORT</h1>
                <p style={{ margin: '5px 0 0', color: '#666', fontSize: '14px' }}>Generated on {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#b45309' }}>JUARA</div>
                <div style={{ fontSize: '12px', color: '#666' }}>Workspace Management System</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '40px' }}>
              <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', marginBottom: '5px' }}>Total Projects</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{sortedProjects.length}</div>
              </div>
              <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', marginBottom: '5px' }}>Total Portfolio Value</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#378ADD' }}>Rp {totalValue.toLocaleString('id-ID')}</div>
              </div>
              <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', marginBottom: '5px' }}>Active Projects</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{sortedProjects.filter(p => !['completed', 'lost'].includes(p.currentStage)).length}</div>
              </div>
              <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', marginBottom: '5px' }}>Current Filter</div>
                <div style={{ fontSize: '12px', fontWeight: '500' }}>{filterClient || "All Clients"} / {filterAE || "All AEs"}</div>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #eee' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px' }}>PROJECT NAME</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px' }}>CLIENT</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px' }}>STAGE</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px' }}>EVENT DATE</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px' }}>VALUE (RP)</th>
                </tr>
              </thead>
              <tbody>
                {sortedProjects.map((p: ProjectRecord, idx: number) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px', fontSize: '12px', fontWeight: 'bold' }}>{p.projectName || (p as any).name}</td>
                    <td style={{ padding: '12px', fontSize: '12px' }}>{p.client}</td>
                    <td style={{ padding: '12px', fontSize: '11px', textTransform: 'uppercase' }}>{p.currentStage}</td>
                    <td style={{ padding: '12px', fontSize: '12px' }}>{formatDate(p.eventDate)}</td>
                    <td style={{ padding: '12px', fontSize: '12px', textAlign: 'right' }}>{p.projectValue?.toLocaleString('id-ID')}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: '60px', display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ textAlign: 'center', width: '200px' }}>
                <p style={{ fontSize: '12px', color: '#666', marginBottom: '60px' }}>Approved by,</p>
                <div style={{ borderTop: '1px solid #000', paddingTop: '10px', fontSize: '14px', fontWeight: 'bold' }}>JUARA MANAGEMENT</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Sidebar Overlay/Scrim */}
      {isMobile && isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 190,
            animation: 'fadeIn 0.2s ease-out'
          }}
        />
      )}

      {/* Mobile Bottom Navigation */}
      <div className="mobile-bottom-nav" style={{ display: isMobile ? 'flex' : 'none' }}>
        <Link href="/projects" className="nav-item active">
          <Grid size={20} />
          <span>Projects</span>
        </Link>
        <Link href="/crm" className="nav-item">
          <Users size={20} />
          <span>CRM</span>
        </Link>
        <Link href="/finance" className="nav-item">
          <FileText size={20} />
          <span>Finance</span>
        </Link>
        <Link href="/docs/manual" className="nav-item">
          <Book size={20} />
          <span>Manual</span>
        </Link>
      </div>

      <style jsx global>{`
        .mobile-only-close { display: none; }
        .mobile-bottom-nav { display: none; }
        .mobile-menu-toggle { display: none; }
        
        /* Premium Scrollbar */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }

        .app-layout-premium {
          display: flex;
          min-height: 100vh;
          background: #09090b;
          color: #f4f4f5;
          font-family: 'Inter', sans-serif;
        }

        .sidebar-premium {
          width: 280px;
          background: #09090b;
          border-right: 0.5px solid rgba(255,255,255,0.06);
          display: flex;
          flex-direction: column;
          padding: 24px 16px;
          flex-shrink: 0;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @media (max-width: 1024px) {
          .app-layout-premium {
            flex-direction: column;
          }

          .mobile-menu-toggle { display: flex !important; }
          .desktop-only-presence, .desktop-only-logout { display: none !important; }
          
          .sidebar-premium {
            display: flex;
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            width: 280px !important;
            z-index: 200;
            box-shadow: 20px 0 50px rgba(0,0,0,0.5);
            background: #09090b !important;
            transform: translateX(-100%);
          }

          .sidebar-premium.mobile-open {
            transform: translateX(0);
          }
          
          .mobile-only-close {
            display: block;
          }
          
          .mobile-bottom-nav {
            display: flex;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 64px;
            background: #09090b;
            border-top: 0.5px solid rgba(255,255,255,0.08);
            z-index: 150;
            justify-content: space-around;
            align-items: center;
            padding-bottom: env(safe-area-inset-bottom);
          }
          
          .mobile-bottom-nav .nav-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            color: #71717a;
            text-decoration: none;
            font-size: 10px;
            font-weight: 500;
            flex: 1;
          }
          
          .mobile-bottom-nav .nav-item.active {
            color: #378ADD;
          }
          
          .main-premium {
            padding-bottom: 80px !important;
            width: 100% !important;
            margin-left: 0 !important;
          }

          .responsive-grid-4 {
            grid-template-columns: repeat(2, 1fr) !important;
          }

          .responsive-grid-2 {
            grid-template-columns: 1fr !important;
          }

          .overview-grid {
            grid-template-columns: 1fr !important;
          }

          .table-premium th:nth-child(4), 
          .table-premium td:nth-child(4) {
            display: none !important;
          }

          .search-container-premium {
            min-width: 100% !important;
          }

          .toolbar-actions {
            width: 100%;
            overflow-x: auto;
            padding-bottom: 8px;
            -webkit-overflow-scrolling: touch;
          }
        }

        @media (max-width: 640px) {
          .responsive-grid-4 {
            grid-template-columns: 1fr !important;
          }
          
          .stat-grid-premium {
            grid-template-columns: 1fr !important;
          }

          .table-premium th:nth-child(2), 
          .table-premium td:nth-child(2),
          .table-premium th:nth-child(6), 
          .table-premium td:nth-child(6) {
            display: none !important;
          }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .print-only-report {
          display: none;
        }
        @media print {
          body * {
            visibility: hidden;
          }
          .print-only-report, .print-only-report * {
            visibility: visible;
          }
          .print-only-report {
            display: block !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
            background: white !important;
            color: black !important;
          }
          .sidebar-premium, .top-header-premium, .view-toolbar-premium, .stat-grid-premium, .tab-content-fade, .app-layout-premium aside, .app-layout-premium header {
            display: none !important;
          }
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
        }
      `}</style>
    </div>
  );
}
