"use client";

import { useState, useMemo } from "react";
import { 
  Users, 
  CheckCircle, 
  Diamond, 
  TrendingUp, 
  Flame, 
  Search, 
  Plus, 
  X, 
  Edit, 
  Phone, 
  Mail, 
  ArrowUp, 
  ArrowDown
} from "lucide-react";
import Link from "next/link";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { PageHeader } from "@/components/ui/PageHeader";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TypeBadge } from "@/components/ui/TypeBadge";

// --- Types ---
interface ClientContact {
  name: string;
  role: string;
  email?: string;
  phone?: string;
  initials: string;
  color: string;
}

interface ClientProject {
  id: string;
  name: string;
  stage: string;
  stageColor: string;
  result?: "Won" | "Lost" | "Ongoing";
}

interface Client {
  id: string;
  name: string;
  category: "Brand" | "Government" | "Co. Partner" | "NGO" | "Media";
  leadSource?: string;
  accountExecutive?: string;
  contacts: ClientContact[];
  projects: number;
  recentProjects: ClientProject[];
  status: "Active" | "Lead" | "Inactive" | "Lost";
  value: number;
  lastActivity: string;
  industry?: string;
  website?: string;
}

// --- Sample Data ---
const CLIENT_DATA: Client[] = [
  { id: "1", name: "ACCESS IND", category: "Co. Partner", contacts: [{ name: "Andi Pratama", role: "Manager", initials: "AP", color: "#378ADD" }], projects: 1, status: "Active", value: 15000000, lastActivity: "2 hari lalu", recentProjects: [{ id: "p1", name: "Indo Expo 2026", stage: "Execution", stageColor: "#378ADD" }] },
  { id: "2", name: "Bali Super Fast", category: "Co. Partner", contacts: [{ name: "Budi Santoso", role: "Owner", initials: "BS", color: "#5DCAA5" }], projects: 0, status: "Active", value: 0, lastActivity: "1 minggu lalu", recentProjects: [] },
  { id: "3", name: "BTV", category: "Brand", contacts: [], projects: 1, status: "Lead", value: 18425763015, lastActivity: "Hari ini", recentProjects: [{ id: "p2", name: "BTV Anniversary", stage: "Proposal", stageColor: "#EF9F27" }] },
  { id: "4", name: "GAPEMPI", category: "Brand", contacts: [], projects: 1, status: "Active", value: 0, lastActivity: "3 hari lalu", recentProjects: [] },
  { id: "5", name: "HERBAL SALAM", category: "Brand", contacts: [{ name: "Siti Aminah", role: "Marketing", initials: "SA", color: "#AFA9EC" }], projects: 1, status: "Active", value: 750000000, lastActivity: "5 hari lalu", recentProjects: [{ id: "p3", name: "Brand Activation", stage: "Completed", stageColor: "#97C459", result: "Won" }] },
  { id: "6", name: "Hutama Karya PT", category: "Government", contacts: [], projects: 1, status: "Active", value: 750000000, lastActivity: "1 minggu lalu", recentProjects: [] },
  { id: "7", name: "International Legends Funmatch", category: "Brand", contacts: [], projects: 1, status: "Active", value: 9433800000, lastActivity: "Hari ini", recentProjects: [{ id: "p4", name: "Legends Match", stage: "Planning", stageColor: "#378ADD" }] },
  { id: "8", name: "KAEL", category: "Brand", contacts: [], projects: 1, status: "Active", value: 0, lastActivity: "2 minggu lalu", recentProjects: [] },
  { id: "9", name: "MIRELA", category: "Brand", contacts: [], projects: 1, status: "Active", value: 90900000, lastActivity: "4 hari lalu", recentProjects: [] },
  { id: "10", name: "OCBC", category: "Brand", contacts: [], projects: 1, status: "Active", value: 0, lastActivity: "3 hari lalu", recentProjects: [] },
  { id: "11", name: "QAPPT", category: "Brand", contacts: [], projects: 1, status: "Lead", value: 0, lastActivity: "Hari ini", recentProjects: [] },
  { id: "12", name: "Raja Rogawa", category: "Brand", contacts: [], projects: 1, status: "Active", value: 2089071800, lastActivity: "1 minggu lalu", recentProjects: [] },
  { id: "13", name: "WE DO", category: "Co. Partner", contacts: [], projects: 3, status: "Active", value: 7500000000, lastActivity: "Hari ini", recentProjects: [] },
];

interface Props {
  initialData?: any;
}

export function CRMDashboard({ initialData }: Props) {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sortKey, setSortKey] = useState<keyof Client>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [isEditingClient, setIsEditingClient] = useState(false);

  // Form States (Shared for Add/Edit)
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState<Client["category"]>("Brand");
  const [formIndustry, setFormIndustry] = useState("");
  const [formWebsite, setFormWebsite] = useState("");
  const [formContactName, setFormContactName] = useState("");
  const [formContactPhone, setFormContactPhone] = useState("");
  const [formRemark, setFormRemark] = useState("");

  // Merge store data with premium seed data
  const clients = useMemo(() => {
    const rawClients = initialData?.clients || [];
    
    return rawClients.map((rc: any) => {
      // Find premium seed for extra detail if it exists
      const seed = CLIENT_DATA.find(s => s.name.toLowerCase() === rc.name.toLowerCase());
      
      const mappedStatus = rc.status === "active" ? "Active" : (rc.status === "lead" ? "Lead" : "Inactive");
      
      // Category is the client type (Brand, Government, etc.)
      // Relation is the PIC name or Lead Source in the JUARA tracker CSV
      const finalCategory = rc.category || "Brand";
      let leadSource = rc.relation || "";
      
      // Sanitize leadSource: if it's "Brand" or "Agency", it's likely a mis-entry in the CSV
      if (["Brand", "Agency", "End Client"].includes(leadSource)) {
        leadSource = "";
      }
      
      // Account Executive (AE) is the person appointed to handle the project (PIC in CSV)
      // Extract from the first project's owners if available
      const accountExecutive = rc.projects?.[0]?.owners?.join(", ") || "";

      return {
        id: rc.id,
        name: rc.name,
        category: finalCategory as any,
        leadSource,
        accountExecutive,
        contacts: rc.contacts?.length > 0 
          ? rc.contacts.map((ct: any, idx: number) => ({
              name: ct.name,
              role: ct.role || (idx === 0 ? "Main Contact" : "Contact"),
              phone: ct.phone || "",
              initials: ct.name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase(),
              color: seed?.contacts[idx]?.color || `hsl(${(ct.name.length * 40) % 360}, 60%, 60%)`
            }))
          : (seed?.contacts || []),
        projects: rc.projectCount || seed?.projects || 0,
        recentProjects: rc.projects?.slice(0, 2).map((p: any) => ({
          id: p.id,
          name: p.projectName,
          stage: p.currentStageLabel,
          stageColor: "#378ADD"
        })) || (seed?.recentProjects || []),
        status: mappedStatus as any,
        value: rc.totalProjectValue || seed?.value || 0,
        lastActivity: seed?.lastActivity || (rc.activeProjectCount > 0 ? "Active Project" : "Updated recently"),
        industry: rc.industry || seed?.industry || "Enterprise",
        website: rc.website || seed?.website || ""
      } as Client;
    });
  }, [initialData]);

  const selectedClient = useMemo(() => clients.find((c: Client) => c.id === selectedClientId) || null, [selectedClientId, clients]);

  const filteredClients = useMemo(() => {
    return clients.filter((c: Client) => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || c.status.toLowerCase() === statusFilter.toLowerCase();
      const matchesCategory = categoryFilter === "All" || c.category === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    }).sort((a: Client, b: Client) => {
      const valA = a[sortKey as keyof Client];
      const valB = b[sortKey as keyof Client];
      if (typeof valA === "string" && typeof valB === "string") {
        return sortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (typeof valA === "number" && typeof valB === "number") {
        return sortOrder === "asc" ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
      }
      return 0;
    });
  }, [clients, searchQuery, statusFilter, categoryFilter, sortKey, sortOrder]);

  const formatCurrency = (val: number) => {
    return val.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
  };

  const handleAddClient = async () => {
    if (!formName.trim()) return;

    const newClientData = {
      id: `cli_${Date.now().toString(36)}`,
      name: formName.trim(),
      aliases: [] as string[],
      type: (formCategory === "Brand" ? "brand" :
             formCategory === "Government" ? "government" :
             formCategory === "Co. Partner" ? "partner" : "brand") as any,
      category: formCategory,
      industry: formIndustry || "",
      address: "",
      website: formWebsite || "",
      relation: formRemark || "-",
      totalProjectValue: 0,
      totalProjectValueLabel: "Rp 0",
      projectCount: 0,
      activeProjectCount: 0,
      contacts: formContactName.trim() ? [
        { name: formContactName.trim(), role: "Main Contact", phone: formContactPhone || "", projects: [] as string[] }
      ] : [] as any[],
      projects: [] as any[],
      health: "on_track" as const,
      status: "lead" as const,
    };

    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClientData)
      });

      if (response.ok) {
        setIsAddingClient(false);
        resetForm();
        window.location.reload();
      } else {
        const err = await response.json();
        alert(`Gagal menambahkan client: ${err.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error("Error adding client:", err);
      alert("Terjadi kesalahan koneksi.");
    }
  };

  const handleUpdateClient = async () => {
    if (!selectedClientId || !formName.trim()) return;

    const updatedData = {
      id: selectedClientId,
      name: formName.trim(),
      aliases: [] as string[],
      type: (formCategory === "Brand" ? "brand" :
             formCategory === "Government" ? "government" :
             formCategory === "Co. Partner" ? "partner" : "brand") as any,
      category: formCategory,
      industry: formIndustry || "",
      address: "",
      website: formWebsite || "",
      relation: formRemark || selectedClient?.leadSource || "-",
      totalProjectValue: selectedClient?.value || 0,
      totalProjectValueLabel: formatCurrency(selectedClient?.value || 0),
      projectCount: selectedClient?.projects || 0,
      activeProjectCount: 0,
      contacts: formContactName.trim() ? [
        { name: formContactName.trim(), role: "Main Contact", phone: formContactPhone || "", projects: [] as string[] }
      ] : (selectedClient?.contacts?.map((c: any) => ({ ...c, projects: c.projects || [] })) || [] as any[]),
      projects: [] as any[],
      health: "on_track" as const,
      status: "active" as const,
    };

    try {
      const response = await fetch('/api/clients', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });

      if (response.ok) {
        setIsEditingClient(false);
        resetForm();
        window.location.reload();
      } else {
        const err = await response.json();
        alert(`Gagal memperbarui klien: ${err.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error("Error updating client:", err);
      alert("Terjadi kesalahan koneksi.");
    }
  };

  const resetForm = () => {
    setFormName("");
    setFormCategory("Brand");
    setFormIndustry("");
    setFormWebsite("");
    setFormContactName("");
    setFormContactPhone("");
    setFormRemark("");
  };

  const handleDeleteClient = async () => {
    if (!selectedClientId) return;
    if (!confirm(`Apakah Anda yakin ingin menghapus client "${selectedClient?.name}"?`)) return;

    try {
      const response = await fetch(`/api/clients?id=${selectedClientId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setIsEditingClient(false);
        setSelectedClientId(null);
        alert("Client berhasil dihapus.");
        window.location.reload();
      } else {
        alert("Gagal menghapus client.");
      }
    } catch (err) {
      console.error("Error deleting client:", err);
      alert("Terjadi kesalahan koneksi.");
    }
  };

  const openEditModal = () => {
    if (!selectedClient) return;
    setFormName(selectedClient.name);
    setFormCategory(selectedClient.category);
    setFormIndustry(selectedClient.industry || "");
    setFormWebsite(selectedClient.website || "");
    setFormContactName(selectedClient.contacts[0]?.name || "");
    setFormContactPhone(selectedClient.contacts[0]?.phone || "");
    setFormRemark("");
    setIsEditingClient(true);
  };

  const getCategoryStyles = (cat: string) => {
    switch (cat) {
      case "Brand": return { bg: "rgba(83,74,183,0.15)", color: "#AFA9EC" };
      case "Government": return { bg: "rgba(15,110,86,0.15)", color: "#5DCAA5" };
      case "Co. Partner": return { bg: "rgba(55,138,221,0.15)", color: "#85B7EB" };
      case "NGO": return { bg: "rgba(180,115,23,0.15)", color: "#EF9F27" };
      case "Media": return { bg: "rgba(212,83,126,0.15)", color: "#ED93B1" };
      default: return { bg: "rgba(255,255,255,0.05)", color: "#71717a" };
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status.toUpperCase()) {
      case "ACTIVE": return { bg: "rgba(99,153,34,0.15)", color: "#97C459" };
      case "LEAD": return { bg: "rgba(239,159,39,0.15)", color: "#EF9F27" };
      case "INACTIVE": return { bg: "rgba(255,255,255,0.06)", color: "#71717a" };
      case "LOST": return { bg: "rgba(226,75,74,0.15)", color: "#F09595" };
      default: return { bg: "rgba(255,255,255,0.05)", color: "#71717a" };
    }
  };

  const headerActions = (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
      <span style={{ fontSize: '12px', color: '#71717a' }}>{filteredClients.length} Clients found</span>
      <button className="primary-button-premium" style={{ background: '#378ADD', color: '#fff', borderRadius: '8px', padding: '8px 16px', border: 'none', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }} onClick={() => setIsAddingClient(true)}>
        + Add New Client
      </button>
    </div>
  );

  return (
    <WorkspaceShell title="" eyebrow="">
      <div className="crm-container" style={{ padding: '0px' }}>
        <PageHeader 
          breadcrumb={['CRM', 'Dashboard']}
          title="Customer Relationship Management"
          actions={
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{filteredClients.length} Clients found</span>
              <button 
                className="primary-button" 
                style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", padding: "10px 16px", background: "var(--accent-primary)", border: "none", color: "white" }} 
                onClick={() => setIsAddingClient(true)}
              >
                <i className="ti ti-plus" style={{ fontSize: 16 }} />
                Add New Client
              </button>
            </div>
          }
        />
        
        {/* Stat Cards Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '24px' }}>
          <MetricCard 
            label="Total Accounts"
            value={clients.length}
            subtitle="Active & prospects"
            icon="users"
          />
          <MetricCard 
            label="Active Clients"
            value={initialData.summary.activeClients}
            subtitle="Working on projects"
            icon="circle-check"
            valueColor="var(--accent-success)"
          />
          <MetricCard 
            label="Relationship Value"
            value={initialData.summary.totalPortfolioValueLabel}
            subtitle="Lifetime project value"
            icon="diamond"
            valueColor="var(--accent-info)"
          />
          <MetricCard 
            label="Potential Clients"
            value={initialData.summary.totalLeads}
            subtitle="In pipeline stage"
            icon="trending-up"
            valueColor="var(--accent-warning)"
          />
          <MetricCard 
            label="Engagement"
            value="High"
            subtitle="Based on activity"
            icon="flame"
            valueColor="var(--accent-danger)"
          />
        </div>

        {/* Search + Filter Toolbar */}
        <div style={{ marginBottom: '24px' }}>
          <div className="crm-toolbar" style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '11px', color: '#52525b' }} />
              <input 
                type="text" 
                placeholder="Search clients or contacts..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', background: '#111113', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px 8px 36px', color: '#d4d4d8', fontSize: '13px', height: '36px', outline: 'none' }}
              />
            </div>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: '160px', background: '#111113', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0 12px', color: '#d4d4d8', fontSize: '13px', height: '36px', outline: 'none', appearance: 'none', flexShrink: 0 }}
            >
              <option value="all">All Status</option>
              <option value="Active">Active</option>
              <option value="Lead">Lead</option>
              <option value="Inactive">Inactive</option>
              <option value="Lost">Lost</option>
            </select>
            <select 
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ width: '180px', background: '#111113', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0 12px', color: '#d4d4d8', fontSize: '13px', height: '36px', outline: 'none', appearance: 'none', flexShrink: 0 }}
            >
              <option value="All">All Categories</option>
              <option value="Brand">Brand</option>
              <option value="Government">Government</option>
              <option value="Co. Partner">Co. Partner</option>
              <option value="NGO">NGO</option>
              <option value="Media">Media</option>
            </select>
            <button className="primary-button-premium" style={{ background: '#378ADD', color: '#fff', borderRadius: '8px', padding: '8px 16px', border: 'none', fontSize: '13px', fontWeight: 500, cursor: 'pointer', height: '36px', flexShrink: 0 }} onClick={() => setIsAddingClient(true)}>
              + Add New Client
            </button>
          </div>

          {/* Category Chips */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {["All", "Brand", "Government", "Co. Partner", "NGO", "Media"].map(chip => (
              <button
                key={chip}
                onClick={() => setCategoryFilter(chip)}
                style={{
                  padding: '4px 12px',
                  fontSize: '12px',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: categoryFilter === chip ? 'rgba(55,138,221,0.12)' : 'rgba(255,255,255,0.05)',
                  color: categoryFilter === chip ? '#85B7EB' : '#71717a',
                  border: categoryFilter === chip ? '0.5px solid rgba(55,138,221,0.3)' : '0.5px solid transparent'
                }}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Content Split */}
        <div className="crm-content-split" style={{ display: 'flex', gap: '0px', position: 'relative' }}>
          
          {/* Main Directory Table */}
          <div className="crm-directory-table" style={{ 
            flex: 1, 
            width: selectedClientId ? 'calc(100% - 320px)' : '100%', 
            transition: 'width 0.3s ease',
            paddingRight: selectedClientId ? '24px' : '0'
          }}>
            <div style={{ fontSize: '11px', color: '#52525b', letterSpacing: '0.08em', marginBottom: '12px', fontWeight: 600 }}>CLIENT DIRECTORY</div>
            
            <div className="crm-table-container" style={{ background: '#111113', borderRadius: '12px 12px 0 0', overflow: 'hidden' }}>
              <div className="crm-table-header" style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 140px 130px 100px 80px 100px 140px', 
                padding: '10px 0', 
                borderBottom: '0.5px solid rgba(255,255,255,0.06)',
                background: '#111113'
              }}>
                {[
                  { label: "CLIENT NAME", key: "name" },
                  { label: "PIC", key: "leadSource" },
                  { label: "CATEGORY", key: "category" },
                  { label: "CONTACTS", key: "contacts" },
                  { label: "PROJECTS", key: "projects" },
                  { label: "STATUS", key: "status" },
                  { label: "LIFETIME VALUE", key: "value", align: 'right' }
                ].map(h => (
                  <div 
                    key={h.label} 
                    onClick={() => {
                      if (sortKey === h.key) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                      else { setSortKey(h.key as any); setSortOrder("asc"); }
                    }}
                    style={{ 
                      fontSize: '11px', 
                      color: sortKey === h.key ? '#378ADD' : '#52525b', 
                      letterSpacing: '0.05em', 
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: '0 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      justifyContent: h.align === 'right' ? 'flex-end' : 'flex-start'
                    }}
                  >
                    {h.label} {sortKey === h.key && (sortOrder === "asc" ? <ArrowUp size={10} /> : <ArrowDown size={10} />)}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {filteredClients.map((client: Client) => {
                  const catStyles = getCategoryStyles(client.category);
                  const statusStyles = getStatusStyles(client.status);
                  const isSelected = selectedClientId === client.id;
                  
                  return (
                    <div 
                      key={client.id}
                      onClick={() => setSelectedClientId(client.id)}
                      className={`client-row-premium ${isSelected ? 'active' : ''}`}
                      style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '1fr 140px 130px 100px 80px 100px 140px', 
                        padding: '12px 0', 
                        borderBottom: '0.5px solid rgba(255,255,255,0.05)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        borderLeft: isSelected ? '3px solid #378ADD' : '3px solid transparent',
                        background: isSelected ? 'rgba(255,255,255,0.02)' : 'transparent'
                      }}
                    >
                      <div style={{ padding: '0 12px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: '#e4e4e7' }}>{client.name}</div>
                        <div style={{ fontSize: '11px', color: '#52525b', marginTop: '2px' }}>Account: {client.id.substring(0,6).toUpperCase()}</div>
                      </div>
                      <div style={{ padding: '0 12px' }}>
                        <div style={{ fontSize: '12px', color: '#a1a1aa' }}>{client.leadSource || "–"}</div>
                      </div>
                      <div style={{ padding: '0 12px' }}>
                        <TypeBadge variant={client.category} />
                      </div>
                      <div style={{ padding: '0 12px' }}>
                        {client.contacts.length === 0 ? (
                          <span style={{ color: '#3f3f46' }}>–</span>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ display: 'flex' }}>
                              {client.contacts.slice(0, 3).map((contact: ClientContact, i: number) => (
                                <div 
                                  key={i} 
                                  style={{ 
                                    width: '20px', 
                                    height: '20px', 
                                    borderRadius: '50%', 
                                    background: contact.color, 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    fontSize: '9px', 
                                    fontWeight: 'bold', 
                                    color: 'white',
                                    border: '1.5px solid #111113',
                                    marginLeft: i === 0 ? 0 : '-6px'
                                  }}
                                >
                                  {contact.initials}
                                </div>
                              ))}
                            </div>
                            <span style={{ fontSize: '12px', color: '#71717a' }}>{client.contacts.length} persons</span>
                          </div>
                        )}
                      </div>
                      <div style={{ padding: '0 12px' }}>
                        {client.projects === 0 ? (
                          <span style={{ color: '#3f3f46' }}>–</span>
                        ) : (
                          <div style={{ fontSize: '13px', color: '#e4e4e7' }}>{client.projects} <span style={{ fontSize: '11px', color: '#52525b' }}>total</span></div>
                        )}
                      </div>
                      <div style={{ padding: '0 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <StatusBadge variant={client.status} />
                          <button 
                            onClick={(e) => { e.stopPropagation(); setSelectedClientId(client.id); openEditModal(); }}
                            style={{ background: 'none', border: 'none', color: '#52525b', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                            title="Edit Client"
                          >
                            <Edit size={12} />
                          </button>
                        </div>
                      </div>
                      <div style={{ padding: '0 12px', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        {client.value > 5000000000 && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#97C459' }} />}
                        <span style={{ fontSize: '13px', color: client.value === 0 ? '#3f3f46' : '#e4e4e7' }}>
                          {client.value === 0 ? "Rp 0" : formatCurrency(client.value)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Panel - Client Detail */}
          {selectedClientId && (
            <aside className="crm-detail-panel" style={{ 
              width: '320px', 
              background: '#111113', 
              borderLeft: '0.5px solid rgba(255,255,255,0.08)',
              height: 'calc(100vh - 120px)',
              position: 'sticky',
              top: '0px',
              overflowY: 'auto',
              animation: 'slideIn 0.3s ease'
            }}>
              {selectedClient ? (
                <div style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <TypeBadge variant={selectedClient.category} />
                    </div>
                    <button onClick={() => setSelectedClientId(null)} style={{ background: 'transparent', border: 'none', color: '#71717a', cursor: 'pointer' }}>
                      <X size={16} />
                    </button>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 500, color: '#f4f4f5', margin: 0 }}>{selectedClient.name}</h2>
                    <div style={{ fontSize: '11px', color: '#52525b', marginTop: '4px' }}>Account: {selectedClient.id.substring(0,6).toUpperCase()}</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#52525b', marginBottom: '4px' }}>PIC Source</div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#f4f4f5' }}>{selectedClient.leadSource || "–"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#52525b', marginBottom: '4px' }}>AE</div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#EF9F27' }}>{(selectedClient as any).accountExecutive || "–"}</div>
                    </div>
                  </div>

                  <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.06)', marginBottom: '24px' }} />

                  {/* Key Contacts */}
                  <div style={{ marginBottom: '32px' }}>
                    <div style={{ fontSize: '11px', color: '#52525b', letterSpacing: '0.06em', fontWeight: 600, marginBottom: '16px' }}>KEY CONTACTS</div>
                    {selectedClient.contacts.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {selectedClient.contacts.map((c: ClientContact, i: number) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold', color: 'white' }}>{c.initials}</div>
                              <div>
                                <div style={{ fontSize: '13px', color: '#e4e4e7', fontWeight: 500 }}>{c.name}</div>
                                <div style={{ fontSize: '11px', color: '#52525b' }}>{c.role}</div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <Phone size={14} style={{ color: '#52525b' }} />
                              <Mail size={14} style={{ color: '#52525b' }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: '#3f3f46' }}>No contacts found</div>
                    )}
                  </div>

                  {/* Recent Projects */}
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ fontSize: '11px', color: '#52525b', letterSpacing: '0.06em', fontWeight: 600, marginBottom: '16px' }}>RECENT PROJECTS</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {selectedClient.recentProjects.length > 0 ? (
                        selectedClient.recentProjects.map((p: ClientProject) => (
                          <div key={p.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px 12px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 500, color: '#e4e4e7', marginBottom: '6px' }}>{p.name}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span className="stage-pill-premium" style={{ background: 'rgba(55, 138, 221, 0.1)', color: '#378ADD', fontSize: '10px' }}>{p.stage}</span>
                              <span style={{ fontSize: '10px', color: '#97C459' }}>WON</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div style={{ fontSize: '12px', color: '#3f3f46' }}>No projects found</div>
                      )}
                    </div>
                  </div>

                  <Link href={`/projects?client=${selectedClient.name}`} style={{ textDecoration: 'none' }}>
                    <button style={{ width: '100%', background: '#378ADD', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', marginTop: '12px' }}>
                      View Portfolio
                    </button>
                  </Link>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                    <button onClick={openEditModal} style={{ background: 'rgba(255,255,255,0.05)', color: '#a1a1aa', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px', fontSize: '12px', cursor: 'pointer' }}>Edit</button>
                    <button onClick={handleDeleteClient} style={{ background: 'rgba(226,75,74,0.1)', color: '#F09595', border: '1px solid rgba(226,75,74,0.2)', borderRadius: '8px', padding: '8px', fontSize: '12px', cursor: 'pointer' }}>Delete</button>
                  </div>
                </div>
              ) : null}
            </aside>
          )}

          {!selectedClientId && (
            <aside className="crm-empty-state" style={{ width: '320px', background: '#111113', borderLeft: '0.5px solid rgba(255,255,255,0.08)', height: 'calc(100vh - 120px)', position: 'sticky', top: '0px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', textAlign: 'center' }}>
              <Users size={48} style={{ color: 'rgba(255,255,255,0.05)', marginBottom: '16px' }} />
              <div style={{ fontSize: '14px', fontWeight: 500, color: '#52525b' }}>Select a client to view details</div>
            </aside>
          )}
        </div>

        <style jsx global>{`
          @media (max-width: 1024px) {
            .crm-stat-grid {
              grid-template-columns: repeat(2, 1fr) !important;
              padding: 0 16px;
            }
            .crm-toolbar {
              flex-wrap: wrap;
              padding: 0 16px;
            }
            .crm-toolbar > div, .crm-toolbar select, .crm-toolbar button {
              width: 100% !important;
              flex: none !important;
            }
            .crm-content-split {
              flex-direction: column;
            }
            .crm-directory-table {
              width: 100% !important;
              padding: 0 16px !important;
            }
            .crm-table-header {
              grid-template-columns: 1fr 100px 100px !important;
            }
            .crm-table-header div:nth-child(2),
            .crm-table-header div:nth-child(4),
            .crm-table-header div:nth-child(5),
            .crm-table-header div:nth-child(7) {
              display: none !important;
            }
            .client-row-premium {
              grid-template-columns: 1fr 100px 100px !important;
            }
            .client-row-premium div:nth-child(2),
            .client-row-premium div:nth-child(4),
            .client-row-premium div:nth-child(5),
            .client-row-premium div:nth-child(7) {
              display: none !important;
            }
            .crm-detail-panel {
              position: fixed !important;
              inset: 0 !important;
              width: 100% !important;
              height: 100% !important;
              z-index: 1000;
              background: #09090b !important;
              padding-bottom: 80px;
            }
            .crm-empty-state {
              display: none !important;
            }
          }
          @media (max-width: 640px) {
            .crm-stat-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </div>



      {/* Add / Edit Client Modal */}
      {(isAddingClient || isEditingClient) && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
          <div style={{ background: '#1f1f23', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '16px', maxWidth: '520px', width: '100%', padding: '24px', position: 'relative' }}>
            <button onClick={() => { setIsAddingClient(false); setIsEditingClient(false); }} style={{ position: 'absolute', right: '16px', top: '16px', background: 'none', border: 'none', color: '#71717a', cursor: 'pointer' }}>
              <X size={20} />
            </button>
            
            <h3 style={{ fontSize: '18px', fontWeight: 500, color: '#f4f4f5', margin: '0 0 20px 0' }}>
              {isEditingClient ? 'Edit Client Details' : 'Add New Client'}
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#a1a1aa', marginBottom: '6px', display: 'block' }}>Company Name</label>
                <input 
                  className="modal-input-premium" 
                  style={{ width: '100%', background: '#111113', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 12px', color: '#d4d4d8', outline: 'none' }}
                  placeholder="e.g. PT. Juara Indonesia"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#a1a1aa', marginBottom: '6px', display: 'block' }}>Sales / PIC Source</label>
                <input 
                  style={{ width: '100%', background: '#111113', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 12px', color: '#d4d4d8', outline: 'none' }}
                  placeholder="e.g. Bram Hady Sulton"
                  value={formRemark}
                  onChange={e => setFormRemark(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#a1a1aa', marginBottom: '6px', display: 'block' }}>Category</label>
                  <select 
                    style={{ width: '100%', background: '#111113', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 12px', color: '#d4d4d8', outline: 'none' }}
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value as any)}
                  >
                    <option value="Brand">Brand</option>
                    <option value="Government">Government</option>
                    <option value="Co. Partner">Co. Partner</option>
                    <option value="NGO">NGO</option>
                    <option value="Media">Media</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#a1a1aa', marginBottom: '6px', display: 'block' }}>Industry</label>
                  <input 
                    style={{ width: '100%', background: '#111113', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 12px', color: '#d4d4d8', outline: 'none' }}
                    placeholder="e.g. Technology"
                    value={formIndustry}
                    onChange={e => setFormIndustry(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#a1a1aa', marginBottom: '6px', display: 'block' }}>Website</label>
                <input 
                  style={{ width: '100%', background: '#111113', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 12px', color: '#d4d4d8', outline: 'none' }}
                  placeholder="https://example.com"
                  value={formWebsite}
                  onChange={e => setFormWebsite(e.target.value)}
                />
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '0.5px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '11px', color: '#52525b', letterSpacing: '0.08em', marginBottom: '12px' }}>MAIN CONTACT (CLIENT SIDE)</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#a1a1aa', marginBottom: '6px', display: 'block' }}>Contact Name</label>
                    <input 
                      style={{ width: '100%', background: '#111113', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', color: '#d4d4d8', outline: 'none' }}
                      placeholder="e.g. Andi Pratama"
                      value={formContactName}
                      onChange={e => setFormContactName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#a1a1aa', marginBottom: '6px', display: 'block' }}>Phone / WA</label>
                    <input 
                      style={{ width: '100%', background: '#111113', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', color: '#d4d4d8', outline: 'none' }}
                      placeholder="0812..."
                      value={formContactPhone}
                      onChange={e => setFormContactPhone(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {!isEditingClient && (
                <div>
                  <label style={{ fontSize: '12px', color: '#a1a1aa', marginBottom: '6px', display: 'block' }}>Remark / Notes</label>
                  <textarea 
                    style={{ width: '100%', background: '#111113', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 12px', color: '#d4d4d8', outline: 'none', minHeight: '80px', resize: 'vertical' }}
                    placeholder="Additional context about this lead..."
                    value={formRemark}
                    onChange={e => setFormRemark(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginTop: '24px' }}>
              <div>
                {isEditingClient && (
                  <button 
                    onClick={handleDeleteClient}
                    style={{ background: 'transparent', border: '0.5px solid rgba(226,75,74,0.3)', borderRadius: '8px', padding: '8px 16px', color: '#F09595', fontSize: '13px', cursor: 'pointer' }}
                  >
                    Delete Account
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => { setIsAddingClient(false); setIsEditingClient(false); }}
                  style={{ background: 'transparent', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 16px', color: '#a1a1aa', fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  onClick={isEditingClient ? handleUpdateClient : handleAddClient}
                  style={{ background: '#378ADD', border: 'none', borderRadius: '8px', padding: '8px 20px', color: '#fff', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
                >
                  {isEditingClient ? 'Update Client' : 'Save Client'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


    </WorkspaceShell>
  );
}
