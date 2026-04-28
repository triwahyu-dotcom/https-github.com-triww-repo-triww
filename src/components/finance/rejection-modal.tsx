"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

interface RejectionModalProps {
  title: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export function RejectionModal({ title, onClose, onConfirm }: RejectionModalProps) {
  const [reason, setReason] = useState("");

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", zIndex: 3000, display: "grid", placeItems: "center", padding: "20px" }}>
      <div style={{ background: "#1f1f23", borderRadius: "24px", width: "100%", maxWidth: "440px", border: "0.5px solid rgba(255,255,255,0.1)", boxShadow: "0 25px 60px rgba(0,0,0,0.6)", overflow: 'hidden' }}>
        <div style={{ padding: '24px 32px', background: '#111113', borderBottom: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: '#f87171', display: 'grid', placeItems: 'center' }}>
              <AlertTriangle size={18} />
            </div>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#f4f4f5" }}>{title}</h3>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#52525b', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <div style={{ padding: '32px' }}>
          <p style={{ fontSize: '13px', color: '#a1a1aa', marginBottom: '20px', lineHeight: 1.5 }}>Please provide a clear reason for rejection. This will be shared with the procurement team for revision.</p>
          
          <textarea
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Incorrect pricing, missing tax documents, etc..."
            style={{ 
              width: "100%", height: "140px", background: "#111113", border: "1px solid rgba(255,255,255,0.08)", 
              borderRadius: "12px", padding: "16px", color: "#f4f4f5", fontSize: "13px", resize: "none", 
              outline: "none", transition: 'border-color 0.2s', marginBottom: '32px'
            }}
            onFocus={(e) => e.target.style.borderColor = '#f87171'}
            onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
          />

          <div style={{ display: "flex", gap: "12px" }}>
            <button onClick={onClose} style={{ flex: 1, padding: "12px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "#a1a1aa", fontSize: '13px', fontWeight: 600, cursor: "pointer" }}>Cancel</button>
            <button 
              disabled={!reason.trim()}
              onClick={() => onConfirm(reason)} 
              style={{ 
                flex: 2, padding: "12px", background: "#f87171", border: "none", borderRadius: "10px", 
                color: "#fff", fontSize: '13px', fontWeight: 700, cursor: "pointer", 
                opacity: !reason.trim() ? 0.5 : 1, transition: 'all 0.2s'
              }}
            >
              Confirm Rejection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
