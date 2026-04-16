"use client";

import { useState } from "react";

interface RejectionModalProps {
  title: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export function RejectionModal({ title, onClose, onConfirm }: RejectionModalProps) {
  const [reason, setReason] = useState("");

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ background: "var(--panel)", borderRadius: "16px", width: "100%", maxWidth: "400px", padding: "32px", border: "1px solid var(--line)", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: "18px", color: "#f87171" }}>{title}</h3>
        <p className="mini-meta" style={{ marginBottom: "16px" }}>Silakan masukkan alasan pembatalan / penolakan agar tim Procurement dapat melakukan perbaikan.</p>
        
        <textarea
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Contoh: Salah nominal, vendor belum update alamat, dll..."
          style={{ width: "100%", height: "120px", background: "var(--panel-soft)", border: "1px solid var(--line)", borderRadius: "10px", padding: "12px", color: "var(--text)", fontSize: "13px", resize: "none", outline: "none", marginBottom: "24px" }}
        />

        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "10px 20px", background: "none", border: "1px solid var(--line)", borderRadius: "8px", color: "var(--text)", cursor: "pointer" }}>Batal</button>
          <button 
            disabled={!reason.trim()}
            onClick={() => onConfirm(reason)} 
            className="primary-button" 
            style={{ minWidth: "120px", background: "#f87171" }}
          >
            Kirim Penolakan
          </button>
        </div>
      </div>
    </div>
  );
}
