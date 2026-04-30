"use client";

import { useState } from "react";
import { formatCurrencyIDR } from "@/lib/utils/format";
import { RequestForPayment, LineItem } from "@/lib/finance/types";
import { Wallet, Plus, Trash2, X, AlertCircle } from "lucide-react";

interface SettlementModalProps {
  rfp: RequestForPayment;
  isOpen: boolean;
  onClose: () => void;
}

export function SettlementModal({ rfp, isOpen, onClose }: SettlementModalProps) {
  const [actualAmount, setActualAmount] = useState<number>(0);
  const [items, setItems] = useState<LineItem[]>([
    { no: 1, description: "", specification: "", qty: 1, unit: "Ls", freq: 0, freqUnit: "", vol: 0, volUnit: "", price: 0, amount: 0 }
  ]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };
    if (field === 'qty' || field === 'price' || field === 'freq' || field === 'vol') {
      const q = Number(item.qty) || 1;
      const f = Number(item.freq) || 1;
      const v = Number(item.vol) || 1;
      const p = Number(item.price) || 0;
      item.amount = q * f * v * p;
    }
    newItems[index] = item;
    setItems(newItems);
    const total = newItems.reduce((sum, it) => sum + (it.amount || 0), 0);
    setActualAmount(total);
  };

  const addLineItem = () => {
    setItems([...items, { no: items.length + 1, description: "", specification: "", qty: 1, unit: "Ls", freq: 0, freqUnit: "", vol: 0, volUnit: "", price: 0, amount: 0 }]);
  };

  const removeLineItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    const total = newItems.reduce((sum, it) => sum + (it.amount || 0), 0);
    setActualAmount(total);
  };

  const difference = actualAmount - rfp.totalAmount;

  const handleSubmit = async () => {
    if (actualAmount <= 0) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/finance/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rfpId: rfp.id, actualAmount, difference, notes, items })
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const err = await res.json().catch(() => ({ error: "Server error" }));
        alert(`Gagal submit settlement: ${err.error}`);
      }
    } catch (e: any) {
      alert(`Terjadi kesalahan koneksi: ${e.message}`);
    } finally { setIsSubmitting(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)", zIndex: 3000, display: "grid", placeItems: "center", padding: "20px" }}>
      <div style={{ background: "#1f1f23", borderRadius: "24px", width: "100%", maxWidth: "840px", border: "0.5px solid rgba(255,255,255,0.1)", boxShadow: "0 25px 60px rgba(0,0,0,0.6)", overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '92vh' }}>
        
        <div style={{ padding: '24px 32px', background: '#111113', borderBottom: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(55,138,221,0.1)', color: '#378ADD', display: 'grid', placeItems: 'center' }}>
              <Wallet size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#f4f4f5" }}>Cash Advance Settlement</h3>
              <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#52525b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>RFP-{rfp.id.slice(0,8)}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#52525b', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
          {/* Summary Box */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: 'rgba(255,255,255,0.06)', borderRadius: '16px', border: '0.5px solid rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: '32px' }}>
            <div style={{ background: '#18181b', padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: '#52525b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Requested</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#f4f4f5' }}>{formatCurrencyIDR(rfp.totalAmount)}</div>
            </div>
            <div style={{ background: '#18181b', padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: '#52525b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Actual Spending</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#378ADD' }}>{formatCurrencyIDR(actualAmount)}</div>
            </div>
            <div style={{ background: '#18181b', padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: difference > 0 ? '#fb7185' : (difference < 0 ? '#34d399' : '#52525b'), fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                {difference > 0 ? 'Over Budget' : (difference < 0 ? 'Under Budget' : 'Variance')}
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: difference > 0 ? '#fb7185' : (difference < 0 ? '#34d399' : '#f4f4f5') }}>
                {difference > 0 ? '+' : ''}{formatCurrencyIDR(difference)}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#52525b', textTransform: 'uppercase', letterSpacing: '1px' }}>Receipt Details</h4>
            <button onClick={addLineItem} style={{ background: 'rgba(55,138,221,0.1)', color: '#378ADD', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={14} /> Add Receipt
            </button>
          </div>

          <div style={{ background: '#111113', borderRadius: '12px', border: '0.5px solid rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: '32px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#18181b', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: '#52525b', fontWeight: 600 }}>Item Description</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', color: '#52525b', fontWeight: 600, width: '140px' }}>Quantity Details</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', color: '#52525b', fontWeight: 600, width: '140px' }}>Unit Price</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', color: '#52525b', fontWeight: 600, width: '140px' }}>Total</th>
                  <th style={{ padding: '12px', width: '48px' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '8px 16px' }}>
                      <input 
                        style={{ width: '100%', background: 'transparent', border: 'none', color: '#e4e4e7', outline: 'none', fontSize: '13px' }} 
                        value={item.description} 
                        onChange={(e) => updateLineItem(idx, 'description', e.target.value)} 
                        placeholder="Expense name..." 
                      />
                    </td>
                    <td style={{ padding: '8px 16px' }}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <input type="number" style={{ width: '33%', background: 'rgba(255,255,255,0.03)', border: 'none', borderRadius: '4px', padding: '6px', color: '#fff', textAlign: 'center', fontSize: '11px' }} value={item.qty} onChange={(e) => updateLineItem(idx, 'qty', e.target.value)} placeholder="Q" />
                        <input type="number" style={{ width: '33%', background: 'rgba(255,255,255,0.03)', border: 'none', borderRadius: '4px', padding: '6px', color: '#fff', textAlign: 'center', fontSize: '11px' }} value={item.freq} onChange={(e) => updateLineItem(idx, 'freq', e.target.value)} placeholder="F" />
                        <input type="number" style={{ width: '33%', background: 'rgba(255,255,255,0.03)', border: 'none', borderRadius: '4px', padding: '6px', color: '#fff', textAlign: 'center', fontSize: '11px' }} value={item.vol} onChange={(e) => updateLineItem(idx, 'vol', e.target.value)} placeholder="V" />
                      </div>
                    </td>
                    <td style={{ padding: '8px 16px' }}>
                      <input 
                        type="number" 
                        style={{ width: '100%', background: 'transparent', border: 'none', color: '#e4e4e7', textAlign: 'right', outline: 'none', fontSize: '13px' }} 
                        value={item.price} 
                        onChange={(e) => updateLineItem(idx, 'price', e.target.value)} 
                      />
                    </td>
                    <td style={{ padding: '8px 16px', textAlign: 'right', fontWeight: 600, color: '#f4f4f5' }}>
                      {formatCurrencyIDR(item.amount)}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <button onClick={() => removeLineItem(idx)} style={{ background: 'none', border: 'none', color: '#52525b', cursor: 'pointer' }}><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: '#52525b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Settlement Notes</label>
            <textarea 
              style={{ width: '100%', background: '#111113', border: '1px solid rgba(255,255,255,0.08)', padding: '16px', color: '#f4f4f5', borderRadius: '12px', minHeight: '100px', outline: 'none', fontSize: '13px', resize: 'none' }}
              value={notes} 
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Explain any variance or provide additional context..."
            />
          </div>

          {difference > 0 && (
            <div style={{ padding: '16px', background: 'rgba(251,113,133,0.05)', borderRadius: '12px', border: '1px solid rgba(251,113,133,0.1)', display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '32px' }}>
              <AlertCircle size={18} color="#fb7185" />
              <div style={{ fontSize: '12px', color: '#fb7185', lineHeight: 1.5 }}>
                <strong>Over Budget Detected:</strong> Actual spending exceeds the requested amount by {formatCurrencyIDR(difference)}. Please ensure justifications are provided in the notes.
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '24px 32px', background: '#111113', borderTop: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button onClick={onClose} style={{ padding: '12px 24px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#a1a1aa', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button 
            disabled={isSubmitting || actualAmount <= 0}
            onClick={handleSubmit} 
            style={{ padding: '12px 32px', background: '#378ADD', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', opacity: (isSubmitting || actualAmount <= 0) ? 0.5 : 1 }}
          >
            {isSubmitting ? "Processing..." : "Submit Settlement"}
          </button>
        </div>
      </div>
    </div>
  );
}
