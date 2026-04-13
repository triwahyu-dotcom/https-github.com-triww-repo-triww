"use client";

import { useState } from "react";
import { formatCurrencyIDR } from "@/lib/utils/format";
import { RequestForPayment, LineItem } from "@/lib/finance/types";

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
    setItems([
      ...items,
      { no: items.length + 1, description: "", specification: "", qty: 1, unit: "Ls", freq: 0, freqUnit: "", vol: 0, volUnit: "", price: 0, amount: 0 }
    ]);
  };

  const removeLineItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    const total = newItems.reduce((sum, it) => sum + (it.amount || 0), 0);
    setActualAmount(total);
  };

  const difference = Number(actualAmount) - rfp.totalAmount;

  const handleSubmit = async () => {
    if (actualAmount <= 0) {
      alert("Total actual amount must be greater than zero.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/finance/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rfpId: rfp.id,
          actualAmount,
          difference,
          notes,
          items
        })
      });

      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json();
        alert("Error: " + data.error);
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ width: "800px", maxWidth: "90vw", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>Cash Advance Settlement</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', fontSize: '24px' }}>×</button>
        </div>

        <div className="form-group" style={{ marginBottom: '20px', padding: '16px', background: 'var(--panel-soft)', borderRadius: '8px' }}>
          <div className="form-grid-2">
            <div>
              <div className="mini-meta">Original Request</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--accent)' }}>{formatCurrencyIDR(rfp.totalAmount)}</div>
            </div>
            <div>
              <div className="mini-meta">Actual Spending</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: difference > 0 ? '#ff4a4a' : (difference < 0 ? '#22c55e' : 'var(--text)') }}>
                {formatCurrencyIDR(actualAmount)}
              </div>
            </div>
          </div>
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="mini-meta">Variance (Requested - Actual)</span>
            <span style={{ fontWeight: 'bold', color: difference > 0 ? '#ff4a4a' : (difference < 0 ? '#22c55e' : 'var(--text)') }}>
              {difference > 0 ? `+ ${formatCurrencyIDR(Math.abs(difference))} (Over Budget)` : difference < 0 ? `- ${formatCurrencyIDR(Math.abs(difference))} (Under Budget)` : 'Balanced'}
            </span>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: "20px" }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <label className="mini-meta">Actual Expense Returns/Receipts</label>
            <button onClick={addLineItem} className="secondary-button" style={{ fontSize: '12px', padding: '4px 12px' }}>+ Add Receipt Row</button>
          </div>
          
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)', textAlign: 'left' }}>
                  <th style={{ padding: '8px', width: '25%' }}>Description / Item</th>
                  <th style={{ padding: '8px', width: '15%' }}>Specification</th>
                  <th style={{ padding: '8px', width: '25%' }}>Qty / Freq / Vol</th>
                  <th style={{ padding: '8px', width: '15%', textAlign: 'right' }}>Unit Price</th>
                  <th style={{ padding: '8px', width: '15%', textAlign: 'right' }}>Total</th>
                  <th style={{ padding: '8px', width: '5%' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: '8px' }}>
                      <input style={{ width: '100%', background: 'transparent', border: 'none', padding: '6px', color: 'white' }} value={item.description} onChange={(e) => updateLineItem(idx, 'description', e.target.value)} placeholder="Description" />
                    </td>
                    <td style={{ padding: '8px' }}>
                      <input style={{ width: '100%', background: 'transparent', border: 'none', padding: '6px', color: 'white' }} value={item.specification} onChange={(e) => updateLineItem(idx, 'specification', e.target.value)} placeholder="Notes" />
                    </td>
                    <td style={{ padding: '8px', display: 'flex', gap: '4px' }}>
                      <input type="number" style={{ width: '33%', background: 'var(--panel-soft)', border: 'none', padding: '6px', color: 'white' }} value={item.qty} onChange={(e) => updateLineItem(idx, 'qty', e.target.value)} placeholder="Q" />
                      <input type="number" style={{ width: '33%', background: 'var(--panel-soft)', border: 'none', padding: '6px', color: 'white' }} value={item.freq} onChange={(e) => updateLineItem(idx, 'freq', e.target.value)} placeholder="F" />
                      <input type="number" style={{ width: '33%', background: 'var(--panel-soft)', border: 'none', padding: '6px', color: 'white' }} value={item.vol} onChange={(e) => updateLineItem(idx, 'vol', e.target.value)} placeholder="V" />
                    </td>
                    <td style={{ padding: '8px' }}>
                      <input type="number" style={{ width: '100%', background: 'transparent', border: 'none', padding: '6px', color: 'white', textAlign: 'right' }} value={item.price} onChange={(e) => updateLineItem(idx, 'price', e.target.value)} onFocus={() => { if (item.price === 0) updateLineItem(idx, 'price', ""); }} />
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>
                      {formatCurrencyIDR(item.amount)}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <button onClick={() => removeLineItem(idx)} style={{ background: 'none', border: 'none', color: '#ff4a4a', cursor: 'pointer', fontSize: '16px' }}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: '24px' }}>
          <label className="mini-meta">Settlement Notes / Explanations</label>
          <textarea 
            style={{ width: '100%', background: 'var(--panel-soft)', border: '1px solid var(--line)', padding: '12px', color: 'var(--text)', borderRadius: '8px', minHeight: '80px', marginTop: '8px' }}
            value={notes} 
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Explain any over/under budget differences..."
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button className="secondary-button" onClick={onClose} disabled={isSubmitting}>Cancel</button>
          <button className="primary-button" onClick={handleSubmit} disabled={isSubmitting || items.length === 0}>
            {isSubmitting ? "Submitting..." : "Submit Settlement"}
          </button>
        </div>
      </div>
    </div>
  );
}
