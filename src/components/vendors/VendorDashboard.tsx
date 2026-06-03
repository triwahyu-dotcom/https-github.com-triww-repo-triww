"use client";

import { useEffect, useState, useMemo } from "react";
import { 
  Users, 
  Package, 
  CheckCircle, 
  Search, 
  Trash2, 
  Edit, 
  ChevronDown, 
  ChevronRight,
  Filter,
  ArrowRight,
  Building2,
  Grid,
  User,
  ArrowUpDown,
  Mail,
  MapPin, 
  Clock, 
  ExternalLink, 
  Check, 
  MoreVertical, 
  X, 
  PlusCircle, 
  TrendingUp, 
  FileText,
  FolderOpen
} from "lucide-react";
import { DashboardData, VendorSummary, ReviewStatus, VendorClassification, Vendor, VendorDetail } from "@/lib/vendor/types";
import { VendorTypeChip } from "./VendorTypeChip";
import { isV2Vendor, getCapabilityDisplay, getTaxTreatment, getVendorTypeLabel } from "@/lib/vendor/v2-helpers";
import { ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TypeBadge } from "@/components/ui/TypeBadge";
import { WorkspaceShell } from "@/components/layout/workspace-shell";

type ViewMode = "all" | "status" | "type" | "directory";

/**
 * Enhanced Vendor type with UI-specific derived fields
 */
type DashboardVendor = VendorDetail & {
  category: string;
  score: number | null;
  location: string;
  docs: { done: number; total: number };
  complianceStatus: string;
  registered: string;
  registeredTimestamp: number;
  formattedRegistered: string;
  status: string;
  type: string;
}

export function VendorDashboard({ initialData }: { initialData: DashboardData }) {
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState<"overview" | "docs" | "projects" | "history" | "profile" | "finance" | "ops" | "audit">("overview");
  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([]);
  
  const handleLogout = () => {
    document.cookie = 'juara_user_role=; path=/; max-age=0';
    document.cookie = 'juara_user_email=; path=/; max-age=0';
    window.location.href = '/login';
  };
  
  // Collapsible sections for "Type" view
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const [sortKey, setSortKey] = useState<string>("registered");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<any>(null);

  const [vendors, setVendors] = useState<DashboardVendor[]>([]);

  useEffect(() => {
    // Rely ONLY on real production data from initialData
    const processed = initialData.vendorDetails.map((v) => {
      const registeredDate = v.sourceTimestamp ? new Date(v.sourceTimestamp) : new Date(0);
      const isGoods = v.relationshipType 
        ? v.relationshipType === "vendor_supply" 
        : (v.classification === "Penyedia Barang" || (v as any).type === "goods");
        
      return {
        ...v,
        status: v.reviewStatus || "new",
        type: v.relationshipType || v.classification || "Unknown",
        category: isGoods ? "PENYEDIA BARANG" : "PENYEDIA JASA",
        score: v.performance?.average || null,
        location: v.businessAddress || "–",
        docs: { done: v.documentCompletion?.complete || 0, total: v.documentCompletion?.required || 3 },
        complianceStatus: v.compliance?.status === "ok" ? "OK" : "Pending",
        registered: registeredDate.toISOString().split('T')[0],
        registeredTimestamp: registeredDate.getTime(),
        formattedRegistered: registeredDate.getTime() === 0 
          ? "N/A" 
          : registeredDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
      };
    });
    setVendors(processed);
  }, [initialData.vendorDetails]);



  const [relationshipTypeFilter, setRelationshipTypeFilter] = useState<string>("all");
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("all");

  const [showRelTypeDropdown, setShowRelTypeDropdown] = useState(false);
  const [showEntityTypeDropdown, setShowEntityTypeDropdown] = useState(false);

  // V2 Labels
  const RELATIONSHIP_LABELS: Record<string, string> = {
    vendor_rental: "Vendor Rental",
    vendor_service: "Vendor Jasa",
    vendor_supply: "Vendor Supply",
    eo_partner: "EO Partner",
    talent_agency: "Talent Agency",
    talent: "Talent",
    crew_lead: "Crew Lead",
    crew_individual: "Crew Individu",
    freelance: "Freelance",
  };

  const ENTITY_LABELS: Record<string, string> = {
    business: "Badan Usaha",
    individual: "Perorangan",
  };

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
      const matchRelType = 
        relationshipTypeFilter === 'all' ? true :
        v.relationshipType === relationshipTypeFilter;

      const matchEntityType = 
        entityTypeFilter === 'all' ? true :
        v.entityType === entityTypeFilter;
      
      const q = searchQuery.toLowerCase();
      const matchSearch = q === '' ? true :
        [
          v.name,
          v.category,
          v.relationshipType ? RELATIONSHIP_LABELS[v.relationshipType] : null,
          v.entityType ? ENTITY_LABELS[v.entityType] : null,
        ].filter(Boolean).some(f => String(f).toLowerCase().includes(q));
      
      return matchRelType && matchEntityType && matchSearch;
    }).sort((a, b) => {
      const order = sortOrder === "asc" ? 1 : -1;
      if (sortKey === "registered") {
        return (a.registeredTimestamp - b.registeredTimestamp) * order;
      }
      if (sortKey === "score") {
        return ((a.score ?? 0) - (b.score ?? 0)) * order;
      }
      if (sortKey === "name") {
        return a.name.localeCompare(b.name) * order;
      }
      return 0;
    });
  }, [vendors, searchQuery, sortKey, sortOrder, relationshipTypeFilter, entityTypeFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return { bg: "rgba(99,153,34,0.15)", text: "#97C459", label: "Disetujui" };
      case "in_review": return { bg: "rgba(239,159,39,0.15)", text: "#EF9F27", label: "Sedang direview" };
      case "new": return { bg: "rgba(55,138,221,0.15)", text: "#85B7EB", label: "Baru" };
      case "rejected": return { bg: "rgba(226,75,74,0.15)", text: "#F09595", label: "Ditolak" };
      case "needs_revision": return { bg: "rgba(239,159,39,0.15)", text: "#EF9F27", label: "Perlu Revisi" };
      default: return { bg: "rgba(255,255,255,0.05)", text: "#71717a", label: status };
    }
  };

  const getClassificationColor = (classification: string) => {
    if (classification === "Penyedia Barang") {
      return { bg: "rgba(15,110,86,0.15)", text: "#5DCAA5", label: "Goods / Equipment" };
    }
    return { bg: "rgba(55,138,221,0.15)", text: "#85B7EB", label: "Services / Specialist" };
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

  const openVendor = (id: string) => {
    setSelectedVendorId(id.toString());
    setIsDetailOpen(true);
    setIsEditing(false);
    setEditFormData(null); // Reset stale edit data
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
          email: editFormData.email,
          bankName: editFormData.bankName,
          bankAccountNumber: editFormData.bankAccountNumber,
          bankAccountHolder: editFormData.bankAccountHolder,
          npwpNumber: editFormData.npwpNumber,
          taxStatus: editFormData.taxStatus,
          legalStatus: editFormData.legalStatus,
          entityType: editFormData.entityType,
          relationshipType: editFormData.relationshipType,
          websiteUrl: editFormData.websiteUrl,
          documentsFolderUrl: editFormData.documentsFolderUrl,
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

  const headerActions = (
    <button
      className="primary-button"
      style={{ height: '32px', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', padding: '0 16px' }}
      onClick={() => alert("Form pendaftaran vendor baru akan segera dibuka.")}
    >
      + New Vendor
    </button>
  );

  return (
    <WorkspaceShell title="Supplier/Vendor Management" actions={headerActions}>
      <div>

          {/* Stat Cards Row */}
          <div className="vendor-grid-premium responsive-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <MetricCard 
              label="Total Vendors" 
              value={vendors.length} 
              subtitle="Registered suppliers" 
              icon={<Users size={16} />} 
            />
            <MetricCard 
              label="Penyedia Jasa" 
              value={vendors.filter(v => v.category === "PENYEDIA JASA").length} 
              subtitle="Service providers" 
              icon={<User size={16} />} 
            />
            <MetricCard 
              label="Penyedia Barang" 
              value={vendors.filter(v => v.category === "PENYEDIA BARANG").length} 
              subtitle="Equipment/Goods" 
              icon={<Package size={16} />} 
            />
            <MetricCard 
              label="Approved" 
              value={vendors.filter(v => v.reviewStatus === "approved").length} 
              subtitle="Verified and ready" 
              icon={<CheckCircle size={16} />} 
              valueColor="var(--accent-success)"
            />
          </div>

          {/* Sticky Toolbar */}
          <div className="view-toolbar-premium" style={{ borderBottom: 'none', background: 'transparent' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', flexWrap: 'wrap', gap: '16px' }}>
              <div className="tab-bar" style={{ marginBottom: 0 }}>
                {(["all", "status", "type", "directory"] as const).map(m => (
                  <button 
                    key={m}
                    onClick={() => setViewMode(m)}
                    className={`tab-item ${viewMode === m ? 'tab-active' : 'tab-inactive'}`}
                    style={{ background: 'transparent', border: 'none' }}
                  >
                    {m === "all" ? "All Vendors" : m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
              <div className="toolbar-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: '#52525b' }} />
                  <input 
                    className="mini-input"
                    style={{ width: '220px', paddingLeft: '32px', height: '32px', background: '#111113' }}
                    placeholder="Search vendor..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>


                {/* V2: Tipe Mitra Filter */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <button 
                    className="mini-input" 
                    style={{ background: '#111113', height: '32px', display: 'flex', alignItems: 'center', gap: '8px', border: relationshipTypeFilter !== 'all' ? '1px solid #378ADD' : '0.5px solid rgba(255,255,255,0.08)' }}
                    onClick={() => { setShowRelTypeDropdown(!showRelTypeDropdown); setShowEntityTypeDropdown(false); }}
                  >
                    {relationshipTypeFilter === 'all' ? 'Tipe Mitra' : (RELATIONSHIP_LABELS[relationshipTypeFilter] || relationshipTypeFilter)} <ChevronDown size={14} />
                  </button>
                  {showRelTypeDropdown && (
                    <div className="dropdown-panel-premium" style={{ width: '240px' }}>
                      {['all', ...Object.keys(RELATIONSHIP_LABELS)].map(opt => (
                        <div 
                          key={opt} 
                          className={`dropdown-item-premium ${relationshipTypeFilter === opt ? 'active' : ''}`}
                          onClick={() => { setRelationshipTypeFilter(opt); setShowRelTypeDropdown(false); }}
                        >
                          <span style={{ flex: 1 }}>{opt === 'all' ? 'Semua Tipe' : RELATIONSHIP_LABELS[opt]}</span>
                          <span style={{ fontSize: '10px', opacity: 0.5 }}>
                            {opt === 'all' ? vendors.length : vendors.filter(v => v.relationshipType === opt).length}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* V2: Bentuk Entitas Filter */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <button 
                    className="mini-input" 
                    style={{ background: '#111113', height: '32px', display: 'flex', alignItems: 'center', gap: '8px', border: entityTypeFilter !== 'all' ? '1px solid #378ADD' : '0.5px solid rgba(255,255,255,0.08)' }}
                    onClick={() => { setShowEntityTypeDropdown(!showEntityTypeDropdown); setShowRelTypeDropdown(false); }}
                  >
                    {entityTypeFilter === 'all' ? 'Bentuk Entitas' : (ENTITY_LABELS[entityTypeFilter] || entityTypeFilter)} <ChevronDown size={14} />
                  </button>
                  {showEntityTypeDropdown && (
                    <div className="dropdown-panel-premium" style={{ width: '200px' }}>
                      {['all', ...Object.keys(ENTITY_LABELS)].map(opt => (
                        <div 
                          key={opt} 
                          className={`dropdown-item-premium ${entityTypeFilter === opt ? 'active' : ''}`}
                          onClick={() => { setEntityTypeFilter(opt); setShowEntityTypeDropdown(false); }}
                        >
                          <span style={{ flex: 1 }}>{opt === 'all' ? 'Semua Entitas' : ENTITY_LABELS[opt]}</span>
                          <span style={{ fontSize: '10px', opacity: 0.5 }}>
                            {opt === 'all' ? vendors.length : vendors.filter(v => v.entityType === opt).length}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button className="ghost-button" style={{ padding: '4px', flexShrink: 0 }} onClick={() => alert("Opsi lanjutan.")}><MoreVertical size={16} /></button>
                <div style={{ background: 'rgba(255,255,255,0.05)', color: '#52525b', fontSize: '11px', padding: '3px 10px', borderRadius: '20px', flexShrink: 0 }}>{filteredVendors.length} ITEMS</div>
                <StatusBadge variant="new" />
              </div>
            </div>
          </div>


          {/* View Renderers */}
          <div style={{ padding: '0 0 80px 0' }}>
            {viewMode === "all" && (
              <div className="tab-content-fade">
                <div className="vendor-table-header" style={{ gridTemplateColumns: '32px 1fr 120px 120px 80px', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}><input type="checkbox" /></div>
                  <div 
                    style={{ cursor: 'pointer', color: sortKey === 'name' ? '#378ADD' : '#f4f4f5' }}
                    onClick={() => {
                      if (sortKey === 'name') setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                      else { setSortKey('name'); setSortOrder('asc'); }
                    }}
                  >
                    NAMA VENDOR {sortKey === 'name' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                  </div>
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
                  <div 
                    style={{ textAlign: 'right', cursor: 'pointer', color: sortKey === 'score' ? '#378ADD' : '#52525b' }}
                    onClick={() => {
                      if (sortKey === 'score') setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                      else { setSortKey('score'); setSortOrder('desc'); }
                    }}
                  >
                    SCORE {sortKey === 'score' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                  </div>
                </div>
                {filteredVendors.map(v => {
                  const status = getStatusColor(v.reviewStatus);
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
                        <div style={{ fontSize: '11px', fontWeight: 500, color: '#52525b', letterSpacing: '0.06em', marginBottom: '4px' }}>
                          {v.category}
                          {isV2Vendor(v) && <span style={{ marginLeft: '8px', color: '#378ADD', fontSize: '9px', fontWeight: 700 }}>V2</span>}
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: '#e4e4e7', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {v.name}
                          {v.entityType && (
                            <span style={{ fontSize: '10px', color: '#71717a', fontWeight: 400 }}>
                              ({ENTITY_LABELS[v.entityType]})
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap' }}>
                          <TypeBadge variant={v.relationshipType || v.type} />
                          
                          {/* Location Badge */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#71717a', fontSize: '11px' }}>
                            <MapPin size={10} style={{ opacity: 0.7 }} />
                            <span>{v.location === '–' ? 'Lokasi Belum Diisi' : v.location.split(',')[0]}</span>
                          </div>

                          {/* Capability Tags */}
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {(() => {
                              const caps: string[] = [];
                              
                              // 1. Cek Data V2 (Granular)
                              if (v.relationshipType === 'vendor_rental' && v.rentalSubcategories) {
                                caps.push(...(Array.isArray(v.rentalSubcategories) ? v.rentalSubcategories : [v.rentalSubcategories]));
                              } else if (v.relationshipType === 'crew_individual' && v.crewRole) {
                                caps.push(v.crewRole);
                              } else if (v.relationshipType === 'talent' && v.performerType) {
                                caps.push(v.performerType);
                              } else if (v.relationshipType === 'freelance' && v.creativeSpecialty) {
                                caps.push(v.creativeSpecialty);
                              } 
                              
                              if (caps.length === 0) {
                                if (v.serviceNames && v.serviceNames.length > 0) {
                                  caps.push(...v.serviceNames);
                                } else {
                                  caps.push(v.classification);
                                }
                              }
                              
                              // Bersihkan & Unikkan
                              const uniqueCaps = Array.from(new Set(caps)).filter(Boolean);
                              
                              return uniqueCaps.slice(0, 3).map((cap, i) => (
                                <span key={i} style={{ 
                                  fontSize: '9px', 
                                  background: 'rgba(255,255,255,0.05)', 
                                  border: '0.5px solid rgba(255,255,255,0.08)',
                                  color: '#a1a1aa',
                                  padding: '1px 6px', 
                                  borderRadius: '4px',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {cap}
                                </span>
                              ));
                            })()}
                            
                            {v.reviewStatus === 'approved' && (
                              <div title="Verified Partner" style={{ color: '#378ADD', display: 'flex', alignItems: 'center' }}>
                                <ShieldCheck size={12} />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div>
                        <StatusBadge variant={v.reviewStatus} />
                      </div>
                      <div style={{ fontSize: '12px', color: '#71717a', textAlign: 'center' }}>
                        {v.formattedRegistered}
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
                                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <VendorTypeChip vendor={v} size="sm" />
                                    <span className="stage-pill-premium" style={{ background: statusInfo.bg, color: statusInfo.text, fontSize: '10px' }}>{statusInfo.label}</span>
                                  </div>
                                  <div style={{ fontSize: '14px', fontWeight: 600, color: scoreColor }}>{v.score === null ? '–' : v.score.toFixed(1)}</div>
                                </div>
                                <div style={{ fontSize: '12px', color: '#52525b', marginBottom: '12px' }}><MapPin size={10} style={{ marginRight: '4px' }} /> {v.location}</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '0.5px solid rgba(255,255,255,0.05)' }}>
                                  <div style={{ fontSize: '11px', background: 'rgba(255,255,255,0.06)', color: '#a1a1aa', padding: '2px 8px', borderRadius: '4px' }}>Docs {v.docs.done}/{v.docs.total}</div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: v.complianceStatus === 'OK' ? '#97C459' : '#EF9F27' }}>
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: v.complianceStatus === 'OK' ? '#97C459' : '#EF9F27' }} /> {v.complianceStatus === 'OK' ? 'Compliant' : 'Pending'}
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
                              {v.name} {v.entityType && <span style={{ fontSize: '10px', color: '#71717a' }}>({ENTITY_LABELS[v.entityType]})</span>}
                            </div>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                               <VendorTypeChip vendor={v} size="sm" />
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
                          <VendorTypeChip vendor={v} size="sm" />
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

              <div style={{ fontSize: '13px', color: '#a1a1aa', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <VendorTypeChip vendor={selectedVendorDetail} />
                {selectedVendorDetail.entityType && (
                  <span style={{ color: '#52525b' }}>• {ENTITY_LABELS[selectedVendorDetail.entityType]}</span>
                )}
                <span style={{ color: '#52525b' }}>• Score {selectedVendorDetail.score || '–'}</span>
                {isV2Vendor(selectedVendorDetail) && (
                   <span style={{ marginLeft: 'auto', background: 'rgba(55,138,221,0.1)', color: '#378ADD', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700 }}>V2 SCHEMA</span>
                )}
              </div>
            </div>

            {/* Premium Tab Bar */}
            <div style={{ padding: '0 24px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', gap: '8px', padding: '8px 0' }}>
                {[
                  { id: 'profile', label: 'Profile', icon: <User size={16} /> },
                  { id: 'finance', label: 'Finance', icon: <Building2 size={16} /> },
                  { id: 'docs', label: 'Docs', icon: <FileText size={16} /> },
                  { id: 'ops', label: 'Operations', icon: <Grid size={16} /> },
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
                        { key: 'picName', label: 'Nama PIC', value: (isEditing ? editFormData?.contacts?.[0]?.name : null) || selectedVendorDetail.contacts?.[0]?.name || '–' },
                        { key: 'phone', label: 'WhatsApp PIC', value: (isEditing ? editFormData?.contacts?.[0]?.phone : null) || selectedVendorDetail.contacts?.[0]?.phone || '–', color: '#22c55e' },
                        { key: 'email', label: 'Business Email', value: (isEditing ? editFormData?.email : null) || selectedVendorDetail.email || '–' },
                        { key: 'location', label: 'Alamat Usaha', value: (isEditing ? editFormData?.location : null) || selectedVendorDetail.location || '–' },
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
                      <Filter size={16} color="#71717a" />
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#a1a1aa', letterSpacing: '0.05em' }}>KLASIFIKASI & METADATA</span>
                    </div>
                    <div style={{ padding: '0 24px' }}>
                      {[
                        { label: 'Klasifikasi Legacy', value: selectedVendorDetail.classification || '–' },
                        { label: 'Tipe Mitra (V2)', value: getVendorTypeLabel(selectedVendorDetail) },
                        { label: 'Bentuk Entitas', value: selectedVendorDetail.entityType ? ENTITY_LABELS[selectedVendorDetail.entityType] : 'Unknown' },
                        { label: 'Registration Date', value: new Date(selectedVendorDetail.registered).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace('.', ':') },
                        { label: 'Form Version', value: selectedVendorDetail.submissionMetadata?.formVersion || 'v1.0 (Legacy)' },
                      ].map((row, idx, arr) => (
                        <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: idx === arr.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.03)', fontSize: '13px' }}>
                          <span style={{ color: '#71717a' }}>{row.label}</span>
                          <span style={{ color: '#f4f4f5', textAlign: 'right' }}>{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* V2: Adaptive Capability Sections */}
                  {isV2Vendor(selectedVendorDetail) && getCapabilityDisplay(selectedVendorDetail as any).map((section) => (
                    <div key={section.section} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                      <div style={{ padding: '16px 24px', background: 'rgba(55,138,221,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle size={16} color="#378ADD" />
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#378ADD', letterSpacing: '0.05em' }}>{section.section.toUpperCase()}</span>
                      </div>
                      <div style={{ padding: '0 24px' }}>
                        {section.fields.filter(f => f.value && (Array.isArray(f.value) ? f.value.length > 0 : true)).map((field, idx, arr) => (
                          <div key={field.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: idx === arr.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.03)', fontSize: '13px' }}>
                            <span style={{ color: '#71717a' }}>{field.label}</span>
                            <span style={{ color: '#f4f4f5', textAlign: 'right', maxWidth: '60%' }}>
                              {Array.isArray(field.value) ? field.value.join(", ") : field.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
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
                        { key: 'bankName', label: 'Nama Bank', value: (isEditing ? editFormData?.bankName : null) || selectedVendorDetail.bankName || '–' },
                        { key: 'bankAccountNumber', label: 'Nomor Rekening', value: (isEditing ? editFormData?.bankAccountNumber : null) || selectedVendorDetail.bankAccountNumber || '–', color: '#378ADD' },
                        { key: 'bankAccountHolder', label: 'Atas Nama', value: (isEditing ? editFormData?.bankAccountHolder : null) || selectedVendorDetail.bankAccountHolder || '–' },
                        { key: 'npwpNumber', label: 'Nomor NPWP', value: (isEditing ? editFormData?.npwpNumber : null) || selectedVendorDetail.npwpNumber || '–' },
                        { key: 'taxStatus', label: 'Tax Status', value: (isEditing ? editFormData?.taxStatus : null) || selectedVendorDetail.taxStatus || 'Unknown' },
                        { key: 'legalStatus', label: 'Legal Status', value: (isEditing ? editFormData?.legalStatus : null) || selectedVendorDetail.legalStatus || 'Unknown' },
                        { key: 'taxTreatment', label: 'Estimasi Pajak', value: getTaxTreatment(selectedVendorDetail), color: '#EF9F27' },
                      ].map((row, idx, arr) => (
                        <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: idx === arr.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.03)', fontSize: '13px' }}>
                          <span style={{ color: '#71717a' }}>{row.label}</span>
                          {!isEditing ? (
                            <span style={{ color: row.color || '#f4f4f5', textAlign: 'right' }}>{row.value}</span>
                          ) : (
                            row.key === 'taxStatus' ? (
                              <select 
                                className="mini-input"
                                style={{ background: '#111113', width: '280px', height: '32px', border: '1px solid rgba(255,255,255,0.1)', color: '#f4f4f5' }}
                                value={editFormData?.taxStatus || 'Unknown'}
                                onChange={(e) => setEditFormData({ ...editFormData, taxStatus: e.target.value })}
                              >
                                <option value="Unknown">Unknown</option>
                                <option value="Non-PKP">Non-PKP</option>
                                <option value="PKP">PKP</option>
                              </select>
                            ) : row.key === 'legalStatus' ? (
                              <select 
                                className="mini-input"
                                style={{ background: '#111113', width: '280px', height: '32px', border: '1px solid rgba(255,255,255,0.1)', color: '#f4f4f5' }}
                                value={editFormData?.legalStatus || 'Unknown'}
                                onChange={(e) => setEditFormData({ ...editFormData, legalStatus: e.target.value })}
                              >
                                <option value="Unknown">Unknown</option>
                                <option value="Freelance/Perorangan">Freelance / Perorangan</option>
                                <option value="PT/CV">PT / CV</option>
                                <option value="Lainnya">Lainnya</option>
                              </select>
                            ) : (
                              <input 
                                className="mini-input"
                                style={{ background: '#111113', width: '280px', height: '32px', textAlign: 'right', border: '1px solid rgba(255,255,255,0.1)' }}
                                value={row.value === '–' ? '' : row.value}
                                onChange={(e) => setEditFormData({ ...editFormData, [row.key]: e.target.value })}
                              />
                            )
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
                      {(selectedVendorDetail.linkedProjects?.length ?? 0) > 0 ? selectedVendorDetail.linkedProjects?.map((p: any, idx: number, arr: any[]) => (
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
          .desktop-only-presence { display: none !important; }
          
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

          .vendor-grid-premium {
             grid-template-columns: repeat(2, 1fr) !important;
             gap: 12px !important;
          }

          .vendor-table-header div:nth-child(3),
          .vendor-table-header div:nth-child(4),
          .vendor-list-row div:nth-child(3),
          .vendor-list-row div:nth-child(4) {
            display: none !important;
          }

          .vendor-table-header, .vendor-list-row {
            grid-template-columns: 32px 1fr 80px !important;
          }

          .toolbar-actions {
            width: 100%;
            overflow-x: auto;
            padding-bottom: 8px;
            -webkit-overflow-scrolling: touch;
          }

          .vendor-detail-panel-premium {
            width: 100% !important;
            height: 100% !important;
            max-height: 100vh !important;
            border-radius: 0 !important;
          }
        }

        @media (max-width: 640px) {
          .responsive-grid-4, .vendor-grid-premium {
            grid-template-columns: 1fr !important;
          }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
    </WorkspaceShell>
  );
}
