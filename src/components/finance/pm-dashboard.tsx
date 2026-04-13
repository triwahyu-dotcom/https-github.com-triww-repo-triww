"use client";

import { useState } from "react";
import { FinanceDashboardData, ExpenseDocument, RequestForPayment } from "@/lib/finance/types";
import { ProjectRecord } from "@/lib/project/types";
import { WorkspaceShell } from "../layout/workspace-shell";
import { SummaryCard } from "../ui/summary-card";
import { formatCurrencyIDR, formatDateFullID } from "@/lib/utils/format";

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

const statusLabel: Record<string, { text: string; tone: string }> = {
  draft:      { text: "Draft",       tone: "tone-amber" },
  submitted:  { text: "Submitted",   tone: "tone-amber" },
  approved:   { text: "Approved ✓",  tone: "tone-blue" },
  paid:       { text: "Paid",        tone: "tone-green" },
  settled:    { text: "Settled",     tone: "tone-green" },
  pending_c_level: { text: "Pending Director", tone: "tone-amber" },
  pending_finance: { text: "Pending Finance",  tone: "tone-amber" },
};

export function PMDashboard({ initialData, activeProjects }: Props) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    activeProjects[0]?.id ?? null
  );

  const docs = initialData.expenseDocuments || [];
  const rfps = initialData.rfps || [];

  const selectedProject = activeProjects.find(p => p.id === selectedProjectId);
  const projectDocs = docs.filter(d => d.projectId === selectedProjectId);
  const projectRfps = rfps.filter(r => r.projectId === selectedProjectId);

  const totalApproved = rfps.filter(r => r.status === "approved" || r.status === "paid" || r.status === "settled").reduce((s, r) => s + r.totalAmount, 0);
  const totalPending = rfps.filter(r => r.status !== "paid" && r.status !== "settled").reduce((s, r) => s + r.totalAmount, 0);

  const headerActions = (
    <div className="workspace-actions">
      <button className="secondary-button" onClick={() => window.print()}>
        Export Report
      </button>
    </div>
  );

  return (
    <WorkspaceShell
      title="Project Monitor"
      eyebrow="PM Workspace (Read-Only)"
      actions={headerActions}
    >
      {/* Summary */}
      <section className="summary-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: "24px" }}>
        <SummaryCard label="My Projects" value={String(activeProjects.length)} description="Active executions" icon="📂" />
        <SummaryCard label="Total Dokumen" value={String(docs.length)} description="PO, SPK, Kontrak, CA" icon="📄" />
        <SummaryCard label="Pending Nilai" value={formatCurrencyIDR(totalPending)} description="Belum terbayar" icon="⏳" />
        <SummaryCard label="Sudah Approved" value={formatCurrencyIDR(totalApproved)} description="Nilai terotorisasi" icon="✅" />
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: "20px", alignItems: "start" }}>

        {/* Left: Project selector */}
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

        {/* Right: Project detail */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {selectedProject ? (
            <>
              {/* Project info header */}
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

              {/* Documents for this project */}
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
                    {projectDocs.length === 0 ? (
                      <div style={{ padding: "32px", textAlign: "center", color: "var(--muted-soft)", fontSize: "13px" }}>
                        Belum ada dokumen untuk project ini.
                      </div>
                    ) : projectDocs.map(doc => {
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
                            <span className={`status-pill ${s.tone}`} style={{ fontSize: "10px" }}>{s.text}</span>
                            {(doc.status === "approved" || doc.status === "paid") && (
                              <button
                                className="secondary-button"
                                style={{ padding: "3px 10px", fontSize: "11px", height: "auto", minHeight: "auto" }}
                                onClick={() => window.open(`/finance/print/${doc.id}`, "_blank")}
                              >
                                View / Print
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* RFPs for this project */}
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
                    {projectRfps.length === 0 ? (
                      <div style={{ padding: "32px", textAlign: "center", color: "var(--muted-soft)", fontSize: "13px" }}>
                        Belum ada RFP untuk project ini.
                      </div>
                    ) : projectRfps.map(rfp => {
                      const s = statusLabel[rfp.status] ?? { text: rfp.status.replace(/_/g, " ").toUpperCase(), tone: "tone-amber" };
                      return (
                        <div key={rfp.id} className="table-row" style={{ gridTemplateColumns: "1.2fr 1.5fr 0.8fr 1fr 1.4fr", alignItems: "center" }}>
                          <div style={{ fontFamily: "monospace", fontSize: "11px" }}>#{rfp.id.substring(0, 10)}</div>
                          <div>{rfp.payeeName}</div>
                          <div style={{ fontSize: "12px" }}>{rfp.paymentType}</div>
                          <div style={{ fontWeight: 600 }}>{formatCurrencyIDR(rfp.totalAmount)}</div>
                          <div style={{ textAlign: "right", display: "flex", gap: "8px", justifyContent: "flex-end", alignItems: "center" }}>
                            <span className={`status-pill ${s.tone}`} style={{ fontSize: "10px" }}>{s.text}</span>
                            {(rfp.status === "approved" || rfp.status === "paid") && (
                              <button
                                className="secondary-button"
                                style={{ padding: "3px 10px", fontSize: "11px", height: "auto", minHeight: "auto" }}
                                onClick={() => window.open(`/finance/print/${rfp.id}`, "_blank")}
                              >
                                Download RFP
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
    </WorkspaceShell>
  );
}
