"use client";

import { useState, useEffect } from "react";
import { X, Trash2, ArrowRight, ArrowLeft, AlertTriangle, Plus, Wallet, Search, Check } from "lucide-react";
import { ProjectRecord } from "@/lib/project/types";
import { ExpenseDocument } from "@/lib/finance/types";
import { formatCurrencyIDR } from "@/lib/utils/format";

interface CaLine {
  description: string;
  amount: number;
}

interface Props {
  activeProjects: ProjectRecord[];
  availableVendors?: any[];
  editDoc?: ExpenseDocument;
  onClose: () => void;
  onSuccess: () => void;
}

export function CashAdvanceModal({ activeProjects, availableVendors = [], editDoc, onClose, onSuccess }: Props) {
  const [selectedProject, setSelectedProject] = useState<ProjectRecord | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [vendorSearch, setVendorSearch] = useState("");
  const [showVendorSuggestions, setShowVendorSuggestions] = useState(false);
  const [payTo, setPayTo] = useState("");
  const [paymentType, setPaymentType] = useState<"Transfer" | "Cash">("Transfer");
  const [bankName, setBankName] = useState("");
  const [accountNo, setAccountNo] = useState("");
  const [accountName, setAccountName] = useState("");
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<CaLine[]>([{ description: "", amount: 0 }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editDoc) {
      const proj = activeProjects.find(p => p.id === editDoc.projectId);
      if (proj) setSelectedProject(proj);
      setPayTo(editDoc.vendorName);
      setDescription(editDoc.description || "");
      setBankName((editDoc as any).bankAccount?.bankName || "");
      setAccountNo((editDoc as any).bankAccount?.accountNo || "");
      setAccountName((editDoc as any).bankAccount?.accountName || "");
      setLines(editDoc.lineItems?.map(l => ({ description: l.description, amount: l.amount })) || [{ description: "", amount: 0 }]);
      setStep(2);
    }
  }, [editDoc, activeProjects]);

  const handleVendorSelect = (vendor: any) => {
    setPayTo(vendor.name || "");
    setBankName(vendor.bankName || "");
    setAccountNo(vendor.bankAccountNumber || "");
    setAccountName(vendor.bankAccountHolder || vendor.name || "");
    setVendorSearch("");
    setShowVendorSuggestions(false);
  };

  const filteredVendors = availableVendors.filter(v => 
    v.name.toLowerCase().includes(vendorSearch.toLowerCase())
  ).slice(0, 5);

  const total = lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const updateLine = (idx: number, field: keyof CaLine, val: any) => {
    setLines(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: val };
      return updated;
    });
  };
  const addLine = () => setLines(prev => [...prev, { description: "", amount: 0 }]);
  const removeLine = (idx: number) => setLines(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (!selectedProject || !payTo || total === 0) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/finance/document", {
        method: editDoc ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editDoc?.id, projectId: selectedProject.id, documentType: "CASH_ADVANCE",
          vendorName: payTo, vendorAddress: "", vendorTaxId: "",
          lineItems: lines.map((l, i) => ({ no: i + 1, description: l.description, specification: "", qty: 1, unit: "Paket", freq: 1, freqUnit: "Kali", vol: 1, volUnit: "", price: Number(l.amount), amount: Number(l.amount) })),
          documentTotal: total, description, paymentTerms: "Full",
          preparedBy: { name: payTo, date: new Date().toISOString() },
          bankAccount: { bankName, accountNo, accountName }, paymentType,
        }),
      });
      if (res.ok) {
        onSuccess();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Gagal: ${err.message || 'Server error'}`);
      }
    } catch (e) {
      alert("Terjadi kesalahan koneksi.");
    } finally { setIsSubmitting(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)", zIndex: 3000, display: "grid", placeItems: "center", padding: "20px" }}>
      <div style={{ background: "#1f1f23", borderRadius: "24px", width: "100%", maxWidth: "740px", border: "0.5px solid rgba(255,255,255,0.1)", boxShadow: "0 25px 60px rgba(0,0,0,0.6)", overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '92vh' }}>
        
        <div style={{ padding: '24px 32px', background: '#111113', borderBottom: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(55,138,221,0.1)', color: '#378ADD', display: 'grid', placeItems: 'center' }}>
              <Wallet size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#f4f4f5" }}>Cash Advance Request</h3>
              <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#52525b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Operational Fund Advance</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#52525b', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
          {step === 1 && (
            <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                <Check size={14} color="#378ADD" />
                <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#52525b', textTransform: 'uppercase', letterSpacing: '1px' }}>Step 1: Select Project</h4>
              </div>
              <div style={{ display: 'grid', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                {activeProjects.map(p => (
                  <div 
                    key={p.id} 
                    onClick={() => setSelectedProject(p)}
                    style={{ 
                      padding: '16px 20px', borderRadius: '12px', background: selectedProject?.id === p.id ? 'rgba(55,138,221,0.05)' : '#18181b', 
                      border: selectedProject?.id === p.id ? '2px solid #378ADD' : '1px solid rgba(255,255,255,0.06)', 
                      cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ fontWeight: 700, color: selectedProject?.id === p.id ? '#378ADD' : '#f4f4f5', fontSize: '14px' }}>{p.projectName}</div>
                    <div style={{ fontSize: '12px', color: '#71717a', marginTop: '2px' }}>{p.client}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
              <div style={{ position: 'relative', marginBottom: '32px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#52525b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Requestor Entity (Optional Lookup)</label>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: '12px', top: '12px', color: '#52525b' }} />
                  <input 
                    className="p-input" style={{ paddingLeft: '36px' }}
                    value={vendorSearch} 
                    onChange={e => { setVendorSearch(e.target.value); setShowVendorSuggestions(true); }}
                    onFocus={() => setShowVendorSuggestions(true)}
                    placeholder="Search personnel or vendor database..." 
                  />
                  {showVendorSuggestions && vendorSearch.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1f1f23', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', marginTop: '8px', boxShadow: '0 15px 30px rgba(0,0,0,0.5)', zIndex: 10, overflow: 'hidden' }}>
                      {filteredVendors.map(v => (
                        <div key={v.id} onClick={() => handleVendorSelect(v)} style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.06)', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = '#27272a'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <div style={{ fontWeight: 600, fontSize: '13px', color: '#f4f4f5' }}>{v.name}</div>
                          <div style={{ fontSize: '11px', color: '#52525b' }}>{v.classification}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                <div className="p-input-group"><label>Pay To (Requestor Name)</label><input className="p-input" value={payTo} onChange={e => setPayTo(e.target.value)} /></div>
                <div className="p-input-group"><label>Purpose / Description</label><input className="p-input" value={description} onChange={e => setDescription(e.target.value)} /></div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '32px', marginBottom: '32px' }}>
                <div>
                   <label style={{ display: 'block', fontSize: '11px', color: '#52525b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Payment Method</label>
                   <div style={{ display: 'flex', background: '#111113', padding: '4px', borderRadius: '10px' }}>
                      {['Transfer', 'Cash'].map(m => (
                        <button key={m} onClick={() => setPaymentType(m as any)} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: paymentType === m ? '#27272a' : 'transparent', color: paymentType === m ? '#f4f4f5' : '#52525b' }}>{m}</button>
                      ))}
                   </div>
                </div>
                {paymentType === "Transfer" && (
                   <div style={{ background: '#18181b', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)', padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                      <div className="p-input-group"><label>Bank</label><input className="p-input" value={bankName} onChange={e => setBankName(e.target.value)} /></div>
                      <div className="p-input-group"><label>Account No</label><input className="p-input" value={accountNo} onChange={e => setAccountNo(e.target.value)} /></div>
                      <div className="p-input-group"><label>Holder</label><input className="p-input" value={accountName} onChange={e => setAccountName(e.target.value)} /></div>
                   </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#52525b', textTransform: 'uppercase', letterSpacing: '1px' }}>Allocation Details</h4>
                <button onClick={addLine} style={{ background: 'rgba(55,138,221,0.1)', color: '#378ADD', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><Plus size={14} /> Add Row</button>
              </div>

              <div style={{ display: 'grid', gap: '8px', marginBottom: '32px' }}>
                {lines.map((line, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 180px 40px', gap: '12px', alignItems: 'center' }}>
                    <input className="p-input" value={line.description} onChange={e => updateLine(idx, "description", e.target.value)} placeholder="Allocation name..." />
                    <input type="number" className="p-input" style={{ textAlign: 'right', fontWeight: 600, color: '#378ADD' }} value={line.amount || ""} onChange={e => updateLine(idx, "amount", e.target.value)} placeholder="0" />
                    <button onClick={() => removeLine(idx)} style={{ background: 'transparent', border: 'none', color: '#52525b', cursor: 'pointer' }}><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>

              <div style={{ padding: '24px', background: 'rgba(55,138,221,0.05)', borderRadius: '16px', border: '1px solid rgba(55,138,221,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '32px' }}>
                <div>
                   <div style={{ fontSize: '11px', color: '#52525b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Total Request</div>
                   <div style={{ fontSize: '11px', color: '#378ADD', fontWeight: 600, marginTop: '4px' }}>Project: {selectedProject?.projectName}</div>
                </div>
                <div style={{ fontSize: '32px', fontWeight: 800, color: '#f4f4f5' }}>{formatCurrencyIDR(total)}</div>
              </div>

              <div style={{ padding: '16px', background: 'rgba(234,179,8,0.05)', borderRadius: '12px', border: '1px solid rgba(234,179,8,0.1)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <AlertTriangle size={18} color="#eab308" />
                <div style={{ fontSize: '11px', color: '#eab308', lineHeight: 1.5 }}>
                  <strong>Policy Reminder:</strong> Cash Advance requires Director approval. Settlement (nota/kwitansi) must be submitted within <strong>5 business days</strong> after the event concludes.
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '24px 32px', background: '#111113', borderTop: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between' }}>
          <button onClick={() => setStep(1)} style={{ background: 'transparent', border: 'none', color: '#a1a1aa', fontSize: '13px', fontWeight: 600, cursor: 'pointer', visibility: step === 1 ? 'hidden' : 'visible', display: 'flex', alignItems: 'center', gap: '8px' }}><ArrowLeft size={16} /> Back</button>
          <div style={{ display: 'flex', gap: '12px' }}>
             <button onClick={onClose} style={{ padding: '12px 24px', background: 'transparent', border: 'none', color: '#a1a1aa', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
             {step === 1 ? (
               <button onClick={() => selectedProject && setStep(2)} disabled={!selectedProject} style={{ padding: '12px 32px', background: '#378ADD', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', opacity: !selectedProject ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '8px' }}>Continue <ArrowRight size={16} /></button>
             ) : (
               <button onClick={handleSubmit} disabled={isSubmitting || total === 0 || !payTo} style={{ padding: '12px 32px', background: '#378ADD', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', opacity: (isSubmitting || total === 0 || !payTo) ? 0.5 : 1 }}>
                 {isSubmitting ? "Processing..." : "Submit Cash Advance"}
               </button>
             )}
          </div>
        </div>

        <style jsx>{`
          @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          .p-input-group label { display: block; font-size: 11px; color: #52525b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; font-weight: 600; }
          .p-input { width: 100%; background: #111113; border: 0.5px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 10px 14px; color: #e4e4e7; outline: none; transition: border-color 0.2s; }
          .p-input:focus { border-color: #378ADD; }
        `}</style>
      </div>
    </div>
  );
}
