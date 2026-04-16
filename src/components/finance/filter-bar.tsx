"use client";

import { useState, useMemo, useEffect } from "react";
import { ExpenseDocument, RequestForPayment } from "@/lib/finance/types";

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

  // Multi-select for Doc Types
  const docTypes = ["PO", "SPK", "KONTRAK", "CASH_ADVANCE"];
  
  // Statuses depend on whether we are filtering Docs or RFPs
  const docStatuses = ["draft", "submitted", "approved", "paid"];
  const rfpStatuses = ["draft", "pending_finance", "pending_c_level", "approved", "paid", "settled"];
  const statuses = type === "docs" ? docStatuses : rfpStatuses;

  const filteredItems = useMemo(() => {
    let result = [...items];

    // 1. Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(item => {
        const doc = item as any;
        return (
          doc.id?.toLowerCase().includes(q) ||
          doc.projectName?.toLowerCase().includes(q) ||
          doc.vendorName?.toLowerCase().includes(q) ||
          doc.payeeName?.toLowerCase().includes(q)
        );
      });
    }

    // 2. Filter Status
    if (statusFilter !== "all") {
      result = result.filter(item => (item as any).status === statusFilter);
    }

    // 3. Filter Type
    if (typeFilter !== "all") {
      result = result.filter(item => (item as any).documentType === typeFilter);
    }

    // 4. Sort
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
        case "newest":
        default: return dateB - dateA;
      }
    });

    return result;
  }, [items, search, statusFilter, typeFilter, sortBy]);

  useEffect(() => {
    onFilter(filteredItems);
  }, [filteredItems, onFilter]);

  return (
    <div className="filter-bar" style={{ 
      display: "flex", 
      flexWrap: "wrap", 
      gap: "12px", 
      marginBottom: "20px",
      alignItems: "center",
      background: "var(--panel-soft)",
      padding: "12px 16px",
      borderRadius: "12px",
      border: "1px solid var(--line)"
    }}>
      {/* Search */}
      <div style={{ flex: 1, minWidth: "200px" }}>
        <input 
          type="text" 
          placeholder={placeholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ 
            width: "100%", 
            background: "var(--bg)", 
            border: "1px solid var(--line)", 
            padding: "8px 12px", 
            borderRadius: "8px",
            fontSize: "13px",
            color: "var(--text)"
          }}
        />
      </div>

      {/* Type Filter (Only for Docs tab if applicable) */}
      {type === "docs" && (
        <select 
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{ background: "var(--bg)", border: "1px solid var(--line)", padding: "8px", borderRadius: "8px", fontSize: "13px", outline: "none" }}
        >
          <option value="all">All Types</option>
          {docTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      )}

      {/* Status Filter */}
      <select 
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        style={{ background: "var(--bg)", border: "1px solid var(--line)", padding: "8px", borderRadius: "8px", fontSize: "13px", outline: "none" }}
      >
        <option value="all">All Statuses</option>
        {statuses.map(s => <option key={s} value={s}>{s.replace("_", " ").toUpperCase()}</option>)}
      </select>

      {/* Sort By */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span className="mini-meta" style={{ margin: 0 }}>Sort:</span>
        <select 
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{ background: "var(--bg)", border: "1px solid var(--line)", padding: "8px", borderRadius: "8px", fontSize: "13px", outline: "none" }}
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="amount_hi">Amount (High-Low)</option>
          <option value="amount_lo">Amount (Low-High)</option>
          <option value="name">Project Name (A-Z)</option>
        </select>
      </div>
    </div>
  );
}
