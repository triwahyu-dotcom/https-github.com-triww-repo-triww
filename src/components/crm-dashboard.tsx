"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { CRMDashboardData, CRMClient } from "@/lib/project/types";
import { WorkspaceShell } from "./layout/workspace-shell";
import { SummaryCard } from "./ui/summary-card";

interface Props {
  initialData: CRMDashboardData;
}

export function CRMDashboard({ initialData }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [selectedClient, setSelectedClient] = useState<CRMClient | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [formData, setFormData] = useState<Partial<CRMClient>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSaveClient = async () => {
    if (!formData.name) {
      setError("Please enter a company name.");
      return;
    }

    const endpoint = "/api/clients";
    const method = modalMode === "add" ? "POST" : "PUT";
    
    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        setIsModalOpen(false);
        window.location.reload(); 
      } else {
        setError(data.error || "Failed to save client. Check your connection.");
      }
    } catch (err) {
      console.error("Save error", err);
      setError("Server connection error. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const openAddModal = () => {
    setModalMode("add");
    setFormData({ status: "lead", category: "BRAND", contacts: [], projects: [] });
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (client: CRMClient) => {
    setModalMode("edit");
    setFormData(client);
    setIsModalOpen(true);
  };

  const filteredClients = useMemo(() => {
    const unique = Array.from(new Map(initialData.clients.map(c => [c.id, c])).values());
    return unique.filter((client) => {
      const matchesSearch =
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.contacts.some((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = filterStatus === "all" || client.status === filterStatus;
      const matchesCategory = filterCategory === "all" || (client.category || "").toUpperCase() === filterCategory;
      return matchesSearch && matchesStatus && matchesCategory;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [initialData.clients, searchQuery, filterStatus, filterCategory]);

  const headerActions = (
    <>
      <div className="workspace-actions" style={{ marginRight: '16px' }}>
        <span className="mini-meta">{filteredClients.length} Clients found</span>
      </div>
      <button className="primary-button" style={{ borderRadius: '8px', padding: '0 16px', height: '36px' }} onClick={openAddModal}>
        + Add New Lead
      </button>
    </>
  );

  return (
    <WorkspaceShell
      title="Manage your client ecosystem"
      eyebrow="Customer Relationship Management"
      actions={headerActions}
    >
      <section className="summary-deck" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <SummaryCard 
          label="Total Accounts" 
          value={String(initialData.summary.totalClients + initialData.summary.totalLeads)} 
          description="Active and leads combined"
          icon="👥" 
        />
        <SummaryCard 
          label="Active Clients" 
          value={String(initialData.summary.activeClients)} 
          description="Working on projects"
          icon="✅" 
        />
        <SummaryCard 
          label="Relationship Value" 
          value={initialData.summary.totalPortfolioValueLabel} 
          description="Lifetime project value"
          icon="💎" 
        />
        <SummaryCard 
          label="Potential Leads" 
          value={String(initialData.summary.totalLeads)} 
          description="In pipeline stage"
          icon="📈" 
        />
        <SummaryCard 
          label="Engagement" 
          value="High" 
          description="Based on activity"
          icon="🔥" 
        />
      </section>

      <div className="toolbar-panel">
        <div className="control-bar">
          <input
            type="text"
            placeholder="Search clients or contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="active">Active Clients</option>
            <option value="lead">Pipeline Leads</option>
          </select>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="all">All Categories</option>
            <option value="BRAND">Brand</option>
            <option value="GOVERNMENT">Government</option>
            <option value="CO. PARTNER">Co. Partner</option>
            <option value="EVENT ORGANIZER">Event Organizer</option>
          </select>
          <button className="primary-button" onClick={openAddModal}>+ Add New Lead</button>
        </div>
      </div>

      <div className="workspace-grid">
        <div className="panel list-panel">
          <div className="panel-kicker">Client Directory</div>
          <div className="table-shell">
            <div className="project-table">
              <div className="table-row table-head">
                <div style={{ gridColumn: "span 1" }}>Client Name</div>
                <div>Category</div>
                <div>Contacts</div>
                <div>Projects</div>
                <div>Status</div>
                <div>Lifetime Value</div>
                <div>Health</div>
              </div>
              {filteredClients.map((client) => (
                <button
                  key={client.id}
                  className={`table-row ${selectedClient?.id === client.id ? "active-table-row" : ""}`}
                  onClick={() => setSelectedClient(client)}
                  style={{ background: "none", borderLeft: "none", borderRight: "none", width: "100%", padding: "13px 14px", textAlign: "left" }}
                >
                  <div style={{ fontWeight: 600 }}>{client.name}</div>
                  <div className="mini-meta">{client.category || client.type?.toUpperCase()}</div>
                  <div className="mini-meta">{client.contacts.length} persons</div>
                  <div className="mini-meta">{client.projectCount} total</div>
                  <div>
                    <span className={`status-pill ${client.status === "active" ? "tone-green" : "tone-amber"}`}>
                      {client.status.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{client.totalProjectValueLabel}</div>
                  <div>
                    <span className={`status-pill tone-${client.health === "on_track" ? "green" : client.health === "watch" ? "amber" : "red"}`}>
                      ●
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="panel detail-panel" style={{ position: "sticky", top: "20px" }}>
          {selectedClient ? (
            <>
              <div className="detail-head">
                <div>
                  <div className="eyebrow" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <span className="status-pill tone-slate" style={{ fontSize: "0.6rem" }}>{selectedClient.category?.toUpperCase() || selectedClient.type?.toUpperCase()}</span>
                    {selectedClient.industry && <span>• {selectedClient.industry}</span>}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
                    <h2>{selectedClient.name}</h2>
                    <button className="primary-button" style={{ scale: "0.8", background: "none", color: "var(--accent)" }} onClick={() => openEditModal(selectedClient)}>Edit Profile</button>
                  </div>
                  {selectedClient.website && (
                    <a href={selectedClient.website} target="_blank" className="mini-stage" style={{ marginTop: "4px" }}>
                      🔗 {selectedClient.website.replace("https://", "")}
                    </a>
                  )}
                </div>
                <span className={`status-pill tone-${selectedClient.status === "active" ? "green" : "amber"}`}>
                  {selectedClient.status?.toUpperCase() || "LEAD"}
                </span>
              </div>

              {selectedClient.address && (
                <div style={{ marginTop: "12px", fontSize: "0.8rem", color: "var(--muted-soft)", display: "flex", gap: "6px" }}>
                  📍 <span>{selectedClient.address}</span>
                </div>
              )}

              <div className="detail-summary" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
                <article>
                  <span>Project Value</span>
                  <strong>{selectedClient.totalProjectValueLabel}</strong>
                </article>
                <article>
                  <span>Active Projects</span>
                  <strong>{selectedClient.activeProjectCount}</strong>
                </article>
              </div>

              <div className="detail-stack" style={{ marginTop: "20px", display: "grid", gap: "16px" }}>
                <section>
                  <div className="panel-kicker">Key Contacts</div>
                  <div className="task-stack">
                    {selectedClient.contacts.map((contact, i) => (
                      <div key={i} className="activity-card">
                        <strong>{contact.name}</strong>
                        <p>{contact.projects.length} participation(s)</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <div className="panel-kicker">Recent Projects</div>
                  <div className="project-list">
                    {selectedClient.projects.slice(0, 3).map((p) => (
                      <div key={p.id} className="document-card" style={{ padding: "12px" }}>
                        <div style={{ fontSize: "0.75rem", color: "var(--muted-soft)" }}>{p.numberLabel}</div>
                        <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{p.projectName}</div>
                        <div className="mini-stage">{p.currentStageLabel}</div>
                      </div>
                    ))}
                  </div>
                </section>
                
                <Link href="/projects" className="primary-button" style={{ width: "100%", marginTop: "10px" }}>
                  View All Projects
                </Link>
              </div>
            </>
          ) : (
            <div className="empty-state" style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🔍</div>
              <h3>Select a client</h3>
              <p>Select a client from the list to see their relationship history and portfolio details.</p>
            </div>
          )}
        </div>
      </div>
      {isModalOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content wide-modal" style={{ backgroundColor: '#1a1a1a', padding: '32px', borderRadius: '16px', width: '100%', border: '1px solid #333', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
            <h2 style={{ marginBottom: '24px' }}>{modalMode === 'add' ? 'Add New Lead' : 'Edit Client Profile'}</h2>
            
            {error && (
              <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '8px', color: '#ef4444', marginBottom: '20px', fontSize: '0.9rem' }}>
                ⚠️ {error}
              </div>
            )}

            <div className="form-section-title">Company Identity</div>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="mini-meta" style={{ marginBottom: '4px' }}>Company Name</label>
                <input style={{ width: '100%', background: '#222', border: '1px solid #333', padding: '10px', color: 'white', borderRadius: '8px' }} 
                   value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="e.g., PT Telkom Indonesia" />
              </div>
              <div className="form-group">
                <label className="mini-meta" style={{ marginBottom: '4px' }}>Industry</label>
                <input style={{ width: '100%', background: '#222', border: '1px solid #333', padding: '10px', color: 'white', borderRadius: '8px' }} 
                   value={formData.industry || ''} onChange={(e) => setFormData({...formData, industry: e.target.value})} placeholder="e.g., Telecom, Banking" />
              </div>
            </div>

            <div className="form-grid-2" style={{ marginTop: '16px' }}>
              <div className="form-group">
                <label className="mini-meta" style={{ marginBottom: '4px' }}>Category</label>
                <select style={{ width: '100%', background: '#222', border: '1px solid #333', padding: '10px', color: 'white', borderRadius: '8px' }} 
                   value={formData.category || 'BRAND'} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                   <option value="BRAND">Brand</option>
                   <option value="GOVERNMENT">Government</option>
                   <option value="CO. PARTNER">Co. Partner</option>
                   <option value="EVENT ORGANIZER">Event Organizer</option>
                </select>
              </div>
              <div className="form-group">
                <label className="mini-meta" style={{ marginBottom: '4px' }}>Status</label>
                <select style={{ width: '100%', background: '#222', border: '1px solid #333', padding: '10px', color: 'white', borderRadius: '8px' }} 
                   value={formData.status || 'lead'} onChange={(e) => setFormData({...formData, status: e.target.value as 'active' | 'lead'})}>
                   <option value="active">Active Client</option>
                   <option value="lead">Pipeline Lead</option>
                </select>
              </div>
            </div>

            <div className="form-section-title" style={{ marginTop: '24px' }}>Location & Reach</div>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="mini-meta" style={{ marginBottom: '4px' }}>Website</label>
                <input style={{ width: '100%', background: '#222', border: '1px solid #333', padding: '10px', color: 'white', borderRadius: '8px' }} 
                   value={formData.website || ''} onChange={(e) => setFormData({...formData, website: e.target.value})} placeholder="https://..." />
              </div>
              <div className="form-group">
                <label className="mini-meta" style={{ marginBottom: '4px' }}>Address</label>
                <textarea style={{ width: '100%', background: '#222', border: '1px solid #333', padding: '10px', color: 'white', borderRadius: '8px', height: '42px' }} 
                   value={formData.address || ''} onChange={(e) => setFormData({...formData, address: e.target.value})} placeholder="Office address..." />
              </div>
            </div>
            <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="primary-button" style={{ background: 'none', border: '1px solid #333' }} disabled={isSaving} onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button className="primary-button" disabled={isSaving} onClick={handleSaveClient}>
                {isSaving ? "Connecting..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </WorkspaceShell>
  );
}
