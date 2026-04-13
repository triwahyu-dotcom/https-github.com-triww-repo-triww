"use client";

import { useState } from "react";
import { FinanceDashboardData, RequestForPayment, ExpenseDocument } from "@/lib/finance/types";
import { ProjectRecord } from "@/lib/project/types";
import { WorkspaceShell } from "../layout/workspace-shell";
import { SummaryCard } from "../ui/summary-card";
import { formatCurrencyIDR, formatDateFullID } from "@/lib/utils/format";

import { POCreatorModal } from "./po-creator-modal";
import { CashAdvanceModal } from "./cash-advance-modal";
import { RfpFromDocModal } from "./rfp-from-doc-modal";
import { SettlementModal } from "./settlement-modal";

interface Props {
  initialData: FinanceDashboardData;
  activeProjects: ProjectRecord[];
  availableVendors?: any[];
}

const docTypeLabel: Record<string, string> = {
  PO: "PO",
  SPK: "SPK",
  KONTRAK: "Kontrak",
  CASH_ADVANCE: "Cash Advance",
};

const statusColors: Record<string, string> = {
  draft: "tone-amber",
  submitted: "tone-amber",
  approved: "tone-blue",
  paid: "tone-green",
  settled: "tone-green",
};

export function PurchasingDashboard({ initialData, activeProjects, availableVendors = [] }: Props) {
  const [activeTab, setActiveTab] = useState<"docs" | "rfps">("docs");
  const [showPOModal, setShowPOModal] = useState(false);
  const [showCAModal, setShowCAModal] = useState(false);
  const [selectedDocForRFP, setSelectedDocForRFP] = useState<ExpenseDocument | null>(null);
  const [selectedRfpForSettlement, setSelectedRfpForSettlement] = useState<RequestForPayment | null>(null);

  const reload = () => window.location.reload();

  // Docs that are approved and don't yet have an RFP
  const docs = initialData.expenseDocuments || [];
  const rfps = initialData.rfps || [];

  const pendingApprovalDocs = docs.filter(d => d.status === "draft" || d.status === "submitted");
  
  // A doc is ready for RFP if it's approved and its total rfps amount < doc amount
  const getDocRfps = (docId: string) => rfps.filter(r => r.documentIds.includes(docId));
  const getDocTotalRfpAmount = (docId: string) => getDocRfps(docId).reduce((s, r) => s + r.totalAmount, 0);

  const approvedDocs = docs.filter(d => {
    if (d.status !== "approved") return false;
    const totalPaid = getDocTotalRfpAmount(d.id);
    return totalPaid < d.amount - 100; // Tolerance for rounding
  });
  const totalDocValue = docs.reduce((s, d) => s + d.amount, 0);

  const headerActions = (
    <div className="workspace-actions" style={{ display: "flex", gap: "10px" }}>
      <button className="secondary-button" onClick={() => setShowCAModal(true)}>+ Cash Advance</button>
      <button className="primary-button" onClick={() => setShowPOModal(true)}>+ New PO / SPK / Kontrak</button>
    </div>
  );

  return (
    <WorkspaceShell
      title="Procurement Cockpit"
      eyebrow="Purchasing Workspace"
      actions={headerActions}
    >
      {/* Summary Cards */}
      <section className="summary-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: "24px" }}>
        <SummaryCard label="Total Dokumen" value={String(docs.length)} description="PO, SPK, Kontrak, CA" icon="📋" />
        <SummaryCard label="Menunggu Approve" value={String(pendingApprovalDocs.length)} description="Belum ditandatangani Director" icon="⏳" />
        <SummaryCard label="Siap Buat RFP" value={String(approvedDocs.length)} description="Approved, belum ada RFP" icon="✅" />
        <SummaryCard label="Total Nilai Dokumen" value={formatCurrencyIDR(totalDocValue)} description="Semua dokumen aktif" icon="💰" />
      </section>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "20px", background: "var(--panel-soft)", padding: "4px", borderRadius: "10px", width: "fit-content" }}>
        <button onClick={() => setActiveTab("docs")} style={{ padding: "8px 20px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "13px", background: activeTab === "docs" ? "var(--panel)" : "transparent", color: activeTab === "docs" ? "var(--text)" : "var(--muted)", boxShadow: activeTab === "docs" ? "0 1px 3px rgba(0,0,0,0.2)" : "none" }}>
          📄 Dokumen Pengadaan ({docs.length})
        </button>
        <button onClick={() => setActiveTab("rfps")} style={{ padding: "8px 20px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "13px", background: activeTab === "rfps" ? "var(--panel)" : "transparent", color: activeTab === "rfps" ? "var(--text)" : "var(--muted)", boxShadow: activeTab === "rfps" ? "0 1px 3px rgba(0,0,0,0.2)" : "none" }}>
          💳 RFP Tracking ({rfps.length})
        </button>
      </div>

      {/* Tab: Dokumen */}
      {activeTab === "docs" && (
        <div className="panel">
          <div className="panel-kicker">Semua Dokumen Pengadaan</div>
          {pendingApprovalDocs.length > 0 && (
            <div style={{ margin: "12px 0", padding: "12px 16px", background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.2)", borderRadius: "8px", fontSize: "13px", color: "#ca8a04" }}>
              ⏳ {pendingApprovalDocs.length} dokumen menunggu approval dari Director
            </div>
          )}
          <div className="table-shell" style={{ marginTop: "16px" }}>
            <div className="project-table" style={{ minWidth: "900px" }}>
              <div className="table-row table-head" style={{ gridTemplateColumns: "1.8fr 1.5fr 1.2fr 1fr 1fr 1.4fr" }}>
                <div>Nomor Dokumen</div>
                <div>Vendor / Pemohon</div>
                <div>Project</div>
                <div>Tipe</div>
                <div>Nilai</div>
                <div style={{ textAlign: "right" }}>Status & Aksi</div>
              </div>
              {docs.length === 0 ? (
                <div style={{ padding: "60px", textAlign: "center", color: "var(--muted-soft)" }}>
                  <div style={{ fontSize: "24px", marginBottom: "12px" }}>📄</div>
                  Belum ada dokumen. Klik "+ New PO / SPK / Kontrak" untuk mulai.
                </div>
              ) : docs.map(doc => (
                <div key={doc.id} className="table-row" style={{ gridTemplateColumns: "1.8fr 1.5fr 1.2fr 1fr 1fr 1.4fr", alignItems: "center" }}>
                  <div>
                    <div style={{ fontFamily: "monospace", fontSize: "12px", fontWeight: 600 }}>{doc.id}</div>
                    <div className="mini-meta">{formatDateFullID(doc.issueDate)}</div>
                  </div>
                  <div>{doc.vendorName}</div>
                  <div style={{ fontSize: "12px" }}>{doc.projectName}</div>
                  <div>
                    <span className="status-pill" style={{ background: "rgba(91,140,255,0.15)", color: "var(--blue)" }}>{docTypeLabel[doc.documentType]}</span>
                  </div>
                  <div style={{ fontWeight: 700 }}>{formatCurrencyIDR(doc.amount)}</div>
                  <div style={{ textAlign: "right", display: "flex", gap: "8px", justifyContent: "flex-end", flexWrap: "wrap" }}>
                    <span className={`status-pill ${statusColors[doc.status] || "tone-amber"}`}>
                      {doc.status.toUpperCase()}
                    </span>
                    {doc.status === "approved" && (() => {
                      const docRfps = getDocRfps(doc.id);
                      const totalPaid = docRfps.reduce((s, r) => s + r.totalAmount, 0);
                      const isFullyRequested = totalPaid >= doc.amount - 100;
                      
                      return (
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          {docRfps.length > 0 && (
                            <span className="mini-meta" style={{ color: isFullyRequested ? "var(--green)" : "var(--blue)" }}>
                              {isFullyRequested ? "✓ Lunas" : `${docRfps.length} RFP Dibuat`}
                            </span>
                          )}
                          {!isFullyRequested && (
                            <button
                              className="primary-button"
                              style={{ padding: "4px 12px", fontSize: "11px", height: "auto", minHeight: "auto" }}
                              onClick={() => setSelectedDocForRFP(doc)}
                            >
                              Buat RFP {docRfps.length > 0 ? "Berikutnya" : ""}
                            </button>
                          )}
                        </div>
                      );
                    })()}
                    <button
                      className="secondary-button"
                      style={{ padding: "4px 10px", fontSize: "11px", height: "auto", minHeight: "auto" }}
                      onClick={() => window.open(`/finance/print/${doc.id}`, "_blank")}
                    >
                      Print
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: RFP Tracking */}
      {activeTab === "rfps" && (
        <div className="panel">
          <div className="panel-kicker">Request For Payment — Tracking</div>
          <div className="table-shell" style={{ marginTop: "16px" }}>
            <div className="project-table" style={{ minWidth: "900px" }}>
              <div className="table-row table-head" style={{ gridTemplateColumns: "1.2fr 1.5fr 1.5fr 1fr 1.6fr" }}>
                <div>RFP ID</div>
                <div>Payee / Vendor</div>
                <div>Project</div>
                <div>Nominal</div>
                <div style={{ textAlign: "right" }}>Status & Aksi</div>
              </div>
              {rfps.length === 0 ? (
                <div style={{ padding: "60px", textAlign: "center", color: "var(--muted-soft)" }}>
                  <div style={{ fontSize: "24px", marginBottom: "12px" }}>💳</div>
                  Belum ada RFP. Approve dokumen terlebih dahulu, lalu klik "Buat RFP".
                </div>
              ) : rfps.map(rfp => (
                <div key={rfp.id} className="table-row" style={{ gridTemplateColumns: "1.2fr 1.5fr 1.5fr 1fr 1.6fr", alignItems: "center" }}>
                  <div style={{ fontFamily: "monospace", fontSize: "12px" }}>#{rfp.id.substring(0, 10)}</div>
                  <div>
                    <div>{rfp.payeeName}</div>
                    <div className="mini-meta">{rfp.paymentType}</div>
                  </div>
                  <div style={{ fontSize: "12px" }}>{rfp.projectName}</div>
                  <div style={{ fontWeight: 700 }}>{formatCurrencyIDR(rfp.totalAmount)}</div>
                  <div style={{ textAlign: "right", display: "flex", gap: "8px", justifyContent: "flex-end", flexWrap: "wrap", alignItems: "center" }}>
                    <span className={`status-pill ${
                      rfp.status === "settled" || rfp.status === "paid" ? "tone-green" :
                      rfp.status === "approved" ? "tone-blue" : "tone-amber"
                    }`}>
                      {rfp.status.replace(/_/g, " ").toUpperCase()}
                    </span>
                    {rfp.status === "paid" && rfp.paymentType === "Cash" && (
                      <button className="primary-button" style={{ padding: "4px 12px", fontSize: "11px", height: "auto", minHeight: "auto" }} onClick={() => setSelectedRfpForSettlement(rfp)}>
                        Settle
                      </button>
                    )}
                    <button className="secondary-button" style={{ padding: "4px 10px", fontSize: "11px", height: "auto", minHeight: "auto" }} onClick={() => window.open(`/finance/print/${rfp.id}`, "_blank")}>
                      Print
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showPOModal && (
        <POCreatorModal
          activeProjects={activeProjects}
          availableVendors={availableVendors}
          onClose={() => setShowPOModal(false)}
          onSuccess={() => { setShowPOModal(false); reload(); }}
        />
      )}
      {showCAModal && (
        <CashAdvanceModal
          activeProjects={activeProjects}
          availableVendors={availableVendors}
          onClose={() => setShowCAModal(false)}
          onSuccess={() => { setShowCAModal(false); reload(); }}
        />
      )}
      {selectedDocForRFP && (
        <RfpFromDocModal
          doc={selectedDocForRFP}
          allRfps={rfps}
          availableVendors={availableVendors}
          onClose={() => setSelectedDocForRFP(null)}
          onSuccess={() => { setSelectedDocForRFP(null); reload(); }}
        />
      )}
      {selectedRfpForSettlement && (
        <SettlementModal
          rfp={selectedRfpForSettlement}
          isOpen={true}
          onClose={() => setSelectedRfpForSettlement(null)}
        />
      )}
    </WorkspaceShell>
  );
}
