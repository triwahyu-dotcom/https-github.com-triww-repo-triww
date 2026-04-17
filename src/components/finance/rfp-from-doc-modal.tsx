"use client";

import { useState, useEffect } from "react";
import { ExpenseDocument, RequestForPayment } from "@/lib/finance/types";
import { formatCurrencyIDR } from "@/lib/utils/format";

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

  // Find the next unpaid termin automatically
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
  const defaultAmount = nextTerm
    ? (nextTerm.amount || Math.round(doc.amount * (nextTerm.percentage || 0) / 100))
    : doc.amount;
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInvoiceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setInvoiceFile(reader.result as string);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Edit RFP Mode
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

  // Auto-populate from VMS if available
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

  const handleTermChange = (ratio: "100" | "50" | "30" | "20" | "custom") => {
    setSelectedTermRatio(ratio);
    if (ratio !== "custom") {
      const pct = Number(ratio) / 100;
      setRfpAmount(Math.round(doc.amount * pct));
      setPaymentTerms(ratio === "100" ? "Full Payment" : ratio === "50" ? "DP 50%" : `Termin ${ratio}%`);
    } else {
      setPaymentTerms("Custom");
    }
  };

  const handleTermSelection = (term: any) => {
    setRfpAmount(term.amount || Math.round(doc.amount * (term.percentage || 0) / 100));
    setPaymentTerms(term.label);
    setSelectedTermRatio("custom"); // Use custom to allow the field to sync with our specific term amount
  };

  const handleSubmit = async () => {
    if (rfpAmount === 0 || (paymentType === "Transfer" && (!bankName || !accountNo))) {
      alert("Lengkapi semua field wajib.");
      return;
    }

    const finalNotes = notes;
    
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/finance/rfp", {
        method: editRfp ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editRfp?.id, // Only for PATCH
          documentId: doc.id,
          rfpAmount,
          paymentTerms,
          paymentType,
          bankAccount: { bankName, accountNo, accountName },
          notes: finalNotes,
          requiredDate,
          vendorInvoiceUrl: invoiceFile,
        }),
      });
      if (res.ok) {
        onSuccess();
      } else {
        const err = await res.json();
        alert("Gagal membuat RFP: " + err.error);
      }
    } catch {
      alert("Network error");
    }
    setIsSubmitting(false);
  };

  const docTypeLabel: Record<string, string> = {
    PO: "Purchase Order",
    SPK: "Surat Perintah Kerja",
    KONTRAK: "Surat Perjanjian Kontrak",
    CASH_ADVANCE: "Cash Advance",
  };

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ backgroundColor: "var(--panel)", borderRadius: "16px", width: "100%", maxWidth: "680px", maxHeight: "90vh", border: "1px solid var(--line)", boxShadow: "var(--shadow)", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "24px 32px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "20px" }}>Buat Request For Payment</h2>
            <p className="mini-meta" style={{ marginTop: "4px" }}>Dari dokumen yang sudah disetujui Director</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "24px", color: "var(--muted)", cursor: "pointer" }}>&times;</button>
        </div>

        <div style={{ padding: "28px 32px", overflowY: "auto", flex: 1 }}>

          {/* Source Document Summary */}
          <div style={{ padding: "16px 20px", background: "rgba(78,203,113,0.06)", border: "1px solid rgba(78,203,113,0.2)", borderRadius: "12px", marginBottom: "24px" }}>
            <div className="mini-meta" style={{ color: "var(--green)", marginBottom: "6px" }}>✓ DOKUMEN SUMBER (APPROVED)</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: "16px", color: "var(--text)", marginBottom: "4px" }}>Project: {doc.projectName}</div>
                <div style={{ fontWeight: 600 }}>{docTypeLabel[doc.documentType]} — {doc.id}</div>
                <div className="mini-meta">Vendor: {doc.vendorName}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="mini-meta">Total Nilai Dokumen</div>
                <div style={{ fontWeight: 700, fontSize: "16px" }}>{formatCurrencyIDR(doc.amount)}</div>
                {allRfps.length > 0 && (
                  <div className="mini-meta" style={{ marginTop: "4px" }}>
                    Terbayar/Diminta: {formatCurrencyIDR(allRfps.filter(r => r.documentIds.includes(doc.id)).reduce((s, r) => s + r.totalAmount, 0))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Termin / Payment Schedule Selection */}
          {doc.paymentSchedule && doc.paymentSchedule.length > 0 && (
            <div style={{ marginBottom: "24px" }}>
               <div className="form-section-title" style={{ marginBottom: "4px" }}>Status Termin Pembayaran (Sesuai PO)</div>
               <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "12px" }}>Termin aktif berikutnya dipilih & dikunci otomatis untuk menghindari kesalahan jumlah transfer.</div>
               <div style={{ display: "grid", gap: "8px" }}>
                  {doc.paymentSchedule.map((term, idx) => {
                    const rfpsForThisDoc = allRfps.filter(r => r.documentIds.includes(doc.id));
                    const isPaid = rfpsForThisDoc.some(r => r.terminLabel === term.label);
                    const prevTerm = idx > 0 ? doc.paymentSchedule![idx - 1] : null;
                    const isPrevPaid = idx === 0 || rfpsForThisDoc.some(r => r.terminLabel === prevTerm?.label);
                    const isNext = !isPaid && isPrevPaid; // this is the auto-selected next term

                    return (
                      <div 
                        key={idx} 
                        style={{ 
                          padding: "12px 16px", 
                          borderRadius: "10px", 
                          border: `${isNext ? "2px" : "1px"} solid ${isNext ? "var(--blue)" : (isPaid ? "rgba(78,203,113,0.3)" : "var(--line)")}`,
                          background: isNext ? "rgba(91,140,255,0.08)" : (isPaid ? "rgba(78,203,113,0.05)" : "transparent"),
                          cursor: "default",
                          opacity: (!isPaid && !isNext) ? 0.4 : 1,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}>
                            {isPaid && <span style={{ color: "var(--green)", fontSize: "11px", background: "rgba(78,203,113,0.1)", padding: "2px 6px", borderRadius: "4px" }}>✓ TERBAYAR</span>}
                            {isNext && <span style={{ color: "var(--blue)", fontSize: "11px", background: "rgba(91,140,255,0.12)", padding: "2px 6px", borderRadius: "4px" }}>🔵 DIPILIH OTOMATIS</span>}
                            {!isPaid && !isNext && <span style={{ color: "var(--muted)", fontSize: "11px" }}>⏳ MENUNGGU</span>}
                            {term.label} {term.percentage}%
                          </div>
                          <div className="mini-meta">{term.date ? `Estimasi: ${term.date}` : "Syarat terpenuhi"}</div>
                        </div>
                        <div style={{ fontWeight: 700, color: isNext ? "var(--blue)" : "inherit" }}>
                          {formatCurrencyIDR(term.amount || (doc.amount * (term.percentage || 0) / 100))}
                        </div>
                      </div>
                    );
                  })}
               </div>
            </div>
          )}

          {/* Amount Selection */}
          {(!doc.paymentSchedule || doc.paymentSchedule.length === 0) && (
            <>
              <div className="form-section-title" style={{ marginBottom: "12px" }}>Nominal yang Diminta Sekarang</div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
                {(["100", "50", "30", "20", "custom"] as const).map(r => (
                  <button key={r} onClick={() => handleTermChange(r)} style={{ padding: "7px 14px", borderRadius: "99px", fontSize: "12px", cursor: "pointer", background: selectedTermRatio === r ? "var(--blue)" : "transparent", color: selectedTermRatio === r ? "white" : "var(--text)", border: `1px solid ${selectedTermRatio === r ? "var(--blue)" : "var(--line)"}` }}>
                    {r === "100" ? "Full Payment" : r === "custom" ? "Custom" : `${r}% DP/Termin`}
                  </button>
                ))}
              </div>
            </>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
            <div>
              <label className="mini-meta">Nominal RFP (IDR) *</label>
              <input
                type="number"
                value={rfpAmount || ""}
                disabled={!!(doc.paymentSchedule && doc.paymentSchedule.length > 0)}
                onChange={e => setRfpAmount(Number(e.target.value))}
                style={{ width: "100%", background: (doc.paymentSchedule && doc.paymentSchedule.length > 0) ? "var(--panel-soft)" : "var(--panel-soft)", border: "2px solid var(--blue)", padding: "12px", color: "var(--text)", borderRadius: "8px", marginTop: "4px", fontSize: "18px", fontWeight: 700, opacity: (doc.paymentSchedule && doc.paymentSchedule.length > 0) ? 0.85 : 1, cursor: (doc.paymentSchedule && doc.paymentSchedule.length > 0) ? "not-allowed" : "text" }}
              />
              {doc.paymentSchedule && doc.paymentSchedule.length > 0 && (
                <div style={{ fontSize: "10px", color: "var(--blue)", marginTop: "4px" }}>🔒 Dikunci otomatis sesuai termin aktif</div>
              )}
            </div>
            <div>
              <label className="mini-meta">Keterangan Term</label>
              <input value={paymentTerms} readOnly={!!(doc.paymentSchedule && doc.paymentSchedule.length > 0)} onChange={e => setPaymentTerms(e.target.value)} style={{ width: "100%", background: "var(--panel-soft)", border: "1px solid var(--line)", padding: "12px", color: "var(--text)", borderRadius: "8px", marginTop: "4px" }} />
            </div>
          </div>

          {/* Payment Method */}
          <div className="form-section-title" style={{ marginBottom: "12px" }}>Metode Pembayaran</div>
          <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
              <input type="radio" checked={paymentType === "Transfer"} onChange={() => setPaymentType("Transfer")} /> Transfer Bank
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
              <input type="radio" checked={paymentType === "Cash"} onChange={() => setPaymentType("Cash")} /> Cash
            </label>
          </div>

          {paymentType === "Transfer" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", padding: "16px", background: "var(--panel-soft)", borderRadius: "10px", border: "1px solid var(--line)", marginBottom: "16px" }}>
              <div>
                <label className="mini-meta">Nama Bank</label>
                <input style={{ width: "100%", background: "transparent", border: "1px solid var(--line)", padding: "8px 10px", color: "var(--text)", borderRadius: "6px", marginTop: "4px" }} value={bankName} onChange={e => setBankName(e.target.value)} placeholder="BCA" />
              </div>
              <div>
                <label className="mini-meta">No. Rekening</label>
                <input style={{ width: "100%", background: "transparent", border: "1px solid var(--line)", padding: "8px 10px", color: "var(--text)", borderRadius: "6px", marginTop: "4px" }} value={accountNo} onChange={e => setAccountNo(e.target.value)} placeholder="123456789" />
              </div>
              <div>
                <label className="mini-meta">Nama Pemilik Rek.</label>
                <input style={{ width: "100%", background: "transparent", border: "1px solid var(--line)", padding: "8px 10px", color: "var(--text)", borderRadius: "6px", marginTop: "4px" }} value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="a.n. Budi Santoso" />
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "24px" }}>
            <div>
              <label className="mini-meta">Catatan</label>
              <input style={{ width: "100%", background: "var(--panel-soft)", border: "1px solid var(--line)", padding: "10px", color: "var(--text)", borderRadius: "8px", marginTop: "4px" }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Catatan khusus..." />
            </div>
            <div>
              <label className="mini-meta">Tanggal Dibutuhkan</label>
              <input type="date" style={{ width: "100%", background: "var(--panel-soft)", border: "1px solid var(--line)", padding: "10px", color: "var(--text)", borderRadius: "8px", marginTop: "4px" }} value={requiredDate} onChange={e => setRequiredDate(e.target.value)} />
            </div>
          </div>

          {/* Document Upload */}
          <div className="form-section-title" style={{ marginBottom: "16px", marginTop: "24px" }}>Dokumen Pendukung Audit (Optional)</div>
          <div style={{ padding: "20px", background: "var(--panel-soft)", border: "1px dashed var(--line)", borderRadius: "12px", marginBottom: "24px" }}>
            <label className="mini-meta" style={{ display: "block", marginBottom: "8px" }}>Upload Invoice Vendor (Jika ada)</label>
            <input 
              type="file" 
              accept="image/*,application/pdf" 
              onChange={handleInvoiceChange}
              style={{ width: "100%", fontSize: "12px" }} 
            />
            {invoiceFile && <div style={{ marginTop: "10px", color: "var(--green)", fontSize: "11px" }}>✅ Invoice berhasil diunggah</div>}
            {isUploading && <div style={{ marginTop: "10px", color: "var(--blue)", fontSize: "11px" }}>⌛ Memproses file...</div>}
            <p className="mini-meta" style={{ marginTop: "10px", fontSize: "10px" }}>Wajib mengunggah invoice untuk pengecekan Finance.</p>
          </div>

          {/* Summary */}
          <div style={{ padding: "14px 18px", background: "rgba(91,140,255,0.06)", border: "1px solid rgba(91,140,255,0.2)", borderRadius: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
            <div className="mini-meta">
              RFP akan diverifikasi oleh Finance sebelum diajukan ke Director untuk otorisasi.
            </div>
            <div style={{ textAlign: "right", minWidth: "140px" }}>
              <div className="mini-meta">Nominal RFP</div>
              <div style={{ fontWeight: 700, fontSize: "18px", color: "var(--blue)" }}>{formatCurrencyIDR(rfpAmount)}</div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <button onClick={onClose} style={{ padding: "10px 20px", background: "none", border: "1px solid var(--line)", borderRadius: "8px", color: "var(--text)", cursor: "pointer" }}>Batal</button>
            <button onClick={handleSubmit} disabled={isSubmitting} className="primary-button" style={{ minWidth: "160px" }}>
              {isSubmitting ? "Memproses..." : "Submit RFP →"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
