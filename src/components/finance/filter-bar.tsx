"use client";

import { useState, useMemo, useEffect } from "react";
import { ExpenseDocument, RequestForPayment } from "@/lib/finance/types";
import { Search, Filter, SortDesc } from "lucide-react";

interface FilterBarProps<T> {
  items: T[];
  type: "docs" | "rfps";
  onFilter: (filteredItems: T[]) => void;
  placeholder?: string;
}

export function FilterBar<T extends ExpenseDocument | RequestForPayment>({ 
  items, 
  type, 
  onFilter,
  placeholder = "Search Project, Vendor, or ID..."
}: FilterBarProps<T>) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");

  const docTypes = ["PO", "SPK", "KONTRAK", "CASH_ADVANCE"];
  const docStatuses = ["draft", "pending_finance", "pending_c_level", "approved", "paid"];
  const rfpStatuses = ["draft", "pending_finance", "pending_c_level", "approved", "paid", "settled"];
  const statuses = type === "docs" ? docStatuses : rfpStatuses;

  const filteredItems = useMemo(() => {
    let result = [...items];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(item => {
        const doc = item as any;
        return (doc.id?.toLowerCase().includes(q) || doc.projectName?.toLowerCase().includes(q) || doc.vendorName?.toLowerCase().includes(q) || doc.payeeName?.toLowerCase().includes(q));
      });
    }
    if (statusFilter !== "all") result = result.filter(item => (item as any).status === statusFilter);
    if (typeFilter !== "all") result = result.filter(item => (item as any).documentType === typeFilter);
    result.sort((a: any, b: any) => {
      const dateA = new Date(a.issueDate || a.requestDate || 0).getTime();
      const dateB = new Date(b.issueDate || b.requestDate || 0).getTime();
      const amountA = a.amount || a.totalAmount || 0;
      const amountB = b.amount || b.totalAmount || 0;
      switch (sortBy) {
        case "oldest": return dateA - dateB;
        case "amount_hi": return amountB - amountA;
        case "amount_lo": return amountA - amountB;
        case "name": return (a.projectName || "").localeCompare(b.projectName || "");
        default: return dateB - dateA;
      }
    });
    return result;
  }, [items, search, statusFilter, typeFilter, sortBy]);

  useEffect(() => { onFilter(filteredItems); }, [filteredItems, onFilter]);

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", marginBottom: "32px", alignItems: "flex-end", background: '#111113', padding: '16px 20px', borderRadius: '16px', border: '0.5px solid rgba(255,255,255,0.06)' }}>
      <div style={{ flex: 1, minWidth: "240px", display: "flex", flexDirection: "column", gap: "8px" }}>
        <label style={{ fontSize: "11px", color: "#52525b", fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Find Document</label>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '11px', color: '#52525b' }} />
          <input 
            type="text" placeholder={placeholder} value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", background: "#18181b", border: "0.5px solid rgba(255,255,255,0.1)", padding: "10px 14px 10px 36px", borderRadius: "10px", fontSize: "13px", color: "#f4f4f5", outline: "none" }}
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
        {type === "docs" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ fontSize: "11px", color: "#52525b", fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Category</label>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ background: "#18181b", border: "0.5px solid rgba(255,255,255,0.1)", padding: "10px 12px", borderRadius: "10px", fontSize: "13px", color: "#f4f4f5", outline: "none", width: "150px", cursor: 'pointer' }}>
              <option value="all">All Types</option>
              {docTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <label style={{ fontSize: "11px", color: "#52525b", fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Stage</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ background: "#18181b", border: "0.5px solid rgba(255,255,255,0.1)", padding: "10px 12px", borderRadius: "10px", fontSize: "13px", color: "#f4f4f5", outline: "none", width: "160px", cursor: 'pointer' }}>
            <option value="all">All Stages</option>
            {statuses.map(s => <option key={s} value={s}>{s.replace(/_/g, " ").toUpperCase()}</option>)}
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <label style={{ fontSize: "11px", color: "#52525b", fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Sort</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ background: "#18181b", border: "0.5px solid rgba(255,255,255,0.1)", padding: "10px 12px", borderRadius: "10px", fontSize: "13px", color: "#f4f4f5", outline: "none", width: "160px", cursor: 'pointer' }}>
            <option value="newest">Recent First</option>
            <option value="oldest">Oldest First</option>
            <option value="amount_hi">Highest Value</option>
            <option value="amount_lo">Lowest Value</option>
          </select>
        </div>
      </div>
    </div>
  );
}
