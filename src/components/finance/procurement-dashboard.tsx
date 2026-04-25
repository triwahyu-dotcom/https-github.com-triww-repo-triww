"use client";

import { useState, useMemo, useCallback } from "react";
import { FinanceDashboardData, RequestForPayment, ExpenseDocument } from "@/lib/finance/types";
import { ProjectRecord } from "@/lib/project/types";
import { WorkspaceShell } from "../layout/workspace-shell";
import { SummaryCard } from "../ui/summary-card";
import { formatCurrencyIDR, formatDateFullID } from "@/lib/utils/format";

import { 
  ClipboardList, 
  Clock, 
  CheckCircle2, 
  Wallet, 
  FileText, 
  CreditCard, 
  AlertTriangle, 
  Eye, 
  Undo2,
  Plus,
  Printer,
  Edit
} from "lucide-react";

import { POCreatorModal } from "./po-creator-modal";
import { CashAdvanceModal } from "./cash-advance-modal";
import { RfpFromDocModal } from "./rfp-from-doc-modal";

import { FilterBar } from "./filter-bar";
import { updateDocStatus, updateRFPStatus } from "@/lib/finance/actions";

interface Props {
  initialData: FinanceDashboardData;
  activeProjects: ProjectRecord[];
  availableVendors?: any[];
  availableFreelancers?: any[];
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
  settlement_pending: "tone-amber",
  settled: "tone-green",
};

const statusLabels: Record<string, string> = {
  draft: "DRAFT",
  pending_finance: "PENDING FINANCE",
  pending_c_level: "PENDING C-LEVEL",
  approved: "APPROVED",
  paid: "PAID",
  settlement_pending: "PENDING SETTLEMENT",
  settled: "SETTLED",
};

export function ProcurementDashboard({ initialData, activeProjects, availableVendors = [], availableFreelancers = [] }: Props) {
  const [activeTab, setActiveTab] = useState<"docs" | "rfps">("docs");
  const [showPOModal, setShowPOModal] = useState(false);
  const [showCAModal, setShowCAModal] = useState(false);
  const [selectedDocForRFP, setSelectedDocForRFP] = useState<ExpenseDocument | null>(null);

  const [viewProofUrl, setViewProofUrl] = useState<string | null>(null);

  const [editDocData, setEditDocData] = useState<ExpenseDocument | null>(null);
  const [editRfpData, setEditRfpData] = useState<RequestForPayment | null>(null);

  const reload = () => window.location.reload();

  // Docs and RFPs from initialData
  const docs = useMemo(() => initialData.expenseDocuments || [], [initialData.expenseDocuments]);
  const rfps = useMemo(() => initialData.rfps || [], [initialData.rfps]);

  const [filteredDocs, setFilteredDocs] = useState<ExpenseDocument[]>([]);
  const [filteredRfps, setFilteredRfps] = useState<RequestForPayment[]>([]);

  const pendingApprovalDocs = useMemo(() => docs.filter(d => d.status === "draft" || d.status === "pending_finance" || d.status === "pending_c_level"), [docs]);

  // A doc is ready for RFP if it's approved and its total rfps amount < doc amount
  const getDocRfps = useCallback((docId: string) => rfps.filter(r => r.documentIds.includes(docId)), [rfps]);
  const getDocTotalRfpAmount = useCallback((docId: string) => getDocRfps(docId).reduce((s, r) => s + r.totalAmount, 0), [getDocRfps]);

  const readyForRfpDocs = useMemo(() => docs.filter(d => {
    if (d.status !== "approved" && d.status !== "pending_finance" && d.status !== "pending_c_level") return false;
    const totalPaid = getDocTotalRfpAmount(d.id);
    return totalPaid < d.amount - 100; // Tolerance for rounding
  }), [docs, getDocTotalRfpAmount]);

  const totalDocValue = useMemo(() => docs.reduce((s, d) => s + d.amount, 0), [docs]);

  const handleFilterDocs = useCallback((items: ExpenseDocument[]) => {
    setFilteredDocs(items);
  }, []);

  const handleFilterRfps = useCallback((items: RequestForPayment[]) => {
    setFilteredRfps(items);
  }, []);

  const headerActions = (
    <div className="workspace-actions" style={{ display: "flex", gap: "10px" }}>
      <button className="secondary-button" onClick={() => setShowCAModal(true)} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <Plus size={16} /> Cash Advance
      </button>
      <button className="primary-button" onClick={() => setShowPOModal(true)} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <Plus size={16} /> New PO / SPK / Kontrak
      </button>
    </div>
  );

  return (
    <WorkspaceShell
      title="Procurement Cockpit"
      eyebrow="Procurement Workspace"
      actions={headerActions}
    >
      {/* Summary Cards */}
      <section className="summary-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: "24px" }}>
        <SummaryCard label="Total Dokumen" value={String(docs.length)} description="PO, SPK, Kontrak, CA" icon={<ClipboardList size={18} />} />
        <SummaryCard label="Menunggu Approve" value={String(pendingApprovalDocs.length)} description="Belum ditandatangani Director" icon={<Clock size={18} />} />
        <SummaryCard label="Siap Buat RFP" value={String(readyForRfpDocs.length)} description="Submitted/Approved, belum ada RFP" icon={<CheckCircle2 size={18} />} />
        <SummaryCard label="Total Nilai Dokumen" value={formatCurrencyIDR(totalDocValue)} description="Semua dokumen aktif" icon={<Wallet size={18} />} />
      </section>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "2px", marginBottom: "16px", background: "var(--panel-soft)", padding: "3px", borderRadius: "8px", width: "fit-content", border: "1px solid var(--line)" }}>
        <button onClick={() => setActiveTab("docs")} style={{ padding: "6px 16px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "12px", background: activeTab === "docs" ? "var(--panel)" : "transparent", color: activeTab === "docs" ? "var(--text)" : "var(--muted)", display: "flex", alignItems: "center", gap: "8px" }}>
          <FileText size={16} /> Dokumen Pengadaan ({docs.length})
        </button>
        <button onClick={() => setActiveTab("rfps")} style={{ padding: "8px 20px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "13px", background: activeTab === "rfps" ? "var(--panel)" : "transparent", color: activeTab === "rfps" ? "var(--text)" : "var(--muted)", boxShadow: activeTab === "rfps" ? "0 1px 3px rgba(0,0,0,0.2)" : "none", display: "flex", alignItems: "center", gap: "8px" }}>
          <CreditCard size={16} /> RFP Tracking ({rfps.length})
        </button>
      </div>

      {/* Tab: Dokumen */}
      {activeTab === "docs" && (
        <div className="panel">
          <div className="panel-kicker">Semua Dokumen Pengadaan</div>
            <div style={{ margin: "10px 0", padding: "10px 14px", background: "rgba(99,102,241,0.05)", border: "1px solid var(--line-strong)", borderRadius: "6px", fontSize: "12px", color: "var(--blue)", display: "flex", alignItems: "center", gap: "8px" }}>
              <Clock size={14} /> <span>{pendingApprovalDocs.length} dokumen menunggu approval dari Director</span>
            </div>
          <FilterBar items={docs} type="docs" onFilter={handleFilterDocs} />

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
              {filteredDocs.length === 0 ? (
                <div style={{ padding: "60px", textAlign: "center", color: "var(--muted-soft)" }}>
                  <div style={{ display: "grid", placeItems: "center", marginBottom: "12px", opacity: 0.2 }}>
                    <FileText size={48} />
                  </div>
                  Tidak ada dokumen yang sesuai dengan filter.
                </div>
              ) : filteredDocs.map(doc => (
                <div key={doc.id} className="table-row" style={{ gridTemplateColumns: "1.8fr 1.5fr 1.2fr 1fr 1fr 1.4fr", alignItems: "center" }}>
                  <div>
                    <div style={{ fontFamily: "monospace", fontSize: "12px", fontWeight: 600 }}>{doc.id}</div>
                    <div className="mini-meta">{formatDateFullID(doc.issueDate)}</div>
                  </div>
                  <div>{doc.vendorName}</div>
                  <div style={{ fontSize: "12px" }}>{doc.projectName}</div>
                  <div>
                    <span className="status-pill" style={{ background: "rgba(99,102,241,0.1)", color: "var(--blue)" }}>{docTypeLabel[doc.documentType]}</span>
                  </div>
                  <div style={{ fontWeight: 700 }}>{formatCurrencyIDR(doc.amount)}</div>
                  <div style={{ textAlign: "right", display: "flex", gap: "8px", justifyContent: "flex-end", flexWrap: "wrap" }}>
                    <span className={`status-pill ${statusColors[doc.status] || "tone-amber"}`}>
                      {statusLabels[doc.status] || doc.status.toUpperCase()}
                    </span>
                      <div style={{ color: "#ef4444", fontSize: "10px", marginTop: "4px", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px", justifyContent: "flex-end" }}>
                        <AlertTriangle size={10} /> {doc.rejectionReason}
                      </div>
                    {doc.status === "draft" && (
                      <button
                        onClick={() => {
                          if (doc.documentType === "CASH_ADVANCE") setEditDocData(doc);
                          else setEditDocData(doc);
                          // Actually editDocData works for both, but we need to know which modal to open
                        }}
                        className="secondary-button"
                        style={{ fontSize: "10px", height: "24px", padding: "0 8px", borderColor: "var(--amber)", color: "var(--amber)" }}
                      >
                        <Edit size={12} /> Edit & Fix
                      </button>
                    )}
                    {(doc.status === "pending_finance" || doc.status === "pending_c_level") && (
                      <button
                        onClick={async () => {
                          if (confirm("Tarik kembali dokumen ini untuk diperbaiki?")) {
                            await updateDocStatus(doc.id, "draft");
                            reload();
                          }
                        }}
                        className="secondary-button"
                        style={{ fontSize: "10px", height: "24px", padding: "0 8px" }}
                      >
                        <Undo2 size={12} /> Tarik
                      </button>
                    )}
                    {(doc.status === "approved" || doc.status === "pending_finance" || doc.status === "pending_c_level") && (() => {
                      const docRfps = getDocRfps(doc.id);
                      const totalPaid = docRfps.reduce((s, r) => s + r.totalAmount, 0);
                      const isFullyRequested = totalPaid >= doc.amount - 100;

                      return (
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          {docRfps.length > 0 && (
                            <span className="mini-meta" style={{ color: isFullyRequested ? "var(--green)" : "var(--blue)", display: "flex", alignItems: "center", gap: "4px" }}>
                              {isFullyRequested ? <><CheckCircle2 size={12} /> Lunas</> : <><FileText size={12} /> {docRfps.length} RFP Dibuat</>}
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
                      style={{ padding: "4px 10px", fontSize: "11px", height: "auto", minHeight: "auto", display: "flex", alignItems: "center", gap: "4px" }}
                      onClick={() => window.open(`/finance/print/${doc.id}`, "_blank")}
                    >
                      <Printer size={12} /> Print
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
          <FilterBar items={rfps} type="rfps" onFilter={handleFilterRfps} />

          <div className="table-shell" style={{ marginTop: "16px" }}>
            <div className="project-table" style={{ minWidth: "900px" }}>
              <div className="table-row table-head" style={{ gridTemplateColumns: "1.2fr 1.5fr 1.5fr 1fr 1.6fr" }}>
                <div>RFP ID</div>
                <div>Payee / Vendor</div>
                <div>Project</div>
                <div>Nominal</div>
                <div style={{ textAlign: "right" }}>Status & Aksi</div>
              </div>
              {filteredRfps.length === 0 ? (
                <div style={{ padding: "60px", textAlign: "center", color: "var(--muted-soft)" }}>
                  <div style={{ display: "grid", placeItems: "center", marginBottom: "12px", opacity: 0.2 }}>
                    <CreditCard size={48} />
                  </div>
                  Tidak ada RFP yang sesuai dengan filter.
                </div>
              ) : filteredRfps.map(rfp => (
                <div key={rfp.id} className="table-row" style={{ gridTemplateColumns: "1.2fr 1.5fr 1.5fr 1fr 1.6fr", alignItems: "center" }}>
                  <div style={{ fontFamily: "monospace", fontSize: "12px" }}>#{rfp.id.substring(0, 10)}</div>
                  <div>
                    <div>{rfp.payeeName}</div>
                    <div className="mini-meta">{rfp.paymentType}</div>
                  </div>
                  <div style={{ fontSize: "12px" }}>{rfp.projectName}</div>
                  <div style={{ fontWeight: 700 }}>{formatCurrencyIDR(rfp.totalAmount)}</div>
                  <div style={{ textAlign: "right", display: "flex", gap: "8px", justifyContent: "flex-end", flexWrap: "wrap", alignItems: "center" }}>
                    <span className={`status-pill ${rfp.status === "settled" || rfp.status === "paid" ? "tone-green" :
                        rfp.status === "approved" ? "tone-blue" : "tone-amber"
                      }`}>
                      {statusLabels[rfp.status] || rfp.status.replace(/_/g, " ").toUpperCase()}
                    </span>
                      <div style={{ color: "#ef4444", fontSize: "10px", marginTop: "4px", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px", justifyContent: "flex-end" }}>
                        <AlertTriangle size={10} /> {rfp.rejectionReason}
                      </div>
                    {rfp.status === "draft" && (
                      <button
                        onClick={() => setEditRfpData(rfp)}
                        className="secondary-button"
                        style={{ fontSize: "10px", height: "24px", padding: "0 8px", borderColor: "var(--amber)", color: "var(--amber)" }}
                      >
                        <Edit size={12} /> Edit & Fix
                      </button>
                    )}
                    {(rfp.status === "pending_c_level" || rfp.status === "pending_finance") && (
                      <button
                        onClick={async () => {
                          if (confirm("Tarik kembali RFP ini untuk diperbaiki?")) {
                            await updateRFPStatus(rfp.id, "draft");
                            reload();
                          }
                        }}
                        className="secondary-button"
                        style={{ fontSize: "10px", height: "24px", padding: "0 8px" }}
                      >
                        <Undo2 size={12} /> Tarik
                      </button>
                    )}
                    {rfp.paymentProofUrl && (
                      <button
                        className="secondary-button"
                        style={{ padding: "4px 10px", fontSize: "11px", height: "auto", minHeight: "auto", borderColor: "var(--green)", color: "var(--green)" }}
                        onClick={() => setViewProofUrl(rfp.paymentProofUrl!)}
                      >
                        <Eye size={12} /> Bukti
                      </button>
                    )}

                    <button className="secondary-button" style={{ padding: "4px 10px", fontSize: "11px", height: "auto", minHeight: "auto", display: "flex", alignItems: "center", gap: "4px" }} onClick={() => window.open(`/finance/print/${rfp.id}`, "_blank")}>
                      <Printer size={12} /> Print
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {(showPOModal || (editDocData && editDocData.documentType !== "CASH_ADVANCE")) && (
        <POCreatorModal
          activeProjects={activeProjects}
          availableVendors={availableVendors}
          availableFreelancers={availableFreelancers}
          editDoc={editDocData && editDocData.documentType !== "CASH_ADVANCE" ? editDocData : undefined}
          onClose={() => { setShowPOModal(false); setEditDocData(null); }}
          onSuccess={() => { setShowPOModal(false); setEditDocData(null); reload(); }}
        />
      )}
      {(showCAModal || (editDocData && editDocData.documentType === "CASH_ADVANCE")) && (
        <CashAdvanceModal
          activeProjects={activeProjects}
          availableVendors={availableVendors}
          editDoc={editDocData && editDocData.documentType === "CASH_ADVANCE" ? editDocData : undefined}
          onClose={() => { setShowCAModal(false); setEditDocData(null); }}
          onSuccess={() => { setShowCAModal(false); setEditDocData(null); reload(); }}
        />
      )}
      {(selectedDocForRFP || editRfpData) && (
        <RfpFromDocModal
          doc={selectedDocForRFP || docs.find(d => d.id === editRfpData?.documentIds[0])!}
          editRfp={editRfpData || undefined}
          allRfps={rfps}
          availableVendors={availableVendors}
          onClose={() => { setSelectedDocForRFP(null); setEditRfpData(null); }}
          onSuccess={() => { setSelectedDocForRFP(null); setEditRfpData(null); reload(); }}
        />
      )}


      {/* Proof Lightbox */}
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
