"use client";

import { useState } from "react";
import { ProjectRecord } from "@/lib/project/types";
import { LineItem, PaymentEvent } from "@/lib/finance/types";
import { formatCurrencyIDR } from "@/lib/utils/format";

type DocType = "PO" | "SPK" | "KONTRAK";

interface Props {
  activeProjects: ProjectRecord[];
  availableVendors?: any[];
  onClose: () => void;
  onSuccess: () => void;
}

const emptyEvent = (label = "Termin"): PaymentEvent => ({
  label,
  percentage: 0,
  amount: 0,
  date: "",
});

const emptyLine = (): LineItem => ({
  no: 1,
  description: "",
  specification: "",
  qty: 1,
  unit: "Unit",
  freq: 1,
  freqUnit: "Kali",
  vol: 1,
  volUnit: "Hari",
  price: 0,
  amount: 0,
});

export function POCreatorModal({ activeProjects, availableVendors = [], onClose, onSuccess }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedProject, setSelectedProject] = useState<ProjectRecord | null>(null);
  const [docType, setDocType] = useState<DocType>("PO");

  // Vendor info
  const [vendorName, setVendorName] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");
  const [vendorAddress, setVendorAddress] = useState("");
  const [vendorTaxId, setVendorTaxId] = useState("");
  const [vendorSearch, setVendorSearch] = useState("");
  const [showVendorSuggestions, setShowVendorSuggestions] = useState(false);

  // Line items
  const [lineItems, setLineItems] = useState<LineItem[]>([{ ...emptyLine() }]);

  // Terms
  const [paymentTerms, setPaymentTerms] = useState("Custom Schedule");
  const [paymentSchedule, setPaymentSchedule] = useState<PaymentEvent[]>([
    { label: "DP 30%", percentage: 30, date: "" },
    { label: "Pelunasan 70%", percentage: 70, date: "" }
  ]);
  const [paymentDate, setPaymentDate] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [shipTo, setShipTo] = useState("");
  const [billingInstruction, setBillingInstruction] = useState("");
  const [billingTerms, setBillingTerms] = useState<string[]>(["Invoice", "BAST", "Report Dokumentasi"]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // SPK Specific
  const [venue, setVenue] = useState("");
  const [duration, setDuration] = useState("");
  const [lampiran, setLampiran] = useState("1 (satu) set");
  const [workScope, setWorkScope] = useState<string[]>([
    "Penerima kerja wajib mengikuti meeting online dan offline, selama persiapan event.",
    "Wajib hadir pada kegiatan Gladi Resik (GR) pada tanggal event.",
    "Menampilkan pertunjukan sesuai dengan konsep dan rundown acara.",
    "Mendukung kelancaran jalannya program acara selama penampilan berlangsung."
  ]);

  const updateLine = (idx: number, field: keyof LineItem, value: any) => {
    setLineItems(prev => {
      const updated = [...prev];
      const line = { ...updated[idx], [field]: value };
      // Auto-calc amount = qty * freq * vol * price
      if (["qty", "freq", "vol", "price", field].includes(field as string)) {
        const qty = field === "qty" ? Number(value) : Number(line.qty);
        const freq = field === "freq" ? Number(value) : Number(line.freq);
        const vol = field === "vol" ? Number(value) : Number(line.vol);
        const price = field === "price" ? Number(value) : Number(line.price);
        line.amount = qty * freq * vol * price;
      }
      updated[idx] = line;
      return updated;
    });
  };

  const addLine = () => setLineItems(prev => [...prev, { ...emptyLine(), no: prev.length + 1 }]);
  const removeLine = (idx: number) => setLineItems(prev => prev.filter((_, i) => i !== idx));

  const grandTotal = lineItems.reduce((s, l) => s + (l.amount || 0), 0);

  const toggleBillingTerm = (term: string) => {
    setBillingTerms(prev => prev.includes(term) ? prev.filter(t => t !== term) : [...prev, term]);
  };

  const handleVendorSelect = (vendor: any) => {
    const raw = vendor.rawSource || {};
    setVendorName(vendor.name || "");
    
    // Address extraction - try more keys
    setVendorAddress(
      vendor.address || 
      raw["Alamat :"] || 
      raw["Alamat Vendor"] || 
      raw["Alamat Kantor"] || 
      raw["Domisili"] || 
      raw["Alamat Lengkap"] || 
      vendor.coverageArea || 
      ""
    );
    
    // NPWP / Tax ID extraction
    setVendorTaxId(vendor.npwpNumber || raw["Nomor Pokok Wajib Pajak (NPWP)"] || raw["NPWP :"] || "");
    
    // Phone extraction
    const phone = vendor.picPhone || (vendor.contacts && vendor.contacts[0]?.phone) || raw["Nomor HP/WA PIC"] || "";
    setVendorPhone(phone);
    
    setVendorSearch("");
    setShowVendorSuggestions(false);
  };

  const filteredVendors = availableVendors.filter(v => 
    v.name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
    (v.serviceNames && v.serviceNames.some((s: string) => s.toLowerCase().includes(vendorSearch.toLowerCase())))
  ).slice(0, 5);

  const handleSubmit = async () => {
    if (!selectedProject || !vendorName) {
      alert("Lengkapi Project dan Vendor terlebih dahulu.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/finance/document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProject.id,
          documentType: docType,
          vendorName,
          vendorPhone,
          vendorAddress,
          vendorTaxId,
          lineItems,
          documentTotal: grandTotal,
          paymentTerms,
          paymentSchedule,
          paymentDate: paymentSchedule[0]?.date || "", // Fallback
          deliveryDate,
          shipTo,
          billingInstruction,
          billingTerms,
          notes,
          venue,
          duration,
          lampiran,
          workScope,
          description: lineItems[0]?.description || "", // Principal job name
          preparedBy: { name: "Purchasing Division", date: new Date().toISOString() },
        }),
      });
      if (res.ok) {
        onSuccess();
      } else {
        const err = await res.json();
        alert("Gagal menyimpan: " + err.error);
      }
    } catch (e) {
      alert("Network error");
    }
    setIsSubmitting(false);
  };

  const docTypeLabels: Record<DocType, string> = {
    PO: "Purchase Order (PO)",
    SPK: "Surat Perintah Kerja (SPK)",
    KONTRAK: "Surat Perjanjian Kontrak",
  };

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ backgroundColor: "var(--panel)", borderRadius: "16px", width: "100%", maxWidth: "960px", maxHeight: "90vh", border: "1px solid var(--line)", boxShadow: "var(--shadow)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        
        {/* Header */}
        <div style={{ padding: "24px 32px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "20px" }}>Buat Dokumen Pengadaan</h2>
            <p className="mini-meta" style={{ marginTop: "4px" }}>Step {step} of 3 — {step === 1 ? "Pilih Project & Tipe" : step === 2 ? "Detail Vendor & Line Items" : "Syarat & Ketentuan"}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "24px", color: "var(--muted)", cursor: "pointer" }}>&times;</button>
        </div>

        <div style={{ padding: "32px", overflowY: "auto", flex: 1 }}>

          {/* ─── STEP 1 ─── */}
          {step === 1 && (
            <div>
              <div className="form-section-title" style={{ marginBottom: "16px" }}>Pilih Project</div>
              <div style={{ display: "grid", gap: "8px", maxHeight: "220px", overflowY: "auto", marginBottom: "28px" }}>
                {activeProjects.map(p => (
                  <div key={p.id} onClick={() => setSelectedProject(p)} style={{ padding: "14px 16px", borderRadius: "10px", border: `2px solid ${selectedProject?.id === p.id ? "var(--blue)" : "var(--line)"}`, background: selectedProject?.id === p.id ? "rgba(91,140,255,0.08)" : "transparent", cursor: "pointer" }}>
                    <div style={{ fontWeight: 600 }}>{p.projectName}</div>
                    <div className="mini-meta">{p.client} • {p.currentStageLabel}</div>
                  </div>
                ))}
              </div>

              <div className="form-section-title" style={{ marginBottom: "16px" }}>Tipe Dokumen</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                {(["PO", "SPK", "KONTRAK"] as DocType[]).map(t => (
                  <label key={t} onClick={() => setDocType(t)} style={{ padding: "16px", borderRadius: "10px", border: `2px solid ${docType === t ? "var(--blue)" : "var(--line)"}`, background: docType === t ? "rgba(91,140,255,0.08)" : "transparent", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: "10px" }}>
                    <input type="radio" name="doctype" checked={docType === t} onChange={() => setDocType(t)} style={{ marginTop: "3px" }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "13px" }}>{docTypeLabels[t]}</div>
                      <div className="mini-meta">{t === "PO" ? "Pembelian barang/jasa" : t === "SPK" ? "Penugasan tenaga/jasa" : "Perjanjian jangka panjang"}</div>
                    </div>
                  </label>
                ))}
              </div>

              <div style={{ marginTop: "32px", display: "flex", justifyContent: "flex-end", gap: "12px", paddingBottom: "10px" }}>
                <button onClick={onClose} style={{ padding: "10px 20px", background: "none", border: "1px solid var(--line)", borderRadius: "8px", color: "var(--text)", cursor: "pointer" }}>Batal</button>
                <button onClick={() => setStep(2)} disabled={!selectedProject} className="primary-button">Lanjut →</button>
              </div>
            </div>
          )}

          {/* ─── STEP 2 ─── */}
          {step === 2 && (
            <div>
              {/* Active Project Banner */}
              <div style={{ marginBottom: "24px", padding: "12px 16px", background: "rgba(91,140,255,0.06)", border: "1px solid rgba(91,140,255,0.2)", borderRadius: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div className="mini-meta" style={{ color: "var(--blue)" }}>PROJECT AKTIF</div>
                  <div style={{ fontWeight: 700 }}>{selectedProject?.projectName}</div>
                </div>
                <button onClick={() => setStep(1)} style={{ background: "none", border: "1px solid var(--line)", padding: "4px 10px", borderRadius: "6px", fontSize: "11px", cursor: "pointer", color: "var(--muted)" }}>Ganti Project</button>
              </div>

              {/* Vendor Info */}
              <div className="form-section-title" style={{ marginBottom: "16px" }}>Informasi Vendor / Penerima</div>
              
              <div style={{ position: "relative", marginBottom: "20px" }}>
                <label className="mini-meta">Cari Vendor dari Database VMS</label>
                <div style={{ position: "relative", marginTop: "4px" }}>
                  <input 
                    style={{ width: "100%", background: "var(--panel-soft)", border: "1px solid var(--blue)", padding: "12px 16px", color: "var(--text)", borderRadius: "10px", outline: "none", boxShadow: "0 0 0 2px rgba(91,140,255,0.1)" }} 
                    value={vendorSearch} 
                    onChange={e => { setVendorSearch(e.target.value); setShowVendorSuggestions(true); }}
                    onFocus={() => setShowVendorSuggestions(true)}
                    placeholder="Ketik nama vendor atau jenis jasa (e.g. 'Catering', 'Tenda')..." 
                  />
                  {showVendorSuggestions && vendorSearch.length > 0 && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "10px", marginTop: "4px", boxShadow: "0 10px 25px rgba(0,0,0,0.3)", zIndex: 10, maxHeight: "280px", overflowY: "auto" }}>
                      {filteredVendors.length === 0 ? (
                        <div style={{ padding: "16px", textAlign: "center", color: "var(--muted)" }}>Vendor tidak ditemukan</div>
                      ) : (
                        filteredVendors.map(v => (
                          <div 
                            key={v.id} 
                            onClick={() => handleVendorSelect(v)}
                            style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", cursor: "pointer", transition: "background 0.2s" }}
                            onMouseEnter={e => e.currentTarget.style.background = "var(--panel-soft)"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                          >
                            <div style={{ fontWeight: 600, fontSize: "13px" }}>{v.name}</div>
                            <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                              <span className="chip" style={{ fontSize: "10px", background: "rgba(91,140,255,0.1)", color: "var(--blue)" }}>{v.classification}</span>
                              {v.serviceNames && v.serviceNames.slice(0, 2).map((s: string) => (
                                <span key={s} className="mini-meta" style={{ fontSize: "10px" }}>• {s}</span>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <label className="mini-meta">Nama Tertera di Dokumen *</label>
                  <input style={{ width: "100%", background: "var(--panel-soft)", border: "1px solid var(--line)", padding: "10px", color: "var(--text)", borderRadius: "8px", marginTop: "4px" }} value={vendorName} onChange={e => setVendorName(e.target.value)} placeholder="PT. Mitra Seni Indonesia" />
                </div>
                <div>
                  <label className="mini-meta">No. Telepon PIC</label>
                  <input style={{ width: "100%", background: "var(--panel-soft)", border: "1px solid var(--line)", padding: "10px", color: "var(--text)", borderRadius: "8px", marginTop: "4px" }} value={vendorPhone} onChange={e => setVendorPhone(e.target.value)} placeholder="08xx-xxxx-xxxx" />
                </div>
                <div>
                  <label className="mini-meta">Alamat Vendor</label>
                  <input style={{ width: "100%", background: "var(--panel-soft)", border: "1px solid var(--line)", padding: "10px", color: "var(--text)", borderRadius: "8px", marginTop: "4px" }} value={vendorAddress} onChange={e => setVendorAddress(e.target.value)} placeholder="Jl. Kebon Jeruk No. 12, Jakarta" />
                </div>
                <div>
                  <label className="mini-meta">NPWP / Tax ID</label>
                  <input style={{ width: "100%", background: "var(--panel-soft)", border: "1px solid var(--line)", padding: "10px", color: "var(--text)", borderRadius: "8px", marginTop: "4px" }} value={vendorTaxId} onChange={e => setVendorTaxId(e.target.value)} placeholder="00.000.000.0-000.000" />
                </div>
              </div>

              {/* Line Items */}
              {/* SPK Specific Details */}
              {(docType === "SPK" || docType === "KONTRAK") && (
                <div style={{ background: "rgba(91,140,255,0.06)", padding: "20px", borderRadius: "12px", border: "1px solid rgba(91,140,255,0.15)", marginBottom: "24px" }}>
                  <div className="form-section-title" style={{ color: "var(--blue)", marginBottom: "16px", marginTop: 0 }}>Detail SPK / Talent</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                    <div>
                      <label className="mini-meta">Lokasi Pekerjaan (Venue) *</label>
                      <input value={venue} onChange={e => setVenue(e.target.value)} placeholder="Contoh: Mandarin Oriental Hotel Jakarta" style={{ width: "100%", background: "var(--panel)", border: "1px solid var(--line)", padding: "10px", color: "var(--text)", borderRadius: "8px", marginTop: "4px" }} />
                    </div>
                    <div>
                      <label className="mini-meta">Durasi Pekerjaan *</label>
                      <input value={duration} onChange={e => setDuration(e.target.value)} placeholder="Contoh: 30 Maret 2026 - 31 Maret 2026" style={{ width: "100%", background: "var(--panel)", border: "1px solid var(--line)", padding: "10px", color: "var(--text)", borderRadius: "8px", marginTop: "4px" }} />
                    </div>
                  </div>
                  <div style={{ marginBottom: "16px" }}>
                     <label className="mini-meta">Lampiran</label>
                     <input value={lampiran} onChange={e => setLampiran(e.target.value)} style={{ width: "100%", background: "var(--panel)", border: "1px solid var(--line)", padding: "10px", color: "var(--text)", borderRadius: "8px", marginTop: "4px" }} />
                  </div>
                  <div>
                     <label className="mini-meta" style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Ruang Lingkup Pekerjaan (Bullet points)</span>
                        <span style={{ fontSize: "10px", opacity: 0.6 }}>Pisahkan dengan baris baru</span>
                     </label>
                     <textarea 
                       value={workScope.join("\n")} 
                       onChange={e => setWorkScope(e.target.value.split("\n"))}
                       rows={6}
                       placeholder="Satu baris per poin pekerjaan..."
                       style={{ width: "100%", background: "var(--panel)", border: "1px solid var(--line)", padding: "10px", color: "var(--text)", borderRadius: "8px", marginTop: "4px", fontSize: "12px", lineHeight: "1.6" }} 
                     />
                  </div>
                </div>
              )}

              <div className="form-section-title" style={{ margin: "24px 0 12px" }}>Detail Pesanan / Pekerjaan</div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                  <thead>
                    <tr style={{ background: "var(--panel-soft)" }}>
                      {["No", "Item / Task", "Spec", "Qty", "Satuan", "Freq", "Sat", "Harga", "Total", ""].map(h => (
                        <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "var(--muted)", whiteSpace: "nowrap", borderBottom: "1px solid var(--line)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((line, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: "6px 8px", color: "var(--muted)" }}>{idx + 1}</td>
                        <td style={{ padding: "4px 6px" }}><input value={line.description} onChange={e => updateLine(idx, "description", e.target.value)} placeholder="Nama item" style={{ width: "140px", background: "var(--panel-soft)", border: "1px solid var(--line)", padding: "6px 8px", color: "var(--text)", borderRadius: "6px" }} /></td>
                        <td style={{ padding: "4px 6px" }}><input value={line.specification} onChange={e => updateLine(idx, "specification", e.target.value)} placeholder="Detail" style={{ width: "120px", background: "var(--panel-soft)", border: "1px solid var(--line)", padding: "6px 8px", color: "var(--text)", borderRadius: "6px" }} /></td>
                        <td style={{ padding: "4px 6px" }}><input type="number" value={line.qty} onChange={e => updateLine(idx, "qty", e.target.value)} style={{ width: "52px", background: "var(--panel-soft)", border: "1px solid var(--line)", padding: "6px 8px", color: "var(--text)", borderRadius: "6px" }} /></td>
                        <td style={{ padding: "4px 6px" }}><input value={line.unit} onChange={e => updateLine(idx, "unit", e.target.value)} style={{ width: "64px", background: "var(--panel-soft)", border: "1px solid var(--line)", padding: "6px 8px", color: "var(--text)", borderRadius: "6px" }} /></td>
                        <td style={{ padding: "4px 6px" }}><input type="number" value={line.freq} onChange={e => updateLine(idx, "freq", e.target.value)} style={{ width: "52px", background: "var(--panel-soft)", border: "1px solid var(--line)", padding: "6px 8px", color: "var(--text)", borderRadius: "6px" }} /></td>
                        <td style={{ padding: "4px 6px" }}><input value={line.freqUnit} onChange={e => updateLine(idx, "freqUnit", e.target.value)} style={{ width: "64px", background: "var(--panel-soft)", border: "1px solid var(--line)", padding: "6px 8px", color: "var(--text)", borderRadius: "6px" }} /></td>
                        <td style={{ padding: "4px 6px" }}><input type="number" value={line.price} onChange={e => updateLine(idx, "price", e.target.value)} style={{ width: "110px", background: "var(--panel-soft)", border: "1px solid var(--line)", padding: "6px 8px", color: "var(--text)", borderRadius: "6px" }} /></td>
                        <td style={{ padding: "4px 8px", fontWeight: 600, whiteSpace: "nowrap", fontSize: "11px" }}>{formatCurrencyIDR(line.amount)}</td>
                        <td style={{ padding: "4px 6px" }}><button onClick={() => removeLine(idx)} style={{ background: "rgba(239,68,68,0.1)", border: "none", borderRadius: "4px", color: "#f87171", cursor: "pointer", padding: "4px 8px" }}>✕</button></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={8} style={{ padding: "12px 8px", textAlign: "right", fontWeight: 700, color: "var(--text)" }}>TOTAL</td>
                      <td colSpan={2} style={{ padding: "12px 8px", fontWeight: 700, fontSize: "14px", color: "var(--blue)" }}>{formatCurrencyIDR(grandTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <button onClick={addLine} style={{ marginTop: "10px", background: "rgba(91,140,255,0.1)", border: "1px dashed var(--blue)", borderRadius: "8px", color: "var(--blue)", cursor: "pointer", padding: "8px 20px", width: "100%", fontSize: "12px" }}>+ Tambah Item</button>

              <div style={{ marginTop: "32px", display: "flex", justifyContent: "space-between", gap: "12px" }}>
                <button onClick={() => setStep(1)} style={{ padding: "10px 20px", background: "none", border: "1px solid var(--line)", borderRadius: "8px", color: "var(--text)", cursor: "pointer" }}>← Kembali</button>
                <div style={{ display: "flex", gap: "12px" }}>
                  <button onClick={onClose} style={{ padding: "10px 20px", background: "none", border: "1px solid var(--line)", borderRadius: "8px", color: "var(--text)", cursor: "pointer" }}>Batal</button>
                  <button onClick={() => setStep(3)} disabled={grandTotal === 0} className="primary-button">Lanjut →</button>
                </div>
              </div>
            </div>
          )}

          {/* ─── STEP 3 ─── */}
          {step === 3 && (
            <div>
              {/* Active Project Banner */}
              <div style={{ marginBottom: "24px", padding: "12px 16px", background: "rgba(91,140,255,0.06)", border: "1px solid rgba(91,140,255,0.2)", borderRadius: "10px" }}>
                <div className="mini-meta" style={{ color: "var(--blue)" }}>PROJECT</div>
                <div style={{ fontWeight: 700 }}>{selectedProject?.projectName}</div>
              </div>

              <div className="form-section-title" style={{ marginBottom: "16px" }}>Syarat & Ketentuan Pembayaran (Termin)</div>
              <div style={{ marginBottom: "20px" }}>
                <label className="mini-meta" style={{ display: "block", marginBottom: "12px" }}>Atur Jadwal Pembayaran (Schedule):</label>
                <div style={{ display: "grid", gap: "10px" }}>
                  {paymentSchedule.map((ev, idx) => (
                    <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 100px 160px auto", gap: "10px", alignItems: "center", background: "var(--panel-soft)", padding: "10px", borderRadius: "8px", border: "1px solid var(--line)" }}>
                      <input 
                        value={ev.label} 
                        onChange={e => {
                          const updated = [...paymentSchedule];
                          updated[idx].label = e.target.value;
                          setPaymentSchedule(updated);
                        }}
                        placeholder="e.g. DP / Termin 1"
                        style={{ background: "transparent", border: "none", borderBottom: "1px solid var(--line)", padding: "4px", color: "var(--text)", fontSize: "14px" }}
                      />
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <input 
                          type="number" 
                          value={ev.percentage || ""} 
                          onChange={e => {
                            const updated = [...paymentSchedule];
                            updated[idx].percentage = Number(e.target.value);
                            updated[idx].amount = (grandTotal * (updated[idx].percentage || 0)) / 100;
                            setPaymentSchedule(updated);
                          }}
                          style={{ width: "50px", background: "transparent", border: "none", borderBottom: "1px solid var(--line)", padding: "4px", color: "var(--text)", textAlign: "center" }}
                        />
                        <span className="mini-meta">%</span>
                      </div>
                      <input 
                        type="date" 
                        value={ev.date || ""} 
                        onChange={e => {
                          const updated = [...paymentSchedule];
                          updated[idx].date = e.target.value;
                          setPaymentSchedule(updated);
                        }}
                        style={{ background: "transparent", border: "none", borderBottom: "1px solid var(--line)", padding: "4px", color: "var(--text)" }}
                      />
                      <button onClick={() => setPaymentSchedule(prev => prev.filter((_, i) => i !== idx))} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer" }}>&times;</button>
                    </div>
                  ))}
                </div>
                <button onClick={() => setPaymentSchedule(prev => [...prev, emptyEvent(`Termin ${prev.length + 1}`)])} style={{ marginTop: "12px", background: "none", border: "1px dashed var(--blue)", color: "var(--blue)", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "12px" }}>+ Tambah Termin / Pembayaran</button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label className="mini-meta">Payment Method Reference</label>
                  <select style={{ width: "100%", background: "var(--panel-soft)", border: "1px solid var(--line)", padding: "10px", color: "var(--text)", borderRadius: "8px", marginTop: "4px" }} value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)}>
                    <option>Custom Schedule</option>
                    <option>Full Payment</option>
                    <option>DP + Pelunasan</option>
                    <option>Retensi 5%</option>
                  </select>
                </div>
                <div>
                  <label className="mini-meta">Catatan Tambahan</label>
                  <input style={{ width: "100%", background: "var(--panel-soft)", border: "1px solid var(--line)", padding: "10px", color: "var(--text)", borderRadius: "8px", marginTop: "4px" }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Catatan atau instruksi khusus..." />
                </div>
              </div>

              <div className="form-section-title" style={{ margin: "24px 0 16px" }}>Delivery Instruction</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label className="mini-meta">Ship To (Lokasi Event)</label>
                  <input style={{ width: "100%", background: "var(--panel-soft)", border: "1px solid var(--line)", padding: "10px", color: "var(--text)", borderRadius: "8px", marginTop: "4px" }} value={shipTo} onChange={e => setShipTo(e.target.value)} placeholder="Gedung A, Jl. Sudirman..." />
                </div>
                <div>
                  <label className="mini-meta">Delivery Date</label>
                  <input type="date" style={{ width: "100%", background: "var(--panel-soft)", border: "1px solid var(--line)", padding: "10px", color: "var(--text)", borderRadius: "8px", marginTop: "4px" }} value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} />
                </div>
              </div>

              <div className="form-section-title" style={{ margin: "24px 0 16px" }}>Billing Instruction</div>
              <div style={{ marginBottom: "12px" }}>
                <label className="mini-meta">Email Billing</label>
                <input style={{ width: "100%", background: "var(--panel-soft)", border: "1px solid var(--line)", padding: "10px", color: "var(--text)", borderRadius: "8px", marginTop: "4px" }} value={billingInstruction} onChange={e => setBillingInstruction(e.target.value)} placeholder="finance@juara.co.id" />
              </div>
              <div style={{ marginBottom: "20px" }}>
                <label className="mini-meta" style={{ display: "block", marginBottom: "8px" }}>Billing Terms — Dokumen Wajib Diserahkan Vendor:</label>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  {["Invoice", "BAST", "Report Dokumentasi", "Kwitansi", "PPN/PPh Faktur"].map(term => (
                    <label key={term} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px" }}>
                      <input type="checkbox" checked={billingTerms.includes(term)} onChange={() => toggleBillingTerm(term)} />
                      {term}
                    </label>
                  ))}
                </div>
              </div>

              {/* Summary box */}
              <div style={{ marginTop: "24px", padding: "20px", background: "rgba(91,140,255,0.06)", border: "1px solid rgba(91,140,255,0.2)", borderRadius: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div className="mini-meta">Ringkasan Dokumen</div>
                    <div style={{ fontWeight: 600, marginTop: "4px" }}>{docTypeLabels[docType]} — {selectedProject?.projectName}</div>
                    <div className="mini-meta">Vendor: {vendorName} • {lineItems.length} item</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="mini-meta">Total Nilai</div>
                    <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--blue)" }}>{formatCurrencyIDR(grandTotal)}</div>
                  </div>
                </div>
                <div style={{ marginTop: "12px", padding: "8px 12px", background: "rgba(234,179,8,0.1)", borderRadius: "8px", border: "1px solid rgba(234,179,8,0.2)", fontSize: "12px", color: "#ca8a04" }}>
                  ⚠️ Dokumen akan tersimpan sebagai <strong>DRAFT</strong> dan perlu disetujui oleh Director sebelum dapat dibuatkan RFP.
                </div>
              </div>

              <div style={{ marginTop: "24px", display: "flex", justifyContent: "space-between", gap: "12px" }}>
                <button onClick={() => setStep(2)} style={{ padding: "10px 20px", background: "none", border: "1px solid var(--line)", borderRadius: "8px", color: "var(--text)", cursor: "pointer" }}>← Kembali</button>
                <div style={{ display: "flex", gap: "12px" }}>
                  <button onClick={onClose} style={{ padding: "10px 20px", background: "none", border: "1px solid var(--line)", borderRadius: "8px", color: "var(--text)", cursor: "pointer" }}>Batal</button>
                  <button onClick={handleSubmit} disabled={isSubmitting} className="primary-button" style={{ minWidth: "180px" }}>
                    {isSubmitting ? "Menyimpan..." : `Submit ${docTypeLabels[docType]}`}
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
