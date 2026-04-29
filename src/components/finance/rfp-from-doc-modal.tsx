"use client";

import { useState, useEffect } from "react";
import { ExpenseDocument, RequestForPayment } from "@/lib/finance/types";
import { formatCurrencyIDR } from "@/lib/utils/format";
import { X, Check, FileText, Landmark, Wallet, Calendar, AlertCircle, ArrowRight, Upload } from "lucide-react";

interface Props {
  doc: ExpenseDocument;
  editRfp?: RequestForPayment;
  allRfps?: any[];
  availableVendors?: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export function RfpFromDocModal({ doc, editRfp, allRfps = [], availableVendors, onClose, onSuccess }: Props) {
  const isCA = doc.documentType === "CASH_ADVANCE";

  const getNextUnpaidTerm = () => {
    if (!doc.paymentSchedule || doc.paymentSchedule.length === 0) return null;
    const rfpsForDoc = allRfps.filter(r => r.documentIds && r.documentIds.includes(doc.id));
    for (const term of doc.paymentSchedule) {
      const alreadyRequested = rfpsForDoc.some(r => r.terminLabel === term.label);
      if (!alreadyRequested) return term;
    }
    return null;
  };

  const nextTerm = editRfp ? null : getNextUnpaidTerm();
  const defaultAmount = nextTerm ? (nextTerm.amount || Math.round(doc.amount * (nextTerm.percentage || 0) / 100)) : doc.amount;
  const defaultTermLabel = nextTerm ? nextTerm.label : (doc.paymentSchedule && doc.paymentSchedule.length > 0 ? "" : "Full Payment");

  const [selectedTermRatio, setSelectedTermRatio] = useState<"100" | "50" | "30" | "20" | "custom">("100");
  const [rfpAmount, setRfpAmount] = useState<number>(defaultAmount);
  const [paymentTerms, setPaymentTerms] = useState(defaultTermLabel);
  const [paymentType, setPaymentType] = useState<"Transfer" | "Cash">("Transfer");
  const [bankName, setBankName] = useState("");
  const [accountNo, setAccountNo] = useState("");
  const [accountName, setAccountName] = useState("");
  const [requiredDate, setRequiredDate] = useState("");
  const [notes, setNotes] = useState(doc.description || "");
  const [invoiceFile, setInvoiceFile] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [pphType, setPphType] = useState<"NONE" | "PPH21" | "PPH23">("NONE");
  const [taxableItems, setTaxableItems] = useState<Record<number, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editRfp) {
      setRfpAmount(editRfp.totalAmount);
      setPaymentTerms(editRfp.terminLabel || "");
      setPaymentType(editRfp.paymentType as "Transfer" | "Cash");
      setBankName(editRfp.bankAccount?.bankName || "");
      setAccountNo(editRfp.bankAccount?.accountNo || "");
      setAccountName(editRfp.bankAccount?.accountName || "");
      setNotes(editRfp.notes || "");
      setRequiredDate(editRfp.requiredDate || "");
      setSelectedTermRatio("custom");
    }
  }, [editRfp]);

  useState(() => {
    if (availableVendors && doc.vendorName) {
      const vendor = availableVendors.find(v => v.name === doc.vendorName);
      if (vendor) {
        setBankName(vendor.bankName || "");
        setAccountNo(vendor.bankAccountNumber || "");
        setAccountName(vendor.bankAccountHolder || "");
      }
    }
  });

  const ratio = doc.amount > 0 ? rfpAmount / doc.amount : 0;
  const pphRate = pphType === "PPH21" ? 0.025 : (pphType === "PPH23" ? 0.02 : 0);
  
  const taxableBase = doc.lineItems?.filter(li => taxableItems[li.no]).reduce((sum, li) => sum + li.amount, 0) || 0;
  const rfpTaxableBase = taxableBase * ratio;
  const rfpPPh = rfpTaxableBase * pphRate;
  const netToVendor = rfpAmount - rfpPPh;

  const handleInvoiceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => { setInvoiceFile(reader.result as string); setIsUploading(false); };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (rfpAmount === 0 || (paymentType === "Transfer" && (!bankName || !accountNo))) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/finance/rfp", {
        method: editRfp ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editRfp?.id, documentId: doc.id, rfpAmount, paymentTerms, paymentType,
          bankAccount: { bankName, accountNo, accountName }, notes, requiredDate, vendorInvoiceUrl: invoiceFile,
          taxAmount: rfpPPh, netAmount: netToVendor, pphType,
        }),
      });
      if (res.ok) {
        onSuccess();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Gagal: ${err.message || 'Server error'}`);
      }
    } catch {
      alert("Terjadi kesalahan koneksi.");
    } finally { setIsSubmitting(false); }
  };

  const docTypeLabel: Record<string, string> = { PO: "Purchase Order", SPK: "Surat Perintah Kerja", KONTRAK: "Surat Perjanjian Kontrak", CASH_ADVANCE: "Cash Advance" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)", zIndex: 3000, display: "grid", placeItems: "center", padding: "20px" }}>
      <div style={{ background: "#1f1f23", borderRadius: "24px", width: "100%", maxWidth: "720px", border: "0.5px solid rgba(255,255,255,0.1)", boxShadow: "0 25px 60px rgba(0,0,0,0.6)", overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '94vh' }}>
        
        <div style={{ padding: '24px 32px', background: '#111113', borderBottom: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(55,138,221,0.1)', color: '#378ADD', display: 'grid', placeItems: 'center' }}>
              <FileText size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#f4f4f5" }}>Request For Payment</h3>
              <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#52525b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Based on {docTypeLabel[doc.documentType]}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#52525b', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
          <div style={{ padding: '24px', background: 'rgba(55,138,221,0.04)', borderRadius: '16px', border: '1px solid rgba(55,138,221,0.1)', marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#378ADD', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>Source Document</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#f4f4f5' }}>{doc.projectName}</div>
                <div style={{ fontSize: '13px', color: '#71717a', marginTop: '4px' }}>{docTypeLabel[doc.documentType]} • {doc.vendorName}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: '#52525b', fontWeight: 700, textTransform: 'uppercase' }}>Total Value</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#f4f4f5', marginTop: '4px' }}>{formatCurrencyIDR(doc.amount)}</div>
              </div>
            </div>
          </div>

          {doc.paymentSchedule && doc.paymentSchedule.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
               <h4 style={{ margin: '0 0 16px', fontSize: '11px', fontWeight: 700, color: '#52525b', textTransform: 'uppercase', letterSpacing: '1px' }}>Payment Schedule Selection</h4>
               <div style={{ display: 'grid', gap: '8px' }}>
                  {doc.paymentSchedule.map((term, idx) => {
                    const isPaid = allRfps.filter(r => r.documentIds.includes(doc.id)).some(r => r.terminLabel === term.label);
                    const isNext = !isPaid && (idx === 0 || allRfps.filter(r => r.documentIds.includes(doc.id)).some(r => r.terminLabel === doc.paymentSchedule![idx-1].label));
                    return (
                      <div key={idx} style={{ padding: '16px 20px', borderRadius: '12px', background: isNext ? 'rgba(55,138,221,0.05)' : isPaid ? 'rgba(34,197,94,0.03)' : '#18181b', border: isNext ? '1.5px solid #378ADD' : '1px solid rgba(255,255,255,0.06)', opacity: (!isPaid && !isNext) ? 0.4 : 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {isPaid ? <div style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 700 }}>PAID</div> : isNext ? <div style={{ background: 'rgba(55,138,221,0.1)', color: '#378ADD', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 700 }}>UP NEXT</div> : <div style={{ background: '#111113', color: '#52525b', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 700 }}>PENDING</div>}
                            <span style={{ fontSize: '14px', fontWeight: 600, color: '#f4f4f5' }}>{term.label} ({term.percentage}%)</span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#71717a', marginTop: '4px' }}>Target: {term.date || "Upon delivery"}</div>
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: isNext ? '#378ADD' : '#f4f4f5' }}>{formatCurrencyIDR(term.amount || (doc.amount * (term.percentage || 0) / 100))}</div>
                      </div>
                    );
                  })}
               </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
            <div className="p-input-group">
              <label>Amount to Request (IDR)</label>
              <div style={{ position: 'relative' }}>
                <input type="number" className="p-input" style={{ fontSize: '18px', fontWeight: 800, color: '#378ADD', background: doc.paymentSchedule?.length ? '#111113' : '#111113' }} value={rfpAmount || ""} disabled={!!doc.paymentSchedule?.length} onChange={e => setRfpAmount(Number(e.target.value))} />
                {doc.paymentSchedule?.length && <div style={{ position: 'absolute', right: '12px', top: '10px', fontSize: '10px', fontWeight: 700, color: '#378ADD' }}>LOCKED</div>}
              </div>
            </div>
            <div className="p-input-group"><label>Term Label</label><input className="p-input" value={paymentTerms} readOnly={!!doc.paymentSchedule?.length} onChange={e => setPaymentTerms(e.target.value)} /></div>
          </div>

          <div style={{ marginBottom: '32px', padding: '24px', background: '#18181b', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#52525b', textTransform: 'uppercase', letterSpacing: '1px' }}>Taxation (Deduction)</h4>
              <select className="p-input" style={{ width: '180px' }} value={pphType} onChange={e => setPphType(e.target.value as any)}>
                <option value="NONE">No PPh Deduction</option>
                <option value="PPH21">PPh 21 (2.5%)</option>
                <option value="PPH23">PPh 23 (2.0%)</option>
              </select>
            </div>

            {pphType !== "NONE" && (
              <>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '20px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <th style={{ textAlign: 'left', padding: '8px', color: '#52525b' }}>Item Description</th>
                      <th style={{ textAlign: 'right', padding: '8px', color: '#52525b' }}>Amount</th>
                      <th style={{ textAlign: 'center', padding: '8px', color: '#52525b', width: '60px' }}>Taxable?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doc.lineItems?.map((li) => (
                      <tr key={li.no} style={{ borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '8px', color: '#e4e4e7' }}>{li.description}</td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#a1a1aa' }}>{formatCurrencyIDR(li.amount)}</td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          <input type="checkbox" checked={!!taxableItems[li.no]} onChange={e => setTaxableItems(prev => ({ ...prev, [li.no]: e.target.checked }))} style={{ cursor: 'pointer' }} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ padding: '16px', background: 'rgba(239,68,68,0.05)', borderRadius: '12px', border: '1.5px dashed rgba(239,68,68,0.15)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                   <div>
                      <div style={{ fontSize: '10px', color: '#ef4444', fontWeight: 700, textTransform: 'uppercase' }}>PPh {pphType === "PPH21" ? "21" : "23"} Deduction</div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#ef4444', marginTop: '4px' }}>- {formatCurrencyIDR(rfpPPh)}</div>
                   </div>
                   <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '10px', color: '#22c55e', fontWeight: 700, textTransform: 'uppercase' }}>Net to Vendor</div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#22c55e', marginTop: '4px' }}>{formatCurrencyIDR(netToVendor)}</div>
                   </div>
                </div>
              </>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '32px', marginBottom: '32px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#52525b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Payment Mode</label>
              <div style={{ display: 'flex', background: '#111113', padding: '4px', borderRadius: '10px' }}>
                {['Transfer', 'Cash'].map(m => (
                  <button key={m} onClick={() => setPaymentType(m as any)} style={{ flex: 1, padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: paymentType === m ? '#27272a' : 'transparent', color: paymentType === m ? '#f4f4f5' : '#52525b', border: 'none' }}>{m}</button>
                ))}
              </div>
            </div>
            {paymentType === "Transfer" && (
              <div style={{ background: '#18181b', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255,255,255,0.06)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div className="p-input-group"><label>Bank</label><input className="p-input" value={bankName} onChange={e => setBankName(e.target.value)} /></div>
                <div className="p-input-group"><label>Account No</label><input className="p-input" value={accountNo} onChange={e => setAccountNo(e.target.value)} /></div>
                <div className="p-input-group"><label>Holder</label><input className="p-input" value={accountName} onChange={e => setAccountName(e.target.value)} /></div>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: '24px', marginBottom: '32px' }}>
            <div className="p-input-group"><label>Internal Notes</label><input className="p-input" value={notes} onChange={e => setNotes(e.target.value)} /></div>
            <div className="p-input-group"><label>Due Date</label><input type="date" className="p-input" value={requiredDate} onChange={e => setRequiredDate(e.target.value)} /></div>
          </div>

          <div style={{ padding: '20px', background: '#18181b', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#f4f4f5' }}>Supporting Audit Document</div>
                <div style={{ fontSize: '11px', color: '#52525b', marginTop: '2px' }}>Upload vendor invoice or delivery receipt</div>
              </div>
              <label style={{ cursor: 'pointer', background: 'rgba(55,138,221,0.1)', color: '#378ADD', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Upload size={14} /> {isUploading ? 'Uploading...' : 'Choose File'}
                <input type="file" hidden accept="image/*,application/pdf" onChange={handleInvoiceChange} />
              </label>
            </div>
            {invoiceFile && <div style={{ marginTop: '12px', fontSize: '11px', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '6px' }}><Check size={14} /> Document attached successfully</div>}
          </div>
        </div>

        <div style={{ padding: '24px 32px', background: '#111113', borderTop: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertCircle size={16} color="#52525b" />
            <span style={{ fontSize: '11px', color: '#52525b', maxWidth: '300px' }}>This request will be audited by Finance Ops before escalation for approval.</span>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={onClose} style={{ padding: '12px 24px', background: 'transparent', border: 'none', color: '#a1a1aa', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleSubmit} disabled={isSubmitting || rfpAmount === 0} style={{ padding: '12px 32px', background: '#378ADD', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', opacity: (isSubmitting || rfpAmount === 0) ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '8px' }}>{isSubmitting ? 'Processing...' : 'Submit Request'} <ArrowRight size={16} /></button>
          </div>
        </div>

        <style jsx>{`
          .p-input-group label { display: block; font-size: 11px; color: #52525b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; font-weight: 600; }
          .p-input { width: 100%; background: #111113; border: 0.5px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 10px 14px; color: #e4e4e7; outline: none; transition: border-color 0.2s; }
          .p-input:focus { border-color: #378ADD; }
        `}</style>
      </div>
    </div>
  );
}
