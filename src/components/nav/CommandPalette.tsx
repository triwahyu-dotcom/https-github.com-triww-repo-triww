"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useCommandPalette } from "@/hooks/useCommandPalette";

interface PaletteItem {
  type: "module" | "action" | "project" | "vendor";
  label: string;
  module: string;
  icon: string; // lucide icon name or emoji fallback
  href: string;
}

const STATIC_ITEMS: PaletteItem[] = [
  // Modules
  { type: "module", label: "Workspace Hub",       module: "HUB",  icon: "🏠", href: "/" },
  { type: "module", label: "Projects Dashboard",  module: "PROJ", icon: "📋", href: "/projects" },
  { type: "module", label: "CRM",                 module: "CRM",  icon: "👥", href: "/crm" },
  { type: "module", label: "Vendor List",          module: "VEND", icon: "🏪", href: "/vendors" },
  { type: "module", label: "Finance Operations",   module: "FIN",  icon: "🧾", href: "/finance" },
  { type: "module", label: "Man Power",            module: "MAN",  icon: "⛏️", href: "/manpower/freelancer" },
  { type: "module", label: "Document Center",      module: "DOCS", icon: "📁", href: "/docs" },
  { type: "module", label: "System Settings",      module: "SET",  icon: "⚙️", href: "/settings" },
  // Actions
  { type: "action", label: "Tambah Project Baru",  module: "PROJ", icon: "➕", href: "/projects/new" },
  { type: "action", label: "Tambah Vendor Baru",   module: "VEND", icon: "➕", href: "/vendors/new" },
  { type: "action", label: "Buat PO / SPK Baru",    module: "FIN",  icon: "➕", href: "/finance/new-po" },
  { type: "action", label: "Anggota Tim & Roles",  module: "SET",  icon: "👤", href: "/settings" },
];

const MODULE_COLORS: Record<string, string> = {
  HUB:  "#C9D1D9",
  PROJ: "#7F77DD",
  CRM:  "#3FB950",
  VEND: "#E6863C",
  FIN:  "#F85149",
  MAN:  "#58A6FF",
  DOCS: "#C9D1D9",
  SET:  "#8B949E",
};

const GROUP_LABELS: Record<string, string> = {
  module: "Modul",
  action: "Aksi Cepat",
  project: "Project",
  vendor: "Vendor",
};

export function CommandPalette() {
  const { isOpen, closePalette } = useCommandPalette();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PaletteItem[]>(STATIC_ITEMS);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResults(STATIC_ITEMS);
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  // Filter results
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (q.length === 0) {
      setResults(STATIC_ITEMS);
      setActiveIndex(0);
      return;
    }
    const filtered = STATIC_ITEMS.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.module.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q)
    );
    setResults(filtered);
    setActiveIndex(0);
  }, [query]);

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.children[activeIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[activeIndex]) {
      navigate(results[activeIndex].href);
    }
  };

  const navigate = (href: string) => {
    if (href === "/finance/new-po") {
      localStorage.setItem("juara_finance_view_mode", "operational");
      localStorage.setItem("juara_finance_admin_role", "procurement");
      localStorage.setItem("juara_finance_open_po_on_load", "true");
      router.push("/finance");
      if (window.location.pathname === "/finance") {
        window.location.reload();
      }
      closePalette();
      return;
    }
    router.push(href);
    closePalette();
  };

  if (!isOpen) return null;

  // Group results
  const grouped = results.reduce<Record<string, PaletteItem[]>>((acc, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {});

  let flatIndex = 0;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={closePalette}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(3px)",
          zIndex: 9998,
          animation: "cmdFadeIn 0.12s ease-out",
        }}
      />

      {/* Palette modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        style={{
          position: "fixed",
          top: "18%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(560px, calc(100vw - 32px))",
          background: "#161B22",
          border: "1px solid #30363D",
          borderRadius: 12,
          zIndex: 9999,
          overflow: "hidden",
          boxShadow: "0 32px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
          animation: "cmdSlideIn 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Input row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 16px",
            borderBottom: "1px solid #30363D",
          }}
        >
          <Search size={16} style={{ color: "#8B949E", flexShrink: 0 }} />
          <input
            ref={inputRef}
            id="command-palette-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Cari modul, project, vendor, atau aksi..."
            autoComplete="off"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 14,
              color: "#C9D1D9",
              fontFamily: "inherit",
            }}
          />
          <kbd
            style={{
              fontSize: 10,
              background: "#0D1117",
              border: "1px solid #30363D",
              borderRadius: 4,
              padding: "2px 6px",
              color: "#484F58",
              fontFamily: "monospace",
              flexShrink: 0,
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          style={{
            maxHeight: 380,
            overflowY: "auto",
            padding: "6px",
            scrollbarWidth: "thin",
            scrollbarColor: "#30363D transparent",
          }}
        >
          {results.length === 0 && (
            <div
              style={{
                padding: "32px 16px",
                textAlign: "center",
                color: "#8B949E",
                fontSize: 13,
              }}
            >
              Tidak ditemukan — coba kata kunci lain
            </div>
          )}

          {Object.entries(grouped).map(([type, items]) => (
            <div key={type}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "#484F58",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  padding: "6px 10px 3px",
                }}
              >
                {GROUP_LABELS[type] ?? type}
              </div>
              {items.map((item) => {
                const idx = flatIndex++;
                const isActive = idx === activeIndex;
                return (
                  <div
                    key={`${item.type}-${item.href}`}
                    onClick={() => navigate(item.href)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 10px",
                      borderRadius: 7,
                      cursor: "pointer",
                      background: isActive ? "#21262D" : "transparent",
                      transition: "background 0.08s",
                    }}
                  >
                    {/* Icon */}
                    <span
                      style={{
                        width: 24,
                        height: 24,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 15,
                        flexShrink: 0,
                      }}
                    >
                      {item.icon}
                    </span>
                    {/* Label */}
                    <span style={{ flex: 1, fontSize: 13, color: "#C9D1D9", fontWeight: 400 }}>
                      {item.label}
                    </span>
                    {/* Module badge */}
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        padding: "2px 6px",
                        borderRadius: 3,
                        letterSpacing: "0.06em",
                        background: `${MODULE_COLORS[item.module] ?? "#8B949E"}20`,
                        color: MODULE_COLORS[item.module] ?? "#8B949E",
                        border: `1px solid ${MODULE_COLORS[item.module] ?? "#8B949E"}40`,
                        flexShrink: 0,
                      }}
                    >
                      {item.module}
                    </span>
                    {/* Enter hint on active */}
                    {isActive && (
                      <kbd
                        style={{
                          fontSize: 10,
                          background: "#0D1117",
                          border: "1px solid #30363D",
                          borderRadius: 4,
                          padding: "2px 5px",
                          color: "#484F58",
                          fontFamily: "monospace",
                          flexShrink: 0,
                        }}
                      >
                        ↵
                      </kbd>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer hints */}
        <div
          style={{
            padding: "8px 16px",
            borderTop: "1px solid #30363D",
            display: "flex",
            gap: 16,
            fontSize: 11,
            color: "#484F58",
          }}
        >
          <span>
            <kbd style={{ fontFamily: "monospace", marginRight: 4 }}>↑↓</kbd>navigasi
          </span>
          <span>
            <kbd style={{ fontFamily: "monospace", marginRight: 4 }}>↵</kbd>buka
          </span>
          <span>
            <kbd style={{ fontFamily: "monospace", marginRight: 4 }}>ESC</kbd>tutup
          </span>
        </div>
      </div>

      <style>{`
        @keyframes cmdFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes cmdSlideIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-6px) scale(0.98); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
}
