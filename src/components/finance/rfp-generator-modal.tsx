"use client";

import { useState } from "react";
import { LineItem } from "@/lib/finance/types";
import { ProjectRecord } from "@/lib/project/types";
import { formatCurrencyIDR } from "@/lib/utils/format";
import { FileText, ChevronRight, Projector, Building2, CreditCard, Calendar, X, Check } from "lucide-react";

interface Props {
  activeProjects: ProjectRecord[];
  availableVendors?: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export function RfpGeneratorModal({ activeProjects, availableVendors = [], onClose, onSuccess }: Props) {
  const [generatorStep, setGeneratorStep] = useState<1 | 2 | 3>(1);
  const [selectedProject, setSelectedProject] = useState<ProjectRecord | null>(null);
  const [docType, setDocType] = useState<"PO" | "SPK" | "KONTRAK" | "CASH_ADVANCE">("PO");
  
  const [vendorName, setVendorName] = useState("");
  const [vendorAddress, setVendorAddress] = useState("");
  const [vendorTaxId, setVendorTaxId] = useState("");
  const [documentTotal, setDocumentTotal] = useState<number | "">(""); 
  const [description, setDescription] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("Full Payment");
  const [selectedTermRatio, setSelectedTermRatio] = useState<"100" | "50" | "30" | "20" | "custom">("100");
  const [rfpAmount, setRfpAmount] = useState<number | "">(""); 
  const [nextPaymentDate, setNextPaymentDate] = useState("");
  const [paymentType, setPaymentType] = useState<"Transfer" | "Cash">("Transfer");
  const [bankName, setBankName] = useState("");
  const [accountNo, setAccountNo] = useState("");
  const [accountName, setAccountName] = useState("");

  const handleVendorSelect = (vendor: any) => {
    setVendorName(vendor.name);
    const raw = vendor.rawSource || {};
    setVendorAddress(vendor.address || raw["Alamat :"] || raw["Address"] || "");
    setVendorTaxId(vendor.taxId || raw["NPWP :"] || raw["NPWP"] || "");
    setBankName(vendor.bankName || raw["Nama Bank"] || raw["Bank Name"] || "");
    setAccountNo(String(vendor.bankAccountNumber || raw["Nomor Rekening : "] || raw["Nomor Rekening"] || raw["Account Number"] || ""));
    setAccountName(vendor.bankAccountHolder || raw["Nama Rekening :"] || raw["Account Holder"] || "");
  };

  const handleTermRatioChange = (ratio: "100" | "50" | "30" | "20" | "custom") => {
    setSelectedTermRatio(ratio);
    if (ratio !== "custom" && typeof documentTotal === "number") {
      setRfpAmount(documentTotal * (Number(ratio) / 100));
      setPaymentTerms(ratio === "100" ? "Full Payment" : ratio === "50" ? "DP 50%" : `Termin ${ratio}%`);
    } else if (ratio === "custom") {
      setPaymentTerms("Custom Term");
    }
  };

  const handleGenerate = async () => {
    if (!documentTotal || !rfpAmount) return;
    try {
      const res = await fetch("/api/finance/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProject?.id, documentType: docType, vendorName, vendorAddress, vendorTaxId,
          documentTotal: Number(documentTotal), rfpAmount: Number(rfpAmount), nextPaymentDate,
          description, paymentType, bankAccount: { bankName, accountNo, accountName }, paymentTerms
        })
      });
      if (res.ok) onSuccess();
    } catch (e) {}
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)", zIndex: 3000, display: "grid", placeItems: "center", padding: "20px" }}>
      <div style={{ background: "#1f1f23", borderRadius: "24px", width: "100%", maxWidth: "880px", border: "0.5px solid rgba(255,255,255,0.1)", boxShadow: "0 25px 60px rgba(0,0,0,0.6)", overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '92vh' }}>
        
        {/* Header with Progress */}
        <div style={{ padding: '24px 32px', background: '#111113', borderBottom: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(55,138,221,0.1)', color: '#378ADD', display: 'grid', placeItems: 'center' }}>
              <FileText size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#f4f4f5" }}>Generate Payment Request</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                {[1,2,3].map(s => (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: generatorStep >= s ? '#378ADD' : '#27272a', color: '#fff', fontSize: '10px', fontWeight: 800, display: 'grid', placeItems: 'center' }}>
                      {generatorStep > s ? <Check size={10} strokeWidth={4} /> : s}
                    </div>
                    {s < 3 && <div style={{ width: '20px', height: '1px', background: generatorStep > s ? '#378ADD' : '#27272a' }} />}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#52525b', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '40px' }}>
          {generatorStep === 1 && (
            <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                <Projector size={18} color="#378ADD" />
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#f4f4f5' }}>Select Active Project</h4>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {activeProjects.map(p => (
                  <div 
                    key={p.id} 
                    onClick={() => { setSelectedProject(p); setGeneratorStep(2); }}
                    style={{ 
                      padding: '20px', borderRadius: '16px', background: '#18181b', border: '1px solid rgba(255,255,255,0.06)', 
                      cursor: 'pointer', transition: 'all 0.2s', position: 'relative', overflow: 'hidden'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#378ADD'; e.currentTarget.style.background = 'rgba(55,138,221,0.03)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = '#18181b'; }}
                  >
                    <div style={{ fontWeight: 700, color: '#f4f4f5', fontSize: '14px', marginBottom: '4px' }}>{p.projectName}</div>
                    <div style={{ fontSize: '12px', color: '#71717a' }}>{p.client} • {p.currentStageLabel}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {generatorStep === 2 && (
            <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                <FileText size={18} color="#378ADD" />
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#f4f4f5' }}>Document Context</h4>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                {[
                  { id: 'PO', title: 'Purchase Order', desc: 'Standard procurement of goods/services.' },
                  { id: 'SPK', title: 'Surat Perintah Kerja', desc: 'For task execution or manpower.' },
                  { id: 'KONTRAK', title: 'Contract Agreement', desc: 'Formal long-term vendor agreements.' },
                  { id: 'CASH_ADVANCE', title: 'Cash Advance', desc: 'Internal rapid cash requests.' }
                ].map(type => (
                  <div 
                    key={type.id}
                    onClick={() => setDocType(type.id as any)}
                    style={{ 
                      padding: '24px', borderRadius: '20px', background: docType === type.id ? 'rgba(55,138,221,0.05)' : '#18181b', 
                      border: docType === type.id ? '2px solid #378ADD' : '1px solid rgba(255,255,255,0.06)', 
                      cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                       <div style={{ fontWeight: 700, color: docType === type.id ? '#378ADD' : '#f4f4f5', fontSize: '15px', marginBottom: '6px' }}>{type.title}</div>
                       <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #378ADD', background: docType === type.id ? '#378ADD' : 'transparent', display: 'grid', placeItems: 'center' }}>
                         {docType === type.id && <Check size={12} color="#fff" strokeWidth={4} />}
                       </div>
                    </div>
                    <div style={{ fontSize: '12px', color: '#71717a', lineHeight: 1.5 }}>{type.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {generatorStep === 3 && (
            <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
              {/* Vendor & Amount Panel */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '40px' }}>
                <div className="p-input-group">
                  <label>Vendor Entity</label>
                  <input className="p-input" value={vendorName} onChange={(e) => setVendorName(e.target.value)} placeholder="Type vendor name..." />
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
                    {availableVendors.slice(0, 4).map(v => (
                      <button key={v.id} onClick={() => handleVendorSelect(v)} style={{ background: '#27272a', color: '#a1a1aa', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '10px', fontWeight: 600, cursor: 'pointer' }}>{v.name}</button>
                    ))}
                  </div>
                </div>
                <div className="p-input-group">
                  <label>Total Value (100%)</label>
                  <input type="number" className="p-input" value={documentTotal} onChange={(e) => { const v = e.target.value; setDocumentTotal(v ? Number(v) : ""); }} placeholder="0" />
                </div>
              </div>

              {/* RFP Allocation */}
              <div style={{ background: 'rgba(55,138,221,0.03)', borderRadius: '24px', border: '1px solid rgba(55,138,221,0.1)', padding: '32px', marginBottom: '40px' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div style={{ fontSize: '11px', color: '#378ADD', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Payment Allocation</div>
                    <div style={{ display: 'flex', background: '#111113', padding: '4px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                       {(["100", "50", "30", "20", "custom"] as const).map(ratio => (
                         <button 
                           key={ratio} 
                           onClick={() => handleTermRatioChange(ratio)}
                           style={{ padding: '6px 12px', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', background: selectedTermRatio === ratio ? '#378ADD' : 'transparent', color: selectedTermRatio === ratio ? '#fff' : '#52525b', transition: 'all 0.2s' }}
                         >
                           {ratio === 'custom' ? 'Custom' : `${ratio}%`}
                         </button>
                       ))}
                    </div>
                 </div>

                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    <div className="p-input-group">
                       <label>Requested Amount</label>
                       <input 
                         type="number" className="p-input" style={{ fontSize: '20px', fontWeight: 700, color: '#378ADD' }} 
                         value={rfpAmount} disabled={selectedTermRatio !== "custom"} 
                         onChange={(e) => setRfpAmount(e.target.value === "" ? "" : Number(e.target.value))} 
                       />
                    </div>
                    <div className="p-input-group">
                       <label>Payment Terms</label>
                       <input className="p-input" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
                    </div>
                 </div>

                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '20px' }}>
                    <div className="p-input-group">
                       <label>Payment Description</label>
                       <input className="p-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Talent DP Payment" />
                    </div>
                    <div className="p-input-group">
                       <label>Target Date</label>
                       <input type="date" className="p-input" value={nextPaymentDate} onChange={(e) => setNextPaymentDate(e.target.value)} />
                    </div>
                 </div>
              </div>

              {/* Method & Bank */}
              <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '32px' }}>
                 <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#52525b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Payment Method</label>
                    <div style={{ display: 'flex', gap: '8px', background: '#111113', padding: '4px', borderRadius: '10px' }}>
                       {['Transfer', 'Cash'].map(m => (
                         <button key={m} onClick={() => setPaymentType(m as any)} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: paymentType === m ? '#27272a' : 'transparent', color: paymentType === m ? '#f4f4f5' : '#52525b' }}>{m}</button>
                       ))}
                    </div>
                 </div>
                 {paymentType === "Transfer" && (
                   <div style={{ background: '#18181b', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)', padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div className="p-input-group"><label>Bank</label><input className="p-input" value={bankName} onChange={(e) => setBankName(e.target.value)} /></div>
                      <div className="p-input-group"><label>Account No</label><input className="p-input" value={accountNo} onChange={(e) => setAccountNo(e.target.value)} /></div>
                      <div className="p-input-group" style={{ gridColumn: 'span 2' }}><label>Account Holder</label><input className="p-input" value={accountName} onChange={(e) => setAccountName(e.target.value)} /></div>
                   </div>
                 )}
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '24px 32px', background: '#111113', borderTop: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between' }}>
          <button onClick={() => generatorStep > 1 && setGeneratorStep((generatorStep - 1) as any)} style={{ background: 'transparent', border: 'none', color: '#a1a1aa', fontSize: '13px', fontWeight: 600, cursor: 'pointer', visibility: generatorStep === 1 ? 'hidden' : 'visible' }}>← Back</button>
          <div style={{ display: 'flex', gap: '12px' }}>
             <button onClick={onClose} style={{ padding: '12px 24px', background: 'transparent', border: 'none', color: '#a1a1aa', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
             {generatorStep < 3 ? (
               <button onClick={() => generatorStep === 1 ? selectedProject && setGeneratorStep(2) : setGeneratorStep(3)} disabled={generatorStep === 1 && !selectedProject} style={{ padding: '12px 32px', background: '#378ADD', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', opacity: (generatorStep === 1 && !selectedProject) ? 0.5 : 1 }}>Continue</button>
             ) : (
               <button onClick={handleGenerate} style={{ padding: '12px 32px', background: '#378ADD', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>Submit RFP</button>
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
