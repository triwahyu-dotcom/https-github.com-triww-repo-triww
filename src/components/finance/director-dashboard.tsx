"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { 
  FileText, 
  CreditCard, 
  CheckCircle2, 
  History, 
  PenTool, 
  Check, 
  AlertCircle, 
  Sparkles, 
  Eye, 
  ArrowRight, 
  ShieldCheck,
  ChevronRight,
  Printer,
  FileDown,
  X,
  Receipt,
  XCircle
} from "lucide-react";
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

const getDocDisplayAmount = (doc: ExpenseDocument) => {
  const subtotal = (doc.lineItems && doc.lineItems.length > 0) 
    ? doc.lineItems.reduce((acc, item) => acc + (Number(item.amount) || 0), 0)
    : doc.amount;
  
  const scheduleTotal = doc.paymentSchedule?.reduce((sum, ev) => sum + (ev.amount || 0), 0) || 0;
  const pphRate = doc.pphType === "PPH21" ? 0.025 : doc.pphType === "PPH23" ? 0.02 : 0.02;
  const isGrossUp = doc.pph21Mode === "grossup" || (scheduleTotal > (subtotal * 1.01));
  
  const tax = (doc.taxAmount || 0) > 0 ? (doc.taxAmount || 0) : (isGrossUp ? (scheduleTotal > 0 ? (scheduleTotal - subtotal - (doc.ppnAmount || 0)) : (subtotal / (1 - pphRate)) - subtotal) : 0);
  const ppn = (doc.ppnAmount || 0) > 0 ? (doc.ppnAmount || 0) : (doc.usePPN ? (subtotal + tax) * 0.11 : 0);
  
  return Math.max(doc.totalPO || 0, doc.amount || 0, scheduleTotal, subtotal + tax + ppn);
};

export function DirectorApprovals({ initialData }: Props) {
  const [activeTab, setActiveTab] = useState<"docs" | "rfps" | "history">("docs");
  const [viewProofUrl, setViewProofUrl] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  const handleFilterDocs = useCallback((items: ExpenseDocument[]) => setFilteredDocs(items), []);
  const handleFilterRfps = useCallback((items: RequestForPayment[]) => setFilteredRfps(items), []);

  const historyItems = useMemo(() => [...historyDocs, ...historyRfps], [historyDocs, historyRfps]);

  const handleFilterHistory = useCallback((items: (ExpenseDocument | RequestForPayment)[]) => {
    const d = items.filter(i => 'issueDate' in i) as ExpenseDocument[];
    const r = items.filter(i => !('issueDate' in i)) as RequestForPayment[];
    setFilteredDocs(d);
    setFilteredRfps(r);
  }, []);

  const handleApproveDoc = async () => {
    if (!selectedDoc) return;
    setIsSigningDoc(true);
    const sigId = `SIG-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    await updateDocStatus(selectedDoc.id, "approved", { digitalSignature: sigId });
    setIsSigningDoc(false);
    setIsDocReviewOpen(false);
    window.location.reload();
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

  const SignaturePad = ({ name, onSign, onReject, isSigning, label }: any) => (
    <div style={{ padding: "32px", display: "flex", flexDirection: "column", gap: "24px", background: '#111113', borderRadius: '16px' }}>
      <div>
        <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px", color: '#f4f4f5' }}>Digital Authorization</h3>
        <p style={{ fontSize: "13px", color: "#71717a", lineHeight: "1.5" }}>
          By signing this document, you provide official authorization as Managing Director.
        </p>
      </div>
      <div style={{ flex: 1, border: "0.5px solid rgba(255,255,255,0.06)", borderRadius: "12px", background: "#18181b", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "30px", minHeight: "260px" }}>
        <ShieldCheck size={42} color="#378ADD" style={{ opacity: 0.3, marginBottom: '20px' }} />
        <div style={{ color: "#378ADD", fontSize: "32px", fontFamily: "'Georgia', serif", fontStyle: "italic", textAlign: "center", textShadow: '0 0 20px rgba(55,138,221,0.2)' }}>
          Eka Marutha Yuswardana
        </div>
        <div style={{ color: "#52525b", fontSize: "11px", marginTop: "12px", textAlign: "center", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 600 }}>
          Managing Director — PT Juara Bisnis Bersama
        </div>
        <div style={{ marginTop: "32px", padding: "6px 16px", borderRadius: "99px", fontSize: "11px", color: "#378ADD", background: "rgba(55,138,221,0.1)", border: '0.5px solid rgba(55,138,221,0.2)' }}>
          System Authenticated Digital Signature
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <button onClick={onSign} disabled={isSigning} style={{ width: "100%", height: "48px", background: '#378ADD', color: '#fff', borderRadius: '10px', border: 'none', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          {isSigning ? "Processing..." : <><PenTool size={18} /> Sign & Authorize {label}</>}
        </button>
        <button onClick={onReject} style={{ background: "transparent", border: "0.5px solid rgba(240,149,149,0.3)", height: "42px", borderRadius: "10px", color: "#F09595", fontSize: "13px", cursor: "pointer", fontWeight: 500 }}>
          Return / Reject Document
        </button>
      </div>
    </div>
  );

  return (
    <WorkspaceShell title="Management Authorization" eyebrow="C-LEVEL WORKSPACE">
      <section className="director-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <SummaryCard label="Pending Docs" value={String(pendingDocs.length)} description={isMobile ? "PO/SPK" : "PO/SPK/Kontrak/CA"} icon={<FileText size={20} />} trendType="up" />
        <SummaryCard label="Pending RFP" value={String(pendingRfps.length)} description={isMobile ? "Payment" : "Payment authorization"} icon={<CreditCard size={20} />} trendType="up" />
        <SummaryCard label="Auth History" value={String(historyDocs.length + historyRfps.length)} description={isMobile ? "Released" : "Released commitments"} icon={<ShieldCheck size={20} />} trendType="neutral" />
      </section>

      <div className="director-tabs" style={{ display: "flex", gap: "10px", marginBottom: "20px", overflowX: 'auto', paddingBottom: '4px' }}>
        {[
          { id: 'docs', label: isMobile ? 'Docs' : 'Approve Dokumen', count: pendingDocs.length, icon: <FileText size={14} /> },
          { id: 'rfps', label: isMobile ? 'RFP' : 'Otorisasi RFP', count: pendingRfps.length, icon: <CreditCard size={14} /> },
          { id: 'history', label: isMobile ? 'Hist.' : 'History Otorisasi', count: null, icon: <History size={14} /> },
        ].map(t => (
          <button 
            key={t.id}
            onClick={() => setActiveTab(t.id as any)} 
            style={{ 
              padding: "8px 18px", 
              borderRadius: "10px", 
              border: activeTab === t.id ? "none" : "0.5px solid rgba(255,255,255,0.08)", 
              cursor: "pointer", 
              fontSize: "13px", 
              background: activeTab === t.id ? "#378ADD" : "transparent", 
              color: activeTab === t.id ? "#fff" : "#71717a", 
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              flexShrink: 0,
              whiteSpace: 'nowrap'
            }}
          >
            {t.icon} {t.label} {t.count !== null && <span style={{ opacity: 0.8, fontSize: '11px', background: activeTab === t.id ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: '4px' }}>{t.count}</span>}
          </button>
        ))}
      </div>

      <div style={{ marginTop: '12px' }}>
        {activeTab === 'docs' && <FilterBar items={pendingDocs} type="docs" onFilter={handleFilterDocs} />}
        {activeTab === 'rfps' && <FilterBar items={pendingRfps} type="rfps" onFilter={handleFilterRfps} />}
        {activeTab === 'history' && <FilterBar items={historyItems} type="docs" onFilter={handleFilterHistory} />}
      </div>

      <div style={{ background: '#111113', borderRadius: '14px', border: '0.5px solid rgba(255,255,255,0.06)', overflow: 'hidden', marginTop: '20px' }}>
          <div className="director-table-header" style={{ 
            display: 'grid', 
            gridTemplateColumns: activeTab === 'rfps' ? "1.5fr 2fr 1.5fr 1fr 1.2fr" : "1.8fr 1.5fr 1.2fr 1fr 1fr 1.2fr",
            background: '#111113',
            padding: '12px 20px',
            borderBottom: '0.5px solid rgba(255,255,255,0.06)'
          }}>
            {activeTab === 'rfps' ? (
              <>
                <div style={{ fontSize: '11px', color: '#52525b', fontWeight: 600 }}>RFP ID</div>
                <div style={{ fontSize: '11px', color: '#52525b', fontWeight: 600 }}>PROJECT / VENDOR</div>
                <div className="hide-mobile" style={{ fontSize: '11px', color: '#52525b', fontWeight: 600 }}>REQ DATE</div>
                <div style={{ fontSize: '11px', color: '#52525b', fontWeight: 600 }}>AMOUNT</div>
                <div style={{ fontSize: '11px', color: '#52525b', fontWeight: 600, textAlign: 'right' }}>ACTIONS</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: '11px', color: '#52525b', fontWeight: 600 }}>DOCUMENT NO</div>
                <div className="hide-mobile" style={{ fontSize: '11px', color: '#52525b', fontWeight: 600 }}>VENDOR</div>
                <div className="hide-mobile" style={{ fontSize: '11px', color: '#52525b', fontWeight: 600 }}>PROJECT</div>
                <div className="hide-mobile" style={{ fontSize: '11px', color: '#52525b', fontWeight: 600 }}>TYPE</div>
                <div style={{ fontSize: '11px', color: '#52525b', fontWeight: 600 }}>VALUE</div>
                <div style={{ fontSize: '11px', color: '#52525b', fontWeight: 600, textAlign: 'right' }}>ACTIONS</div>
              </>
            )}
          </div>

         {((activeTab === 'docs' && filteredDocs.length === 0) || (activeTab === 'rfps' && filteredRfps.length === 0)) ? (
            <div style={{ padding: '80px', textAlign: 'center', color: '#3f3f46' }}>
              <ShieldCheck size={40} style={{ opacity: 0.1, marginBottom: '16px' }} />
              <div>No pending authorizations found</div>
            </div>
         ) : (
           <>
             {activeTab === 'rfps' ? filteredRfps.map(rfp => (
               <div key={rfp.id} className="list-row-premium director-row" style={{ 
                 display: 'grid', gridTemplateColumns: "1.5fr 2fr 1.5fr 1fr 1.2fr", 
                 alignItems: "center", padding: '14px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.05)' 
               }}>
                 <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#e4e4e7' }}>#{rfp.id.substring(0, 10)}</div>
                 <div>
                    <div style={{ fontSize: '13px', color: '#e4e4e7', fontWeight: 500 }}>{rfp.projectName}</div>
                    <div style={{ fontSize: '11px', color: '#52525b' }}>Payee: {rfp.payeeName}</div>
                 </div>
                 <div className="hide-mobile" style={{ fontSize: '12px', color: '#71717a' }}>{formatDateFullID(rfp.requestDate)}</div>
                 <div style={{ fontSize: '13px', fontWeight: 600, color: '#e4e4e7' }}>{formatCurrencyIDR(rfp.netAmount || rfp.totalAmount)}</div>
                 <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button onClick={() => window.open(`/finance/print/${rfp.id}`, "_blank")} className="hide-mobile" style={{ background: 'transparent', border: '0.5px solid rgba(255,255,255,0.1)', color: '#71717a', borderRadius: '6px', padding: '6px 12px', fontSize: '11px', cursor: 'pointer' }}>View</button>
                    <button onClick={() => { setSelectedRfp(rfp); setIsRfpReviewOpen(true); }} style={{ background: '#378ADD', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 16px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>Sign</button>
                 </div>
               </div>
             )) : filteredDocs.map(doc => (
               <div key={doc.id} className="list-row-premium director-row" style={{ 
                 display: 'grid', gridTemplateColumns: "1.8fr 1.5fr 1.2fr 1fr 1fr 1.2fr", 
                 alignItems: "center", padding: '14px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.05)' 
               }}>
                 <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#e4e4e7' }}>{doc.id}</div>
                 <div className="hide-mobile" style={{ fontSize: '13px', color: '#e4e4e7' }}>{doc.vendorName}</div>
                 <div className="hide-mobile" style={{ fontSize: '12px', color: '#a1a1aa' }}>{doc.projectName}</div>
                 <div className="hide-mobile"><span style={{ fontSize: '10px', background: 'rgba(55,138,221,0.1)', color: '#85B7EB', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>{doc.documentType}</span></div>
                 <div style={{ fontSize: '13px', fontWeight: 600, color: '#e4e4e7' }}>{formatCurrencyIDR(getDocDisplayAmount(doc))}</div>
                 <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button onClick={() => window.open(`/finance/print/${doc.id}`, "_blank")} className="hide-mobile" style={{ background: 'transparent', border: '0.5px solid rgba(255,255,255,0.1)', color: '#71717a', borderRadius: '6px', padding: '6px 12px', fontSize: '11px', cursor: 'pointer' }}>View</button>
                    {activeTab !== 'history' && <button onClick={() => { setSelectedDoc(doc); setIsDocReviewOpen(true); }} style={{ background: '#378ADD', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 16px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>Sign</button>}
                 </div>
               </div>
             ))}
           </>
         )}
      </div>

      {/* Review Modals */}
      {isDocReviewOpen && selectedDoc && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", display: "grid", placeItems: "center", zIndex: 1000, backdropFilter: "blur(8px)" }}>
          <div style={{ width: "min(1200px, 95vw)", height: "min(800px, 92vh)", display: "flex", flexDirection: "column", background: "#1f1f23", borderRadius: "20px", overflow: "hidden", border: "0.5px solid rgba(255,255,255,0.1)" }}>
            <div style={{ padding: "24px 32px", borderBottom: "0.5px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center", background: '#111113' }}>
              <div>
                <h2 style={{ fontSize: "20px", color: '#f4f4f5', margin: 0 }}>Review {docTypeLabel[selectedDoc.documentType] || selectedDoc.documentType}</h2>
                <div style={{ fontSize: "12px", color: "#71717a", marginTop: "4px" }}>{selectedDoc.id} • {selectedDoc.vendorName}</div>
              </div>
              <button onClick={() => setIsDocReviewOpen(false)} style={{ background: "rgba(255,255,255,0.05)", border: "none", width: '32px', height: '32px', borderRadius: '8px', color: "#71717a", cursor: "pointer", display: 'grid', placeItems: 'center' }}><X size={18} /></button>
            </div>
            <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1.6fr 1fr", overflow: "hidden" }}>
              <div style={{ padding: "40px", overflowY: "auto", borderRight: "0.5px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", marginBottom: "40px" }}>
                  <div><label style={{ fontSize: '10px', color: '#52525b', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>PROJECT</label><div style={{ fontWeight: 600, fontSize: '15px', color: '#e4e4e7', marginTop: "6px" }}>{selectedDoc.projectName}</div></div>
                  <div><label style={{ fontSize: '10px', color: '#52525b', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>DOC VALUE</label><div style={{ fontWeight: 700, fontSize: "24px", color: "#378ADD", marginTop: "6px" }}>{formatCurrencyIDR(getDocDisplayAmount(selectedDoc))}</div></div>
                  <div><label style={{ fontSize: '10px', color: '#52525b', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>VENDOR</label><div style={{ marginTop: "6px", color: '#a1a1aa' }}>{selectedDoc.vendorName}</div></div>
                  <div><label style={{ fontSize: '10px', color: '#52525b', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>PAYMENT TERMS</label><div style={{ marginTop: "6px", color: '#a1a1aa' }}>{selectedDoc.paymentTerms || "-"}</div></div>
                </div>

                {selectedDoc.lineItems && selectedDoc.lineItems.length > 0 && (
                  <div style={{ marginTop: '40px' }}>
                    <label style={{ fontSize: '10px', color: '#52525b', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '16px', display: 'block' }}>Line Items</label>
                    <div style={{ background: '#111113', borderRadius: '12px', border: '0.5px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                        <thead><tr style={{ background: "#18181b" }}>
                          {["No", "Description", "Qty", "Price", "Total"].map(h => <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "#52525b", fontWeight: 600 }}>{h}</th>)}
                        </tr></thead>
                        <tbody>
                          {selectedDoc.lineItems.map((item, i) => (
                            <tr key={i} style={{ borderBottom: "0.5px solid rgba(255,255,255,0.04)" }}>
                              <td style={{ padding: "12px 16px", color: '#71717a' }}>{i + 1}</td>
                              <td style={{ padding: "12px 16px", color: '#e4e4e7' }}>{item.description}</td>
                              <td style={{ padding: "12px 16px", color: '#a1a1aa' }}>{item.qty} {item.unit}</td>
                              <td style={{ padding: "12px 16px", color: '#a1a1aa' }}>{formatCurrencyIDR(item.price)}</td>
                              <td style={{ padding: "12px 16px", fontWeight: 600, color: '#e4e4e7' }}>{formatCurrencyIDR(item.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                
                {selectedDoc.documentType === "CASH_ADVANCE" && (() => {
                  const linkedRfp = initialData.rfps?.find(r => r.documentIds?.includes(selectedDoc.id));
                  if (!linkedRfp) return null;
                  return (
                    <div style={{ background: "rgba(55,138,221,0.05)", border: "0.5px solid rgba(55,138,221,0.1)", borderRadius: "16px", padding: "24px", marginTop: "40px" }}>
                      <div style={{ fontSize: "11px", textTransform: "uppercase", color: "#378ADD", fontWeight: 700, marginBottom: "20px", letterSpacing: "1.5px" }}>RFP Disbursement Target</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                        <div><label style={{ fontSize: '9px', color: '#52525b', fontWeight: 600 }}>PAYEE</label><div style={{ fontWeight: 600, color: '#e4e4e7', marginTop: '4px' }}>{linkedRfp.payeeName}</div></div>
                        <div><label style={{ fontSize: '9px', color: '#52525b', fontWeight: 600 }}>BANK</label><div style={{ fontWeight: 600, color: '#e4e4e7', marginTop: '4px' }}>{linkedRfp.bankAccount.bankName}</div></div>
                        <div style={{ gridColumn: "span 2" }}>
                          <label style={{ fontSize: '9px', color: '#52525b', fontWeight: 600 }}>ACCOUNT NO</label>
                          <div style={{ fontSize: "28px", fontWeight: 700, color: "#e4e4e7", marginTop: "4px", letterSpacing: '1px' }}>{linkedRfp.bankAccount.accountNo}</div>
                          <div style={{ fontSize: "12px", color: "#71717a", marginTop: "4px" }}>a.n. {linkedRfp.bankAccount.accountName}</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
              <SignaturePad name="Eka Marutha Yuswardana" onSign={handleApproveDoc} onReject={() => setRejectionTarget({ id: selectedDoc.id, type: "DOC" })} isSigning={isSigningDoc} label="Document" />
            </div>
          </div>
        </div>
      )}

      {isRfpReviewOpen && selectedRfp && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", display: "grid", placeItems: "center", zIndex: 1000, backdropFilter: "blur(8px)" }}>
          <div style={{ width: "min(1200px, 95vw)", height: "min(800px, 92vh)", display: "flex", flexDirection: "column", background: "#1f1f23", borderRadius: "20px", overflow: "hidden", border: "0.5px solid rgba(255,255,255,0.1)" }}>
             <div style={{ padding: "24px 32px", borderBottom: "0.5px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center", background: '#111113' }}>
              <div>
                <h2 style={{ fontSize: "20px", color: '#f4f4f5', margin: 0 }}>Review Request For Payment</h2>
                <div style={{ fontSize: "12px", color: "#71717a", marginTop: "4px" }}>#{selectedRfp.id} • {selectedRfp.payeeName}</div>
              </div>
              <button onClick={() => setIsRfpReviewOpen(false)} style={{ background: "rgba(255,255,255,0.05)", border: "none", width: '32px', height: '32px', borderRadius: '8px', color: "#71717a", cursor: "pointer", display: 'grid', placeItems: 'center' }}><X size={18} /></button>
            </div>
            <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1.6fr 1fr", overflow: "hidden" }}>
              <div style={{ padding: "40px", overflowY: "auto", borderRight: "0.5px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", marginBottom: "40px" }}>
                  <div><label style={{ fontSize: '10px', color: '#52525b', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>PROJECT</label><div style={{ fontWeight: 600, fontSize: '15px', color: '#e4e4e7', marginTop: "6px" }}>{selectedRfp.projectName}</div></div>
                  <div><label style={{ fontSize: '10px', color: '#52525b', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>RFP VALUE</label><div style={{ fontWeight: 700, fontSize: "28px", color: "#e4e4e7", marginTop: "6px" }}>{formatCurrencyIDR(selectedRfp.netAmount || selectedRfp.totalAmount)}</div></div>
                  <div><label style={{ fontSize: '10px', color: '#52525b', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>PAYEE / VENDOR</label><div style={{ marginTop: "6px", color: '#a1a1aa' }}>{selectedRfp.payeeName}</div></div>
                  <div><label style={{ fontSize: '10px', color: '#52525b', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>METHOD</label><div style={{ marginTop: "6px", color: '#a1a1aa' }}>{selectedRfp.paymentType}</div></div>
                </div>

                <div style={{ background: "rgba(55,138,221,0.04)", border: "0.5px solid rgba(55,138,221,0.1)", borderRadius: "16px", padding: "24px", marginBottom: "32px" }}>
                  <label style={{ fontSize: '9px', color: '#378ADD', fontWeight: 700, letterSpacing: '1.5px' }}>DESTINATION ACCOUNT</label>
                  <div style={{ marginTop: "16px" }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#e4e4e7' }}>{selectedRfp.bankAccount.bankName}</div>
                    <div style={{ fontSize: "32px", fontWeight: 700, color: "#e4e4e7", margin: "8px 0", letterSpacing: '1px' }}>{selectedRfp.bankAccount.accountNo}</div>
                    <div style={{ fontSize: "12px", color: "#71717a" }}>a.n. {selectedRfp.bankAccount.accountName}</div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "32px" }}>
                  <div style={{ padding: "20px", background: "rgba(255,255,255,0.02)", borderRadius: "14px", border: "0.5px solid rgba(255,255,255,0.06)" }}>
                    <label style={{ fontSize: '9px', color: '#52525b', fontWeight: 600, letterSpacing: '1px' }}>FINANCE AUDIT</label>
                    <div style={{ marginTop: "12px" }}>
                      <div style={{ fontWeight: 600, color: '#e4e4e7', fontSize: '13px' }}>{selectedRfp.financeApprovedBy?.name || "Finance Team"}</div>
                      <div style={{ fontSize: '11px', color: '#52525b', marginTop: '2px' }}>{selectedRfp.financeApprovedBy?.date ? formatDateFullID(selectedRfp.financeApprovedBy.date) : "System Verified"}</div>
                    </div>
                  </div>
                  <div style={{ padding: "20px", background: "rgba(255,255,255,0.02)", borderRadius: "14px", border: "0.5px solid rgba(255,255,255,0.06)" }}>
                    <label style={{ fontSize: '9px', color: '#52525b', fontWeight: 600, letterSpacing: '1px' }}>AUDIT ARTIFACTS</label>
                    <div style={{ marginTop: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                       <button onClick={() => window.open(`/finance/print/${selectedRfp.documentIds?.[0] || selectedRfp.id}?only=po`, "_blank")} style={{ background: '#111113', border: '0.5px solid rgba(55,138,221,0.2)', color: '#85B7EB', borderRadius: '6px', padding: '8px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><FileText size={12} /> PO/SPK</button>
                       <button onClick={() => window.open(`/finance/print/${selectedRfp.id}?only=rfp`, "_blank")} style={{ background: '#111113', border: '0.5px solid rgba(93,202,165,0.2)', color: '#5DCAA5', borderRadius: '6px', padding: '8px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><Receipt size={12} /> RFP Doc</button>
                       {selectedRfp.vendorInvoiceUrl ? (
                          <button onClick={() => setViewProofUrl(selectedRfp.vendorInvoiceUrl!)} style={{ gridColumn: 'span 2', background: '#111113', border: '0.5px solid rgba(239,159,39,0.2)', color: '#EF9F27', borderRadius: '6px', padding: '8px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><Eye size={12} /> Invoice Vendor</button>
                       ) : (
                          <div style={{ gridColumn: 'span 2', fontSize: '10px', color: '#f09595', textAlign: 'center', padding: '8px', background: 'rgba(240,149,149,0.05)', borderRadius: '6px' }}>Invoice Not Attached</div>
                       )}
                    </div>
                  </div>
                </div>
                <div><label style={{ fontSize: '10px', color: '#52525b', fontWeight: 600, letterSpacing: '1px' }}>NOTES</label><div style={{ fontSize: "13px", color: "#a1a1aa", marginTop: "8px", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{selectedRfp.notes || "No additional notes provided."}</div></div>
              </div>
              <SignaturePad name="Eka Marutha Yuswardana" onSign={handleApproveRfp} onReject={() => setRejectionTarget({ id: selectedRfp.id, type: "RFP" })} isSigning={isSigningRfp} label="RFP" />
            </div>
          </div>
        </div>
      )}

      {viewProofUrl && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px" }} onClick={() => setViewProofUrl(null)}>
          <img src={viewProofUrl} alt="Preview" style={{ maxWidth: "100%", maxHeight: "90vh", borderRadius: "12px", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }} />
        </div>
      )}

      {rejectionTarget && (
        <RejectionModal title={`Reject ${rejectionTarget.type}`} onClose={() => setRejectionTarget(null)} onConfirm={confirmRejection} />
      )}

      <style jsx global>{`
        @media (max-width: 1024px) {
          .director-stat-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .director-table-header {
            grid-template-columns: 1fr 100px 80px !important;
          }
          .director-row {
            grid-template-columns: 1fr 100px 80px !important;
          }
          .hide-mobile {
            display: none !important;
          }
        }

        @media (max-width: 640px) {
          .director-stat-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </WorkspaceShell>
  );
}
