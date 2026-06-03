"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { 
  FileText, 
  Search, 
  CreditCard, 
  Coins, 
  Eye, 
  AlertCircle, 
  Check, 
  CheckCircle2, 
  History, 
  ShieldCheck, 
  ChevronRight,
  Printer,
  FileDown,
  X,
  Plus,
  ArrowRight,
  Receipt,
  Trash2
} from "lucide-react";
import { FinanceDashboardData, RequestForPayment, ExpenseDocument } from "@/lib/finance/types";
import { WorkspaceShell } from "../layout/workspace-shell";
import { MetricCard } from "../ui/MetricCard";
import { formatCurrencyIDR, formatDateFullID } from "@/lib/utils/format";
import { updateRFPStatus } from "@/lib/finance/actions";
import { ViewSwitcher } from "./portal-router";
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
        <p className="mini-meta" style={{ marginBottom: "24px" }}>RFP #{rfp.id.substring(0,8)} — {formatCurrencyIDR(rfp.netAmount || rfp.totalAmount)}</p>
        
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
  viewMode?: "monitoring" | "operational";
  onViewModeChange?: (mode: "monitoring" | "operational") => void;
}

export function FinanceOpsDashboard({ 
  initialData,
  viewMode,
  onViewModeChange
}: Props) {
  const [activeTab, setActiveTabRaw] = useState<"doc_verification" | "verification" | "payment" | "settlement" | "processed" | "budget">("doc_verification");
  const [isMobile, setIsMobile] = useState(false);

  const headerActions = (
    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
      {viewMode && onViewModeChange && (
        <ViewSwitcher viewMode={viewMode} onViewModeChange={onViewModeChange} />
      )}
    </div>
  );

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
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

  const setActiveTab = (newTab: any) => {
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
  
  const handleRejectRfp = (rfpId: string) => setRejectionRfpId(rfpId);

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

  const handleRejectDoc = (docId: string) => setRejectionDocId(docId);

  const confirmDocRejection = async (reason: string) => {
    if (!rejectionDocId) return;
    await handleUpdateDocStatus(rejectionDocId, "draft", { rejectionReason: reason });
    setRejectionDocId(null);
    window.location.reload();
  };

  const handleDeleteDoc = async (id: string) => {
    if (!confirm("Hapus dokumen ini secara permanen?")) return;
    await fetch(`/api/finance/document?id=${id}`, { method: "DELETE" });
    window.location.reload();
  };

  const handleDeleteRfp = async (id: string) => {
    if (!confirm("Hapus RFP ini secara permanen?")) return;
    await fetch(`/api/finance/rfp?id=${id}`, { method: "DELETE" });
    window.location.reload();
  };

  const docVerificationQueue = useMemo(() => (initialData.expenseDocuments || []).filter(d => d.status === "pending_finance"), [initialData.expenseDocuments]);
  const verificationQueue = useMemo(() => (initialData.rfps || []).filter(r => r.status === "pending_finance"), [initialData.rfps]);
  const paymentQueue = useMemo(() => (initialData.rfps || []).filter(r => r.status === "approved"), [initialData.rfps]);
  const settlementQueue = useMemo(() => (initialData.rfps || []).filter(r => r.status === "pending_settlement_approval"), [initialData.rfps]);
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

  const handleFilter = useCallback((items: any[]) => setFilteredItems(items), []);

  return (
    <WorkspaceShell title="Finance Operations" eyebrow="FINANCE WORKSPACE" actions={headerActions}>
      <section className="finance-ops-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px', marginBottom: '24px' }}>
         <MetricCard label="Docs Verify" value={String(docVerificationQueue.length)} subtitle={isMobile ? "Pending" : "PO/SPK pending check"} icon={<FileText size={16} />} />
         <MetricCard label="RFP Review" value={String(verificationQueue.length)} subtitle={isMobile ? "Review" : "Awaiting audit"} icon={<Search size={16} />} />
         <MetricCard label="Ready to Pay" value={String(paymentQueue.length)} subtitle={isMobile ? "Approved" : "C-Level approved"} icon={<CreditCard size={16} />} />
         <MetricCard label="Pending STL" value={String(settlementQueue.length)} subtitle={isMobile ? "STL" : "Waiting approval"} icon={<Receipt size={16} />} />
         <MetricCard label="Outstanding" value={formatCurrencyIDR(initialData.summary?.totalOutstandingAmount || 0)} subtitle={isMobile ? "Unpaid" : "Unpaid commitment"} icon={<Coins size={16} />} valueColor="var(--accent-danger)" />
         <MetricCard label="Processed" value={String(processedQueue.length)} subtitle={isMobile ? "Done" : "Completed"} icon={<CheckCircle2 size={16} />} valueColor="var(--accent-success)" />
      </section>

      <div className="finance-ops-tabs" style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border-default)', marginBottom: '24px', overflowX: 'auto' }}>
        {[
          { id: 'doc_verification', label: isMobile ? 'Docs' : 'Dokumen Masuk', count: docVerificationQueue.length },
          { id: 'verification', label: isMobile ? 'RFP' : 'RFP Masuk', count: verificationQueue.length },
          { id: 'payment', label: isMobile ? 'Pay' : 'Payment Hub', count: paymentQueue.length },
          { id: 'settlement', label: isMobile ? 'STL' : 'Settlement CA', count: caPaidQueue.length + settlementQueue.length },
          { id: 'processed', label: isMobile ? 'Hist.' : 'Historis Pembayaran', count: processedQueue.length },
          { id: 'budget', label: isMobile ? 'Budg.' : 'Project Budget', count: 0 },
        ].map(t => (
          <div
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`tab-item ${activeTab === t.id ? 'tab-active' : 'tab-inactive'}`}
            style={{ padding: '12px 18px', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            {t.label} <span style={{ opacity: 0.6, fontSize: '11px', marginLeft: '4px' }}>({t.count})</span>
          </div>
        ))}
      </div>

      <FilterBar items={activeQueue} type="rfps" onFilter={handleFilter} />

      <div style={{ background: '#111113', borderRadius: '12px', border: '0.5px solid rgba(255,255,255,0.06)', overflow: 'hidden', marginTop: '20px' }}>
         <div className="finance-ops-table-header" style={{ 
            display: 'grid', 
            gridTemplateColumns: activeTab === "doc_verification" ? "1.5fr 1.2fr 1fr 1fr 1.5fr" : "1fr 1.5fr 1fr 1fr 1.5fr",
            background: '#111113',
            padding: '10px 16px',
            borderBottom: '0.5px solid rgba(255,255,255,0.06)'
          }}>
           {activeTab === "doc_verification" ? (
             <>
               <div style={{ fontSize: '11px', color: '#52525b', fontWeight: 500 }}>DOKUMEN DETAIL</div>
               <div className="hide-mobile" style={{ fontSize: '11px', color: '#52525b', fontWeight: 500 }}>VENDOR NAME</div>
               <div style={{ fontSize: '11px', color: '#52525b', fontWeight: 500 }}>AMOUNT</div>
               <div className="hide-mobile" style={{ fontSize: '11px', color: '#52525b', fontWeight: 500 }}>DATE</div>
               <div style={{ fontSize: '11px', color: '#52525b', fontWeight: 500, textAlign: 'right' }}>ACTIONS</div>
             </>
           ) : (
             <>
               <div style={{ fontSize: '11px', color: '#52525b', fontWeight: 500 }}>RFP DETAIL</div>
               <div className="hide-mobile" style={{ fontSize: '11px', color: '#52525b', fontWeight: 500 }}>PROJECT / PAYEE</div>
               <div style={{ fontSize: '11px', color: '#52525b', fontWeight: 500 }}>AMOUNT</div>
               <div className="hide-mobile" style={{ fontSize: '11px', color: '#52525b', fontWeight: 500 }}>REQUEST DATE</div>
               <div style={{ fontSize: '11px', color: '#52525b', fontWeight: 500, textAlign: 'right' }}>ACTIONS</div>
             </>
           )}
         </div>

         {filteredItems.length === 0 ? (
           <div style={{ padding: '80px 20px', textAlign: 'center', color: '#3f3f46' }}>
              Tidak ada item yang sesuai filter
           </div>
         ) : filteredItems.map((item) => {
           if (activeTab === "doc_verification") {
             const doc = item as ExpenseDocument;
             return (
                <div key={doc.id} className="list-row-premium finance-ops-row" style={{ 
                  display: 'grid', gridTemplateColumns: "1.5fr 1.2fr 1fr 1fr 1.5fr", 
                  alignItems: "center", padding: '12px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.05)' 
                }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#e4e4e7' }}>{doc.id}</div>
                    <div style={{ fontSize: '11px', color: '#52525b' }}>{doc.documentType} • {doc.projectName}</div>
                  </div>
                  <div className="hide-mobile" style={{ fontSize: '13px', color: '#a1a1aa' }}>{doc.vendorName}</div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#e4e4e7' }}>{formatCurrencyIDR(doc.amount)}</div>
                  <div className="hide-mobile" style={{ fontSize: '12px', color: '#71717a' }}>{formatDateFullID(doc.issueDate)}</div>
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                     <button onClick={() => window.open(`/finance/print/${doc.id}`, "_blank")} className="mini-btn" style={{ background: 'transparent', border: '0.5px solid rgba(255,255,255,0.12)', color: '#71717a', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer' }}>Audit</button>
                     <button onClick={() => handleRejectDoc(doc.id)} className="hide-mobile" style={{ background: 'transparent', border: '0.5px solid rgba(226,75,74,0.2)', color: '#F09595', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer' }}>Return</button>
                     <button onClick={() => setSelectedReviewDoc(doc)} style={{ background: '#378ADD', color: '#fff', borderRadius: '6px', padding: '4px 12px', fontSize: '11px', border: 'none', cursor: 'pointer', fontWeight: 500 }}>{isMobile ? 'Sign' : 'Sign & Forward'}</button>
                  </div>
                </div>
              );
           } else {
             const rfp = item as RequestForPayment;
             return (
                <div key={rfp.id} className="list-row-premium finance-ops-row" style={{ 
                  display: 'grid', gridTemplateColumns: "1fr 1.5fr 1fr 1fr 1.5fr", 
                  alignItems: "center", padding: '12px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.05)' 
                }}>
                  <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#e4e4e7' }}>#{rfp.id.substring(0,8)}</div>
                  <div className="hide-mobile">
                     <div style={{ fontSize: '13px', color: '#e4e4e7' }}>{rfp.projectName}</div>
                     <div style={{ fontSize: '11px', color: '#52525b' }}>{rfp.payeeName}</div>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#e4e4e7' }}>{formatCurrencyIDR(rfp.netAmount || rfp.totalAmount)}</div>
                  <div className="hide-mobile" style={{ fontSize: '12px', color: '#71717a' }}>{formatDateFullID(rfp.requestDate)}</div>
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                     <button onClick={() => window.open(`/finance/print/${rfp.id}`, "_blank")} className="mini-btn" style={{ background: 'transparent', border: '0.5px solid rgba(255,255,255,0.12)', color: '#71717a', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer' }}>Audit</button>
                     {activeTab === 'verification' && (
                        <>
                          <button onClick={() => handleRejectRfp(rfp.id)} className="hide-mobile" style={{ background: 'transparent', border: '0.5px solid rgba(226,75,74,0.2)', color: '#F09595', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer' }}>Return</button>
                          <button onClick={() => setSelectedReviewRfp(rfp)} style={{ background: '#378ADD', color: '#fff', borderRadius: '6px', padding: '4px 12px', fontSize: '11px', border: 'none', cursor: 'pointer', fontWeight: 500 }}>{isMobile ? 'Review' : 'Review & Sign'}</button>
                        </>
                     )}
                     {activeTab === 'payment' && (
                        <button onClick={() => setSelectedRfpForPayment(rfp)} style={{ background: '#5DCAA5', color: '#fff', borderRadius: '6px', padding: '4px 12px', fontSize: '11px', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Paid</button>
                     )}
                     {activeTab === 'settlement' && rfp.settlementDetails && (
                        <button onClick={async () => { await handleUpdateStatus(rfp.id, 'settled'); window.location.reload(); }} style={{ background: '#5DCAA5', color: '#fff', borderRadius: '6px', padding: '4px 12px', fontSize: '11px', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Approve</button>
                     )}
                  </div>
                </div>
              );
           }
         })}
      </div>

      {selectedReviewRfp && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ backgroundColor: "#1f1f23", borderRadius: "16px", width: "100%", maxWidth: "800px", border: "0.5px solid rgba(255,255,255,0.1)", padding: "32px" }}>
             <h2 style={{ fontSize: '20px', color: '#f4f4f5', margin: '0 0 8px 0' }}>Review Audit RFP #{selectedReviewRfp.id.substring(0,8)}</h2>
             <div style={{ fontSize: "13px", color: "#71717a", marginBottom: "24px" }}>Periksa dokumen dasar dan invoice vendor sebelum memberikan tanda tangan.</div>
             
             <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "32px" }}>
                 <div style={{ padding: "16px", borderRadius: "10px", background: "#111113", border: "0.5px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                      <FileText size={16} color="#378ADD" />
                      <div style={{ fontSize: "13px", fontWeight: 600, color: '#e4e4e7' }}>PO / SPK</div>
                    </div>
                    <div style={{ flex: 1, fontSize: "11px", color: "#52525b", marginBottom: "16px" }}>{selectedReviewRfp.documentIds?.[0] || "-"}</div>
                    <button onClick={() => window.open(`/finance/print/${selectedReviewRfp.documentIds?.[0]}`, "_blank")} style={{ width: "100%", padding: '6px', borderRadius: '6px', background: 'rgba(55,138,221,0.1)', color: '#85B7EB', border: 'none', fontSize: '11px', cursor: 'pointer' }}>Buka PO</button>
                 </div>
                 <div style={{ padding: "16px", borderRadius: "10px", background: "#111113", border: "0.5px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                      <Receipt size={16} color="#5DCAA5" />
                      <div style={{ fontSize: "13px", fontWeight: 600, color: '#e4e4e7' }}>RFP Dokumen</div>
                    </div>
                    <div style={{ flex: 1, fontSize: "11px", color: "#52525b", marginBottom: "16px" }}>RFP-{selectedReviewRfp.id.substring(0,6)}</div>
                    <button onClick={() => window.open(`/finance/print/${selectedReviewRfp.id}`, "_blank")} style={{ width: "100%", padding: '6px', borderRadius: '6px', background: 'rgba(93,202,165,0.1)', color: '#5DCAA5', border: 'none', fontSize: '11px', cursor: 'pointer' }}>Buka RFP</button>
                 </div>
                 <div style={{ padding: "16px", borderRadius: "10px", background: "#111113", border: "0.5px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                      <Eye size={16} color="#EF9F27" />
                      <div style={{ fontSize: "13px", fontWeight: 600, color: '#e4e4e7' }}>Invoice Vendor</div>
                    </div>
                    <div style={{ flex: 1, fontSize: "11px", color: "#52525b", marginBottom: "16px" }}>
                      {selectedReviewRfp.vendorInvoiceUrl ? "Terlampir" : "Tidak ada"}
                    </div>
                    <button disabled={!selectedReviewRfp.vendorInvoiceUrl} onClick={() => setViewProofUrl(selectedReviewRfp.vendorInvoiceUrl!)} style={{ width: "100%", padding: '6px', borderRadius: '6px', background: 'rgba(239,159,39,0.1)', color: '#EF9F27', border: 'none', fontSize: '11px', cursor: 'pointer', opacity: selectedReviewRfp.vendorInvoiceUrl ? 1 : 0.4 }}>Buka Invoice</button>
                 </div>
             </div>

             <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button onClick={() => setSelectedReviewRfp(null)} style={{ padding: '8px 16px', borderRadius: '8px', border: '0.5px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#71717a', cursor: 'pointer' }}>Tutup</button>
                <button onClick={() => handleSignAndForward(selectedReviewRfp)} style={{ padding: '8px 20px', borderRadius: '8px', background: '#378ADD', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Sign & Forward to Director</button>
             </div>
          </div>
        </div>
      )}

      {selectedRfpForPayment && (
        <PaymentProofModal rfp={selectedRfpForPayment} onClose={() => setSelectedRfpForPayment(null)} onSuccess={(url) => { handleUpdateStatus(selectedRfpForPayment.id, 'paid', { paymentProofUrl: url }); setSelectedRfpForPayment(null); }} />
      )}
      {rejectionRfpId && <RejectionModal title="Kembalikan RFP" onClose={() => setRejectionRfpId(null)} onConfirm={confirmRejection} />}
      {rejectionDocId && <RejectionModal title="Kembalikan Dokumen" onClose={() => setRejectionDocId(null)} onConfirm={confirmDocRejection} />}
      
      {selectedReviewDoc && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ backgroundColor: "#1f1f23", borderRadius: "16px", width: "100%", maxWidth: "480px", border: "0.5px solid rgba(255,255,255,0.1)", padding: "32px", textAlign: "center" }}>
            <ShieldCheck size={48} color="#378ADD" style={{ marginBottom: '16px' }} />
            <h2 style={{ fontSize: '20px', color: '#f4f4f5', margin: '0 0 12px 0' }}>Forward ke Direktur</h2>
            <div style={{ fontSize: "13px", color: "#71717a", marginBottom: "24px", lineHeight: 1.6 }}>
              Konfirmasi bahwa dokumen <strong>{selectedReviewDoc.id}</strong> telah diverifikasi kelengkapannya oleh Finance.
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
              <button onClick={() => setSelectedReviewDoc(null)} style={{ padding: '8px 16px', borderRadius: '8px', border: '0.5px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#71717a', cursor: 'pointer' }}>Batal</button>
              <button onClick={() => handleSignAndForwardDoc(selectedReviewDoc)} style={{ padding: '8px 24px', borderRadius: '8px', background: '#378ADD', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Ya, Forward</button>
            </div>
          </div>
        </div>
      )}

      {viewProofUrl && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px" }} onClick={() => setViewProofUrl(null)}>
          <img src={viewProofUrl} alt="Preview" style={{ maxWidth: "100%", maxHeight: "90vh", borderRadius: "8px", boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }} />
        </div>
      )}
      {selectedRfpForSettlement && <SettlementModal rfp={selectedRfpForSettlement} isOpen={true} onClose={() => setSelectedRfpForSettlement(null)} />}
      
      <style jsx global>{`
        @media (max-width: 1024px) {
          .finance-ops-stats {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .finance-ops-table-header {
            display: none !important;
          }
          .finance-ops-row {
            display: flex !important;
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 10px !important;
            padding: 14px 16px !important;
            background: rgba(255, 255, 255, 0.02) !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
          }
          .finance-ops-row > div {
            text-align: left !important;
          }
          .finance-ops-row > div:last-child {
            justify-content: flex-start !important;
            margin-top: 4px;
          }
          .hide-mobile {
            display: none !important;
          }
          .mini-btn {
            padding: 4px 6px !important;
          }
        }

        @media (max-width: 640px) {
          .finance-ops-stats {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </WorkspaceShell>
  );
}
