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
  X
} from "lucide-react";

type ViewMode = "overview" | "list" | "table" | "board";

const VIEW_OPTIONS: { id: ViewMode; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "list", label: "List" },
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
  const [newProjectPIC, setNewProjectPIC] = useState("");
  const [newProjectMainFolder, setNewProjectMainFolder] = useState("");
  const [newProjectProposalLink, setNewProjectProposalLink] = useState("");
  const [newProjectRemark, setNewProjectRemark] = useState("");
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  
  // Detail States
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedProject = projects.find(p => p.id === selectedId) || null;
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState<"overview" | "tasks" | "docs" | "vendors" | "execution" | "manpower">("overview");
  const [expandedPhase, setExpandedPhase] = useState<WorkflowStage | null>(null);

  // Sorting
  const [sortConfig, setSortConfig] = useState<{ key: keyof ProjectRecord; direction: 'asc' | 'desc' } | null>(null);

  const filteredProjects = projects.filter(p => {
    const matchesSearch = 
      (p.projectName || (p as any).name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.client || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.owners || []).some(o => o.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStage = selectedStage ? p.currentStage === selectedStage : true;
    return matchesSearch && matchesStage;
  });

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    const aVal = a[key];
    const bVal = b[key];
    if (aVal === bVal) return 0;
    const res = (aVal || "") > (bVal || "") ? 1 : -1;
    return direction === 'asc' ? res : -res;
  });

  const activeProjectsCount = projects.filter(p => ["execution", "finance"].includes(p.currentStage)).length;
  const leadsCount = projects.filter(p => p.currentStage === "lead").length;
  const totalValue = projects.reduce((sum, p) => {
    const valStr = (p as any).projectValue || (p as any).value || "0";
    const val = typeof valStr === 'number' ? valStr : parseFloat(valStr.toString().replace(/[^0-9.-]+/g,"") || "0");
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  const stats = [
    { label: "Total Projects", value: projects.length.toString(), sub: "Projects in workspace", trend: "Real-time", trendType: 'neutral', icon: <BarChart3 size={16} /> },
    { label: "Active Projects", value: activeProjectsCount.toString(), sub: "In execution/finance", trend: "Real-time", trendType: 'neutral', icon: <Zap size={16} /> },
    { label: "Leads", value: leadsCount.toString(), sub: "New opportunities", trend: "Real-time", trendType: 'neutral', icon: <Target size={16} /> },
    { label: "Total Value", value: mounted && totalValue > 0 ? `Rp ${totalValue.toLocaleString('id-ID')}` : (mounted ? "Rp 0" : "---"), sub: "Account worth", trend: "Real-time", trendType: 'neutral', icon: <Coins size={16} /> },
  ];

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

  const toggleTask = (projectId: string, taskId: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        tasks: p.tasks.map(t => t.id === taskId ? { ...t, status: t.status === "done" ? "todo" : "done" } : t)
      };
    }));
  };

  const handleAssignVendor = (projectId: string) => {
    if (!vendorToAssign) return;
    const vendor = initialData.availableVendors.find(v => v.id === vendorToAssign);
    if (!vendor) return;

    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      const alreadyAssigned = (p.assignedVendors || []).some(v => v.vendorId === vendor.id);
      if (alreadyAssigned) return p;
      
      const newAssignment = {
        vendorId: vendor.id,
        vendorName: vendor.name,
        linkId: `lnk_${Date.now()}`,
        status: "confirmed" as const,
        quotedPrice: 0,
      };
      
      return {
        ...p,
        assignedVendors: [...(p.assignedVendors || []), newAssignment]
      };
    }));
    setIsAssignVendorOpen(false);
  };

  const handleRemoveVendor = (projectId: string, linkId: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        assignedVendors: (p.assignedVendors || []).filter(v => v.linkId !== linkId)
      };
    }));
  };

  const handleRemoveShortlist = (projectId: string, linkId: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        vendorShortlist: (p.vendorShortlist || []).filter(v => v.linkId !== linkId)
      };
    }));
  };

  const handleAssignManpower = (projectId: string) => {
    if (!manpowerToAssign) return;
    const mpObj = initialData.availableFreelancers?.find(f => f.id === manpowerToAssign);
    if (!mpObj) return;

    const finalPosition = selectedPositionToAssign === "Custom" ? customPosition : selectedPositionToAssign;
    if (!finalPosition) return;

    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      // Allow multiple assignments of the same person if the position is different
      const alreadyAssignedSamePosition = (p.assignedFreelancers || []).some(f => f.id === manpowerToAssign && f.position === finalPosition);
      if (alreadyAssignedSamePosition) return p;
      
      return {
        ...p,
        assignedFreelancers: [
          ...(p.assignedFreelancers || []),
          {
            id: mpObj.id,
            name: mpObj.nama,
            position: finalPosition || mpObj.posisi_utama[0] || "Crew",
            phone: mpObj.no_hp
          }
        ]
      };
    }));
    setIsAssignManpowerOpen(false);
    setManpowerToAssign("");
    setSelectedPositionToAssign("");
    setCustomPosition("");
  };

  const handleRemoveManpower = (projectId: string, freelancerId: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        assignedFreelancers: (p.assignedFreelancers || []).filter(f => f.id !== freelancerId)
      };
    }));
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
      owners: newProjectPIC ? newProjectPIC.split(",").map(s => s.trim()) : ["Admin"],
      mainFolder: newProjectMainFolder,
      remark: newProjectRemark,
    };

    if (newProjectProposalLink) {
      projectData.documents = [
        { id: `doc_${Date.now()}`, title: 'Proposal / Deck', url: newProjectProposalLink, status: 'available', stage: 'pitching' }
      ];
    }

    try {
      const isEdit = !!editingProjectId;
      const url = '/api/projects';
      const method = isEdit ? 'PUT' : 'POST';
      
      const payload = isEdit ? { ...projects.find(p => p.id === editingProjectId), ...projectData } : projectData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        if (isEdit) {
          setProjects(prev => prev.map(p => p.id === editingProjectId ? result.project : p));
        } else {
          setProjects(prev => [result.project, ...prev]);
        }
        
        setIsAddingProject(false);
        setEditingProjectId(null);
        
        // Reset form
        setNewProjectName("");
        setNewProjectInitial("");
        setNewProjectClient("");
        setNewProjectValue("0");
        setNewProjectPIC("");
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
    setNewProjectPIC(project.owners.join(", "));
    setNewProjectMainFolder(project.mainFolder || "");
    setNewProjectServiceLine(project.serviceLine || "EO - Corporate");
    setNewProjectStage(project.currentStage);
    setNewProjectRemark(project.remark || "");
    setIsAddingProject(true);
  };

  return (
    <div className="app-layout-premium">
      {/* Sidebar Navigation */}
      <aside className="sidebar-premium">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px', padding: '0 4px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '14px' }}>J</div>
          <span style={{ fontSize: '11px', fontWeight: 500, color: '#a1a1aa', letterSpacing: '0.06em' }}>JUARA WORKSPACE</span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          <Link href="/" className="sidebar-item-premium"><Home size={18} /> Workspace Hub</Link>
          <Link href="/projects" className="sidebar-item-premium active"><Grid size={18} /> Projects</Link>
          <Link href="/crm" className="sidebar-item-premium"><User size={18} /> CRM</Link>
          <Link href="/vendors" className="sidebar-item-premium"><Building2 size={18} /> Vendors</Link>
          <Link href="/manpower/freelancer" className="sidebar-item-premium"><Users size={18} /> Man Power</Link>
          <Link href="/finance" className="sidebar-item-premium"><FileText size={18} /> Finance & RFP</Link>
          <Link href="/docs" className="sidebar-item-premium"><FolderOpen size={18} /> Document Center</Link>

          <div style={{ marginTop: '32px', marginBottom: '8px', padding: '0 12px' }}>
            <span style={{ fontSize: '10px', color: '#3f3f46', letterSpacing: '0.08em' }}>ACTIVE IDENTITY</span>
          </div>
          <div style={{ background: '#1f1f23', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '6px 10px', fontSize: '12px', color: '#a1a1aa', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 4px' }}>
            Project Manager (Viewer) <ChevronDown size={14} />
          </div>

          <div style={{ marginTop: '24px', marginBottom: '8px', padding: '0 12px' }}>
            <span style={{ fontSize: '10px', color: '#3f3f46', letterSpacing: '0.08em' }}>THEME</span>
          </div>
          <div style={{ display: 'flex', background: '#111113', borderRadius: '8px', padding: '2px', margin: '0 4px' }}>
            <button style={{ flex: 1, padding: '4px', background: '#378ADD', color: 'white', borderRadius: '6px', fontSize: '11px' }}>Dark</button>
            <button style={{ flex: 1, padding: '4px', color: '#52525b', fontSize: '11px' }}>Monday</button>
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="main-premium">
        {/* Fixed Top Header */}
        <header className="top-header-premium">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(99,153,34,0.1)', color: '#639922', padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: 600, marginBottom: '6px' }}>DATABASE READY</div>
              <h1 style={{ fontSize: '22px', fontWeight: 500, color: '#f4f4f5', margin: 0 }}>JUARA'S PROJECTS 2026</h1>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button className="ghost-button" style={{ fontSize: '12px', padding: '6px 14px', border: '0.5px solid rgba(255,255,255,0.15)', color: '#a1a1aa' }}>Open detail</button>
              <button className="primary-button" style={{ fontSize: '12px', padding: '6px 14px', background: '#378ADD' }} onClick={() => setIsAddingProject(true)}>+ Add Project</button>
              <button className="ghost-button" style={{ fontSize: '12px', color: '#71717a' }}>Logout</button>
            </div>
          </div>
        </header>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Stat Cards Row */}
          <div className="stat-grid-premium">
            {stats.map((s, idx) => (
              <div key={idx} className="section-card-premium" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '12px', color: '#71717a' }}>{s.label}</span>
                  <div style={{ color: '#52525b' }}>{s.icon}</div>
                </div>
                <div style={{ fontSize: s.label === "Total Value" ? '20px' : '24px', fontWeight: 500, color: '#f4f4f5' }}>{s.value}</div>
                <div style={{ fontSize: '12px', color: '#52525b', marginTop: '4px' }}>{s.sub}</div>
                <div className={`trend-pill ${s.trendType === 'up' ? 'trend-up' : (s.trendType === 'down' ? 'trend-down' : 'trend-neutral')}`}>
                  {s.trend}
                </div>
              </div>
            ))}
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

            {/* Search + Filter Row */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '12px', top: '10px', color: '#52525b' }} />
                <input 
                  className="mini-input"
                  style={{ width: '100%', paddingLeft: '36px', height: '36px', background: '#111113' }}
                  placeholder="Search client, project, PIC, service, status, or stage"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div style={{ position: 'relative', width: '160px' }}>
                <Filter size={14} style={{ position: 'absolute', left: '12px', top: '10px', color: '#52525b' }} />
                <select className="mini-input" style={{ width: '100%', paddingLeft: '36px', height: '36px', background: '#111113' }}>
                  <option>All stages</option>
                </select>
              </div>
            </div>
          </div>

          {/* Stage Filter Chips */}
          <div className="stage-filter-scroll">
            {STAGE_OPTIONS.map(stage => (
              <button 
                key={stage.key}
                className={`stage-chip-premium ${selectedStage === stage.key ? 'active' : ''}`}
                onClick={() => setSelectedStage(selectedStage === stage.key ? null : stage.key)}
              >
                {stage.label}
              </button>
            ))}
          </div>

          {/* View Renderers */}
          <div style={{ padding: '0 24px 40px 24px' }}>
            {viewMode === "overview" && (
              <div className="tab-content-fade">
                <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', letterSpacing: '0.08em', color: '#52525b', fontWeight: 600 }}>FOCUS PROJECTS</span>
                  <button className="ghost-button" style={{ fontSize: '12px', color: '#378ADD' }}>View All</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  {projects.slice(0, 2).map((p, i) => (
                    <div key={i} className="section-card-premium" style={{ padding: '14px 16px', cursor: 'pointer' }} onClick={() => openProject(p)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div className="stage-pill-premium" style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa' }}>{p.currentStage.toUpperCase()}</div>
                        <div className="urgency-badge-premium" style={{ background: 'rgba(180,115,23,0.2)', color: '#EF9F27' }}>Needs monitoring</div>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 500, color: '#e4e4e7', marginBottom: '2px' }}>{p.projectName || (p as any).name || "Untitled Project"}</div>
                      <div style={{ fontSize: '12px', color: '#71717a', marginBottom: '12px' }}>{p.client}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#52525b' }}>{p.eventDate || "TBD"}</span>
                        <span style={{ fontSize: '12px', color: '#a1a1aa' }}>{p.projectValueLabel}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {viewMode === "list" && (
              <div className="tab-content-fade">
                {sortedProjects.map(p => (
                  <div key={p.id} className="list-row-premium" onClick={() => openProject(p)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: getStageColor(p.currentStage) }} />
                      <div>
                        <div style={{ fontSize: '13px', color: '#e4e4e7', fontWeight: 500 }}>{p.projectName || (p as any).name || "Untitled Project"}</div>
                        <div style={{ fontSize: '12px', color: '#71717a' }}>{p.client}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                      <div className="stage-pill-premium" style={{ background: 'rgba(255,255,255,0.05)', color: '#71717a' }}>{p.currentStage.toUpperCase()}</div>
                      <div style={{ fontSize: '12px', color: '#a1a1aa', width: '120px', textAlign: 'right' }}>{p.projectValueLabel}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {viewMode === "table" && (
              <div className="tab-content-fade" style={{ overflowX: 'auto' }}>
                <table className="table-premium">
                  <thead>
                    <tr>
                      <th onClick={() => setSortConfig({ key: 'projectName', direction: sortConfig?.direction === 'asc' ? 'desc' : 'asc' })}>PROJECT ↕</th>
                      <th onClick={() => setSortConfig({ key: 'client', direction: sortConfig?.direction === 'asc' ? 'desc' : 'asc' })}>CLIENT ↕</th>
                      <th>STAGE</th>
                      <th>EVENT DATE</th>
                      <th style={{ textAlign: 'right' }}>VALUE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedProjects.map(p => (
                      <tr key={p.id} onClick={() => openProject(p)}>
                        <td>{p.projectName || (p as any).name || "Untitled Project"}</td>
                        <td>{p.client}</td>
                        <td>
                          <span className="stage-pill-premium" style={{ background: 'rgba(255,255,255,0.05)', color: getStageColor(p.currentStage) }}>
                            {p.currentStage.toUpperCase()}
                          </span>
                        </td>
                        <td>{p.eventDate || "–"}</td>
                        <td style={{ textAlign: 'right' }}>{p.projectValueLabel || "–"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {viewMode === "board" && (
              <div className="tab-content-fade">
                <div className="board-zoom-controls">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '12px', color: '#71717a' }}>Board zoom</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#111113', padding: '4px 12px', borderRadius: '8px', border: '0.5px solid rgba(255,255,255,0.08)' }}>
                      <button onClick={() => setBoardZoom(z => Math.max(50, z - 10))} style={{ color: '#71717a', border: 'none', background: 'none', cursor: 'pointer' }}>–</button>
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
                    {STAGE_OPTIONS.map(col => {
                      const colProjects = projects.filter(p => p.currentStage === col.key);
                      return (
                        <div 
                          key={col.key} 
                          className="kanban-column-premium" 
                          style={{ minWidth: denseMode ? '220px' : '280px', background: 'rgba(255,255,255,0.01)', borderRadius: '12px' }}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => {
                            if (!draggedProjectId) return;
                            setProjects(prev => prev.map(p => 
                              p.id === draggedProjectId ? { ...p, currentStage: col.key } : p
                            ));
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
                            {colProjects.map(p => (
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
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                                  <span style={{ color: '#52525b' }}>{p.eventDate || "–"}</span>
                                  <span style={{ color: '#a1a1aa' }}>{p.projectValueLabel}</span>
                                </div>
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
        </div>
      </main>

      {/* Detail Overlay */}
      {detailOpen && selectedProject && (
        <div 
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}
          onClick={() => setDetailOpen(false)}
        >
          <div 
            style={{ width: '600px', background: '#18181b', height: '100%', overflowY: 'auto', borderLeft: '0.5px solid rgba(255,255,255,0.08)', animation: 'slideIn 0.3s ease' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header-premium" style={{ position: 'sticky', top: 0, zIndex: 10, background: '#18181b', padding: '24px 32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="stage-pill-premium" style={{ background: 'rgba(55,138,221,0.1)', color: '#378ADD', marginBottom: '8px' }}>{selectedProject.currentStage.toUpperCase()}</div>
                  <h2 style={{ fontSize: '20px', fontWeight: 500, margin: 0 }}>{selectedProject.projectName}</h2>
                  <div style={{ color: '#71717a', fontSize: '13px' }}>{selectedProject.client}</div>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    className="secondary-button-premium" 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      height: '34px',
                      background: '#f4f4f5',
                      color: '#18181b',
                      padding: '0 16px',
                      borderRadius: '8px',
                      border: 'none',
                      fontWeight: 600,
                      fontSize: '13px'
                    }} 
                    onClick={() => openEditModal(selectedProject)}
                  >
                    <Edit size={14} /> Edit
                  </button>
                  <button 
                    className="ghost-button" 
                    onClick={() => setDetailOpen(false)}
                    style={{ background: 'none', border: 'none', color: '#a1a1aa', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
                  >
                    Close
                  </button>
                </div>
              </div>
              
              <div style={{ marginTop: '24px', display: 'flex', gap: '24px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                {["overview", "tasks", "docs", "vendors", "execution", "manpower"].map(tab => (
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
                        <div style={{ fontSize: '14px' }}>{selectedProject.eventDate || "–"}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#52525b', marginBottom: '4px' }}>VALUE</div>
                        <div style={{ fontSize: '14px' }}>{selectedProject.projectValueLabel || "–"}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#52525b', marginBottom: '4px' }}>PIC</div>
                        <div style={{ fontSize: '14px' }}>{(selectedProject.owners || []).join(", ") || "–"}</div>
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
                <div className="tab-content-fade">
                  {/* Overall Checklist Progress */}
                  <div className="overall-completion-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', color: '#71717a' }}>Overall checklist</span>
                      <span style={{ fontSize: '12px', fontWeight: 600 }}>{Math.round((selectedProject.tasks.filter(t => t.status === 'done').length / selectedProject.tasks.length) * 100)}%</span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: '#378ADD', width: `${(selectedProject.tasks.filter(t => t.status === 'done').length / selectedProject.tasks.length) * 100}%` }} />
                    </div>
                  </div>

                  <div className="section-card-premium" style={{ marginBottom: '20px' }}>
                    <div className="section-header-premium" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', fontWeight: 500 }}>Stage Checklist</span>
                      <span style={{ fontSize: '12px', color: '#71717a' }}>{selectedProject.tasks.filter(t => t.status === 'done').length} / {selectedProject.tasks.length} completed</span>
                    </div>
                    <div className="task-stack" style={{ padding: '0 16px 16px' }}>
                      {selectedProject.tasks.map(t => (
                        <div key={t.id} className="item-row-premium" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
                          <div 
                            className={`custom-checkbox-premium ${t.status === 'done' ? 'checked' : ''}`}
                            onClick={() => toggleTask(selectedProject.id, t.id)}
                            style={{ cursor: 'pointer' }}
                          >
                            {t.status === 'done' && <Check size={10} color="white" />}
                          </div>
                          <span style={{ fontSize: '13px', color: t.status === 'done' ? '#52525b' : '#e4e4e7' }}>{t.title}</span>
                          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                             <span className="urgency-badge-premium" style={{ fontSize: '10px', background: 'rgba(151,196,89,0.1)', color: '#97C459' }}>On track</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="section-card-premium">
                    <div className="section-header-premium" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', fontWeight: 500 }}>Milestones</span>
                      <button className="ghost-button" style={{ fontSize: '11px', color: '#378ADD' }} onClick={() => alert("Fitur edit milestone sedang disiapkan. Milestones akan otomatis terupdate berdasarkan progress task.")}>Edit milestones</button>
                    </div>
                    <div style={{ padding: '0 16px 16px' }}>
                      {(selectedProject.milestones || []).map(m => (
                        <div key={m.id} className="item-row-premium" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: m.completed ? '#97C459' : '#3f3f46' }} />
                          <span style={{ fontSize: '13px' }}>{m.label}</span>
                          <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#71717a' }}>{m.target}</span>
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
                      {Math.round((selectedProject.tasks.filter(t => t.status === 'done').length / (selectedProject.tasks.length || 1)) * 100)}%
                    </div>
                    <div style={{ fontSize: '12px', color: '#71717a', marginBottom: '12px' }}>Overall project completion</div>
                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: '#378ADD', width: `${(selectedProject.tasks.filter(t => t.status === 'done').length / (selectedProject.tasks.length || 1)) * 100}%` }} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                    {STAGE_OPTIONS.map(stage => {
                       const pTasks = selectedProject.tasks.filter(t => t.stage === stage.key);
                       const pDone = pTasks.filter(t => t.status === "done").length;
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
                            {initialData.availableVendors.map(v => (
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
                      {(selectedProject.assignedVendors || []).map(v => (
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
                       {(selectedProject.vendorShortlist || []).map(v => (
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
                            {(initialData.availableFreelancers || []).map(f => (
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
                              {((initialData.availableFreelancers || []).find(f => f.id === manpowerToAssign)?.posisi_utama || ["Crew"]).map(pos => (
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
                      {(selectedProject.assignedFreelancers || []).map(f => (
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
                      {initialData.clients?.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <button className="btn-add-client-premium">
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
                      {STAGE_OPTIONS.map(s => (
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
                    <label style={{ fontSize: '12px', color: '#a1a1aa', marginBottom: '5px', display: 'block' }}>PIC / Owners</label>
                    <input 
                      className="modal-input-premium" 
                      placeholder="e.g. Yudi, Andi"
                      value={newProjectPIC}
                      onChange={e => setNewProjectPIC(e.target.value)}
                    />
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
                    />
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
    </div>
  );
}
