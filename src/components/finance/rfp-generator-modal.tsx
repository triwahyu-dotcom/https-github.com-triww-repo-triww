"use client";

import { useState } from "react";
import { LineItem } from "@/lib/finance/types";
import { ProjectRecord } from "@/lib/project/types";
import { formatCurrencyIDR } from "@/lib/utils/format";

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
  
  // Form state
  const [vendorName, setVendorName] = useState("");
  const [vendorAddress, setVendorAddress] = useState("");
  const [vendorTaxId, setVendorTaxId] = useState("");
  const [documentTotal, setDocumentTotal] = useState<number | "">(""); 
  const [description, setDescription] = useState("");
  
  // Payment terms
  const [paymentTerms, setPaymentTerms] = useState("Full Payment");
  const [selectedTermRatio, setSelectedTermRatio] = useState<"100" | "50" | "30" | "20" | "custom">("100");
  const [rfpAmount, setRfpAmount] = useState<number | "">(""); 
  const [nextPaymentDate, setNextPaymentDate] = useState("");
  
  // Payment state
  const [paymentType, setPaymentType] = useState<"Transfer" | "Cash">("Transfer");
  const [bankName, setBankName] = useState("");
  const [accountNo, setAccountNo] = useState("");
  const [accountName, setAccountName] = useState("");

  const handleVendorSelect = (vendor: any) => {
    setVendorName(vendor.name);
    // basic heuristics
    const raw = vendor.rawSource || {};
    
    const vAddr = vendor.address || raw["Alamat :"] || raw["Address"] || "";
    const vTax = vendor.taxId || raw["NPWP :"] || raw["NPWP"] || "";
    const bName = vendor.bankName || raw["Nama Bank"] || raw["Bank Name"] || "";
    const bAcc = vendor.bankAccountNumber || raw["Nomor Rekening : "] || raw["Nomor Rekening"] || raw["Account Number"] || "";
    const bHolder = vendor.bankAccountHolder || raw["Nama Rekening :"] || raw["Account Holder"] || "";

    setVendorAddress(vAddr);
    setVendorTaxId(vTax);
    
    if (bName) setBankName(bName);
    if (bAcc) setAccountNo(String(bAcc));
    if (bHolder) setAccountName(bHolder);
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
    if (!documentTotal || documentTotal === 0 || !rfpAmount || rfpAmount === 0) {
      alert("Please enter valid amounts.");
      return;
    }

    const payload = {
      projectId: selectedProject?.id,
      documentType: docType,
      vendorName,
      vendorAddress,
      vendorTaxId,
      documentTotal: Number(documentTotal),
      rfpAmount: Number(rfpAmount),
      nextPaymentDate,
      description,
      paymentType,
      bankAccount: { bankName, accountNo, accountName },
      paymentTerms
    };
    
    try {
      const res = await fetch("/api/finance/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        onSuccess();
      } else {
        alert("Failed to generate payment request");
      }
    } catch (e) {
      console.error(e);
      alert("Error generating payment request");
    }
  };

  return (
    <div className="modal-overlay" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="modal-content wide-modal" style={{ backgroundColor: 'var(--panel)', padding: '32px', borderRadius: '16px', width: '100%', maxWidth: '800px', border: '1px solid var(--line)', boxShadow: 'var(--shadow)', maxHeight: '90vh', overflowY: 'auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0 }}>Request For Payment (RFP) Generator</h2>
          <div className="mini-meta">Step {generatorStep} of 3</div>
        </div>

        {generatorStep === 1 && (
           <div>
             <div className="form-section-title">Step 1: Select Active Project</div>
             <div style={{ maxHeight: "300px", overflowY: "auto", display: "grid", gap: "8px" }}>
               {activeProjects.map(p => (
                 <div 
                   key={p.id} 
                   onClick={() => { setSelectedProject(p); setGeneratorStep(2); }}
                   className="document-card" 
                   style={{ cursor: "pointer", border: "1px solid var(--line)", background: selectedProject?.id === p.id ? "var(--blue-soft)" : "transparent" }}
                 >
                   <div style={{ fontWeight: 600 }}>{p.projectName}</div>
                   <div className="mini-meta">{p.client} • {p.currentStageLabel}</div>
                 </div>
               ))}
             </div>
             <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="secondary-button" onClick={onClose} style={{ marginLeft: '12px' }}>Cancel</button>
             </div>
           </div>
        )}

        {generatorStep === 2 && (
           <div>
             <div className="form-section-title">Step 2: Underlying Document Type</div>
             <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "16px" }}>
                <label className={`document-card ${docType === 'PO' ? 'active' : ''}`} style={{ cursor: "pointer", display: 'flex', alignItems: 'flex-start', gap: '12px', border: docType === 'PO' ? '2px solid var(--blue)' : '1px solid var(--line)' }}>
                   <input type="radio" name="doctype" value="PO" checked={docType === 'PO'} onChange={() => setDocType('PO')} style={{ marginTop: '4px' }} />
                   <div>
                     <div style={{ fontWeight: 600 }}>Purchase Order (PO)</div>
                     <div className="mini-meta">Standard procurement for goods/services.</div>
                   </div>
                </label>
                <label className={`document-card ${docType === 'SPK' ? 'active' : ''}`} style={{ cursor: "pointer", display: 'flex', alignItems: 'flex-start', gap: '12px', border: docType === 'SPK' ? '2px solid var(--blue)' : '1px solid var(--line)' }}>
                   <input type="radio" name="doctype" value="SPK" checked={docType === 'SPK'} onChange={() => setDocType('SPK')} style={{ marginTop: '4px' }} />
                   <div>
                     <div style={{ fontWeight: 600 }}>Surat Perintah Kerja (SPK)</div>
                     <div className="mini-meta">For manpower or specific task execution.</div>
                   </div>
                </label>
                <label className={`document-card ${docType === 'KONTRAK' ? 'active' : ''}`} style={{ cursor: "pointer", display: 'flex', alignItems: 'flex-start', gap: '12px', border: docType === 'KONTRAK' ? '2px solid var(--blue)' : '1px solid var(--line)' }}>
                   <input type="radio" name="doctype" value="KONTRAK" checked={docType === 'KONTRAK'} onChange={() => setDocType('KONTRAK')} style={{ marginTop: '4px' }} />
                   <div>
                     <div style={{ fontWeight: 600 }}>Surat Perjanjian Kontrak</div>
                     <div className="mini-meta">For formal long-term vendor agreements.</div>
                   </div>
                </label>
                <label className={`document-card ${docType === 'CASH_ADVANCE' ? 'active' : ''}`} style={{ cursor: "pointer", display: 'flex', alignItems: 'flex-start', gap: '12px', border: docType === 'CASH_ADVANCE' ? '2px solid var(--blue)' : '1px solid var(--line)' }}>
                   <input type="radio" name="doctype" value="CASH_ADVANCE" checked={docType === 'CASH_ADVANCE'} onChange={() => setDocType('CASH_ADVANCE')} style={{ marginTop: '4px' }} />
                   <div>
                     <div style={{ fontWeight: 600 }}>Cash Advance</div>
                     <div className="mini-meta">Internal rapid cash request.</div>
                   </div>
                </label>
             </div>
             
             <div style={{ marginTop: "24px", display: 'flex', justifyContent: 'space-between' }}>
               <button className="primary-button" style={{ background: 'none', border: '1px solid var(--line)' }} onClick={() => setGeneratorStep(1)}>← Back</button>
               <div>
                  <button className="secondary-button" style={{ marginRight: '12px' }} onClick={onClose}>Cancel</button>
                  <button className="primary-button" onClick={() => setGeneratorStep(3)}>Continue →</button>
               </div>
             </div>
           </div>
        )}

        {generatorStep === 3 && (
           <div>
              <div className="form-section-title">Step 3: Document & Payment Details</div>
              
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="mini-meta">Vendor Name (Optional: Search Database)</label>
                  <input style={{ width: '100%', background: 'var(--panel-soft)', border: '1px solid var(--line)', padding: '10px', color: 'var(--text)', borderRadius: '8px', marginTop: '4px' }} value={vendorName} onChange={(e) => setVendorName(e.target.value)} placeholder="Type or select below..." />
                  {availableVendors && availableVendors.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                      {availableVendors.slice(0, 5).map(v => (
                        <button key={v.id} onClick={() => handleVendorSelect(v)} className="chip" style={{ fontSize: '10px', padding: '4px 8px' }}>{v.name}</button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label className="mini-meta">Total PO/SPK Value (100% Amount)</label>
                  <input type="number" style={{ width: '100%', background: 'var(--panel-soft)', border: '1px solid var(--line)', padding: '10px', color: 'var(--text)', borderRadius: '8px', marginTop: '4px' }} value={documentTotal} onChange={(e) => { const v = e.target.value; setDocumentTotal(v ? Number(v) : ""); }} placeholder="e.g. 50000000" />
                </div>
              </div>

              <div style={{ background: "var(--panel)", border: "1px solid var(--blue)", borderRadius: "8px", overflow: "hidden", marginTop: '24px' }}>
                <div style={{ padding: "12px 16px", background: "rgba(91, 140, 255, 0.1)", borderBottom: "1px solid var(--blue)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                   <div style={{ fontWeight: 600, color: "var(--blue)" }}>Amount to Request Now (RFP)</div>
                </div>
                <div style={{ padding: "16px" }}>
                   <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
                     {(["100", "50", "30", "20", "custom"] as const).map(ratio => (
                       <button
                         key={ratio}
                         onClick={() => handleTermRatioChange(ratio)}
                         style={{ 
                           padding: "6px 12px", 
                           borderRadius: "99px", 
                           fontSize: "12px", 
                           cursor: "pointer",
                           background: selectedTermRatio === ratio ? "var(--blue)" : "transparent",
                           color: selectedTermRatio === ratio ? "white" : "var(--text)",
                           border: `1px solid ${selectedTermRatio === ratio ? "var(--blue)" : "var(--line)"}`
                         }}
                       >
                         {ratio === "100" ? "Full payment" : ratio === "custom" ? "Custom Amount" : `${ratio}% DP/Term`}
                       </button>
                     ))}
                   </div>
                   
                   <div className="form-grid-2">
                     <div>
                       <label className="mini-meta">Requested Transfer / Cash Amount</label>
                       <input 
                         type="number"
                         style={{ width: '100%', background: 'var(--panel-soft)', border: '1px solid var(--blue)', padding: '10px', color: 'var(--text)', borderRadius: '8px', marginTop: '4px', fontSize: '18px', fontWeight: 600 }} 
                         value={rfpAmount} 
                         disabled={selectedTermRatio !== "custom"}
                         onChange={(e) => {
                           const val = e.target.value;
                           setRfpAmount(val === "" ? "" : Number(val));
                         }} 
                         placeholder="Requested Amount" 
                       />
                     </div>
                     <div>
                       <label className="mini-meta">Term Description</label>
                       <input 
                         style={{ width: '100%', background: 'var(--panel-soft)', border: '1px solid var(--line)', padding: '10px', color: 'var(--text)', borderRadius: '8px', marginTop: '4px' }} 
                         value={paymentTerms} 
                         onChange={(e) => setPaymentTerms(e.target.value)} 
                         placeholder="e.g. DP 50%" 
                       />
                     </div>
                   </div>

                   <div className="form-grid-2" style={{ marginTop: '16px' }}>
                     <div>
                       <label className="mini-meta">Note / Reference</label>
                       <input 
                         style={{ width: '100%', background: 'var(--panel-soft)', border: '1px solid var(--line)', padding: '10px', color: 'var(--text)', borderRadius: '8px', marginTop: '4px' }} 
                         value={description} 
                         onChange={(e) => setDescription(e.target.value)} 
                         placeholder="e.g. Pembayaran DP Talent Dance" 
                       />
                     </div>
                     <div>
                       <label className="mini-meta">Next Payment Date (Optional)</label>
                       <input 
                         type="date"
                         style={{ width: '100%', background: 'var(--panel-soft)', border: '1px solid var(--line)', padding: '10px', color: 'var(--text)', borderRadius: '8px', marginTop: '4px' }} 
                         value={nextPaymentDate} 
                         onChange={(e) => setNextPaymentDate(e.target.value)} 
                       />
                     </div>
                   </div>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: "24px" }}>
                <label className="mini-meta">Payment Method</label>
                <div style={{ display: "flex", gap: "16px", marginTop: "8px" }}>
                   <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                     <input type="radio" name="paymentType" value="Transfer" checked={paymentType === "Transfer"} onChange={() => setPaymentType("Transfer")} /> Transfer
                   </label>
                   <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                     <input type="radio" name="paymentType" value="Cash" checked={paymentType === "Cash"} onChange={() => setPaymentType("Cash")} /> Cash
                   </label>
                </div>
              </div>

              {paymentType === "Transfer" && (
                <div className="form-grid-2" style={{ marginTop: "16px", background: "var(--panel-soft)", padding: "16px", borderRadius: "8px", border: "1px solid var(--line)" }}>
                  <div className="form-group">
                    <label className="mini-meta">Bank Name</label>
                    <input style={{ width: '100%', background: 'var(--panel-soft)', border: '1px solid var(--line)', padding: '10px', color: 'var(--text)', borderRadius: '8px', marginTop: '4px' }} value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. BCA" />
                  </div>
                  <div className="form-group"></div>
                  <div className="form-group" style={{ marginTop: "12px" }}>
                    <label className="mini-meta">Account No</label>
                    <input style={{ width: '100%', background: 'var(--panel-soft)', border: '1px solid var(--line)', padding: '10px', color: 'var(--text)', borderRadius: '8px', marginTop: '4px' }} value={accountNo} onChange={(e) => setAccountNo(e.target.value)} placeholder="..." />
                  </div>
                  <div className="form-group" style={{ marginTop: "12px" }}>
                    <label className="mini-meta">Account Holder Name</label>
                    <input style={{ width: '100%', background: 'var(--panel-soft)', border: '1px solid var(--line)', padding: '10px', color: 'var(--text)', borderRadius: '8px', marginTop: '4px' }} value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="..." />
                  </div>
                </div>
              )}

              <div style={{ marginTop: '32px', display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
                <button className="primary-button" style={{ background: 'none', border: '1px solid var(--line)' }} onClick={() => setGeneratorStep(2)}>← Back</button>
                <div>
                  <button className="secondary-button" style={{ background: 'none', border: '1px solid var(--line)', marginRight: '12px' }} onClick={onClose}>Cancel</button>
                  <button className="primary-button" onClick={handleGenerate}>Submit Request For Payment</button>
                </div>
              </div>
           </div>
        )}
        
      </div>
    </div>
  );
}
