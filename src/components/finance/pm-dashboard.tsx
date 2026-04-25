"use client";

import { useState, useMemo, useCallback } from "react";
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
import { SummaryCard } from "../ui/summary-card";
import { formatCurrencyIDR, formatDateFullID } from "@/lib/utils/format";
import { FilterBar } from "./filter-bar";

interface Props {
  initialData: FinanceDashboardData;
  activeProjects: ProjectRecord[];
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

export function PMDashboard({ initialData, activeProjects }: Props) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    activeProjects[0]?.id ?? null
  );

  const docs = useMemo(() => initialData.expenseDocuments || [], [initialData.expenseDocuments]);
  const rfps = useMemo(() => initialData.rfps || [], [initialData.rfps]);

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
    <div className="workspace-actions">
      <button className="secondary-button" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => window.print()}>
        <Printer size={16} /> Export Report
      </button>
    </div>
  );

  return (
    <WorkspaceShell
      title="Project Monitor"
      eyebrow="PM Workspace (Read-Only)"
      actions={headerActions}
    >
      <section className="summary-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: "24px", display: 'grid', gap: '16px' }}>
        <SummaryCard label="My Projects" value={String(activeProjects.length)} description="Active executions" icon={<FolderOpen size={18} />} />
        <SummaryCard label="Total Dokumen" value={String(docs.length)} description="PO, SPK, Kontrak, CA" icon={<FileText size={18} />} />
        <SummaryCard label="Pending Nilai" value={formatCurrencyIDR(totalPending)} description="Belum terbayar" icon={<Clock size={18} />} />
        <SummaryCard label="Sudah Approved" value={formatCurrencyIDR(totalApproved)} description="Nilai terotorisasi" icon={<CheckCircle2 size={18} />} />
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: "20px", alignItems: "start" }}>

        <div className="panel" style={{ padding: "16px" }}>
          <div className="panel-kicker" style={{ marginBottom: "12px" }}>Pilih Project</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {activeProjects.map(p => {
              const pDocs = docs.filter(d => d.projectId === p.id);
              const pRfps = rfps.filter(r => r.projectId === p.id);
              const hasPending = pRfps.some(r => r.status !== "paid" && r.status !== "settled");
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedProjectId(p.id)}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "10px",
                    cursor: "pointer",
                    border: `2px solid ${selectedProjectId === p.id ? "var(--blue)" : "var(--line)"}`,
                    background: selectedProjectId === p.id ? "rgba(91,140,255,0.08)" : "transparent",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: "13px", marginBottom: "4px" }}>{p.projectName}</div>
                  <div className="mini-meta">{p.client}</div>
                  <div style={{ display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
                    {pDocs.length > 0 && <span className="chip" style={{ fontSize: "10px", padding: "2px 6px" }}>{pDocs.length} Dok</span>}
                    {pRfps.length > 0 && <span className="chip" style={{ fontSize: "10px", padding: "2px 6px" }}>{pRfps.length} RFP</span>}
                    {hasPending && <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#f59e0b", display: "inline-block", alignSelf: "center" }} title="Ada pending" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {selectedProject ? (
            <>
              <div className="panel" style={{ padding: "20px 24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div className="panel-kicker">{selectedProject.client}</div>
                    <h2 style={{ margin: "4px 0 8px", fontSize: "20px" }}>{selectedProject.projectName}</h2>
                    <span className="status-pill tone-blue">{selectedProject.currentStageLabel}</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="mini-meta">Nilai Project</div>
                    <div style={{ fontWeight: 700, fontSize: "18px" }}>{selectedProject.projectValueLabel}</div>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <FilterBar 
                  items={combinedItems} 
                  type="rfps" 
                  onFilter={handleFilter}
                  placeholder="Cari dalam project ini..."
                />
              </div>

              <div className="panel">
                <div className="panel-kicker">Dokumen Pengadaan</div>
                <div className="table-shell" style={{ marginTop: "12px" }}>
                  <div className="project-table">
                    <div className="table-row table-head" style={{ gridTemplateColumns: "1.8fr 1.2fr 0.8fr 1fr 1.4fr" }}>
                      <div>No. Dokumen</div>
                      <div>Vendor</div>
                      <div>Tipe</div>
                      <div>Nilai</div>
                      <div style={{ textAlign: "right" }}>Status & Aksi</div>
                    </div>
                    {filteredProjectDocs.length === 0 ? (
                      <div style={{ padding: "32px", textAlign: "center", color: "var(--muted-soft)", fontSize: "13px" }}>
                        Tidak ada dokumen yang sesuai filter.
                      </div>
                    ) : filteredProjectDocs.map(doc => {
                      const s = statusLabel[doc.status] ?? { text: doc.status, tone: "tone-amber" };
                      return (
                        <div key={doc.id} className="table-row" style={{ gridTemplateColumns: "1.8fr 1.2fr 0.8fr 1fr 1.4fr", alignItems: "center" }}>
                          <div>
                            <div style={{ fontFamily: "monospace", fontSize: "11px", fontWeight: 600 }}>{doc.id}</div>
                            <div className="mini-meta">{formatDateFullID(doc.issueDate)}</div>
                          </div>
                          <div style={{ fontSize: "13px" }}>{doc.vendorName}</div>
                          <div><span className="status-pill" style={{ background: "rgba(91,140,255,0.15)", color: "var(--blue)", fontSize: "10px" }}>{docTypeLabel[doc.documentType]}</span></div>
                          <div style={{ fontWeight: 600 }}>{formatCurrencyIDR(doc.amount)}</div>
                          <div style={{ textAlign: "right", display: "flex", gap: "8px", justifyContent: "flex-end", alignItems: "center" }}>
                            <span className={`status-pill ${s.tone}`} style={{ fontSize: "10px", display: 'flex', alignItems: 'center', gap: '4px' }}>
                              {s.icon && s.icon} {s.text}
                            </span>
                            {doc.rejectionReason && (
                                <div style={{ color: "#ef4444", fontSize: "10px", marginTop: "4px", fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <AlertCircle size={10} /> {doc.rejectionReason}
                                </div>
                            )}
                            {(doc.status === "approved" || doc.status === "paid") && (
                              <button
                                className="secondary-button"
                                style={{ padding: "3px 10px", fontSize: "11px", height: "auto", minHeight: "auto", display: 'flex', alignItems: 'center', gap: '6px' }}
                                onClick={() => window.open(`/finance/print/${doc.id}`, "_blank")}
                              >
                                <Printer size={10} /> View / Print
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="panel">
                <div className="panel-kicker">Request For Payment (RFP)</div>
                <div className="table-shell" style={{ marginTop: "12px" }}>
                  <div className="project-table">
                    <div className="table-row table-head" style={{ gridTemplateColumns: "1.2fr 1.5fr 0.8fr 1fr 1.4fr" }}>
                      <div>RFP ID</div>
                      <div>Payee</div>
                      <div>Metode</div>
                      <div>Nominal</div>
                      <div style={{ textAlign: "right" }}>Status & Aksi</div>
                    </div>
                    {filteredProjectRfps.length === 0 ? (
                      <div style={{ padding: "32px", textAlign: "center", color: "var(--muted-soft)", fontSize: "13px" }}>
                        Tidak ada RFP yang sesuai filter.
                      </div>
                    ) : filteredProjectRfps.map(rfp => {
                      const s = statusLabel[rfp.status] ?? { text: rfp.status.replace(/_/g, " ").toUpperCase(), tone: "tone-amber" };
                      return (
                        <div key={rfp.id} className="table-row" style={{ gridTemplateColumns: "1.2fr 1.5fr 0.8fr 1fr 1.4fr", alignItems: "center" }}>
                          <div style={{ fontFamily: "monospace", fontSize: "11px" }}>#{rfp.id.substring(0, 10)}</div>
                          <div>{rfp.payeeName}</div>
                          <div style={{ fontSize: "12px" }}>{rfp.paymentType}</div>
                          <div style={{ fontWeight: 600 }}>{formatCurrencyIDR(rfp.totalAmount)}</div>
                          <div style={{ textAlign: "right", display: "flex", gap: "8px", justifyContent: "flex-end", alignItems: "center" }}>
                            <span className={`status-pill ${s.tone}`} style={{ fontSize: "10px", display: 'flex', alignItems: 'center', gap: '4px' }}>
                              {s.icon && s.icon} {s.text}
                            </span>
                            {rfp.rejectionReason && (
                              <div style={{ color: "#ef4444", fontSize: "10px", marginTop: "4px", fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <AlertCircle size={10} /> {rfp.rejectionReason}
                              </div>
                            )}
                            {rfp.paymentProofUrl && (
                              <button 
                                className="secondary-button" 
                                style={{ padding: "3px 10px", fontSize: "11px", height: "auto", minHeight: "auto", borderColor: "var(--green)", color: "var(--green)", display: 'flex', alignItems: 'center', gap: '6px' }}
                                onClick={() => setViewProofUrl(rfp.paymentProofUrl!)}
                              >
                                <Eye size={10} /> Bukti
                              </button>
                            )}
                            {(rfp.status === "approved" || rfp.status === "paid") && (
                              <button
                                className="secondary-button"
                                style={{ padding: "3px 10px", fontSize: "11px", height: "auto", minHeight: "auto", display: 'flex', alignItems: 'center', gap: '6px' }}
                                onClick={() => window.open(`/finance/print/${rfp.id}`, "_blank")}
                              >
                                <FileDown size={10} /> Download RFP
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="panel" style={{ padding: "60px", textAlign: "center", color: "var(--muted-soft)" }}>
              Pilih project di sebelah kiri untuk melihat status dokumen.
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
    </WorkspaceShell>
  );
}
