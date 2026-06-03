"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { 
  FolderOpen, 
  FileText, 
  Clock, 
  CheckCircle2, 
  Check, 
  AlertCircle, 
  Eye, 
  Printer, 
  FileDown,
  ChevronRight,
  ShieldCheck
} from "lucide-react";
import { FinanceDashboardData, ExpenseDocument, RequestForPayment } from "@/lib/finance/types";
import { ProjectRecord } from "@/lib/project/types";
import { WorkspaceShell } from "../layout/workspace-shell";
import { MetricCard } from "../ui/MetricCard";
import { formatCurrencyIDR, formatDateFullID } from "@/lib/utils/format";
import { FilterBar } from "./filter-bar";
import { ViewSwitcher } from "./portal-router";

interface Props {
  initialData: FinanceDashboardData;
  activeProjects: ProjectRecord[];
  viewMode?: "monitoring" | "operational";
  onViewModeChange?: (mode: "monitoring" | "operational") => void;
}

const docTypeLabel: Record<string, string> = {
  PO: "PO",
  SPK: "SPK",
  KONTRAK: "Kontrak",
  CASH_ADVANCE: "Cash Advance",
};

const statusLabel: Record<string, { text: string; tone: string; icon?: React.ReactNode }> = {
  draft:      { text: "Draft",       tone: "tone-amber" },
  submitted:  { text: "Submitted",   tone: "tone-amber" },
  approved:   { text: "Approved",  tone: "tone-blue", icon: <Check size={12} /> },
  paid:       { text: "Paid",        tone: "tone-green" },
  settled:    { text: "Settled",     tone: "tone-green" },
  pending_c_level: { text: "Pending Director", tone: "tone-amber" },
  pending_finance: { text: "Pending Finance",  tone: "tone-amber" },
};

export function PMDashboard({ 
  initialData, 
  activeProjects,
  viewMode,
  onViewModeChange
}: Props) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    activeProjects[0]?.id ?? null
  );
  const [projectSearch, setProjectSearch] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const docs = useMemo(() => initialData.expenseDocuments || [], [initialData.expenseDocuments]);
  const rfps = useMemo(() => initialData.rfps || [], [initialData.rfps]);

  const filteredProjects = useMemo(() => {
    if (!projectSearch) return activeProjects;
    const q = projectSearch.toLowerCase();
    return activeProjects.filter(p => p.projectName.toLowerCase().includes(q) || p.client.toLowerCase().includes(q));
  }, [activeProjects, projectSearch]);

  const selectedProject = useMemo(() => activeProjects.find(p => p.id === selectedProjectId), [activeProjects, selectedProjectId]);
  const projectDocs = useMemo(() => docs.filter(d => d.projectId === selectedProjectId), [docs, selectedProjectId]);
  const projectRfps = useMemo(() => rfps.filter(r => r.projectId === selectedProjectId), [rfps, selectedProjectId]);

  const totalApproved = useMemo(() => rfps.filter(r => r.status === "approved" || r.status === "paid" || r.status === "settled").reduce((s, r) => s + r.totalAmount, 0), [rfps]);
  const totalPending = useMemo(() => rfps.filter(r => r.status !== "paid" && r.status !== "settled").reduce((s, r) => s + r.totalAmount, 0), [rfps]);

  const [filteredProjectDocs, setFilteredProjectDocs] = useState<ExpenseDocument[]>([]);
  const [filteredProjectRfps, setFilteredProjectRfps] = useState<RequestForPayment[]>([]);
  const [viewProofUrl, setViewProofUrl] = useState<string | null>(null);

  const handleFilter = useCallback((items: any[]) => {
    const d = items.filter(i => "documentType" in i);
    const r = items.filter(i => !("documentType" in i));
    setFilteredProjectDocs(d);
    setFilteredProjectRfps(r);
  }, []);

  const combinedItems = useMemo(() => [...projectDocs, ...projectRfps], [projectDocs, projectRfps]);

  const headerActions = (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
      {viewMode && onViewModeChange && (
        <ViewSwitcher viewMode={viewMode} onViewModeChange={onViewModeChange} />
      )}
      <button 
        style={{ 
          background: 'transparent',
          border: '0.5px solid rgba(255,255,255,0.15)',
          color: '#a1a1aa',
          borderRadius: '8px',
          padding: '6px 14px',
          fontSize: '12px',
          cursor: 'pointer',
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px' 
        }} 
        onClick={() => window.print()}
      >
        <FileDown size={14} /> Export Report
      </button>
    </div>
  );

  return (
    <WorkspaceShell
      title="Project Monitor"
      eyebrow="PM WORKSPACE (READ-ONLY)"
      actions={headerActions}
    >
      <section className="pm-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: "24px" }}>
        <MetricCard label="My Projects" value={String(activeProjects.length)} subtitle={isMobile ? "Active" : "Active executions"} icon={<FolderOpen size={16} />} />
        <MetricCard label="Total Dokumen" value={String(docs.length)} subtitle={isMobile ? "Files" : "PO, SPK, Kontrak, CA"} icon={<FileText size={16} />} />
        <MetricCard label="Pending Nilai" value={formatCurrencyIDR(totalPending)} subtitle={isMobile ? "Unpaid" : "Belum terbayar"} icon={<Clock size={16} />} valueColor="var(--accent-danger)" />
        <MetricCard label="Sudah Approved" value={formatCurrencyIDR(totalApproved)} subtitle={isMobile ? "Auth" : "Nilai terotorisasi"} icon={<CheckCircle2 size={16} />} valueColor="var(--accent-success)" />
      </section>

      <div className="pm-split-pane" style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "1px", background: 'rgba(255,255,255,0.08)', borderRadius: '12px', border: '0.5px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        {/* Left Panel: Project List */}
        <div className="pm-left-panel" style={{ background: "#111113", padding: "12px", height: '70vh', overflowY: 'auto' }}>
          <input 
            type="text" 
            placeholder="Cari project..." 
            value={projectSearch}
            onChange={(e) => setProjectSearch(e.target.value)}
            style={{ 
              width: "100%", 
              background: "#1f1f23", 
              border: "0.5px solid rgba(255,255,255,0.1)", 
              borderRadius: "8px", 
              fontSize: "12px", 
              padding: "7px 10px", 
              marginBottom: "10px",
              color: '#d4d4d8',
              outline: 'none'
            }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {filteredProjects.map(p => {
              const pDocs = docs.filter(d => d.projectId === p.id);
              const pRfps = rfps.filter(r => r.projectId === p.id);
              const hasPending = pRfps.some(r => r.status !== "paid" && r.status !== "settled");
              const isActive = selectedProjectId === p.id;

              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedProjectId(p.id)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: isActive ? "0 8px 8px 0" : "8px",
                    cursor: "pointer",
                    background: isActive ? "rgba(55,138,221,0.08)" : "transparent",
                    borderLeft: isActive ? "3px solid #378ADD" : "none",
                    transition: "all 0.2s",
                  }}
                  className="project-card-pm"
                >
                  <div style={{ fontSize: "11px", color: "#52525b", letterSpacing: "0.04em", textTransform: 'uppercase' }}>{p.client}</div>
                  <div style={{ fontWeight: 500, fontSize: "13px", color: "#e4e4e7", margin: "3px 0", lineHeight: 1.4 }}>{p.projectName}</div>
                  <div style={{ display: "flex", gap: "6px", marginTop: "6px", alignItems: 'center' }}>
                    <span style={{ background: 'rgba(255,255,255,0.06)', color: '#71717a', borderRadius: '20px', padding: '2px 7px', fontSize: '11px' }}>{pDocs.length} Dok</span>
                    <span style={{ background: 'rgba(255,255,255,0.06)', color: '#71717a', borderRadius: '20px', padding: '2px 7px', fontSize: '11px' }}>{pRfps.length} RFP</span>
                    {hasPending && <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#EF9F27" }} title="Pending items" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Panel: Project Detail */}
        <div className="pm-right-panel" style={{ background: "#18181b", padding: "20px", height: '70vh', overflowY: 'auto' }}>
          {selectedProject ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: '24px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#52525b' }}>{selectedProject.client}</div>
                  <h2 style={{ fontSize: '18px', fontWeight: 500, color: '#f4f4f5', margin: '4px 0' }}>{selectedProject.projectName}</h2>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px' }}>
                    <span className="stage-pill-premium" style={{ background: 'rgba(55,138,221,0.15)', color: '#85B7EB', fontSize: '10px' }}>{selectedProject.currentStageLabel}</span>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: '12px', color: '#71717a' }}>Nilai Project</div>
                  <div style={{ fontWeight: 500, fontSize: "16px", color: '#f4f4f5' }}>{selectedProject.projectValueLabel}</div>
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <FilterBar 
                  items={combinedItems} 
                  type="rfps" 
                  onFilter={handleFilter}
                  placeholder="Cari dalam project ini..."
                />
              </div>

              <section style={{ marginBottom: '32px' }}>
                <div style={{ fontSize: '11px', color: '#52525b', letterSpacing: '0.08em', marginBottom: '8px', fontWeight: 500 }}>DOKUMEN PENGADAAN</div>
                <div style={{ background: '#111113', borderRadius: '8px', border: '0.5px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div className="pm-table-header" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 100px 120px 140px', padding: '10px 14px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: '10px', color: '#52525b', letterSpacing: '0.05em' }}>NO. DOKUMEN</div>
                    <div className="hide-mobile" style={{ fontSize: '10px', color: '#52525b', letterSpacing: '0.05em' }}>VENDOR</div>
                    <div className="hide-mobile" style={{ fontSize: '10px', color: '#52525b', letterSpacing: '0.05em' }}>TIPE</div>
                    <div style={{ fontSize: '10px', color: '#52525b', letterSpacing: '0.05em' }}>NILAI</div>
                    <div style={{ fontSize: '10px', color: '#52525b', letterSpacing: '0.05em', textAlign: 'right' }}>STATUS</div>
                  </div>
                  {filteredProjectDocs.length === 0 ? (
                    <div style={{ padding: "40px", textAlign: "center", color: "#3f3f46", fontSize: "13px" }}>
                      Tidak ada dokumen yang sesuai filter
                    </div>
                  ) : filteredProjectDocs.map(doc => (
                    <div key={doc.id} className="pm-row" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 100px 120px 140px', padding: '12px 14px', borderBottom: '0.5px solid rgba(255,255,255,0.04)', alignItems: 'center' }}>
                      <div style={{ fontSize: '12px', fontWeight: 500, color: '#e4e4e7' }}>{doc.id}</div>
                      <div className="hide-mobile" style={{ fontSize: '12px', color: '#a1a1aa' }}>{doc.vendorName}</div>
                      <div className="hide-mobile"><span style={{ background: 'rgba(55,138,221,0.1)', color: '#85B7EB', fontSize: '10px', padding: '2px 6px', borderRadius: '4px' }}>{docTypeLabel[doc.documentType]}</span></div>
                      <div style={{ fontSize: '12px', color: '#e4e4e7' }}>{formatCurrencyIDR(doc.amount)}</div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ 
                          background: doc.status === 'approved' || doc.status === 'paid' ? 'rgba(151,196,89,0.15)' : 'rgba(239,159,39,0.15)',
                          color: doc.status === 'approved' || doc.status === 'paid' ? '#97C459' : '#EF9F27',
                          fontSize: '10px', padding: '2px 8px', borderRadius: '20px'
                        }}>
                          {doc.status.replace(/_/g, " ").toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <div style={{ fontSize: '11px', color: '#52525b', letterSpacing: '0.08em', marginBottom: '8px', fontWeight: 500 }}>REQUEST FOR PAYMENT (RFP)</div>
                <div style={{ background: '#111113', borderRadius: '8px', border: '0.5px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div className="pm-table-header-rfp" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 100px 120px 140px', padding: '10px 14px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: '10px', color: '#52525b', letterSpacing: '0.05em' }}>RFP ID</div>
                    <div className="hide-mobile" style={{ fontSize: '10px', color: '#52525b', letterSpacing: '0.05em' }}>PAYEE</div>
                    <div className="hide-mobile" style={{ fontSize: '10px', color: '#52525b', letterSpacing: '0.05em' }}>METODE</div>
                    <div style={{ fontSize: '10px', color: '#52525b', letterSpacing: '0.05em' }}>NOMINAL</div>
                    <div style={{ fontSize: '10px', color: '#52525b', letterSpacing: '0.05em', textAlign: 'right' }}>STATUS</div>
                  </div>
                  {filteredProjectRfps.length === 0 ? (
                    <div style={{ padding: "40px", textAlign: "center", color: "#3f3f46", fontSize: "13px" }}>
                      Tidak ada RFP yang sesuai filter
                    </div>
                  ) : filteredProjectRfps.map(rfp => (
                    <div key={rfp.id} className="pm-row-rfp" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 100px 120px 140px', padding: '12px 14px', borderBottom: '0.5px solid rgba(255,255,255,0.04)', alignItems: 'center' }}>
                      <div style={{ fontSize: '12px', fontFamily: 'monospace', color: '#e4e4e7' }}>#{rfp.id.substring(0, 8)}</div>
                      <div className="hide-mobile" style={{ fontSize: '12px', color: '#a1a1aa' }}>{rfp.payeeName}</div>
                      <div className="hide-mobile" style={{ fontSize: '11px', color: '#71717a' }}>{rfp.paymentType}</div>
                      <div style={{ fontSize: '12px', color: '#e4e4e7', fontWeight: 500 }}>{formatCurrencyIDR(rfp.totalAmount)}</div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ 
                          background: rfp.status === 'paid' || rfp.status === 'settled' ? 'rgba(15,110,86,0.15)' : rfp.status === 'approved' ? 'rgba(55,138,221,0.15)' : 'rgba(239,159,39,0.15)',
                          color: rfp.status === 'paid' || rfp.status === 'settled' ? '#5DCAA5' : rfp.status === 'approved' ? '#85B7EB' : '#EF9F27',
                          fontSize: '10px', padding: '2px 8px', borderRadius: '20px'
                        }}>
                          {rfp.status.replace(/_/g, " ").toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#3f3f46' }}>
              <FolderOpen size={48} style={{ marginBottom: '16px', opacity: 0.2 }} />
              <div style={{ fontSize: '14px' }}>Pilih project untuk melihat detail</div>
            </div>
          )}
        </div>
      </div>

      {viewProofUrl && (
        <div 
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px" }}
          onClick={() => setViewProofUrl(null)}
        >
          <div style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh" }}>
            <button style={{ position: "absolute", top: "-40px", right: "0", background: "none", border: "none", color: "white", fontSize: "24px", cursor: "pointer" }}>&times; Tutup</button>
            <img src={viewProofUrl} alt="Bukti Transfer" style={{ maxWidth: "100%", maxHeight: "90vh", borderRadius: "8px", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }} />
          </div>
        </div>
      )}

      <style jsx global>{`
        @media (max-width: 1024px) {
          .pm-stat-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .pm-split-pane {
            grid-template-columns: 1fr !important;
          }
          .pm-left-panel {
            height: 300px !important;
            border-bottom: 0.5px solid rgba(255,255,255,0.1);
          }
          .pm-right-panel {
            height: auto !important;
          }
          .pm-table-header, .pm-table-header-rfp {
            display: none !important;
          }
          .pm-row, .pm-row-rfp {
            display: flex !important;
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 10px !important;
            padding: 14px 16px !important;
            background: rgba(255, 255, 255, 0.02) !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
          }
          .pm-row > div, .pm-row-rfp > div {
            text-align: left !important;
          }
          .pm-row > div:last-child, .pm-row-rfp > div:last-child {
            justify-content: flex-start !important;
            margin-top: 4px;
          }
          .hide-mobile {
            display: none !important;
          }
        }

        @media (max-width: 640px) {
          .pm-stat-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </WorkspaceShell>
  );
}
