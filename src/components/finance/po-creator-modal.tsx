"use client";

import React, { useState, useEffect } from "react";
import { ProjectRecord } from "@/lib/project/types";
import { LineItem, PaymentEvent, ExpenseDocument } from "@/lib/finance/types";
import { 
  ShoppingBag, 
  FileSignature, 
  Scroll, 
  AlertCircle, 
  Trash2, 
  Plus, 
  Upload, 
  X,
  ChevronRight,
  Check
} from "lucide-react";
import { formatCurrencyIDR } from "@/lib/utils/format";
import { supabase } from "@/lib/supabase";

type DocType = "PO" | "SPK" | "KONTRAK";

interface Props {
  activeProjects: ProjectRecord[];
  availableVendors?: any[];
  availableFreelancers?: any[];
  editDoc?: ExpenseDocument;
  onClose: () => void;
  onSuccess: () => void;
}

const emptyEvent = (label = "Termin"): PaymentEvent => ({
  label,
  percentage: 0,
  amount: 0,
  date: "",
});

const emptyLine = (pphEnabled: boolean): LineItem => ({
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
  usePPh: pphEnabled
});

export function POCreatorModal({ activeProjects, availableVendors = [], availableFreelancers = [], editDoc, onClose, onSuccess }: Props) {
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
  const [pphType, setPphType] = useState<"NONE" | "PPH21" | "PPH23">("NONE");
  const [lineItems, setLineItems] = useState<LineItem[]>([{ ...emptyLine(false) }]);

  // Terms
  const [paymentTerms, setPaymentTerms] = useState("Full Payment");
  const [paymentSchedule, setPaymentSchedule] = useState<PaymentEvent[]>([
    { label: "Full Payment", percentage: 100, date: "" }
  ]);
  const [paymentDate, setPaymentDate] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [shipTo, setShipTo] = useState("");
  const [billingInstruction, setBillingInstruction] = useState("");
  const [billingTerms, setBillingTerms] = useState<string[]>(["Invoice", "BAST", "Report Dokumentasi"]);
  const [paymentKeterangan, setPaymentKeterangan] = useState<string[]>([
    "Sudah menandatangani Perjanjian Kerahasiaan (Non-Disclosure Agreement)"
  ]);
  const [penaltyFile, setPenaltyFile] = useState<File | null>(null);
  const [penaltyMemoUrl, setPenaltyMemoUrl] = useState("");
  const [isUploadingPenalty, setIsUploadingPenalty] = useState(false);
  const [notes, setNotes] = useState("");
  const [usePPN, setUsePPN] = useState(false);
  const [isGrossUp, setIsGrossUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [discount, setDiscount] = useState(0);

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

  // Handle Edit Doc Mode
  useEffect(() => {
    if (editDoc) {
      const proj = activeProjects.find(p => p.id === editDoc.projectId);
      if (proj) setSelectedProject(proj);
      setDocType(editDoc.documentType as DocType);
      setVendorName(editDoc.vendorName);
      setVendorAddress(editDoc.vendorAddress || "");
      setVendorTaxId(editDoc.vendorTaxId || "");
      setLineItems(editDoc.lineItems || [{ ...emptyLine(false) }]);
      setPaymentTerms(editDoc.paymentTerms || "");
      setPaymentSchedule(editDoc.paymentSchedule || []);
      setDeliveryDate(editDoc.deliveryDate || "");
      setShipTo(editDoc.shipTo || "");
      setBillingInstruction(editDoc.billingInstruction || "");
      setBillingTerms(editDoc.billingTerms || []);
      setNotes(editDoc.notes || "");
      
      setUsePPN(editDoc.usePPN || false);
      setIsGrossUp(editDoc.pph21Mode === "grossup");
      setVenue(editDoc.venue || "");
      setDuration(editDoc.duration || "");
      setLampiran(editDoc.lampiran || "");
      setWorkScope(editDoc.workScope || []);
      setPaymentKeterangan(editDoc.paymentKeterangan || [
        "Sudah menandatangani Perjanjian Kerahasiaan (Non-Disclosure Agreement)"
      ]);
      setPenaltyMemoUrl(editDoc.penaltyMemoUrl || "");
      setDiscount(editDoc.discount || 0);
      setStep(2); 
    }
  }, [editDoc, activeProjects]);

  const updateLine = (idx: number, field: keyof LineItem, value: any) => {
    setLineItems(prev => {
      const updated = [...prev];
      const line = { ...updated[idx], [field]: value };
      if (["qty", "freq", "price", field].includes(field as string)) {
        const qty = field === "qty" ? Number(value) : Number(line.qty);
        const freq = field === "freq" ? Number(value) : Number(line.freq);
        const price = field === "price" ? Number(value) : Number(line.price);
        line.amount = qty * freq * price;
      }
      updated[idx] = line;
      return updated;
    });
  };

  const addLine = () => setLineItems(prev => [...prev, { ...emptyLine(pphType !== "NONE"), no: prev.length + 1 }]);
  const removeLine = (idx: number) => setLineItems(prev => prev.filter((_, i) => i !== idx));

  const subtotalItems = lineItems.reduce((s, l) => s + (l.amount || 0), 0);
  const taxBase = Math.max(0, subtotalItems - discount);
  
  // PPh Calculation
  const pphRate = pphType === "PPH21" ? 0.025 : pphType === "PPH23" ? 0.02 : 0;
  const pphAmount = isGrossUp ? (taxBase / (1 - pphRate)) - taxBase : 0;
  const docGross = taxBase + pphAmount;

  const ppnAmount = usePPN ? docGross * 0.11 : 0;
  const totalPO = docGross + ppnAmount;
  const grandTotal = totalPO;

  const toggleBillingTerm = (term: string) => {
    setBillingTerms(prev => prev.includes(term) ? prev.filter(t => t !== term) : [...prev, term]);
  };

  const handleVendorSelect = (vendor: any) => {
    if (vendor.type === 'freelancer') {
      setVendorName(vendor.nama || "");
      setVendorPhone(vendor.no_hp || "");
      setVendorAddress(vendor.kota_domisili || "");
      setVendorTaxId("");
    } else {
      const raw = vendor.rawSource || {};
      setVendorName(vendor.name || "");
      setVendorAddress(vendor.businessAddress || vendor.address || raw["Alamat :"] || raw["Alamat Vendor"] || "");
      setVendorTaxId(vendor.npwpNumber || raw["Nomor Pokok Wajib Pajak (NPWP)"] || "");
      const phone = vendor.picPhone || (vendor.contacts && vendor.contacts[0]?.phone) || "";
      setVendorPhone(phone);
    }
    setVendorSearch("");
    setShowVendorSuggestions(false);
  };

  const handleTermsChange = (mode: string) => {
    setPaymentTerms(mode);
    const bullets = ["Sudah menandatangani Perjanjian Kerahasiaan (Non-Disclosure Agreement)"];
    if (mode === "Full Payment") {
      setPaymentSchedule([{ label: "Full Payment", percentage: 100, date: "" }]);
      bullets.push("Pembayaran 100% akan dilakukan setelah pekerjaan selesai dan invoice diterima.");
    } else if (mode === "DP + Pelunasan") {
      setPaymentSchedule([{ label: "Down Payment (DP)", percentage: 50, date: "" }, { label: "Pelunasan", percentage: 50, date: "" }]);
      bullets.push("DP 50% akan dibayarkan setelah invoice diterima.");
      bullets.push("Pelunasan 50% akan dibayarkan setelah pekerjaan selesai.");
    }
    setPaymentKeterangan(bullets);
  };

  const combinedVendors = [
    ...availableVendors.map(v => ({ ...v, type: 'vendor', displayName: v.name, displayMeta: v.serviceNames?.join(", ") })),
    ...availableFreelancers.map(f => ({ ...f, type: 'freelancer', displayName: f.nama, displayMeta: f.posisi_utama?.join(", ") }))
  ];

  const filteredVendors = combinedVendors.filter(v => 
    v.displayName.toLowerCase().includes(vendorSearch.toLowerCase()) ||
    (v.displayMeta && v.displayMeta.toLowerCase().includes(vendorSearch.toLowerCase()))
  ).slice(0, 10);

  const hasPenalty = lineItems.some(item => (item.price || 0) < 0);

  const uploadPenaltyMemo = async (file: File) => {
    if (!supabase) return "";
    setIsUploadingPenalty(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `penalty-memos/${fileName}`;
      const { data, error } = await supabase.storage.from('finance-docs').upload(filePath, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('finance-docs').getPublicUrl(filePath);
      return publicUrl;
    } catch (err) {
      return "";
    } finally {
      setIsUploadingPenalty(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedProject || !vendorName) {
      alert("Harap pilih project dan isi nama vendor sebelum submit.");
      return;
    }
    setIsSubmitting(true);
    try {
      let finalMemoUrl = penaltyMemoUrl;
      if (hasPenalty && penaltyFile) {
        finalMemoUrl = await uploadPenaltyMemo(penaltyFile);
      }
      const finalPaymentSchedule = paymentSchedule.map(ev => ({ ...ev, amount: (grandTotal * (ev.percentage || 0)) / 100 }));
      
      const payload = {
        id: editDoc?.id, projectId: selectedProject.id, projectInitial: selectedProject.projectInitial,
        documentType: docType, vendorName, vendorPhone, vendorAddress, vendorTaxId,
        lineItems, documentTotal: grandTotal, paymentTerms, paymentSchedule: finalPaymentSchedule,
        deliveryDate, shipTo, billingInstruction, billingTerms, notes, venue, duration, lampiran, workScope,
        paymentKeterangan, penaltyMemoUrl: finalMemoUrl, description: lineItems[0]?.description || "",
        pphType, usePPh21: pphType !== "NONE", pph21Mode: isGrossUp ? "grossup" : "none", usePPN, grossAmount: docGross, taxAmount: pphAmount, ppnAmount, netAmount: grandTotal, totalPO,
        discount,
        preparedBy: { name: "Procurement Division", date: new Date().toISOString() },
      };

      const res = await fetch("/api/finance/document", {
        method: editDoc ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onSuccess();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(`Gagal menyimpan dokumen: ${errData.message || 'Server error'}`);
      }
    } catch (e) {
      console.error("Submit Error:", e);
      alert("Terjadi kesalahan koneksi saat submit.");
    }
    setIsSubmitting(false);
  };

  const docTypeLabels: Record<DocType, string> = { PO: "Purchase Order", SPK: "SPK / Penugasan", KONTRAK: "Kontrak Kerja" };

  const isStep1Valid = !!selectedProject;
  const isStep2Valid = !!vendorName && lineItems.length > 0;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 1000, display: "grid", placeItems: "center", backdropFilter: "blur(12px)" }}>
      <div style={{ width: "min(960px, 95vw)", height: "min(820px, 92vh)", background: "#1f1f23", borderRadius: "24px", display: "flex", flexDirection: "column", overflow: "hidden", border: "0.5px solid rgba(255,255,255,0.1)" }}>
        
        {/* Header & Steps */}
        <div style={{ padding: "32px 40px", background: "#111113", borderBottom: "0.5px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <div>
              <h2 style={{ fontSize: "20px", color: "#f4f4f5", margin: 0 }}>{editDoc ? 'Edit' : 'Create'} Procurement Document</h2>
              <p style={{ fontSize: "12px", color: "#71717a", marginTop: "4px" }}>Generate PO, SPK, or Contract for project: <strong>{selectedProject?.projectName || 'Select Project'}</strong></p>
            </div>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.05)", border: "none", width: '32px', height: '32px', borderRadius: '8px', color: "#71717a", cursor: "pointer", display: 'grid', placeItems: 'center' }}><X size={18} /></button>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {[1, 2, 3].map((s) => (
              <React.Fragment key={s}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ 
                    width: '28px', height: '28px', borderRadius: '50%', border: step === s ? 'none' : '1px solid rgba(255,255,255,0.1)',
                    background: step === s ? '#378ADD' : (step > s ? 'rgba(93,202,165,0.1)' : 'transparent'),
                    display: 'grid', placeItems: 'center', fontSize: '12px', fontWeight: 600,
                    color: step === s ? '#fff' : (step > s ? '#5DCAA5' : '#52525b')
                  }}>{step > s ? <Check size={14} /> : s}</div>
                  <span style={{ fontSize: '13px', fontWeight: step === s ? 600 : 500, color: step === s ? '#e4e4e7' : '#52525b' }}>{s === 1 ? 'Project & Type' : s === 2 ? 'Vendor & Items' : 'Terms & Submit'}</span>
                </div>
                {s < 3 && <div style={{ flex: 1, height: '1px', background: step > s ? '#5DCAA5' : 'rgba(255,255,255,0.06)', margin: '0 12px', maxWidth: '60px' }} />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, overflowY: "auto", padding: "40px" }}>
          
          {step === 1 && (
            <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#52525b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Select Project</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "12px", marginBottom: '40px', maxHeight: '240px', overflowY: 'auto', padding: '4px' }}>
                {activeProjects.map(p => (
                  <div key={p.id} onClick={() => setSelectedProject(p)} style={{ 
                    padding: "16px", background: selectedProject?.id === p.id ? "rgba(55,138,221,0.1)" : "#18181b",
                    borderRadius: "12px", border: selectedProject?.id === p.id ? "1.5px solid #378ADD" : "0.5px solid rgba(255,255,255,0.06)",
                    cursor: "pointer", transition: "all 0.2s"
                  }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: selectedProject?.id === p.id ? '#378ADD' : '#e4e4e7' }}>{p.projectName}</div>
                    <div style={{ fontSize: '11px', color: '#52525b', marginTop: '4px' }}>{p.client}</div>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: '12px', fontWeight: 600, color: '#52525b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Document Type</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
                {(["PO", "SPK", "KONTRAK"] as DocType[]).map(t => (
                  <div key={t} onClick={() => setDocType(t)} style={{ 
                    padding: "20px", background: docType === t ? "rgba(55,138,221,0.1)" : "#18181b",
                    borderRadius: "16px", border: docType === t ? "1.5px solid #378ADD" : "0.5px solid rgba(255,255,255,0.06)",
                    cursor: "pointer", textAlign: 'center'
                  }}>
                    <div style={{ color: docType === t ? '#378ADD' : '#52525b', marginBottom: '8px' }}>{t === 'PO' ? <ShoppingBag size={24} /> : t === 'SPK' ? <Scroll size={24} /> : <FileSignature size={24} />}</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: docType === t ? '#e4e4e7' : '#71717a' }}>{docTypeLabels[t]}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
              <div style={{ position: "relative", marginBottom: "32px" }}>
                <label style={{ fontSize: '11px', color: '#52525b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Vendor Database Lookup</label>
                <div style={{ position: "relative", marginTop: "8px" }}>
                  <input style={{ width: "100%", background: "#111113", border: "0.5px solid rgba(255,255,255,0.1)", padding: "12px 16px", color: "#e4e4e7", borderRadius: "10px", outline: "none" }} value={vendorSearch} onChange={e => { setVendorSearch(e.target.value); setShowVendorSuggestions(true); }} placeholder="Search existing vendors or freelancers..." />
                  {showVendorSuggestions && vendorSearch.length > 0 && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#18181b", border: "0.5px solid rgba(255,255,255,0.1)", borderRadius: "10px", marginTop: "4px", boxShadow: "0 10px 30px rgba(0,0,0,0.5)", zIndex: 10, maxHeight: "240px", overflowY: "auto" }}>
                      {filteredVendors.map(v => (
                        <div key={v.id} onClick={() => handleVendorSelect(v)} style={{ padding: "12px 16px", borderBottom: "0.5px solid rgba(255,255,255,0.05)", cursor: "pointer" }}>
                          <div style={{ fontWeight: 600, fontSize: "13px", color: '#e4e4e7' }}>{v.displayName}</div>
                          <div style={{ fontSize: '11px', color: '#52525b' }}>{v.displayMeta}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "32px" }}>
                <div className="p-input-group"><label>Vendor Name</label><input className="p-input" value={vendorName} onChange={e => setVendorName(e.target.value)} /></div>
                <div className="p-input-group"><label>Phone</label><input className="p-input" value={vendorPhone} onChange={e => setVendorPhone(e.target.value)} /></div>
                <div className="p-input-group"><label>Tax ID (NPWP)</label><input className="p-input" value={vendorTaxId} onChange={e => setVendorTaxId(e.target.value)} placeholder="00.000.000.0-000.000" /></div>
                <div className="p-input-group">
                  <label>PPh & Gross Up</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select className="p-input" style={{ flex: 2 }} value={pphType} onChange={e => setPphType(e.target.value as any)}>
                      <option value="NONE">Tanpa PPh</option>
                      <option value="PPH21">PPh 21 (2.5%)</option>
                      <option value="PPH23">PPh 23 (2.0%)</option>
                    </select>
                    {pphType !== "NONE" && (
                      <label style={{ flex: 1.2, display: 'flex', alignItems: 'center', gap: '8px', background: '#111113', border: '0.5px solid rgba(255,255,255,0.1)', padding: '0 12px', borderRadius: '8px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={isGrossUp} onChange={e => setIsGrossUp(e.target.checked)} style={{ width: '14px', height: '14px' }} />
                        <span style={{ fontSize: '11px', color: isGrossUp ? '#378ADD' : '#71717a', fontWeight: 600 }}>Gross Up</span>
                      </label>
                    )}
                  </div>
                </div>
                <div className="p-input-group">
                  <label>PPN Status</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#111113', border: '0.5px solid rgba(255,255,255,0.1)', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={usePPN} onChange={e => setUsePPN(e.target.checked)} style={{ width: '16px', height: '16px' }} />
                    <span style={{ fontSize: '13px', color: usePPN ? '#378ADD' : '#71717a', fontWeight: 600 }}>{usePPN ? 'Menggunakan PPN (11%)' : 'Tanpa PPN'}</span>
                  </label>
                </div>
                {docType !== "PO" && (
                  <>
                    <div className="p-input-group"><label>Venue</label><input className="p-input" value={venue} onChange={e => setVenue(e.target.value)} /></div>
                    <div className="p-input-group"><label>Duration</label><input className="p-input" value={duration} onChange={e => setDuration(e.target.value)} /></div>
                    <div className="p-input-group"><label>Lampiran</label><input className="p-input" value={lampiran} onChange={e => setLampiran(e.target.value)} /></div>
                  </>
                )}
                <div className="p-input-group" style={{ gridColumn: docType === "PO" ? 'span 2' : 'span 1' }}><label>Address</label><input className="p-input" value={vendorAddress} onChange={e => setVendorAddress(e.target.value)} /></div>
              </div>

              {docType !== "PO" && (
                <div style={{ marginBottom: '32px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#378ADD', textTransform: 'uppercase', letterSpacing: '1px' }}>Work Scope (Ruang Lingkup Pekerjaan)</div>
                    <button onClick={() => setWorkScope(prev => [...prev, ""])} style={{ background: 'rgba(55,138,221,0.1)', color: '#378ADD', border: 'none', borderRadius: '6px', padding: '4px 12px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>+ Add Scope</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {workScope.map((scope, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center', background: '#111113', padding: '8px 12px', borderRadius: '8px', border: '0.5px solid rgba(255,255,255,0.06)' }}>
                        <input className="cell-input" value={scope} onChange={e => {
                          const next = [...workScope];
                          next[idx] = e.target.value;
                          setWorkScope(next);
                        }} />
                        <button onClick={() => setWorkScope(prev => prev.filter((_, i) => i !== idx))} style={{ color: '#52525b', background: 'none', border: 'none' }}><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#e4e4e7', textTransform: 'uppercase' }}>Line Items</div>
                  <button onClick={addLine} style={{ background: 'rgba(55,138,221,0.1)', color: '#378ADD', border: 'none', borderRadius: '6px', padding: '4px 12px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>+ Add Row</button>
                </div>
                <div style={{ background: '#111113', borderRadius: '12px', border: '0.5px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead><tr style={{ background: '#18181b' }}>
                      <th style={{ padding: '12px', textAlign: 'left', color: '#52525b' }}>Description</th>
                      <th style={{ padding: '12px', textAlign: 'center', color: '#52525b', width: '50px' }}>Qty</th>
                      <th style={{ padding: '12px', textAlign: 'center', color: '#52525b', width: '60px' }}>Unit</th>
                      <th style={{ padding: '12px', textAlign: 'center', color: '#52525b', width: '50px' }}>Freq</th>
                      <th style={{ padding: '12px', textAlign: 'center', color: '#52525b', width: '60px' }}>Unit</th>
                      <th style={{ padding: '12px', textAlign: 'right', color: '#52525b' }}>Price</th>
                      <th style={{ padding: '12px', textAlign: 'right', color: '#52525b' }}>Total</th>
                      <th style={{ width: '40px' }}></th>
                    </tr></thead>
                    <tbody>
                      {lineItems.map((line, idx) => (
                        <tr key={idx} style={{ borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '8px' }}><input className="cell-input" value={line.description} onChange={e => updateLine(idx, "description", e.target.value)} /></td>
                          <td style={{ padding: '8px' }}><input className="cell-input text-center" type="number" value={line.qty} onChange={e => updateLine(idx, "qty", e.target.value)} /></td>
                          <td style={{ padding: '8px' }}><input className="cell-input text-center" value={line.unit} onChange={e => updateLine(idx, "unit", e.target.value)} placeholder="Unit" /></td>
                          <td style={{ padding: '8px' }}><input className="cell-input text-center" type="number" value={line.freq} onChange={e => updateLine(idx, "freq", e.target.value)} /></td>
                          <td style={{ padding: '8px' }}><input className="cell-input text-center" value={line.freqUnit} onChange={e => updateLine(idx, "freqUnit", e.target.value)} placeholder="Days" /></td>
                          <td style={{ padding: '8px' }}><input className="cell-input text-right" type="number" value={line.price} onChange={e => updateLine(idx, "price", e.target.value)} /></td>
                          <td style={{ padding: '8px', textAlign: 'right', color: '#e4e4e7', fontWeight: 600 }}>{formatCurrencyIDR(line.amount)}</td>
                          <td style={{ textAlign: 'center' }}><button onClick={() => removeLine(idx)} style={{ color: '#52525b', background: 'none', border: 'none' }}><Trash2 size={14} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ padding: '20px', background: '#18181b', display: 'flex', justifyContent: 'flex-end', gap: '24px', alignItems: 'baseline' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '10px', color: '#52525b' }}>Subtotal</div>
                      <div style={{ fontSize: '14px', color: '#e4e4e7' }}>{formatCurrencyIDR(subtotalItems)}</div>
                    </div>
                    <div style={{ textAlign: 'right', width: '120px' }}>
                      <div style={{ fontSize: '10px', color: '#f87171', fontWeight: 600 }}>Discount</div>
                      <input 
                        type="number" 
                        className="cell-input text-right" 
                        style={{ fontSize: '14px', color: '#f87171', borderBottom: '1px dashed rgba(248,113,113,0.3)', padding: '2px 0' }} 
                        value={discount} 
                        onChange={e => setDiscount(Number(e.target.value))} 
                        placeholder="0"
                      />
                    </div>
                    {isGrossUp && pphType !== "NONE" && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '10px', color: '#52525b' }}>PPh {pphType === "PPH21" ? "21" : "23"} Gross Up</div>
                        <div style={{ fontSize: '14px', color: '#378ADD' }}>+ {formatCurrencyIDR(pphAmount)}</div>
                      </div>
                    )}
                    {usePPN && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '10px', color: '#52525b' }}>PPN (11%)</div>
                        <div style={{ fontSize: '14px', color: '#EF9F27' }}>+ {formatCurrencyIDR(ppnAmount)}</div>
                      </div>
                    )}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '10px', color: '#378ADD', fontWeight: 700 }}>Total PO Value</div>
                      <div style={{ fontSize: '24px', fontWeight: 700, color: '#378ADD' }}>{formatCurrencyIDR(totalPO)}</div>
                    </div>
                  </div>
                </div>

                {hasPenalty && (
                  <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(239,68,68,0.05)', borderRadius: '12px', border: '1px dashed rgba(239,68,68,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#ef4444' }}>Penalty Memo Required</div>
                      <div style={{ fontSize: '11px', color: '#71717a' }}>Negative items detected. Please upload an approval memo.</div>
                    </div>
                    <label style={{ cursor: 'pointer', background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '8px 16px', borderRadius: '8px', fontSize: '11px', fontWeight: 600 }}>
                      {isUploadingPenalty ? 'Uploading...' : (penaltyFile || penaltyMemoUrl ? '✓ Memo Attached' : 'Upload Memo')}
                      <input type="file" hidden accept="image/*,application/pdf" onChange={e => e.target.files?.[0] && setPenaltyFile(e.target.files[0])} />
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                <div className="p-input-group">
                  <label>Payment Method Reference</label>
                  <select className="p-input" value={paymentTerms} onChange={e => handleTermsChange(e.target.value)}>
                    <option value="Full Payment">Full Payment</option>
                    <option value="DP + Pelunasan">DP + Pelunasan</option>
                    <option value="Custom Schedule">Custom Schedule</option>
                  </select>
                </div>
                <div className="p-input-group">
                  <label>Notes / Catatan Pembayaran</label>
                  <input className="p-input" placeholder="Misal: Pembayaran bertahap sesuai progres..." value={notes} onChange={e => setNotes(e.target.value)} />
                </div>
              </div>

              {/* Payment Schedule */}
              <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#378ADD', textTransform: 'uppercase', letterSpacing: '1px' }}>Detail Jadwal Pembayaran (Schedule)</div>
                  {paymentTerms === "Custom Schedule" && (
                    <button onClick={() => setPaymentSchedule(prev => [...prev, emptyEvent(`Termin ${prev.length + 1}`)])} style={{ background: 'rgba(55,138,221,0.1)', color: '#378ADD', border: 'none', borderRadius: '6px', padding: '4px 12px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>+ Add Termin</button>
                  )}
                </div>
                <div style={{ background: '#111113', borderRadius: '12px', border: '0.5px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 160px 180px 40px', gap: '12px', padding: '12px 16px', background: '#18181b', fontSize: '10px', color: '#52525b', fontWeight: 600 }}>
                    <span>LABEL / DESKRIPSI</span>
                    <span style={{ textAlign: 'center' }}>%</span>
                    <span>NILAI (RP)</span>
                    <span>TANGGAL (EST)</span>
                    <span></span>
                  </div>
                  {paymentSchedule.map((ev, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 160px 180px 40px', gap: '12px', padding: '12px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.04)', alignItems: 'center' }}>
                      <input className="cell-input" value={ev.label} onChange={e => {
                        const next = [...paymentSchedule];
                        next[idx].label = e.target.value;
                        setPaymentSchedule(next);
                      }} placeholder="Label (e.g. DP 50%)" />
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input className="cell-input text-center" type="number" step="0.01" value={ev.percentage} onChange={e => {
                          const next = [...paymentSchedule];
                          const pct = Number(e.target.value);
                          next[idx].percentage = pct;
                          next[idx].amount = (grandTotal * pct) / 100;
                          setPaymentSchedule(next);
                        }} />
                        <span style={{ color: '#52525b', fontSize: '12px' }}>%</span>
                      </div>

                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: '#52525b' }}>Rp</span>
                        <input 
                          className="cell-input" 
                          style={{ paddingLeft: '20px', color: '#378ADD', fontWeight: 600 }} 
                          type="text"
                          value={(ev.amount || (grandTotal * (ev.percentage || 0) / 100)).toLocaleString('id-ID')} 
                          onChange={e => {
                            const next = [...paymentSchedule];
                            // Remove non-digits to get raw number
                            const rawValue = e.target.value.replace(/[^0-9]/g, '');
                            const amt = Number(rawValue);
                            next[idx].amount = amt;
                            next[idx].percentage = grandTotal > 0 ? (amt / grandTotal) * 100 : 0;
                            setPaymentSchedule(next);
                          }} 
                        />
                      </div>

                      <input className="p-input" type="date" value={ev.date} onChange={e => {
                        const next = [...paymentSchedule];
                        next[idx].date = e.target.value;
                        setPaymentSchedule(next);
                      }} style={{ padding: '6px 10px', fontSize: '12px' }} />
                      
                      <button onClick={() => setPaymentSchedule(prev => prev.filter((_, i) => i !== idx))} style={{ color: '#ef4444', background: 'none', border: 'none', opacity: paymentSchedule.length > 1 ? 1 : 0, pointerEvents: paymentSchedule.length > 1 ? 'auto' : 'none' }}><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Remarks */}
              <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#378ADD', textTransform: 'uppercase', letterSpacing: '1px' }}>Keterangan Pembayaran (Bullet Points)</div>
                  <button onClick={() => setPaymentKeterangan(prev => [...prev, ""])} style={{ background: 'rgba(55,138,221,0.1)', color: '#378ADD', border: 'none', borderRadius: '6px', padding: '4px 12px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>+ Add Line</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {paymentKeterangan.map((kt, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center', background: '#111113', padding: '8px 12px', borderRadius: '8px', border: '0.5px solid rgba(255,255,255,0.06)' }}>
                      <input className="cell-input" value={kt} onChange={e => {
                        const next = [...paymentKeterangan];
                        next[idx] = e.target.value;
                        setPaymentKeterangan(next);
                      }} />
                      <button onClick={() => setPaymentKeterangan(prev => prev.filter((_, i) => i !== idx))} style={{ color: '#52525b', background: 'none', border: 'none' }}><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery & Billing */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                <div className="p-input-group">
                  <label>Ship To (Lokasi Event)</label>
                  <input className="p-input" value={shipTo} onChange={e => setShipTo(e.target.value)} placeholder="Gedung A, Jl. Sudirman..." />
                </div>
                <div className="p-input-group">
                  <label>Delivery Date</label>
                  <input className="p-input" type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} />
                </div>
                <div className="p-input-group">
                  <label>Email Billing</label>
                  <input className="p-input" value={billingInstruction} onChange={e => setBillingInstruction(e.target.value)} placeholder="finance@juara.co.id" />
                </div>
                <div className="p-input-group">
                  <label>Required Documents (Billing Terms)</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '8px' }}>
                    {["Invoice", "BAST", "Report Dokumentasi", "Kwitansi", "PPh/PPN Faktur"].map(term => (
                      <label key={term} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: '#a1a1aa' }}>
                        <input type="checkbox" checked={billingTerms.includes(term)} onChange={() => toggleBillingTerm(term)} style={{ width: '14px', height: '14px' }} />
                        {term}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Ringkasan */}
              <div style={{ background: 'rgba(55,138,221,0.05)', border: '1px solid rgba(55,138,221,0.1)', borderRadius: '16px', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <div>
                   <div style={{ fontSize: '11px', color: '#378ADD', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Ringkasan Dokumen</div>
                   <div style={{ fontSize: '14px', fontWeight: 600, color: '#e4e4e7' }}>{docTypeLabels[docType]} — {selectedProject?.projectName}</div>
                   <div style={{ fontSize: '12px', color: '#71717a', marginTop: '2px' }}>Vendor: {vendorName} • {lineItems.length} items</div>
                 </div>
                 <div style={{ textAlign: 'right' }}>
                   <div style={{ fontSize: '11px', color: '#71717a' }}>Total Nilai</div>
                   <div style={{ fontSize: '24px', fontWeight: 800, color: '#e4e4e7' }}>{formatCurrencyIDR(grandTotal)}</div>
                 </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{ padding: "24px 40px", background: "#111113", borderTop: "0.5px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between" }}>
          <button onClick={() => step > 1 && setStep((step - 1) as any)} style={{ background: 'transparent', border: 'none', color: '#71717a', cursor: 'pointer', opacity: step === 1 ? 0 : 1 }}>Back</button>
          <div style={{ display: 'flex', gap: '12px' }}>
             <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#71717a', padding: '0 20px', cursor: 'pointer' }}>Cancel</button>
             <button 
                onClick={() => {
                  if (step === 1 && !isStep1Valid) { alert("Harap pilih project terlebih dahulu."); return; }
                  if (step === 2 && !isStep2Valid) { alert("Harap isi nama vendor dan minimal 1 item."); return; }
                  step < 3 ? setStep((step + 1) as any) : handleSubmit();
                }} 
                style={{ 
                  background: (step === 1 && !isStep1Valid) || (step === 2 && !isStep2Valid) ? 'rgba(55,138,221,0.3)' : '#378ADD', 
                  color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 32px', fontWeight: 600, 
                  cursor: (step === 1 && !isStep1Valid) || (step === 2 && !isStep2Valid) ? 'not-allowed' : 'pointer' 
                }}
              >
                {isSubmitting ? 'Submitting...' : (step === 3 ? `Submit ${docType}` : 'Next Step')}
             </button>
          </div>
        </div>

        <style jsx>{`
          @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          .p-input-group label { display: block; font-size: 11px; color: #52525b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; font-weight: 600; }
          .p-input { width: 100%; background: #111113; border: 0.5px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 10px 14px; color: #e4e4e7; outline: none; }
          .cell-input { width: 100%; background: transparent; border: none; color: #e4e4e7; outline: none; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
        `}</style>
      </div>
    </div>
  );
}
