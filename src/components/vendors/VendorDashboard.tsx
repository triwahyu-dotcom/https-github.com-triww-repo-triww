"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { 
  Users, 
  Package, 
  CheckCircle, 
  Star, 
  Search, 
  Plus, 
  Trash2, 
  Edit, 
  ChevronDown, 
  ChevronRight,
  Filter,
  LogOut,
  ArrowRight,
  Building2,
  Home,
  Grid,
  User,
  Layout,
  Briefcase,
  FileBarChart,
  FolderOpen,
  ArrowUpDown,
  Mail,
  Zap,
  BarChart3,
  MapPin,
  Clock,
  ExternalLink,
  Check,
  MoreVertical,
  X,
  PlusCircle,
  TrendingUp,
  FileText
} from "lucide-react";
import { DashboardData, VendorSummary, ReviewStatus, VendorClassification } from "@/lib/vendor/types";

type ViewMode = "all" | "status" | "type" | "directory";

export function VendorDashboard({ initialData }: { initialData: DashboardData }) {
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [scoreFilter, setScoreFilter] = useState<string>("all");
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState<"overview" | "docs" | "projects" | "history">("overview");
  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([]);
  const [lang, setLang] = useState<"ID" | "EN">("ID");
  
  // Collapsible sections for "Type" view
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const [sortKey, setSortKey] = useState<string>("registered");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [isSyncing, setIsSyncing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<any>(null);

  const [vendors, setVendors] = useState<any[]>([]);

  useEffect(() => {
    // Rely ONLY on real production data from initialData
    const processed = initialData.vendorDetails.map((v) => {
      return {
        ...v,
        category: v.classification === "Penyedia Barang" ? "PENYEDIA BARANG" : "PENYEDIA JASA",
        type: v.serviceNames?.[0] || "Others",
        classification: v.classification === "Penyedia Barang" ? "Goods / Equipment" : "Services / Specialist",
        status: v.reviewStatus === "approved" ? "Disetujui" : (v.reviewStatus === "in_review" ? "Sedang direview" : "Baru"),
        score: v.performance?.average || null,
        location: v.businessAddress || "–",
        docs: { done: v.documentCompletion?.complete || 0, total: v.documentCompletion?.required || 3 },
        compliance: v.compliance?.status === "ok" ? "OK" : "Pending",
        registered: v.createdAt ? v.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]
      };
    });
    setVendors(processed);
  }, [initialData.vendorDetails]);


  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      alert("Sinkronisasi database vendor berhasil!");
    }, 1500);
  };

  const handleLogout = () => {
    window.location.href = "/login";
  };



  const [classificationFilter, setClassificationFilter] = useState<string>("all");
  const [servicesFilter, setServicesFilter] = useState<string>("all");
  const [showClassDropdown, setShowClassDropdown] = useState(false);
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);

  // Get dynamic unique services for the filter
  const allServiceTypes = useMemo(() => {
    const types = new Set<string>();
    vendors.forEach(v => {
      if (v.type && v.type !== "Others") types.add(v.type);
    });
    return Array.from(types).sort();
  }, [vendors]);



  const filteredVendors = useMemo(() => {
    return vendors.filter(v => {
      const matchScore = 
        scoreFilter === 'all' ? true :
        scoreFilter === 'top' ? (v.score !== null && v.score >= 4.5) :
        scoreFilter === 'mid' ? (v.score !== null && v.score >= 3.5 && v.score < 4.5) :
        scoreFilter === 'low' ? (v.score !== null && v.score < 3.5) :
        scoreFilter === 'unrated' ? v.score === null : true;
      
      const matchClass = 
        classificationFilter === 'all' ? true :
        v.classification === classificationFilter;
      
      const matchService = 
        servicesFilter === 'all' ? true :
        v.type === servicesFilter;
      
      const matchSearch = searchQuery === '' ? true :
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.category.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchScore && matchClass && matchService && matchSearch;
    }).sort((a, b) => {
      const order = sortOrder === "asc" ? 1 : -1;
      if (sortKey === "registered") {
        return (new Date(a.registered).getTime() - new Date(b.registered).getTime()) * order;
      }
      return 0;
    });
  }, [vendors, scoreFilter, searchQuery, sortKey, sortOrder, classificationFilter, servicesFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Disetujui": return { bg: "rgba(99,153,34,0.15)", text: "#97C459", label: "Disetujui" };
      case "Sedang direview": return { bg: "rgba(239,159,39,0.15)", text: "#EF9F27", label: "Sedang direview" };
      case "Baru": return { bg: "rgba(55,138,221,0.15)", text: "#85B7EB", label: "Baru" };
      case "Ditolak": return { bg: "rgba(226,75,74,0.15)", text: "#F09595", label: "Ditolak" };
      default: return { bg: "rgba(255,255,255,0.05)", text: "#71717a", label: status };
    }
  };

  const getClassificationColor = (classification: string) => {
    if (classification === "Goods / Equipment" || classification === "Equipment") {
      return { bg: "rgba(15,110,86,0.15)", text: "#5DCAA5" };
    }
    return { bg: "rgba(83,74,183,0.15)", text: "#AFA9EC" };
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return "#52525b";
    if (score >= 4.5) return "#97C459";
    if (score >= 3.5) return "#85B7EB";
    return "#EF9F27";
  };

  const renderStarBar = (score: number | null, size = 8, gap = 4) => {
    const color = getScoreColor(score);
    const filledCount = score === null ? 0 : Math.round(score);
    return (
      <div className="star-dot-bar" style={{ gap: `${gap}px` }}>
        {[1,2,3,4,5].map(i => (
          <div 
            key={i} 
            className="star-dot" 
            style={{ 
              width: `${size}px`, 
              height: `${size}px`,
              background: i <= filledCount ? color : 'rgba(255,255,255,0.12)' 
            }} 
          />
        ))}
      </div>
    );
  };

  const openVendor = (id: number) => {
    setSelectedVendorId(id.toString());
    setIsDetailOpen(true);
    setIsEditing(false);
  };

  const startEditing = () => {
    if (!selectedVendorDetail) return;
    setEditFormData({ ...selectedVendorDetail });
    setIsEditing(true);
  };

  const handleSaveVendor = async () => {
    try {
      const response = await fetch(`/api/vendors/${editFormData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editFormData.name,
          classification: editFormData.classification,
          businessAddress: editFormData.location,
        })
      });

      if (response.ok) {
        setVendors(prev => prev.map(v => v.id === editFormData.id ? editFormData : v));
        setIsEditing(false);
        alert("Profil vendor berhasil diperbarui!");
      } else {
        alert("Gagal memperbarui profil vendor.");
      }
    } catch (error) {
      console.error("Error saving vendor:", error);
      alert("Terjadi kesalahan saat menyimpan.");
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedVendorIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectedVendorDetail = vendors.find(v => v.id.toString() === selectedVendorId);

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
          <Link href="/projects" className="sidebar-item-premium"><Grid size={18} /> Projects</Link>
          <Link href="/crm" className="sidebar-item-premium"><User size={18} /> CRM</Link>
          <Link href="/vendors" className="sidebar-item-premium active"><Building2 size={18} /> Vendors</Link>
          <Link href="/manpower/freelancer" className="sidebar-item-premium"><Users size={18} /> Man Power</Link>
          <Link href="/finance" className="sidebar-item-premium"><FileText size={18} /> Finance & RFP</Link>
          <Link href="/docs" className="sidebar-item-premium"><FolderOpen size={18} /> Document Center</Link>

          <div style={{ marginTop: '32px', marginBottom: '8px', padding: '0 12px' }}>
            <span style={{ fontSize: '10px', color: '#3f3f46', letterSpacing: '0.08em' }}>ACTIVE IDENTITY</span>
          </div>
          <div style={{ background: '#1f1f23', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '6px 10px', fontSize: '12px', color: '#a1a1aa', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 4px' }}>
            Vendor Manager (Full Access) <ChevronDown size={14} />
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
              <h1 style={{ fontSize: '22px', fontWeight: 500, color: '#f4f4f5', margin: 0 }}>Supplier/Vendor Management</h1>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ display: 'flex', background: '#111113', borderRadius: '8px', padding: '2px', border: '0.5px solid rgba(255,255,255,0.08)' }}>
                <button onClick={() => setLang("ID")} style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '6px', background: lang === "ID" ? "#1f1f23" : "transparent", color: lang === "ID" ? "#f4f4f5" : "#52525b", border: 'none' }}>ID</button>
                <button onClick={() => setLang("EN")} style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '6px', background: lang === "EN" ? "#1f1f23" : "transparent", color: lang === "EN" ? "#f4f4f5" : "#52525b", border: 'none' }}>EN</button>
              </div>
              <button className="ghost-button" style={{ fontSize: '12px', padding: '6px 14px', border: '0.5px solid rgba(255,255,255,0.12)', color: '#a1a1aa' }} onClick={() => alert("Membuka log sinkronisasi vendor...")}>Sync Log</button>
              <button className="ghost-button" style={{ fontSize: '12px', padding: '6px 14px', border: '0.5px solid rgba(255,255,255,0.12)', color: '#a1a1aa' }} onClick={() => alert("Membuka outbox email vendor...")}>Outbox</button>
              <button 
                className="primary-button" 
                style={{ fontSize: '12px', padding: '6px 16px', background: isSyncing ? '#1f2937' : '#378ADD', opacity: isSyncing ? 0.7 : 1 }}
                onClick={handleSync}
                disabled={isSyncing}
              >
                {isSyncing ? "Menyinkronkan..." : "Sinkronkan sekarang"}
              </button>
              <button className="ghost-button" style={{ fontSize: '12px', color: '#71717a' }} onClick={handleLogout}>Logout</button>
            </div>
          </div>
        </header>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Stat Cards Row */}
          <div className="vendor-grid-premium">
            {[
              { label: "Total Vendors", value: vendors.length, sub: "Registered suppliers", trend: "↑ 5 dari bulan lalu", trendType: 'up', icon: <Users size={16} /> },
              { label: "Penyedia Jasa", value: vendors.filter(v => v.category === "PENYEDIA JASA").length, sub: "Service providers", trend: "↑ 2 dari bulan lalu", trendType: 'up', icon: <User size={16} /> },
              { label: "Penyedia Barang", value: vendors.filter(v => v.category === "PENYEDIA BARANG").length, sub: "Equipment/Goods", trend: "sama", trendType: 'neutral', icon: <Package size={16} /> },
              { label: "Approved", value: vendors.filter(v => v.status === "Disetujui").length, sub: "Verified and ready", trend: "↑ 5 dari bulan lalu", trendType: 'up', icon: <CheckCircle size={16} /> },
              { label: "Top Rated", value: vendors.filter(v => v.score && v.score >= 4.5).length, sub: "Score >= 4.5", trend: "↑ 3 dari bulan lalu", trendType: 'up', icon: <Star size={16} /> },
            ].map((s, idx) => (
              <div key={idx} className="section-card-premium" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '12px', color: '#71717a' }}>{s.label}</span>
                  <div style={{ color: '#52525b' }}>{s.icon}</div>
                </div>
                <div style={{ fontSize: '24px', fontWeight: 500, color: '#f4f4f5' }}>{s.value}</div>
                <div style={{ fontSize: '12px', color: '#52525b', marginTop: '4px' }}>{s.sub}</div>
                <div className={`trend-pill trend-neutral`}>
                  Real-time
                </div>
              </div>
            ))}
          </div>

          {/* Sticky Toolbar */}
          <div className="view-toolbar-premium">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(["all", "status", "type", "directory"] as const).map(m => (
                  <button 
                    key={m}
                    onClick={() => setViewMode(m)}
                    style={{ 
                      padding: '6px 14px', 
                      fontSize: '13px', 
                      borderRadius: '8px',
                      background: viewMode === m ? '#378ADD' : 'transparent',
                      color: viewMode === m ? 'white' : '#71717a',
                      border: viewMode === m ? 'none' : '0.5px solid rgba(255,255,255,0.08)',
                      cursor: 'pointer'
                    }}
                  >
                    {m === "all" ? "All Vendors" : m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: '#52525b' }} />
                  <input 
                    className="mini-input"
                    style={{ width: '220px', paddingLeft: '32px', height: '32px', background: '#111113' }}
                    placeholder="Search vendor..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div style={{ position: 'relative' }}>
                  <button 
                    className="mini-input" 
                    style={{ background: '#111113', height: '32px', display: 'flex', alignItems: 'center', gap: '8px', border: classificationFilter !== 'all' ? '1px solid #378ADD' : '0.5px solid rgba(255,255,255,0.08)' }}
                    onClick={() => { setShowClassDropdown(!showClassDropdown); setShowServiceDropdown(false); }}
                  >
                    {classificationFilter === 'all' ? 'Classification' : classificationFilter} <ChevronDown size={14} />
                  </button>
                  {showClassDropdown && (
                    <div className="dropdown-panel-premium">
                      {['all', 'Services / Specialist', 'Goods / Equipment'].map(opt => (
                        <div 
                          key={opt} 
                          className={`dropdown-item-premium ${classificationFilter === opt ? 'active' : ''}`}
                          onClick={() => { setClassificationFilter(opt); setShowClassDropdown(false); }}
                        >
                          {opt === 'all' ? 'All Classifications' : opt}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ position: 'relative' }}>
                  <button 
                    className="mini-input" 
                    style={{ background: '#111113', height: '32px', display: 'flex', alignItems: 'center', gap: '8px', border: servicesFilter !== 'all' ? '1px solid #378ADD' : '0.5px solid rgba(255,255,255,0.08)' }}
                    onClick={() => { setShowServiceDropdown(!showServiceDropdown); setShowClassDropdown(false); }}
                  >
                    {servicesFilter === 'all' ? 'Services' : servicesFilter} <ChevronDown size={14} />
                  </button>
                  {showServiceDropdown && (
                    <div className="dropdown-panel-premium" style={{ width: '240px' }}>
                      {['all', ...allServiceTypes, 'Others'].map(opt => (
                        <div 
                          key={opt} 
                          className={`dropdown-item-premium ${servicesFilter === opt ? 'active' : ''}`}
                          onClick={() => { setServicesFilter(opt); setShowServiceDropdown(false); }}
                        >
                          {opt === 'all' ? 'All Services' : opt}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button className="ghost-button" style={{ padding: '4px' }} onClick={() => alert("Opsi lanjutan.")}><MoreVertical size={16} /></button>
                <div style={{ background: 'rgba(255,255,255,0.05)', color: '#52525b', fontSize: '11px', padding: '3px 10px', borderRadius: '20px' }}>{filteredVendors.length} ITEMS</div>
                <div style={{ background: '#378ADD', color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '4px' }}>Baru</div>
                <button 
                  className="primary-button" 
                  style={{ height: '32px', background: '#378ADD', borderRadius: '8px' }}
                  onClick={() => alert("Form pendaftaran vendor baru akan segera dibuka.")}
                >
                  + New
                </button>
              </div>
            </div>

            {/* Score Filter Row */}
            <div className="score-chip-row" style={{ marginTop: '8px' }}>
              {[
                { id: 'all', label: 'All scores' },
                { id: 'top', label: '4.5 – 5.0 (Top Rated)' },
                { id: 'mid', label: '3.5 – 4.4' },
                { id: 'low', label: 'Below 3.5' },
                { id: 'unrated', label: 'Not yet rated' }
              ].map(chip => (
                <button 
                  key={chip.id}
                  className={`score-chip ${scoreFilter === chip.id ? 'active' : ''}`}
                  onClick={() => setScoreFilter(chip.id)}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* View Renderers */}
          <div style={{ padding: '0 24px 80px 24px' }}>
            {viewMode === "all" && (
              <div className="tab-content-fade">
                <div className="vendor-table-header" style={{ gridTemplateColumns: '32px 1fr 120px 120px 80px', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}><input type="checkbox" /></div>
                  <div>NAMA VENDOR</div>
                  <div>STATUS</div>
                  <div 
                    style={{ textAlign: 'center', cursor: 'pointer', color: sortKey === 'registered' ? '#378ADD' : '#52525b' }}
                    onClick={() => {
                      if (sortKey === 'registered') setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                      else { setSortKey('registered'); setSortOrder('desc'); }
                    }}
                  >
                    TANGGAL DAFTAR {sortKey === 'registered' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                  </div>
                  <div style={{ textAlign: 'right' }}>SCORE</div>
                </div>
                {filteredVendors.map(v => {
                  const status = getStatusColor(v.status);
                  const classification = getClassificationColor(v.classification);
                  const scoreColor = getScoreColor(v.score);
                  return (
                    <div key={v.id} className="vendor-list-row" style={{ gridTemplateColumns: '32px 1fr 120px 120px 80px', gap: '16px' }} onClick={() => openVendor(v.id)}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedVendorIds.includes(v.id.toString())}
                          onChange={(e) => {
                            e.stopPropagation();
                            const id = v.id.toString();
                            setSelectedVendorIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
                          }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '11px', fontWeight: 500, color: '#52525b', letterSpacing: '0.06em', marginBottom: '4px' }}>{v.category}</div>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: '#e4e4e7' }}>{v.name}</div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
                          <span className="stage-pill-premium" style={{ background: classification.bg, color: classification.text }}>{v.classification}</span>
                        </div>
                      </div>
                      <div>
                        <span className="stage-pill-premium" style={{ background: status.bg, color: status.text }}>{status.label}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#71717a', textAlign: 'center' }}>
                        {new Date(v.registered).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                      <div style={{ textAlign: 'right', width: '80px' }}>
                        <div style={{ fontSize: '15px', fontWeight: 500, color: scoreColor }}>{v.score === null ? '–' : v.score.toFixed(1)}</div>
                        <div style={{ display: 'flex', gap: '3px', marginTop: '4px', justifyContent: 'flex-end' }}>
                          {[1,2,3,4,5].map(i => (
                            <div key={i} style={{
                              width: '7px', height: '7px',
                              borderRadius: '50%',
                              background: i <= (v.score === null ? 0 : Math.round(v.score)) 
                                ? scoreColor 
                                : 'rgba(255,255,255,0.12)'
                            }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {viewMode === "status" && (
              <div className="tab-content-fade">
                {["Disetujui", "Sedang direview", "Baru"].map(statusKey => {
                  const statusInfo = getStatusColor(statusKey);
                  const statusVendors = filteredVendors.filter(v => v.status === statusKey);
                  const totalInCategory = vendors.filter(v => v.status === statusKey).length;

                  return (
                    <div key={statusKey} style={{ marginBottom: '32px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 500, color: '#71717a' }}>{statusInfo.label}</span>
                        <span style={{ background: 'rgba(255,255,255,0.05)', color: '#52525b', fontSize: '11px', padding: '2px 8px', borderRadius: '20px' }}>{statusVendors.length}</span>
                      </div>
                      
                      {statusVendors.length > 0 ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                          {statusVendors.map(v => {
                            const classification = getClassificationColor(v.classification);
                            const scoreColor = getScoreColor(v.score);
                            return (
                              <div key={v.id} className="section-card-premium" style={{ padding: '16px', cursor: 'pointer' }} onClick={() => openVendor(v.id)}>
                                <div style={{ fontSize: '11px', color: '#52525b', letterSpacing: '0.06em', marginBottom: '4px' }}>{v.category}</div>
                                <div style={{ fontSize: '14px', fontWeight: 500, color: '#e4e4e7', marginBottom: '12px' }}>{v.name}</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                  <div style={{ display: 'flex', gap: '6px' }}>
                                    <span className="stage-pill-premium" style={{ background: classification.bg, color: classification.text, fontSize: '10px' }}>{v.classification}</span>
                                    <span className="stage-pill-premium" style={{ background: statusInfo.bg, color: statusInfo.text, fontSize: '10px' }}>{statusInfo.label}</span>
                                  </div>
                                  <div style={{ fontSize: '14px', fontWeight: 600, color: scoreColor }}>{v.score === null ? '–' : v.score.toFixed(1)}</div>
                                </div>
                                <div style={{ fontSize: '12px', color: '#52525b', marginBottom: '12px' }}><MapPin size={10} style={{ marginRight: '4px' }} /> {v.location}</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '0.5px solid rgba(255,255,255,0.05)' }}>
                                  <div style={{ fontSize: '11px', background: 'rgba(255,255,255,0.06)', color: '#a1a1aa', padding: '2px 8px', borderRadius: '4px' }}>Docs {v.docs.done}/{v.docs.total}</div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: v.compliance === 'OK' ? '#97C459' : '#EF9F27' }}>
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: v.compliance === 'OK' ? '#97C459' : '#EF9F27' }} /> {v.compliance === 'OK' ? 'Compliant' : 'Pending'}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ padding: '14px 16px', fontSize: '13px', color: '#3f3f46', fontStyle: totalInCategory === 0 ? 'italic' : 'normal' }}>
                          {totalInCategory === 0 ? "Tidak ada vendor dalam kategori ini" : "Tidak ada vendor yang sesuai filter"}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {viewMode === "type" && (
              <div className="tab-content-fade">
                {["Production Floor Team", "Equipment / Technical", "Designer 3D Motion Graphics", "Others"].map(type => {
                  const typeVendors = filteredVendors.filter(v => v.type === type);
                  const isCollapsed = collapsedSections[type];
                  return (
                    <div key={type} style={{ marginBottom: '8px', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '12px', overflow: 'hidden' }}>
                      <div className="collapsible-header-premium" style={{ background: '#111113', padding: '12px 16px', marginBottom: '4px' }} onClick={() => setCollapsedSections(prev => ({ ...prev, [type]: !isCollapsed }))}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', fontWeight: 500, color: '#e4e4e7' }}>{type}</span>
                          <span style={{ background: 'rgba(255,255,255,0.06)', color: '#71717a', fontSize: '11px', padding: '2px 8px', borderRadius: '20px', marginLeft: '8px' }}>{typeVendors.length}</span>
                        </div>
                        <div style={{ transition: '0.2s', transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)', display: 'flex', alignItems: 'center' }}>
                          <ChevronDown size={16} color="#52525b" />
                        </div>
                      </div>
                      {!isCollapsed && typeVendors.map(v => {
                        const status = getStatusColor(v.status);
                        const classification = getClassificationColor(v.classification);
                        const scoreColor = getScoreColor(v.score);
                        return (
                          <div 
                            key={v.id} 
                            className="vendor-list-row" 
                            style={{ 
                              display: 'grid',
                              gridTemplateColumns: '130px 1fr 140px 80px 60px',
                              alignItems: 'center',
                              gap: '12px',
                              padding: '10px 16px',
                              borderBottom: '0.5px solid rgba(255,255,255,0.05)'
                            }} 
                            onClick={() => openVendor(v.id)}
                          >
                            <div style={{ fontSize: '11px', color: '#52525b', letterSpacing: '0.05em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {v.category}
                            </div>
                            <div style={{ fontSize: '13px', fontWeight: 500, color: '#e4e4e7' }}>
                              {v.name}
                            </div>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <span className="stage-pill-premium" style={{ background: classification.bg, color: classification.text }}>{v.classification}</span>
                              <span className="stage-pill-premium" style={{ background: status.bg, color: status.text }}>{status.label}</span>
                            </div>
                            <div style={{ fontSize: '12px', color: '#71717a', textAlign: 'center' }}>
                              {v.docs.done}/{v.docs.total}
                            </div>
                            <div style={{ fontSize: '14px', fontWeight: 500, color: scoreColor, textAlign: 'right' }}>
                               {v.score === null ? '–' : v.score.toFixed(1)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}

            {viewMode === "directory" && (
              <div className="tab-content-fade">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  {filteredVendors.map(v => {
                    const status = getStatusColor(v.status);
                    const classification = getClassificationColor(v.classification);
                    const scoreColor = getScoreColor(v.score);
                    return (
                      <div key={v.id} className="section-card-premium" style={{ padding: '16px', cursor: 'pointer' }} onClick={() => openVendor(v.id)}>
                        <div style={{ fontSize: '11px', color: '#52525b', letterSpacing: '0.06em', marginBottom: '4px' }}>{v.category}</div>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: '#e4e4e7', marginBottom: '12px' }}>{v.name}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <span className="stage-pill-premium" style={{ background: classification.bg, color: classification.text, fontSize: '10px' }}>{v.classification}</span>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: scoreColor }}>{v.score === null ? '–' : v.score.toFixed(1)}</div>
                          </div>
                        </div>
                        <div style={{ fontSize: '12px', color: '#71717a', marginBottom: '12px' }}><MapPin size={10} style={{ marginRight: '4px' }} /> {v.location}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                           {renderStarBar(v.score)}
                           <span className="stage-pill-premium" style={{ background: status.bg, color: status.text, fontSize: '10px' }}>{status.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Bulk Action Bar */}
      {selectedVendorIds.length > 0 && (
        <div className="bulk-action-bar">
          <div style={{ fontSize: '13px', color: '#e4e4e7', fontWeight: 500 }}>{selectedVendorIds.length} vendor terpilih</div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <button 
              className="primary-button" 
              style={{ background: '#97C459', padding: '6px 16px', fontSize: '12px' }}
              onClick={() => {
                alert(`${selectedVendorIds.length} vendor berhasil disetujui!`);
                setSelectedVendorIds([]);
              }}
            >
              Approve semua
            </button>
            <button className="ghost-button" style={{ border: '0.5px solid rgba(255,255,255,0.15)', fontSize: '12px', padding: '6px 14px' }} onClick={() => alert("Mengekspor data vendor...")}>Export</button>
            <button onClick={() => setSelectedVendorIds([])} style={{ background: 'none', border: 'none', color: '#71717a', fontSize: '12px', cursor: 'pointer' }}>Batalkan</button>
          </div>
        </div>
      )}

      {/* Detail Panel Overlay */}
      {isDetailOpen && selectedVendorDetail && (
        <div 
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setIsDetailOpen(false)}
        >
          <div 
            className="vendor-detail-panel-premium" 
            style={{ 
              width: '900px', 
              maxHeight: '85vh', 
              background: '#0f0f11', 
              borderRadius: '16px', 
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
              <div style={{ fontSize: '10px', color: '#71717a', fontWeight: 600, letterSpacing: '0.1em', marginBottom: '8px' }}>
                {(selectedVendorDetail.type || selectedVendorDetail.category).toUpperCase()}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#f4f4f5', margin: 0 }}>{selectedVendorDetail.name}</h2>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span className="stage-pill-premium" style={{ background: getStatusColor(selectedVendorDetail.status).bg, color: getStatusColor(selectedVendorDetail.status).text, padding: '4px 12px' }}>
                    {getStatusColor(selectedVendorDetail.status).label}
                  </span>
                  {!isEditing ? (
                    <button className="ghost-button" style={{ background: '#1f1f23', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 16px', fontSize: '13px' }} onClick={startEditing}>Edit Vendor</button>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="primary-button" style={{ background: '#22c55e', padding: '6px 16px', fontSize: '13px' }} onClick={handleSaveVendor}>Save Changes</button>
                      <button className="ghost-button" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 16px', fontSize: '13px' }} onClick={() => setIsEditing(false)}>Cancel</button>
                    </div>
                  )}
                  <button className="ghost-button" style={{ background: '#1f1f23', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 16px', fontSize: '13px' }} onClick={() => setIsDetailOpen(false)}>Close</button>
                </div>
              </div>

              <div style={{ fontSize: '13px', color: '#a1a1aa', marginTop: '8px' }}>
                {selectedVendorDetail.classification === 'Services / Specialist' ? 'Penyedia Jasa' : 'Penyedia Barang'} · Score {selectedVendorDetail.score || '–'}
              </div>
            </div>

            {/* Premium Tab Bar */}
            <div style={{ padding: '0 24px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', gap: '8px', padding: '8px 0' }}>
                {[
                  { id: 'profile', label: 'Profile', icon: <User size={16} /> },
                  { id: 'finance', label: 'Finance', icon: <Building2 size={16} /> },
                  { id: 'docs', label: 'Docs', icon: <FileText size={16} /> },
                  { id: 'ops', label: 'Operations', icon: <Zap size={16} /> },
                  { id: 'audit', label: 'Audit', icon: <Clock size={16} /> }
                ].map(t => (
                  <button 
                    key={t.id}
                    onClick={() => setActiveDetailTab(t.id as any)}
                    style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 24px',
                      fontSize: '13px',
                      fontWeight: 500,
                      borderRadius: '8px',
                      background: activeDetailTab === t.id ? '#1f1f23' : 'transparent',
                      color: activeDetailTab === t.id ? '#f4f4f5' : '#71717a',
                      border: activeDetailTab === t.id ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
                      cursor: 'pointer',
                      transition: '0.2s'
                    }}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Body Content */}
            <div style={{ padding: '32px', flex: 1, overflowY: 'auto' }}>
              {activeDetailTab === 'profile' && (
                <div className="tab-content-fade" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Kontak & Identitas Section */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                    <div style={{ padding: '16px 24px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <User size={16} color="#71717a" />
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#a1a1aa', letterSpacing: '0.05em' }}>KONTAK & IDENTITAS</span>
                    </div>
                    <div style={{ padding: '0 24px' }}>
                      {[
                        { key: 'picName', label: 'Nama PIC', value: editFormData?.contacts?.[0]?.name || selectedVendorDetail.contacts?.[0]?.name || '–' },
                        { key: 'phone', label: 'WhatsApp PIC', value: editFormData?.contacts?.[0]?.phone || selectedVendorDetail.contacts?.[0]?.phone || '–', color: '#22c55e' },
                        { key: 'email', label: 'Business Email', value: editFormData?.email || selectedVendorDetail.email || '–' },
                        { key: 'location', label: 'Alamat Usaha', value: editFormData?.location || selectedVendorDetail.location || '–' },
                      ].map((row, idx, arr) => (
                        <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: idx === arr.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.03)', fontSize: '13px' }}>
                          <span style={{ color: '#71717a' }}>{row.label}</span>
                          {!isEditing ? (
                            <span style={{ color: row.color || '#f4f4f5', textAlign: 'right' }}>{row.value}</span>
                          ) : (
                            <input 
                              className="mini-input"
                              style={{ background: '#111113', width: '280px', height: '32px', textAlign: 'right', border: '1px solid rgba(255,255,255,0.1)' }}
                              value={row.value === '–' ? '' : row.value}
                              onChange={(e) => {
                                if (row.key === 'picName' || row.key === 'phone') {
                                  const contacts = [...(editFormData?.contacts || selectedVendorDetail.contacts || [{ name: '', phone: '' }])];
                                  if (row.key === 'picName') contacts[0].name = e.target.value;
                                  else contacts[0].phone = e.target.value;
                                  setEditFormData({ ...editFormData, contacts });
                                } else {
                                  setEditFormData({ ...editFormData, [row.key]: e.target.value });
                                }
                              }}
                            />
                          )}
                        </div>
                      ))}
                    </div>


                  </div>

                  {/* Klasifikasi Section */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                    <div style={{ padding: '16px 24px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <BarChart3 size={16} color="#71717a" />
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#a1a1aa', letterSpacing: '0.05em' }}>KLASIFIKASI</span>
                    </div>
                    <div style={{ padding: '0 24px' }}>
                      {[
                        { label: 'Tipe Bisnis', value: selectedVendorDetail.classification || '–' },
                        { label: 'Registration Date', value: new Date(selectedVendorDetail.registered).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace('.', ':') },
                      ].map((row, idx, arr) => (
                        <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', borderBottom: idx === arr.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.03)', fontSize: '13px' }}>
                          <span style={{ color: '#71717a' }}>{row.label}</span>
                          <span style={{ color: '#f4f4f5', textAlign: 'right' }}>{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeDetailTab === 'finance' && (
                <div className="tab-content-fade" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Perbankan & Perpajakan Section */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                    <div style={{ padding: '16px 24px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Building2 size={16} color="#71717a" />
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#a1a1aa', letterSpacing: '0.05em' }}>PERBANKAN & PERPAJAKAN</span>
                    </div>
                    <div style={{ padding: '0 24px' }}>
                      {[
                        { key: 'bankName', label: 'Nama Bank', value: editFormData?.bankName || selectedVendorDetail.bankName || '–' },
                        { key: 'bankAccountNumber', label: 'Nomor Rekening', value: editFormData?.bankAccountNumber || selectedVendorDetail.bankAccountNumber || '–', color: '#378ADD' },
                        { key: 'bankAccountHolder', label: 'Atas Nama', value: editFormData?.bankAccountHolder || selectedVendorDetail.bankAccountHolder || '–' },
                        { key: 'npwpNumber', label: 'Nomor NPWP', value: editFormData?.npwpNumber || selectedVendorDetail.npwpNumber || '–' },
                        { key: 'taxStatus', label: 'Tax Status', value: editFormData?.taxStatus || selectedVendorDetail.taxStatus || 'Unknown' },
                        { key: 'legalStatus', label: 'Legal Status', value: editFormData?.legalStatus || selectedVendorDetail.legalStatus || 'Unknown' },
                      ].map((row, idx, arr) => (
                        <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: idx === arr.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.03)', fontSize: '13px' }}>
                          <span style={{ color: '#71717a' }}>{row.label}</span>
                          {!isEditing ? (
                            <span style={{ color: row.color || '#f4f4f5', textAlign: 'right' }}>{row.value}</span>
                          ) : (
                            <input 
                              className="mini-input"
                              style={{ background: '#111113', width: '280px', height: '32px', textAlign: 'right', border: '1px solid rgba(255,255,255,0.1)' }}
                              value={row.value === '–' ? '' : row.value}
                              onChange={(e) => setEditFormData({ ...editFormData, [row.key]: e.target.value })}
                            />
                          )}
                        </div>
                      ))}
                    </div>


                  </div>
                </div>
              )}

              {activeDetailTab === 'docs' && (
                <div className="tab-content-fade" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                   {(selectedVendorDetail.documents && selectedVendorDetail.documents.length > 0) ? selectedVendorDetail.documents.map((doc: any) => (
                     <div key={doc.id} className="section-card-premium" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                         <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(55,138,221,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FileText size={20} color="#378ADD" />
                         </div>
                         <div>
                           <div style={{ fontSize: '13px', fontWeight: 500, color: '#f4f4f5' }}>{doc.label}</div>
                           <div style={{ fontSize: '11px', color: doc.isVerified ? '#97C459' : '#71717a' }}>
                             {doc.isVerified ? '✓ Verified' : 'Pending Verification'}
                           </div>
                         </div>
                       </div>
                       <a href={doc.url} target="_blank" rel="noopener noreferrer" className="ghost-button" style={{ padding: '6px 12px', fontSize: '11px', border: '1px solid rgba(255,255,255,0.1)' }}>View</a>
                     </div>
                   )) : (
                     <div style={{ gridColumn: 'span 2', padding: '40px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <FolderOpen size={32} color="#3f3f46" style={{ marginBottom: '12px' }} />
                        <div style={{ color: '#71717a', fontSize: '13px' }}>Belum ada dokumen digital yang diunggah.</div>
                     </div>
                   )}
                </div>
              )}

              {activeDetailTab === 'ops' && (
                <div className="tab-content-fade" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Performance Metrics */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                    {[
                      { key: 'quality', label: 'Quality', score: editFormData?.performance?.quality || selectedVendorDetail.performance?.quality || 4.5 },
                      { key: 'reliability', label: 'Reliability', score: editFormData?.performance?.reliability || selectedVendorDetail.performance?.reliability || 4.8 },
                      { key: 'communication', label: 'Communication', score: editFormData?.performance?.communication || selectedVendorDetail.performance?.communication || 4.2 },
                    ].map(m => (
                      <div key={m.label} className="section-card-premium" style={{ padding: '16px' }}>
                        <div style={{ fontSize: '11px', color: '#71717a', marginBottom: '8px' }}>{m.label.toUpperCase()}</div>
                        {!isEditing ? (
                          <>
                            <div style={{ fontSize: '20px', fontWeight: 600, color: getScoreColor(m.score) }}>{m.score.toFixed(1)}</div>
                            {renderStarBar(m.score, 6, 3)}
                          </>
                        ) : (
                          <input 
                            type="number"
                            step="0.1"
                            min="0"
                            max="5"
                            className="mini-input"
                            style={{ background: '#111113', width: '100%', height: '32px', color: getScoreColor(m.score) }}
                            value={m.score}
                            onChange={(e) => {
                              const performance = { ...(editFormData?.performance || selectedVendorDetail.performance || {}) };
                              performance[m.key as keyof typeof performance] = parseFloat(e.target.value);
                              setEditFormData({ ...editFormData, performance });
                            }}
                          />
                        )}
                      </div>
                    ))}
                  </div>


                  {/* Active Projects */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                    <div style={{ padding: '16px 24px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Grid size={16} color="#71717a" />
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#a1a1aa', letterSpacing: '0.05em' }}>ACTIVE PROJECTS</span>
                    </div>
                    <div style={{ padding: '0 24px' }}>
                      {selectedVendorDetail.linkedProjects?.length > 0 ? selectedVendorDetail.linkedProjects.map((p: any, idx: number, arr: any[]) => (
                        <div key={p.linkId} style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', borderBottom: idx === arr.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.03)', fontSize: '13px' }}>
                          <div>
                            <div style={{ color: '#f4f4f5', fontWeight: 500 }}>{p.projectName}</div>
                            <div style={{ fontSize: '11px', color: '#71717a', marginTop: '2px' }}>{p.client}</div>
                          </div>
                          <span className="stage-pill-premium" style={{ alignSelf: 'center' }}>{p.stageLabel}</span>
                        </div>
                      )) : (
                        <div style={{ padding: '24px 0', color: '#52525b', fontSize: '13px', textAlign: 'center' }}>Tidak ada project aktif saat ini.</div>
                      )}
                    </div>
                  </div>

                  {/* Account Management */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="section-card-premium" style={{ padding: '16px' }}>
                       <div style={{ fontSize: '11px', color: '#71717a', marginBottom: '8px' }}>ACCOUNT MANAGER</div>
                       {!isEditing ? (
                         <div style={{ fontSize: '14px', color: '#f4f4f5' }}>{selectedVendorDetail.accountManager || 'Juara Internal Staff'}</div>
                       ) : (
                         <input 
                           className="mini-input"
                           style={{ background: '#111113', width: '100%', height: '32px' }}
                           value={editFormData?.accountManager || selectedVendorDetail.accountManager || ''}
                           onChange={(e) => setEditFormData({ ...editFormData, accountManager: e.target.value })}
                           placeholder="Enter account manager name"
                         />
                       )}
                    </div>
                    <div className="section-card-premium" style={{ padding: '16px' }}>
                       <div style={{ fontSize: '11px', color: '#71717a', marginBottom: '8px' }}>AVAILABILITY NOTES</div>
                       {!isEditing ? (
                         <div style={{ fontSize: '14px', color: '#f4f4f5' }}>{selectedVendorDetail.availabilityNotes || 'Ready for nationwide deployment.'}</div>
                       ) : (
                         <input 
                           className="mini-input"
                           style={{ background: '#111113', width: '100%', height: '32px' }}
                           value={editFormData?.availabilityNotes || selectedVendorDetail.availabilityNotes || ''}
                           onChange={(e) => setEditFormData({ ...editFormData, availabilityNotes: e.target.value })}
                           placeholder="Enter availability notes"
                         />
                       )}
                    </div>
                  </div>

                </div>
              )}

              {activeDetailTab === 'audit' && (
                <div className="tab-content-fade" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                    <div style={{ padding: '16px 24px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#a1a1aa', letterSpacing: '0.05em' }}>SYSTEM AUDIT LOG</span>
                    </div>
                    <div style={{ padding: '8px 24px' }}>
                      {(selectedVendorDetail.auditLog && selectedVendorDetail.auditLog.length > 0) ? selectedVendorDetail.auditLog.map((log: any, idx: number, arr: any[]) => (
                        <div key={log.id} style={{ display: 'flex', gap: '16px', padding: '16px 0', borderBottom: idx === arr.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.03)' }}>
                          <div style={{ minWidth: '80px', fontSize: '11px', color: '#52525b' }}>
                            {new Date(log.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '13px', color: '#e4e4e7' }}>{log.message}</div>
                            <div style={{ fontSize: '11px', color: '#71717a', marginTop: '4px' }}>Action by <span style={{ color: '#378ADD' }}>{log.actor}</span></div>
                          </div>
                        </div>
                      )) : (
                        <div style={{ padding: '24px 0', textAlign: 'center', color: '#52525b', fontSize: '13px' }}>
                          Belum ada riwayat aktivitas untuk vendor ini.
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

    </div>
  );
}
