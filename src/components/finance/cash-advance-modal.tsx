"use client";

import { useState, useEffect } from "react";
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

  // Requestor info
  const [payTo, setPayTo] = useState("");
  const [paymentType, setPaymentType] = useState<"Transfer" | "Cash">("Transfer");
  const [bankName, setBankName] = useState("");
  const [accountNo, setAccountNo] = useState("");
  const [accountName, setAccountName] = useState("");
  const [description, setDescription] = useState("");

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

  // Line items
  const [lines, setLines] = useState<CaLine[]>([{ description: "", amount: 0 }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle Edit Mode
  useEffect(() => {
    if (editDoc) {
      const proj = activeProjects.find(p => p.id === editDoc.projectId);
      if (proj) setSelectedProject(proj);
      setPayTo(editDoc.vendorName);
      setDescription(editDoc.description || "");
      // Bank info for CA is often in bankAccount field
      setBankName((editDoc as any).bankAccount?.bankName || "");
      setAccountNo((editDoc as any).bankAccount?.accountNo || "");
      setAccountName((editDoc as any).bankAccount?.accountName || "");
      setLines(editDoc.lineItems?.map(l => ({ description: l.description, amount: l.amount })) || [{ description: "", amount: 0 }]);
      setStep(2);
    }
  }, [editDoc, activeProjects]);

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
    if (!selectedProject || !payTo || total === 0) {
      alert("Lengkapi semua field wajib.");
      return;
    }
    setIsSubmitting(true);
    try {
      const lineItemsForAPI = lines.map((l, i) => ({
        no: i + 1,
        description: l.description,
        specification: "",
        qty: 1,
        unit: "Paket",
        freq: 1,
        freqUnit: "Kali",
        vol: 1,
        volUnit: "",
        price: Number(l.amount),
        amount: Number(l.amount),
      }));

      const res = await fetch("/api/finance/document", {
        method: editDoc ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editDoc?.id, // Only for PATCH
          projectId: selectedProject.id,
          documentType: "CASH_ADVANCE",
          vendorName: payTo,
          vendorAddress: "",
          vendorTaxId: "",
          lineItems: lineItemsForAPI,
          documentTotal: total,
          description,
          paymentTerms: "Full",
          preparedBy: { name: payTo, date: new Date().toISOString() },
          // CA also needs bank for later RFP
          bankAccount: { bankName, accountNo, accountName },
          paymentType,
        }),
      });
      if (res.ok) {
        onSuccess();
      } else {
        const err = await res.json();
        alert("Gagal: " + err.error);
      }
    } catch {
      alert("Network error");
    }
    setIsSubmitting(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "24px", overflowY: "auto" }}>
      <div style={{ backgroundColor: "var(--panel)", borderRadius: "16px", width: "100%", maxWidth: "700px", border: "1px solid var(--line)", boxShadow: "var(--shadow)" }}>

        <div style={{ padding: "24px 32px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "20px" }}>Permohonan Cash Advance</h2>
            <p className="mini-meta" style={{ marginTop: "4px" }}>Pengajuan uang muka operasional untuk kegiatan/event</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "24px", color: "var(--muted)", cursor: "pointer" }}>&times;</button>
        </div>

        <div style={{ padding: "32px" }}>

          {step === 1 && (
            <div>
              <div className="form-section-title" style={{ marginBottom: "16px" }}>Pilih Project</div>
              <div style={{ display: "grid", gap: "8px", maxHeight: "200px", overflowY: "auto", marginBottom: "28px" }}>
                {activeProjects.map(p => (
                  <div key={p.id} onClick={() => setSelectedProject(p)} style={{ padding: "14px 16px", borderRadius: "10px", border: `2px solid ${selectedProject?.id === p.id ? "var(--blue)" : "var(--line)"}`, background: selectedProject?.id === p.id ? "rgba(91,140,255,0.08)" : "transparent", cursor: "pointer" }}>
                    <div style={{ fontWeight: 600 }}>{p.projectName}</div>
                    <div className="mini-meta">{p.client}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <button onClick={onClose} style={{ padding: "10px 20px", background: "none", border: "1px solid var(--line)", borderRadius: "8px", color: "var(--text)", cursor: "pointer" }}>Batal</button>
                <button onClick={() => setStep(2)} disabled={!selectedProject} className="primary-button">Lanjut →</button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              {/* Requestor */}
              <div className="form-section-title" style={{ marginBottom: "16px" }}>Data Pemohon</div>
              
              <div style={{ position: "relative", marginBottom: "20px" }}>
                <label className="mini-meta">Cari Vendor Member (Optional)</label>
                <div style={{ position: "relative", marginTop: "4px" }}>
                  <input 
                    style={{ width: "100%", background: "var(--panel-soft)", border: "1px solid var(--blue)", padding: "10px 14px", color: "var(--text)", borderRadius: "10px", outline: "none" }} 
                    value={vendorSearch} 
                    onChange={e => { setVendorSearch(e.target.value); setShowVendorSuggestions(true); }}
                    onFocus={() => setShowVendorSuggestions(true)}
                    placeholder="Ketik untuk mencari vendor..." 
                  />
                  {showVendorSuggestions && vendorSearch.length > 0 && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "10px", marginTop: "4px", boxShadow: "0 10px 25px rgba(0,0,0,0.3)", zIndex: 10, maxHeight: "200px", overflowY: "auto" }}>
                      {filteredVendors.length === 0 ? (
                        <div style={{ padding: "12px", textAlign: "center", color: "var(--muted)" }}>Vendor tidak ditemukan</div>
                      ) : (
                        filteredVendors.map(v => (
                          <div 
                            key={v.id} 
                            onClick={() => handleVendorSelect(v)}
                            style={{ padding: "10px 16px", borderBottom: "1px solid var(--line)", cursor: "pointer" }}
                            onMouseEnter={e => e.currentTarget.style.background = "var(--panel-soft)"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                          >
                            <div style={{ fontWeight: 600, fontSize: "12px" }}>{v.name}</div>
                            <div className="mini-meta" style={{ fontSize: "10px" }}>{v.classification} • {v.bankName || "No Bank Info"}</div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label className="mini-meta">Nama Pemohon (Pay To) *</label>
                  <input style={{ width: "100%", background: "var(--panel-soft)", border: "1px solid var(--line)", padding: "10px", color: "var(--text)", borderRadius: "8px", marginTop: "4px" }} value={payTo} onChange={e => setPayTo(e.target.value)} placeholder="Nama personil atau vendor" />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label className="mini-meta">Keterangan / Peruntukan</label>
                  <input style={{ width: "100%", background: "var(--panel-soft)", border: "1px solid var(--line)", padding: "10px", color: "var(--text)", borderRadius: "8px", marginTop: "4px" }} value={description} onChange={e => setDescription(e.target.value)} placeholder="Misal: Operasional survey lokasi event HUT Kaltara" />
                </div>
              </div>

              {/* Payment Method */}
              <div className="form-section-title" style={{ marginBottom: "16px" }}>Metode Pembayaran</div>
              <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                  <input type="radio" checked={paymentType === "Transfer"} onChange={() => setPaymentType("Transfer")} /> Transfer Bank
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                  <input type="radio" checked={paymentType === "Cash"} onChange={() => setPaymentType("Cash")} /> Cash / Tunai
                </label>
              </div>

              {paymentType === "Transfer" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "24px", padding: "16px", background: "var(--panel-soft)", borderRadius: "10px", border: "1px solid var(--line)" }}>
                  <div>
                    <label className="mini-meta">Nama Bank</label>
                    <input style={{ width: "100%", background: "transparent", border: "1px solid var(--line)", padding: "8px 10px", color: "var(--text)", borderRadius: "6px", marginTop: "4px" }} value={bankName} onChange={e => setBankName(e.target.value)} placeholder="BCA" />
                  </div>
                  <div>
                    <label className="mini-meta">No. Rekening</label>
                    <input style={{ width: "100%", background: "transparent", border: "1px solid var(--line)", padding: "8px 10px", color: "var(--text)", borderRadius: "6px", marginTop: "4px" }} value={accountNo} onChange={e => setAccountNo(e.target.value)} placeholder="1234567890" />
                  </div>
                  <div>
                    <label className="mini-meta">Nama Pemilik Rekening</label>
                    <input style={{ width: "100%", background: "transparent", border: "1px solid var(--line)", padding: "8px 10px", color: "var(--text)", borderRadius: "6px", marginTop: "4px" }} value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="Nama sesuai ATM" />
                  </div>
                </div>
              )}

              {/* Line Items */}
              <div className="form-section-title" style={{ marginBottom: "12px" }}>Rincian Kebutuhan Dana</div>
              <div style={{ display: "grid", gap: "8px", marginBottom: "8px" }}>
                {lines.map((line, idx) => (
                  <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "8px", alignItems: "center" }}>
                    <input value={line.description} onChange={e => updateLine(idx, "description", e.target.value)} placeholder={`Kebutuhan ${idx + 1}...`} style={{ background: "var(--panel-soft)", border: "1px solid var(--line)", padding: "9px 12px", color: "var(--text)", borderRadius: "8px" }} />
                    <input type="number" value={line.amount || ""} onChange={e => updateLine(idx, "amount", e.target.value)} placeholder="Nominal" style={{ width: "140px", background: "var(--panel-soft)", border: "1px solid var(--line)", padding: "9px 12px", color: "var(--text)", borderRadius: "8px" }} />
                    <button onClick={() => removeLine(idx)} style={{ background: "rgba(239,68,68,0.1)", border: "none", borderRadius: "6px", color: "#f87171", cursor: "pointer", padding: "9px 12px" }}>✕</button>
                  </div>
                ))}
              </div>
              <button onClick={addLine} style={{ background: "rgba(91,140,255,0.1)", border: "1px dashed var(--blue)", borderRadius: "8px", color: "var(--blue)", cursor: "pointer", padding: "8px 20px", width: "100%", fontSize: "12px", marginBottom: "20px" }}>+ Tambah Item</button>

              {/* Total */}
              <div style={{ padding: "16px 20px", background: "rgba(91,140,255,0.06)", border: "1px solid rgba(91,140,255,0.2)", borderRadius: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <div>
                  <div className="mini-meta">Total Cash Advance</div>
                  <div className="mini-meta" style={{ marginTop: "2px" }}>Project: {selectedProject?.projectName}</div>
                </div>
                <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--blue)" }}>{formatCurrencyIDR(total)}</div>
              </div>

              <div style={{ padding: "10px 14px", background: "rgba(234,179,8,0.08)", borderRadius: "8px", border: "1px solid rgba(234,179,8,0.2)", fontSize: "12px", color: "#ca8a04", marginBottom: "24px" }}>
                ⚠️ Cash Advance perlu persetujuan Director. Penyelesaian (settlement) wajib dilakukan maksimal <strong>5 hari setelah event</strong> disertai nota/kwitansi.
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                <button onClick={() => setStep(1)} style={{ padding: "10px 20px", background: "none", border: "1px solid var(--line)", borderRadius: "8px", color: "var(--text)", cursor: "pointer" }}>← Kembali</button>
                <div style={{ display: "flex", gap: "12px" }}>
                  <button onClick={onClose} style={{ padding: "10px 20px", background: "none", border: "1px solid var(--line)", borderRadius: "8px", color: "var(--text)", cursor: "pointer" }}>Batal</button>
                  <button onClick={handleSubmit} disabled={isSubmitting || total === 0 || !payTo} className="primary-button">
                    {isSubmitting ? "Menyimpan..." : "Submit Cash Advance"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
