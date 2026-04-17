"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { FinanceDashboardData, RequestForPayment, ExpenseDocument } from "@/lib/finance/types";
import { WorkspaceShell } from "../layout/workspace-shell";
import { SummaryCard } from "../ui/summary-card";
import { formatCurrencyIDR, formatDateFullID } from "@/lib/utils/format";
import { updateRFPStatus } from "@/lib/finance/actions";
import { FilterBar } from "./filter-bar";
import { RejectionModal } from "./rejection-modal";
import { SettlementModal } from "./settlement-modal";

interface PaymentProofModalProps {
  rfp: RequestForPayment;
  onClose: () => void;
  onSuccess: (proofUrl: string) => void;
}

function PaymentProofModal({ rfp, onClose, onSuccess }: PaymentProofModalProps) {
  const [file, setFile] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    
    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setFile(reader.result as string);
      setIsUploading(false);
    };
    reader.readAsDataURL(f);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ background: "var(--panel)", borderRadius: "16px", width: "100%", maxWidth: "480px", padding: "32px", border: "1px solid var(--line)" }}>
        <h3 style={{ margin: "0 0 8px 0", fontSize: "18px" }}>Upload Bukti Transfer</h3>
        <p className="mini-meta" style={{ marginBottom: "24px" }}>RFP #{rfp.id.substring(0,8)} — {formatCurrencyIDR(rfp.totalAmount)}</p>
        
        <div style={{ marginBottom: "24px" }}>
          <label className="mini-meta">Pilih Gambar Bukti Transfer (Mandatory)</label>
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleFileChange} 
            style={{ width: "100%", marginTop: "8px", padding: "12px", border: "2px dashed var(--line)", borderRadius: "10px", background: "var(--panel-soft)" }} 
          />
        </div>

        {file && (
          <div style={{ marginBottom: "24px", textAlign: "center" }}>
            <img src={file} alt="Preview" style={{ maxWidth: "100%", maxHeight: "200px", borderRadius: "8px", border: "1px solid var(--line)" }} />
          </div>
        )}

        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "10px 20px", background: "none", border: "1px solid var(--line)", borderRadius: "8px", color: "var(--text)", cursor: "pointer" }}>Batal</button>
          <button 
            disabled={!file || isUploading} 
            onClick={() => file && onSuccess(file)} 
            className="primary-button" 
            style={{ minWidth: "120px", background: "var(--green)" }}
          >
            Selesaikan Pembayaran
          </button>
        </div>
      </div>
    </div>
  );
}

interface Props {
  initialData: FinanceDashboardData;
}

export function FinanceOpsDashboard({ initialData }: Props) {
  const [activeTab, setActiveTabRaw] = useState<"doc_verification" | "verification" | "payment" | "settlement" | "processed">("doc_verification");
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab") as any;
    if (tabParam) {
      setActiveTabRaw(tabParam);
    }
    
    const handlePopState = () => {
      const p = new URLSearchParams(window.location.search);
      setActiveTabRaw((p.get("tab") as any) || "doc_verification");
    };
    
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const setActiveTab = (newTab: "doc_verification" | "verification" | "payment" | "settlement" | "processed") => {
    setActiveTabRaw(newTab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", newTab);
    window.history.pushState(null, "", url.toString());
  };

  const [selectedRfpForPayment, setSelectedRfpForPayment] = useState<RequestForPayment | null>(null);
  const [selectedRfpForSettlement, setSelectedRfpForSettlement] = useState<RequestForPayment | null>(null);
  const [viewProofUrl, setViewProofUrl] = useState<string | null>(null);
  const [rejectionRfpId, setRejectionRfpId] = useState<string | null>(null);
  const [rejectionDocId, setRejectionDocId] = useState<string | null>(null);
  const [selectedReviewRfp, setSelectedReviewRfp] = useState<RequestForPayment | null>(null);
  const [selectedReviewDoc, setSelectedReviewDoc] = useState<ExpenseDocument | null>(null);

  const handleSignAndForward = async (rfp: RequestForPayment) => {
    const signerName = "Serafina Nolani";
    const signature = `SIG-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    await updateRFPStatus(rfp.id, "pending_c_level", {
      financeApprovedBy: {
        name: signerName,
        date: new Date().toISOString(),
        signature: signature
      }
    });
    setSelectedReviewRfp(null);
    window.location.reload();
  };

  const handleUpdateStatus = (rfpId: string, status: string, extra = {}) => updateRFPStatus(rfpId, status, extra);
  
  const handleRejectRfp = (rfpId: string) => {
    setRejectionRfpId(rfpId);
  };

  const confirmRejection = async (reason: string) => {
    if (!rejectionRfpId) return;
    await updateRFPStatus(rejectionRfpId, "draft", { rejectionReason: reason });
    setRejectionRfpId(null);
    window.location.reload();
  };

  const handleUpdateDocStatus = async (docId: string, status: string, extra = {}) => {
    await fetch("/api/finance/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ docId, status, ...extra }),
    });
  };

  const handleSignAndForwardDoc = async (doc: ExpenseDocument) => {
    const signerName = "Serafina Nolani";
    const signature = `SIG-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    await handleUpdateDocStatus(doc.id, "pending_c_level", {
      verifiedBy: {
        name: signerName,
        date: new Date().toISOString(),
        digitalSignature: signature
      }
    });
    setSelectedReviewDoc(null);
    window.location.reload();
  };

  const handleRejectDoc = (docId: string) => {
    setRejectionDocId(docId);
  };

  const confirmDocRejection = async (reason: string) => {
    if (!rejectionDocId) return;
    await handleUpdateDocStatus(rejectionDocId, "draft", { rejectionReason: reason });
    setRejectionDocId(null);
    window.location.reload();
  };

  const docVerificationQueue = useMemo(() => (initialData.expenseDocuments || []).filter(d => d.status === "pending_finance"), [initialData.expenseDocuments]);
  const verificationQueue = useMemo(() => (initialData.rfps || []).filter(r => r.status === "pending_finance"), [initialData.rfps]);
  const paymentQueue = useMemo(() => (initialData.rfps || []).filter(r => r.status === "approved"), [initialData.rfps]);
  const settlementQueue = useMemo(() => (initialData.rfps || []).filter(r => r.status === "pending_settlement_approval"), [initialData.rfps]);
  // CA RFPs that are paid but not yet settled — Finance needs to submit settlement
  const caPaidQueue = useMemo(() => (initialData.rfps || []).filter(r => {
    if (r.status !== "paid") return false;
    const docs = initialData.expenseDocuments || [];
    return (r.documentIds || []).some(did => {
      const srcDoc = docs.find(d => d.id === did);
      return srcDoc?.documentType === "CASH_ADVANCE";
    });
  }), [initialData.rfps, initialData.expenseDocuments]);
  const processedQueue = useMemo(() => (initialData.rfps || []).filter(r => r.status === "paid" || r.status === "settled"), [initialData.rfps]);

  const [filteredItems, setFilteredItems] = useState<any[]>([]);

  const activeQueue = useMemo(() => {
    if (activeTab === "doc_verification") return docVerificationQueue;
    if (activeTab === "verification") return verificationQueue;
    if (activeTab === "payment") return paymentQueue;
    if (activeTab === "settlement") return [...caPaidQueue, ...settlementQueue];
    return processedQueue;
  }, [activeTab, docVerificationQueue, verificationQueue, paymentQueue, settlementQueue, processedQueue]);

  const handleFilter = useCallback((items: any[]) => {
    setFilteredItems(items);
  }, []);

  return (
    <WorkspaceShell title="Finance Operations" eyebrow="Finance Admin View">
      <section className="summary-grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)', marginBottom: '24px' }}>
         <SummaryCard label="Docs Verify" value={String(docVerificationQueue.length)} description="PO/SPK pending check" icon="📄" />
         <SummaryCard label="RFP In Review" value={String(verificationQueue.length)} description="Awaiting audit" icon="🔍" />
         <SummaryCard label="Ready to Pay" value={String(paymentQueue.length)} description="C-Level approved" icon="💳" />
         <SummaryCard label="Pending Settlement" value={String(settlementQueue.length)} description="Waiting for approval" icon="🧾" />
         <SummaryCard label="Outstanding" value={formatCurrencyIDR(initialData.summary?.totalOutstandingAmount || 0)} description="Unpaid commitment" icon="💰" />
         <SummaryCard label="Processed" value={String((initialData.rfps || []).filter(r => r.status === 'paid' || r.status === 'settled').length)} description="Completed payments" icon="✅" />
      </section>

      <div className="toolbar-panel">
        <div className="database-tabs">
           <button className={`chip ${activeTab === 'doc_verification' ? 'active' : ''}`} onClick={() => setActiveTab('doc_verification')}>
             Dokumen Masuk ({docVerificationQueue.length})
           </button>
           <button className={`chip ${activeTab === 'verification' ? 'active' : ''}`} onClick={() => setActiveTab('verification')}>
             RFP Masuk ({verificationQueue.length})
           </button>
           <button className={`chip ${activeTab === 'payment' ? 'active' : ''}`} onClick={() => setActiveTab('payment')}>
             Payment Hub ({paymentQueue.length})
           </button>
           <button className={`chip ${activeTab === 'settlement' ? 'active' : ''}`} onClick={() => setActiveTab('settlement')}>
             Settlement CA ({caPaidQueue.length + settlementQueue.length})
           </button>
           <button className={`chip ${activeTab === 'processed' ? 'active' : ''}`} onClick={() => setActiveTab('processed')}>
             Historis Pembayaran ({processedQueue.length})
           </button>
        </div>
      </div>

      <div style={{ marginTop: "24px" }}>
        <FilterBar items={activeQueue} type="rfps" onFilter={handleFilter} />
      </div>

      <div className="panel" style={{ marginTop: '24px' }}>
         <div className="table-shell">
            <div className="project-table" style={{ minWidth: "1000px" }}>
               {activeTab === "doc_verification" ? (
                 <>
                   <div className="table-row table-head" style={{ gridTemplateColumns: "1.5fr 1.5fr 1fr 1fr 1.5fr" }}>
                      <div>Dokumen Detail</div>
                      <div>Vendor Name</div>
                      <div>Amount</div>
                      <div>Date</div>
                      <div style={{ textAlign: "right" }}>Action</div>
                   </div>
                   {filteredItems.length === 0 ? (
                     <div style={{ padding: '60px', textAlign: 'center', color: 'var(--muted-soft)' }}>
                        Tidak ada dokumen yang sesuai filter.
                     </div>
                   ) : filteredItems.map((item) => {
                     const doc = item as ExpenseDocument;
                     return (
                       <div key={doc.id} className="table-row" style={{ gridTemplateColumns: "1.5fr 1.5fr 1fr 1fr 1.5fr", alignItems: "center" }}>
                          <div>
                            <div style={{ fontWeight: 600 }}>{doc.id}</div>
                            <div className="mini-meta">{doc.documentType} - {doc.projectName}</div>
                          </div>
                          <div>{doc.vendorName}</div>
                          <div style={{ fontWeight: 600 }}>{formatCurrencyIDR(doc.amount)}</div>
                          <div className="mini-meta">{formatDateFullID(doc.issueDate)}</div>
                          <div style={{ textAlign: "right", display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                             <a href={`/finance/print/${doc.id}`} className="secondary-button" style={{ fontSize: "11px", padding: '4px 12px' }}>👁️ Audit Docs</a>
                             <button onClick={() => handleRejectDoc(doc.id)} className="secondary-button" style={{ fontSize: "11px", padding: '4px 12px', color: '#f87171', borderColor: 'rgba(239,68,68,0.2)' }}>Return</button>
                             <button onClick={() => setSelectedReviewDoc(doc)} className="primary-button" style={{ fontSize: "11px", padding: '4px 16px', background: 'var(--blue)' }}>Sign & Forward</button>
                          </div>
                       </div>
                     );
                   })}
                 </>
               ) : (
                 <>
                   <div className="table-row table-head" style={{ gridTemplateColumns: "1fr 1.5fr 1fr 1fr 1.5fr" }}>
                      <div>RFP Detail</div>
                      <div>Project / Payee</div>
                      <div>Amount {activeTab === "settlement" && " / Diff"}</div>
                      <div>Request Date</div>
                      <div style={{ textAlign: "right" }}>Action</div>
                   </div>
               
               {filteredItems.length === 0 ? (
                 <div style={{ padding: '60px', textAlign: 'center', color: 'var(--muted-soft)' }}>
                    Tidak ada item yang sesuai filter.
                 </div>
               ) : filteredItems.map((item) => {
                 const rfp = item as RequestForPayment;
                 return (
                 <div key={rfp.id} className="table-row" style={{ gridTemplateColumns: "1fr 1.5fr 1fr 1fr 1.5fr" }}>
                    <div style={{ fontWeight: 600 }}>#{rfp.id.substring(0,8)}</div>
                    <div>
                       <div>{rfp.projectName}</div>
                       <div className="mini-meta">{rfp.payeeName}</div>
                    </div>
                    <div>
                       <div style={{ fontWeight: 600 }}>{formatCurrencyIDR(rfp.totalAmount)}</div>
                       {activeTab === "settlement" && rfp.settlementDetails && (
                         <div style={{ fontSize: '11px', color: rfp.settlementDetails.difference > 0 ? '#ff4a4a' : '#22c55e', marginTop: '2px' }}>
                           Actual: {formatCurrencyIDR(rfp.settlementDetails.actualAmount)}
                         </div>
                       )}
                    </div>
                    <div className="mini-meta">{formatDateFullID(rfp.requestDate)}</div>
                    <div style={{ textAlign: "right", display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                       <a href={`/finance/print/${rfp.id}`} className="secondary-button" style={{ fontSize: "11px", padding: '4px 12px' }}>Audit Docs</a>
                       {activeTab === 'verification' && (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => handleRejectRfp(rfp.id)} className="secondary-button" style={{ fontSize: "11px", padding: '4px 12px', color: '#f87171', borderColor: 'rgba(239,68,68,0.2)' }}>Return</button>
                            <button onClick={() => setSelectedReviewRfp(rfp)} className="primary-button" style={{ fontSize: "11px", padding: '4px 16px', background: 'var(--blue)' }}>Review & Sign</button>
                          </div>
                       )}
                       {activeTab === 'payment' && (
                          <button onClick={() => setSelectedRfpForPayment(rfp)} className="primary-button" style={{ fontSize: "11px", padding: '4px 16px', background: 'var(--green)' }}>Post & Mark as Paid</button>
                       )}
                       {activeTab === 'settlement' && rfp.settlementDetails && (
                          <button onClick={async () => { await handleUpdateStatus(rfp.id, 'settled'); window.location.reload(); }} className="primary-button" style={{ fontSize: "11px", padding: '4px 16px', background: 'var(--green)' }}>Approve Settlement</button>
                       )}
                       {activeTab === 'settlement' && !rfp.settlementDetails && (
                          <button onClick={() => setSelectedRfpForSettlement(rfp)} className="primary-button" style={{ fontSize: "11px", padding: '4px 16px', background: 'var(--amber)', border: '1px solid var(--amber)' }}>Submit Settlement</button>
                       )}
                       {rfp.paymentProofUrl && (
                          <button onClick={() => setViewProofUrl(rfp.paymentProofUrl!)} className="secondary-button" style={{ fontSize: "11px", padding: '4px 12px', borderColor: 'var(--green)', color: 'var(--green)' }}>👁️ Bukti</button>
                       )}
                    </div>
                 </div>
                 );
               })}
               </>
               )}
            </div>
         </div>
      </div>

      {/* Modals */}
      {/* Review & Audit Modal */}
      {selectedReviewRfp && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ backgroundColor: "var(--panel)", borderRadius: "16px", width: "100%", maxWidth: "800px", border: "1px solid var(--line)", padding: "32px" }}>
             <h2 style={{ marginTop: 0 }}>Review Audit RFP #{selectedReviewRfp.id.substring(0,8)}</h2>
             <div style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "20px" }}>Periksa dokumen dasar dan invoice vendor sebelum memberikan tanda tangan.</div>
             
             <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "32px" }}>
                 {/* Card 1: PO */}
                 <div style={{ padding: "16px", borderRadius: "10px", background: "var(--panel-soft)", border: "1px solid var(--line)", display: "flex", flexDirection: "column" }}>
                   <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                     <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(99,102,241,0.1)", color: "var(--blue)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>📄</div>
                     <div>
                       <div className="mini-meta" style={{ margin: 0, fontWeight: 600 }}>Dokumen 1</div>
                       <div style={{ fontSize: "13px", fontWeight: 700 }}>PO / Kontrak</div>
                     </div>
                   </div>
                   <div style={{ flex: 1, fontSize: "12px", color: "var(--muted)", marginBottom: "16px", wordBreak: "break-word" }}>{selectedReviewRfp.documentIds?.[0] || "-"}</div>
                   <button onClick={() => window.open(`/finance/print/${selectedReviewRfp.documentIds?.[0] || selectedReviewRfp.id}?only=po`, "_blank")} className="secondary-button" style={{ width: "100%", justifyContent: "center", border: "1px solid var(--blue)", color: "var(--blue)" }}>👁️ Buka PO</button>
                 </div>

                 {/* Card 2: RFP */}
                 <div style={{ padding: "16px", borderRadius: "10px", background: "var(--panel-soft)", border: "1px solid var(--line)", display: "flex", flexDirection: "column" }}>
                   <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                     <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(34,197,94,0.1)", color: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>💳</div>
                     <div>
                       <div className="mini-meta" style={{ margin: 0, fontWeight: 600 }}>Dokumen 2</div>
                       <div style={{ fontSize: "13px", fontWeight: 700 }}>RFP Terbit</div>
                     </div>
                   </div>
                   <div style={{ flex: 1, fontSize: "12px", color: "var(--muted)", marginBottom: "16px", wordBreak: "break-word" }}>RFP-{selectedReviewRfp.id.substring(0,6)}</div>
                   <button onClick={() => window.open(`/finance/print/${selectedReviewRfp.id}?only=rfp`, "_blank")} className="secondary-button" style={{ width: "100%", justifyContent: "center", border: "1px solid var(--green)", color: "var(--green)" }}>👁️ Buka RFP</button>
                 </div>

                 {/* Card 3: Invoice */}
                 <div style={{ padding: "16px", borderRadius: "10px", background: "var(--panel-soft)", border: "1px solid var(--line)", display: "flex", flexDirection: "column" }}>
                   <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                     <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(245,158,11,0.1)", color: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>🧾</div>
                     <div>
                       <div className="mini-meta" style={{ margin: 0, fontWeight: 600 }}>Dokumen 3</div>
                       <div style={{ fontSize: "13px", fontWeight: 700 }}>Invoice Vendor</div>
                     </div>
                   </div>
                   <div style={{ flex: 1, fontSize: "12px", marginBottom: "16px" }}>
                     {selectedReviewRfp.vendorInvoiceUrl ? <span style={{ color: "var(--green)", fontWeight: 600 }}>✅ Terlampir</span> : <span style={{ color: "#f87171" }}>❌ Tidak dilampirkan</span>}
                   </div>
                   {selectedReviewRfp.vendorInvoiceUrl ? (
                     <button onClick={() => setViewProofUrl(selectedReviewRfp.vendorInvoiceUrl!)} className="secondary-button" style={{ width: "100%", justifyContent: "center", color: "#d97706", borderColor: "#f59e0b" }}>👁️ Buka Invoice</button>
                   ) : (
                     <button disabled className="secondary-button" style={{ width: "100%", justifyContent: "center", opacity: 0.5 }}>Tidak Ada Invoice</button>
                   )}
                 </div>
             </div>

             <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "20px" }}>
                <button onClick={() => setSelectedReviewRfp(null)} className="secondary-button">Close</button>
                <button 
                  onClick={() => handleSignAndForward(selectedReviewRfp)} 
                  className="primary-button" 
                  style={{ background: "var(--blue)" }}
                >
                  Sign & Forward to Director →
                </button>
             </div>
          </div>
        </div>
      )}

      {selectedRfpForPayment && (
        <PaymentProofModal 
          rfp={selectedRfpForPayment} 
          onClose={() => setSelectedRfpForPayment(null)} 
          onSuccess={(url) => {
            handleUpdateStatus(selectedRfpForPayment.id, 'paid', { paymentProofUrl: url });
            setSelectedRfpForPayment(null);
          }}
        />
      )}

      {rejectionRfpId && (
        <RejectionModal
          title="Kembalikan Dokumen RFP"
          onClose={() => setRejectionRfpId(null)}
          onConfirm={confirmRejection}
        />
      )}

      {selectedReviewDoc && (() => {
        const linkedRfp = initialData.rfps?.find(r => r.documentIds?.includes(selectedReviewDoc.id));
        
        return (
          <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
            <div style={{ backgroundColor: "var(--panel)", borderRadius: "16px", width: "100%", maxWidth: "500px", border: "1px solid var(--line)", padding: "32px", textAlign: "center" }}>
              <h2 style={{ marginTop: 0 }}>Forward Dokumen ke Direktur</h2>
              <div style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "24px" }}>
                Dengan ini Anda mengkonfirmasi bahwa dokumen <strong>{selectedReviewDoc.id}</strong> telah diverifikasi kelengkapannya oleh staf Finance.
              </div>
              
              {selectedReviewDoc.documentType === "CASH_ADVANCE" && linkedRfp && (
                <div style={{ background: "rgba(91,140,255,0.05)", border: "1px solid rgba(91,140,255,0.1)", borderRadius: "12px", padding: "16px", marginBottom: "24px", textAlign: "left" }}>
                  <div style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--blue)", fontWeight: 700, marginBottom: "8px", letterSpacing: "1px" }}>Linked RFP Payment Details</div>
                  <div style={{ fontWeight: 600, fontSize: "14px" }}>{linkedRfp.bankAccount.bankName}</div>
                  <div style={{ fontSize: "18px", margin: "4px 0", fontWeight: 700 }}>{linkedRfp.bankAccount.accountNo}</div>
                  <div style={{ fontSize: "12px", color: "var(--muted)" }}>a.n. {linkedRfp.bankAccount.accountName}</div>
                  <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                    <span>Amount:</span>
                    <span style={{ fontWeight: 700 }}>{formatCurrencyIDR(linkedRfp.totalAmount)}</span>
                  </div>
                </div>
              )}

              {selectedReviewDoc.documentType === "CASH_ADVANCE" && !linkedRfp && (
                <div style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.1)", borderRadius: "12px", padding: "12px", marginBottom: "24px", color: "#f87171", fontSize: "12px" }}>
                  ⚠️ RFP belum dibuat untuk Cash Advance ini.
                </div>
              )}
              
              <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
                <button onClick={() => setSelectedReviewDoc(null)} className="secondary-button" style={{minWidth: "120px"}}>Batal</button>
                <button 
                  onClick={() => handleSignAndForwardDoc(selectedReviewDoc)} 
                  className="primary-button" 
                  style={{ background: "var(--blue)", minWidth: "160px" }}
                >
                  Ya, Sign & Forward
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {rejectionDocId && (
        <RejectionModal
          title="Kembalikan Dokumen (PO/SPK)"
          onClose={() => setRejectionDocId(null)}
          onConfirm={confirmDocRejection}
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
