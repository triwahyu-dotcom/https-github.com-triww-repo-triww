"use client";

import { useState, useMemo, useCallback } from "react";
import { FinanceDashboardData, RequestForPayment } from "@/lib/finance/types";
import { WorkspaceShell } from "../layout/workspace-shell";
import { SummaryCard } from "../ui/summary-card";
import { formatCurrencyIDR, formatDateFullID } from "@/lib/utils/format";
import { updateRFPStatus } from "@/lib/finance/actions";
import { FilterBar } from "./filter-bar";
import { RejectionModal } from "./rejection-modal";

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
  const [activeTab, setActiveTab] = useState<"verification" | "payment" | "settlement" | "processed">("verification");
  const [selectedRfpForPayment, setSelectedRfpForPayment] = useState<RequestForPayment | null>(null);
  const [viewProofUrl, setViewProofUrl] = useState<string | null>(null);
  const [rejectionRfpId, setRejectionRfpId] = useState<string | null>(null);
  const [selectedReviewRfp, setSelectedReviewRfp] = useState<RequestForPayment | null>(null);

  const handleSignAndForward = async (rfp: RequestForPayment) => {
    const signerName = "Finance Audit";
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

  const verificationQueue = useMemo(() => (initialData.rfps || []).filter(r => r.status === "pending_finance"), [initialData.rfps]);
  const paymentQueue = useMemo(() => (initialData.rfps || []).filter(r => r.status === "approved"), [initialData.rfps]);
  const settlementQueue = useMemo(() => (initialData.rfps || []).filter(r => r.status === "pending_settlement_approval"), [initialData.rfps]);
  const processedQueue = useMemo(() => (initialData.rfps || []).filter(r => r.status === "paid" || r.status === "settled"), [initialData.rfps]);

  const [filteredItems, setFilteredItems] = useState<RequestForPayment[]>([]);

  const activeQueue = useMemo(() => {
    if (activeTab === "verification") return verificationQueue;
    if (activeTab === "payment") return paymentQueue;
    if (activeTab === "settlement") return settlementQueue;
    return processedQueue;
  }, [activeTab, verificationQueue, paymentQueue, settlementQueue, processedQueue]);

  const handleFilter = useCallback((items: RequestForPayment[]) => {
    setFilteredItems(items);
  }, []);

  return (
    <WorkspaceShell title="Finance Operations" eyebrow="Finance Admin View">
      <section className="summary-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: '24px' }}>
         <SummaryCard label="In Review" value={String(verificationQueue.length)} description="Awaiting audit" icon="🔍" />
         <SummaryCard label="Ready to Pay" value={String(paymentQueue.length)} description="C-Level approved" icon="💳" />
         <SummaryCard label="Pending Settlement" value={String(settlementQueue.length)} description="Waiting for approval" icon="🧾" />
         <SummaryCard label="Outstanding" value={formatCurrencyIDR(initialData.summary?.totalOutstandingAmount || 0)} description="Unpaid commitment" icon="💰" />
         <SummaryCard label="Processed" value={String((initialData.rfps || []).filter(r => r.status === 'paid' || r.status === 'settled').length)} description="Completed payments" icon="✅" />
      </section>

      <div className="toolbar-panel">
        <div className="database-tabs">
           <button className={`chip ${activeTab === 'verification' ? 'active' : ''}`} onClick={() => setActiveTab('verification')}>
             Verification Queue ({verificationQueue.length})
           </button>
           <button className={`chip ${activeTab === 'payment' ? 'active' : ''}`} onClick={() => setActiveTab('payment')}>
             Payment Hub ({paymentQueue.length})
           </button>
           <button className={`chip ${activeTab === 'settlement' ? 'active' : ''}`} onClick={() => setActiveTab('settlement')}>
             Settlement Checks ({settlementQueue.length})
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
               ) : filteredItems.map(rfp => (
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
                       {activeTab === 'settlement' && (
                          <button onClick={() => handleUpdateStatus(rfp.id, 'settled')} className="primary-button" style={{ fontSize: "11px", padding: '4px 16px', background: 'var(--green)' }}>Approve Settlement</button>
                       )}
                       {rfp.paymentProofUrl && (
                          <button onClick={() => setViewProofUrl(rfp.paymentProofUrl!)} className="secondary-button" style={{ fontSize: "11px", padding: '4px 12px', borderColor: 'var(--green)', color: 'var(--green)' }}>👁️ Bukti</button>
                       )}
                    </div>
                 </div>
               ))}
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
             
             <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "32px" }}>
                <div style={{ padding: "16px", borderRadius: "10px", background: "var(--panel-soft)", border: "1px solid var(--line)" }}>
                  <div className="mini-meta" style={{ marginBottom: "8px" }}>Source PO / Document</div>
                  <div style={{ fontWeight: 600 }}>{selectedReviewRfp.documentIds?.[0] || "Ref missing"}</div>
                  <a href={`/finance/print/${selectedReviewRfp.id}`} target="_blank" style={{ display: "inline-block", marginTop: "12px", color: "var(--blue)", textDecoration: "none", fontSize: "12px" }}>👁️ View Audit Layout (PO + RFP)</a>
                </div>
                <div style={{ padding: "16px", borderRadius: "10px", background: "var(--panel-soft)", border: "1px solid var(--line)" }}>
                  <div className="mini-meta" style={{ marginBottom: "8px" }}>Invoice Vendor</div>
                  {selectedReviewRfp.vendorInvoiceUrl ? (
                    <div>
                      <div style={{ fontSize: "12px", color: "var(--green)", marginBottom: "8px" }}>✅ File Available</div>
                      <button onClick={() => setViewProofUrl(selectedReviewRfp.vendorInvoiceUrl!)} className="secondary-button" style={{ fontSize: "11px", padding: "4px 10px" }}>👁️ View Invoice</button>
                    </div>
                  ) : (
                    <div style={{ fontSize: "12px", color: "#f87171" }}>❌ Invoice Not Uploaded</div>
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

      {/* Review & Audit Modal */}
      {selectedReviewRfp && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ backgroundColor: "var(--panel)", borderRadius: "16px", width: "100%", maxWidth: "800px", border: "1px solid var(--line)", padding: "32px" }}>
             <h2 style={{ marginTop: 0 }}>Review Audit RFP #{selectedReviewRfp.id.substring(0,8)}</h2>
             <div style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "20px" }}>Periksa dokumen dasar dan invoice vendor sebelum memberikan tanda tangan.</div>
             
             <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "32px" }}>
                <div style={{ padding: "16px", borderRadius: "10px", background: "var(--panel-soft)", border: "1px solid var(--line)" }}>
                  <div className="mini-meta" style={{ marginBottom: "8px" }}>Source PO / Document</div>
                  <div style={{ fontWeight: 600 }}>{selectedReviewRfp.documentIds?.[0] || "Ref missing"}</div>
                  <a href={`/finance/print/${selectedReviewRfp.id}`} target="_blank" style={{ display: "inline-block", marginTop: "12px", color: "var(--blue)", textDecoration: "none", fontSize: "12px" }}>👁️ View Audit Layout (PO + RFP)</a>
                </div>
                <div style={{ padding: "16px", borderRadius: "10px", background: "var(--panel-soft)", border: "1px solid var(--line)" }}>
                  <div className="mini-meta" style={{ marginBottom: "8px" }}>Invoice Vendor</div>
                  {selectedReviewRfp.vendorInvoiceUrl ? (
                    <div>
                      <div style={{ fontSize: "12px", color: "var(--green)", marginBottom: "8px" }}>✅ File Available</div>
                      <button onClick={() => setViewProofUrl(selectedReviewRfp.vendorInvoiceUrl!)} className="secondary-button" style={{ fontSize: "11px", padding: "4px 10px" }}>👁️ View Invoice</button>
                    </div>
                  ) : (
                    <div style={{ fontSize: "12px", color: "#f87171" }}>❌ Invoice Not Uploaded</div>
                  )}
                </div>
             </div>

             <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "20px" }}>
                <button onClick={() => setSelectedReviewRfp(null)} className="secondary-button">Close</button>
                <button 
                  onClick={() => handleSignAndForward(selectedReviewRfp)} 
                  className="primary-button" 
                  style={{ background: "var(--blue)" }}
                  disabled={!selectedReviewRfp.vendorInvoiceUrl}
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
