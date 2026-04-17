"use client";

import { useState, useMemo, useCallback } from "react";
import { FinanceDashboardData, RequestForPayment, ExpenseDocument } from "@/lib/finance/types";
import { WorkspaceShell } from "../layout/workspace-shell";
import { SummaryCard } from "../ui/summary-card";
import { formatCurrencyIDR, formatDateFullID } from "@/lib/utils/format";
import { updateRFPStatus, updateDocStatus } from "@/lib/finance/actions";
import { FilterBar } from "./filter-bar";
import { RejectionModal } from "./rejection-modal";

interface Props {
  initialData: FinanceDashboardData;
}

const docTypeLabel: Record<string, string> = {
  PO: "Purchase Order",
  SPK: "Surat Perintah Kerja",
  KONTRAK: "Surat Perjanjian Kontrak",
  CASH_ADVANCE: "Cash Advance",
};

export function DirectorApprovals({ initialData }: Props) {
  const [activeTab, setActiveTab] = useState<"docs" | "rfps" | "history">("docs");
  const [viewProofUrl, setViewProofUrl] = useState<string | null>(null);

  // PO/Doc approval state
  const [selectedDoc, setSelectedDoc] = useState<ExpenseDocument | null>(null);
  const [isDocReviewOpen, setIsDocReviewOpen] = useState(false);
  const [isSigningDoc, setIsSigningDoc] = useState(false);

  // RFP approval state
  const [selectedRfp, setSelectedRfp] = useState<RequestForPayment | null>(null);
  const [isRfpReviewOpen, setIsRfpReviewOpen] = useState(false);
  const [isSigningRfp, setIsSigningRfp] = useState(false);

  const [rejectionTarget, setRejectionTarget] = useState<{ id: string; type: "DOC" | "RFP" } | null>(null);

  const pendingDocs = useMemo(() => (initialData.expenseDocuments || []).filter(d => d.status === "pending_c_level"), [initialData.expenseDocuments]);
  const pendingRfps = useMemo(() => (initialData.rfps || []).filter(r => r.status === "pending_c_level"), [initialData.rfps]);
  const historyDocs = useMemo(() => (initialData.expenseDocuments || []).filter(d => d.status === "approved" || d.status === "paid"), [initialData.expenseDocuments]);
  const historyRfps = useMemo(() => (initialData.rfps || []).filter(r => ["approved", "paid", "settled"].includes(r.status)), [initialData.rfps]);

  const [filteredDocs, setFilteredDocs] = useState<ExpenseDocument[]>([]);
  const [filteredRfps, setFilteredRfps] = useState<RequestForPayment[]>([]);

  const handleFilterDocs = useCallback((items: ExpenseDocument[]) => {
    setFilteredDocs(items);
  }, []);

  const handleFilterRfps = useCallback((items: RequestForPayment[]) => {
    setFilteredRfps(items);
  }, []);

  const handleApproveDoc = async () => {
    if (!selectedDoc) return;
    setIsSigningDoc(true);
    const sigId = `SIG-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    await updateDocStatus(selectedDoc.id, "approved", { digitalSignature: sigId });
    setIsSigningDoc(false);
  };

  const handleRejectDoc = async () => {
    if (!selectedDoc) return;
    setRejectionTarget({ id: selectedDoc.id, type: "DOC" });
  };

  const handleApproveRfp = async () => {
    if (!selectedRfp) return;
    setIsSigningRfp(true);
    const sigId = `SIG-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const signerName = "Managing Director";
    await updateRFPStatus(selectedRfp.id, "approved", { 
      digitalSignature: sigId,
      cLevelApprovedBy: {
        name: signerName,
        date: new Date().toISOString(),
        signature: sigId
      }
    });
    setIsSigningRfp(false);
    setIsRfpReviewOpen(false);
    window.location.reload();
  };

  const handleRejectRfp = async () => {
    if (!selectedRfp) return;
    setRejectionTarget({ id: selectedRfp.id, type: "RFP" });
  };

  const confirmRejection = async (reason: string) => {
    if (!rejectionTarget) return;
    const { id, type } = rejectionTarget;
    if (type === "DOC") {
      await updateDocStatus(id, "draft", { rejectionReason: reason });
    } else {
      await updateRFPStatus(id, "draft", { rejectionReason: reason });
    }
    setRejectionTarget(null);
    setIsDocReviewOpen(false);
    setIsRfpReviewOpen(false);
    window.location.reload();
  };
  const SignaturePad = ({ name, onSign, onReject, isSigning, label }: {
    name: string; onSign: () => void; onReject: () => void; isSigning: boolean; label: string;
  }) => (
    <div style={{ padding: "32px", display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>Digital Sign-off</h3>
        <p style={{ fontSize: "13px", color: "var(--muted-soft)", lineHeight: "1.5" }}>
          Dengan menandatangani dokumen ini, Anda memberikan otorisasi resmi sebagai Managing Director.
        </p>
      </div>
      <div style={{ flex: 1, border: "2px dashed var(--line-strong)", borderRadius: "12px", background: "var(--panel-soft)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px", minHeight: "240px" }}>
        <div style={{ fontSize: "36px", opacity: 0.1, marginBottom: "12px" }}>🖋️</div>
        <div style={{ color: "var(--blue)", fontSize: "28px", fontFamily: "Georgia, serif", fontStyle: "italic", textAlign: "center" }}>
          Eka Marutha Yuswardana
        </div>
        <div style={{ color: "var(--muted-soft)", fontSize: "11px", marginTop: "8px", textAlign: "center", textTransform: "uppercase", letterSpacing: "1px" }}>
          Managing Director — PT Juara Bisnis Bersama
        </div>
        <div style={{ marginTop: "24px", padding: "10px 20px", border: "1px solid var(--line)", borderRadius: "99px", fontSize: "12px", color: "var(--blue)", background: "rgba(91,140,255,0.05)" }}>
          Klik 'Tanda Tangan & Setujui' untuk menerapkan tanda tangan
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <button onClick={onSign} disabled={isSigning} className="primary-button" style={{ width: "100%", height: "46px", fontSize: "14px", fontWeight: 600 }}>
          {isSigning ? "Memproses..." : `✓ Tanda Tangan & Setujui ${label}`}
        </button>
        <button onClick={onReject} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", height: "40px", borderRadius: "8px", color: "#f87171", fontSize: "13px", cursor: "pointer" }}>
          Tolak / Kembalikan
        </button>
      </div>
    </div>
  );

  return (
    <WorkspaceShell
      title="Management Authorization"
      eyebrow="C-Level Workspace"
      actions={null}
    >
      <section className="summary-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: "24px" }}>
        <SummaryCard label="Dokumen Menunggu" value={String(pendingDocs.length)} description="PO/SPK/Kontrak/CA perlu tanda tangan" icon="📄" />
        <SummaryCard label="RFP Menunggu" value={String(pendingRfps.length)} description="Permintaan pembayaran perlu otorisasi" icon="💳" />
        <SummaryCard label="Riwayat Otorisasi" value={String(historyDocs.length + historyRfps.length)} description="Dokumen yang telah dirilis" icon="✅" />
      </section>

      <div style={{ display: "flex", gap: "2px", marginBottom: "16px", background: "var(--panel-soft)", padding: "3px", borderRadius: "8px", width: "fit-content", border: "1px solid var(--line)" }}>
        <button onClick={() => setActiveTab("docs")} style={{ padding: "6px 16px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "12px", background: activeTab === "docs" ? "var(--panel)" : "transparent", color: activeTab === "docs" ? "var(--text)" : "var(--muted)" }}>
          📄 Approve Dokumen {pendingDocs.length > 0 && <span style={{ background: "var(--blue)", color: "white", borderRadius: "99px", padding: "1px 6px", fontSize: "10px", marginLeft: "6px" }}>{pendingDocs.length}</span>}
        </button>
        <button onClick={() => setActiveTab("rfps")} style={{ padding: "6px 16px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "12px", background: activeTab === "rfps" ? "var(--panel)" : "transparent", color: activeTab === "rfps" ? "var(--text)" : "var(--muted)" }}>
          💳 Otorisasi RFP {pendingRfps.length > 0 && <span style={{ background: "var(--blue)", color: "white", borderRadius: "99px", padding: "1px 6px", fontSize: "10px", marginLeft: "6px" }}>{pendingRfps.length}</span>}
        </button>
        <button onClick={() => setActiveTab("history")} style={{ padding: "6px 16px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "12px", background: activeTab === "history" ? "var(--panel)" : "transparent", color: activeTab === "history" ? "var(--text)" : "var(--muted)" }}>
          🕒 History Otorisasi
        </button>
      </div>

      {activeTab === "docs" && (
        <div className="panel">
          <div className="panel-kicker">Dokumen Pengadaan — Menunggu Tanda Tangan Director</div>
          <div style={{ marginTop: "12px" }}>
            <FilterBar items={pendingDocs} type="docs" onFilter={handleFilterDocs} />
          </div>
          <div className="table-shell" style={{ marginTop: "16px" }}>
            <div className="project-table" style={{ minWidth: "800px" }}>
              <div className="table-row table-head" style={{ gridTemplateColumns: "1.8fr 1.5fr 1.2fr 1fr 1fr 1fr" }}>
                <div>No. Dokumen</div>
                <div>Vendor</div>
                <div>Project</div>
                <div>Tipe</div>
                <div>Nilai</div>
                <div style={{ textAlign: "right" }}>Aksi</div>
              </div>
              {filteredDocs.length === 0 ? (
                <div style={{ padding: "60px", textAlign: "center", color: "var(--muted-soft)" }}>
                  <div style={{ fontSize: "24px", marginBottom: "12px" }}>🎉</div>
                  Tidak ada dokumen yang sesuai filter.
                </div>
              ) : filteredDocs.map(doc => (
                <div key={doc.id} className="table-row" style={{ gridTemplateColumns: "1.8fr 1.5fr 1.2fr 1fr 1fr 1fr", alignItems: "center" }}>
                  <div>
                    <div style={{ fontFamily: "monospace", fontSize: "12px", fontWeight: 600 }}>{doc.id}</div>
                    <div className="mini-meta">{formatDateFullID(doc.issueDate)}</div>
                  </div>
                  <div>{doc.vendorName}</div>
                  <div style={{ fontSize: "12px" }}>{doc.projectName}</div>
                  <div><span className="status-pill" style={{ background: "rgba(99,102,241,0.1)", color: "var(--blue)" }}>{docTypeLabel[doc.documentType]}</span></div>
                  <div style={{ fontWeight: 700 }}>{formatCurrencyIDR(doc.amount)}</div>
                  <div style={{ textAlign: "right", display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                    <button className="secondary-button" style={{ fontSize: "11px", padding: "4px 10px", height: "auto", minHeight: "auto" }} onClick={() => window.open(`/finance/print/${doc.id}`, "_blank")}>
                      Preview
                    </button>
                    <button className="primary-button" style={{ fontSize: "11px", padding: "4px 12px", height: "auto", minHeight: "auto" }} onClick={() => { setSelectedDoc(doc); setIsDocReviewOpen(true); }}>
                      Review & Sign
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "rfps" && (
        <div className="panel">
          <div className="panel-kicker">Request For Payment — Menunggu Otorisasi</div>
          <div style={{ marginTop: "12px" }}>
            <FilterBar items={pendingRfps} type="rfps" onFilter={handleFilterRfps} />
          </div>
          <div className="table-shell" style={{ marginTop: "16px" }}>
             <div className="project-table" style={{ minWidth: "800px" }}>
               <div className="table-row table-head" style={{ gridTemplateColumns: "1.5fr 2fr 1.5fr 1fr 1fr" }}>
                 <div>RFP ID</div>
                 <div>Project / Vendor</div>
                 <div>Tgl. Pengajuan</div>
                 <div>Nominal</div>
                 <div style={{ textAlign: "right" }}>Aksi</div>
               </div>
               {filteredRfps.length === 0 ? (
                 <div style={{ padding: "60px", textAlign: "center", color: "var(--muted-soft)" }}>
                   <div style={{ fontSize: "24px", marginBottom: "12px" }}>🎉</div>
                   Tidak ada RFP yang sesuai filter.
                 </div>
               ) : filteredRfps.map(rfp => (
                 <div key={rfp.id} className="table-row" style={{ gridTemplateColumns: "1.5fr 2fr 1.5fr 1fr 1fr", alignItems: "center" }}>
                   <div style={{ fontFamily: "monospace", fontSize: "12px" }}>#{rfp.id.substring(0, 10)}</div>
                   <div>
                     <div>{rfp.projectName}</div>
                     <div className="mini-meta">Payee: {rfp.payeeName}</div>
                   </div>
                   <div>{formatDateFullID(rfp.requestDate)}</div>
                   <div style={{ fontWeight: 700 }}>{formatCurrencyIDR(rfp.totalAmount)}</div>
                   <div style={{ textAlign: "right", display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                     <button className="secondary-button" style={{ fontSize: "11px", padding: "4px 10px", height: "auto", minHeight: "auto" }} onClick={() => window.open(`/finance/print/${rfp.id}`, "_blank")}>
                       Preview
                     </button>
                     <button className="primary-button" style={{ fontSize: "11px", padding: "4px 12px", height: "auto", minHeight: "auto" }} onClick={() => { setSelectedRfp(rfp); setIsRfpReviewOpen(true); }}>
                       Review & Sign
                     </button>
                   </div>
                 </div>
               ))}
             </div>
          </div>
        </div>
      )}

      {isDocReviewOpen && selectedDoc && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "grid", placeItems: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
          <div style={{ width: "min(1100px, 95vw)", height: "min(780px, 90vh)", display: "flex", flexDirection: "column", background: "var(--bg)", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--line-strong)" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ fontSize: "18px", margin: 0 }}>Review {docTypeLabel[selectedDoc.documentType]}</h2>
                <p className="mini-meta" style={{ marginTop: "2px" }}>{selectedDoc.id} — {selectedDoc.vendorName}</p>
              </div>
              <button onClick={() => setIsDocReviewOpen(false)} style={{ background: "none", border: "none", fontSize: "24px", color: "var(--muted)", cursor: "pointer" }}>&times;</button>
            </div>
            <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1.6fr 1fr", overflow: "hidden" }}>
              <div style={{ padding: "20px", overflowY: "auto", borderRight: "1px solid var(--line)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
                  <div><label className="eyebrow">Project</label><div style={{ fontWeight: 600, marginTop: "4px" }}>{selectedDoc.projectName}</div></div>
                  <div><label className="eyebrow">Nilai Dokumen</label><div style={{ fontWeight: 700, fontSize: "18px", color: "var(--blue)", marginTop: "4px" }}>{formatCurrencyIDR(selectedDoc.amount)}</div></div>
                  <div><label className="eyebrow">Vendor</label><div style={{ marginTop: "4px" }}>{selectedDoc.vendorName}</div></div>
                  <div><label className="eyebrow">Payment Terms</label><div style={{ marginTop: "4px" }}>{selectedDoc.paymentTerms || "-"}</div></div>
                </div>
                {selectedDoc.lineItems && selectedDoc.lineItems.length > 0 && (
                  <div>
                    <div className="eyebrow" style={{ marginBottom: "8px" }}>Detail Item</div>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                      <thead><tr style={{ background: "var(--panel-soft)" }}>
                        {["No", "Item", "Qty", "Harga", "Total"].map(h => <th key={h} style={{ padding: "6px 10px", textAlign: "left", color: "var(--muted)", fontWeight: 600 }}>{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {selectedDoc.lineItems.map((item, i) => (
                          <tr key={i} style={{ borderBottom: "1px solid var(--line)" }}>
                            <td style={{ padding: "6px 10px" }}>{i + 1}</td>
                            <td style={{ padding: "6px 10px" }}>{item.description}</td>
                            <td style={{ padding: "6px 10px" }}>{item.qty} {item.unit}</td>
                            <td style={{ padding: "6px 10px" }}>{formatCurrencyIDR(item.price)}</td>
                            <td style={{ padding: "6px 10px", fontWeight: 600 }}>{formatCurrencyIDR(item.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {selectedDoc.shipTo && (
                  <div style={{ marginTop: "16px" }}>
                    <label className="eyebrow">Delivery</label>
                    <div style={{ marginTop: "4px", fontSize: "13px" }}>Ship To: {selectedDoc.shipTo} • {selectedDoc.deliveryDate}</div>
                  </div>
                )}
                {selectedDoc.billingTerms && selectedDoc.billingTerms.length > 0 && (
                  <div style={{ marginTop: "16px" }}>
                    <label className="eyebrow">Billing Terms</label>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "6px" }}>
                      {selectedDoc.billingTerms.map(t => <span key={t} className="chip" style={{ fontSize: "11px" }}>{t}</span>)}
                    </div>
                  </div>
                )}
                {selectedDoc.documentType === "CASH_ADVANCE" && (() => {
                  const linkedRfp = initialData.rfps?.find(r => r.documentIds?.includes(selectedDoc.id));
                  if (!linkedRfp) return (
                    <div style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.1)", borderRadius: "12px", padding: "12px", marginTop: "16px", color: "#f87171", fontSize: "12px", textAlign: "center" }}>
                      ⚠️ RFP belum dibuat untuk Cash Advance ini.
                    </div>
                  );

                  return (
                    <div style={{ background: "rgba(91,140,255,0.05)", border: "1px solid rgba(91,140,255,0.1)", borderRadius: "12px", padding: "16px", marginTop: "24px" }}>
                      <div style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--blue)", fontWeight: 700, marginBottom: "12px", letterSpacing: "1px" }}>RFP Payment Destination</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                        <div>
                          <label className="eyebrow" style={{ color: "var(--blue)" }}>Penerima / Payee</label>
                          <div style={{ fontWeight: 600, fontSize: "14px", marginTop: "4px" }}>{linkedRfp.payeeName}</div>
                        </div>
                        <div>
                          <label className="eyebrow" style={{ color: "var(--blue)" }}>Bank</label>
                          <div style={{ fontWeight: 600, fontSize: "14px", marginTop: "4px" }}>{linkedRfp.bankAccount.bankName}</div>
                        </div>
                        <div style={{ gridColumn: "span 2" }}>
                          <label className="eyebrow" style={{ color: "var(--blue)" }}>Account Number</label>
                          <div style={{ fontSize: "20px", fontWeight: 700, marginTop: "4px", color: "var(--text)" }}>{linkedRfp.bankAccount.accountNo}</div>
                          <div style={{ fontSize: "12px", color: "var(--muted-soft)", marginTop: "2px" }}>a.n. {linkedRfp.bankAccount.accountName}</div>
                        </div>
                      </div>
                      <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px dotted var(--line)", display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                        <span>Total Disbursement:</span>
                        <span style={{ fontWeight: 700, color: "var(--blue)" }}>{formatCurrencyIDR(linkedRfp.totalAmount)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
              <SignaturePad name="Eka Marutha Yuswardana" onSign={handleApproveDoc} onReject={handleRejectDoc} isSigning={isSigningDoc} label="Dokumen" />
            </div>
          </div>
        </div>
      )}

      {isRfpReviewOpen && selectedRfp && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "grid", placeItems: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
          <div style={{ width: "min(1100px, 95vw)", height: "min(780px, 90vh)", display: "flex", flexDirection: "column", background: "var(--bg)", borderRadius: "18px", overflow: "hidden", border: "1px solid var(--line-strong)" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ fontSize: "18px", margin: 0 }}>Review Request For Payment</h2>
                <p className="mini-meta" style={{ marginTop: "2px" }}>{selectedRfp.id} — {selectedRfp.payeeName}</p>
                {selectedRfp.documentIds && selectedRfp.documentIds.length > 0 && (
                  <p className="mini-meta" style={{ color: "var(--blue)", fontWeight: 600 }}>Ref. Doc: {selectedRfp.documentIds.join(", ")}</p>
                )}
              </div>
              <button onClick={() => setIsRfpReviewOpen(false)} style={{ background: "none", border: "none", fontSize: "24px", color: "var(--muted)", cursor: "pointer" }}>&times;</button>
            </div>
            <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1.6fr 1fr", overflow: "hidden" }}>
              <div style={{ padding: "28px", overflowY: "auto", borderRight: "1px solid var(--line)" }}>
                <span className="status-pill tone-amber" style={{ marginBottom: "20px", display: "inline-block" }}>MENUNGGU OTORISASI</span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
                  <div><label className="eyebrow">Project</label><div style={{ fontWeight: 600, marginTop: "4px" }}>{selectedRfp.projectName}</div></div>
                  <div><label className="eyebrow">Nominal RFP</label><div style={{ fontWeight: 700, fontSize: "22px", color: "var(--text)", marginTop: "4px" }}>{formatCurrencyIDR(selectedRfp.totalAmount)}</div></div>
                  <div><label className="eyebrow">Payee / Vendor</label><div style={{ marginTop: "4px" }}>{selectedRfp.payeeName}</div></div>
                  <div><label className="eyebrow">Metode</label><div style={{ marginTop: "4px" }}>{selectedRfp.paymentType}</div></div>
                </div>
                <div style={{ padding: "16px", background: "rgba(91,140,255,0.05)", borderRadius: "8px", border: "1px solid rgba(91,140,255,0.1)", marginBottom: "20px" }}>
                  <label className="eyebrow" style={{ color: "var(--blue)" }}>Rekening Tujuan</label>
                  <div style={{ marginTop: "8px" }}>
                    <div style={{ fontWeight: 600 }}>{selectedRfp.bankAccount.bankName}</div>
                    <div style={{ fontSize: "18px", margin: "4px 0" }}>{selectedRfp.bankAccount.accountNo}</div>
                    <div className="mini-meta" style={{ margin: 0 }}>a.n. {selectedRfp.bankAccount.accountName}</div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                  <div style={{ padding: "12px", background: "rgba(91,140,255,0.05)", borderRadius: "8px", border: "1px solid rgba(91,140,255,0.1)" }}>
                    <label className="eyebrow" style={{ color: "var(--blue)" }}>Finance Signature</label>
                    <div style={{ marginTop: "4px" }}>
                      <div style={{ fontWeight: 600 }}>{selectedRfp.financeApprovedBy?.name || "Finance Admin"}</div>
                      <div className="mini-meta">{selectedRfp.financeApprovedBy?.date ? formatDateFullID(selectedRfp.financeApprovedBy.date) : "Verified"}</div>
                      <div style={{ fontSize: "10px", color: "var(--blue)", marginTop: "4px" }}>{selectedRfp.financeApprovedBy?.signature || "Checked"}</div>
                    </div>
                  </div>
                  <div style={{ padding: "12px", background: "rgba(91,140,255,0.05)", borderRadius: "8px", border: "1px solid rgba(91,140,255,0.1)" }}>
                    <label className="eyebrow" style={{ color: "var(--blue)" }}>Audit Documents (Tiga Dokumen Khusus)</label>
                    <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      <button onClick={() => window.open(`/finance/print/${selectedRfp.documentIds?.[0] || selectedRfp.id}?only=po`, "_blank")} className="secondary-button" style={{ fontSize: "11px", padding: "6px 12px", width: "100%", justifyContent: "center", border: "1px solid var(--blue)", color: "var(--blue)", background: "white" }}>📄 Buka PO/Kontrak</button>
                      <button onClick={() => window.open(`/finance/print/${selectedRfp.id}?only=rfp`, "_blank")} className="secondary-button" style={{ fontSize: "11px", padding: "6px 12px", width: "100%", justifyContent: "center", border: "1px solid var(--green)", color: "var(--green)", background: "white" }}>💳 Buka RFP</button>
                      {selectedRfp.vendorInvoiceUrl ? (
                         <button onClick={() => setViewProofUrl(selectedRfp.vendorInvoiceUrl!)} className="secondary-button" style={{ fontSize: "11px", padding: "6px 12px", width: "100%", justifyContent: "center", gridColumn: "span 2", border: "1px solid #f59e0b", color: "#d97706", background: "white" }}>🧾 Buka Invoice Vendor</button>
                      ) : (
                         <div style={{ fontSize: "11px", color: "#f87171", gridColumn: "span 2", textAlign: "center", padding: "6px" }}>❌ Invoice Vendor Tidak Dilampirkan</div>
                      )}
                    </div>
                  </div>
                </div>
                <div><label className="eyebrow">Catatan</label><div style={{ fontSize: "13px", color: "var(--muted)", marginTop: "6px", whiteSpace: "pre-wrap" }}>{selectedRfp.notes || "-"}</div></div>
              </div>
              <SignaturePad name="Eka Marutha Yuswardana" onSign={handleApproveRfp} onReject={handleRejectRfp} isSigning={isSigningRfp} label="RFP" />
            </div>
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <div className="panel">
          <div className="panel-kicker">Riwayat Otorisasi — Dokumen & RFP yang telah disetujui</div>
          <div style={{ marginTop: "12px" }}>
            <FilterBar items={[...historyDocs, ...historyRfps]} type="docs" onFilter={(items) => {
              const d = items.filter(i => 'issueDate' in i) as ExpenseDocument[];
              const r = items.filter(i => !('issueDate' in i)) as RequestForPayment[];
              handleFilterDocs(d);
              handleFilterRfps(r);
            }} />
          </div>
          <div className="table-shell" style={{ marginTop: "16px" }}>
            <div className="project-table" style={{ minWidth: "800px" }}>
              <div className="table-row table-head" style={{ gridTemplateColumns: "1fr 1.5fr 1.5fr 1fr 1fr 1fr" }}>
                <div>ID</div>
                <div>Vendor / Payee</div>
                <div>Project</div>
                <div>Status</div>
                <div>Nilai</div>
                <div style={{ textAlign: "right" }}>Aksi</div>
              </div>
              {[...historyDocs, ...historyRfps].length === 0 ? (
                <div style={{ padding: "60px", textAlign: "center", color: "var(--muted-soft)" }}>Kosong.</div>
              ) : [...historyDocs, ...historyRfps].map(item => (
                <div key={item.id} className="table-row" style={{ gridTemplateColumns: "1fr 1.5fr 1.5fr 1fr 1fr 1fr", alignItems: "center" }}>
                   <div style={{ fontFamily: "monospace", fontSize: "11px" }}>{item.id}</div>
                   <div>{"vendorName" in item ? item.vendorName : item.payeeName}</div>
                   <div>{item.projectName}</div>
                   <div><span className={`status-pill tone-${(item.status === 'paid' || item.status === 'approved') ? 'green' : 'blue'}`}>{item.status.toUpperCase()}</span></div>
                   <div style={{ fontWeight: 600 }}>{formatCurrencyIDR("amount" in item ? item.amount : item.totalAmount)}</div>
                   <div style={{ textAlign: "right" }}>
                     <a href={`/finance/print/${item.id}`} target="_blank" className="secondary-button" style={{ fontSize: "11px", padding: "4px 10px" }}>👁️ View Audit</a>
                   </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {rejectionTarget && (
        <RejectionModal
          title={`Tolak ${rejectionTarget.type === "DOC" ? "Dokumen" : "RFP"}`}
          onClose={() => setRejectionTarget(null)}
          onConfirm={confirmRejection}
        />
      )}
    </WorkspaceShell>
  );
}
