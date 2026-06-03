"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { useCommandPalette } from "@/hooks/useCommandPalette";

const PAGE_TITLES: Record<string, string> = {
  "/": "Workspace Hub",
  "/projects": "Projects Dashboard",
  "/crm": "CRM",
  "/vendors": "Vendors",
  "/manpower": "Man Power",
  "/manpower/freelancer": "Man Power — Freelancer",
  "/finance": "Finance & RFP",
  "/finance/monitoring": "Finance Monitoring Center",
  "/docs": "Document Center",
  "/settings": "System Settings",
};

function getCurrentPageTitle(pathname: string): string {
  // Exact match first
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  // Partial match
  const keys = Object.keys(PAGE_TITLES).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (key !== "/" && pathname.startsWith(key)) return PAGE_TITLES[key];
  }
  return "JUARA Workspace";
}

interface TopMicroBarProps {
  userRole: string;
  canOverride?: boolean;
  adminViewRole?: string;
  onAdminViewRoleChange?: (role: string) => void;
}

const FINANCE_OVERRIDE_ROLES = [
  { id: "finance", label: "Finance" },
  { id: "procurement", label: "Procurement" },
  { id: "director", label: "Director" },
  { id: "pm", label: "PM" },
];

export function TopMicroBar({
  userRole,
  canOverride,
  adminViewRole,
  onAdminViewRoleChange,
}: TopMicroBarProps) {
  const { openPalette } = useCommandPalette();
  const pathname = usePathname();
  const pageTitle = getCurrentPageTitle(pathname);

  const isFinancePage = pathname.startsWith("/finance");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <div
      style={{
        height: 44,
        borderBottom: "1px solid #30363D",
        background: "#161B22",
        display: "flex",
        alignItems: "center",
        padding: "0 20px",
        gap: 10,
        flexShrink: 0,
      }}
    >
      {/* Page breadcrumb */}
      {!isMobile && (
        <span
          style={{
            fontSize: 13,
            color: "#8B949E",
            flex: 1,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            fontWeight: 500,
          }}
        >
          {pageTitle}
        </span>
      )}

      {/* spacer if mobile */}
      {isMobile && <div style={{ flex: 1 }} />}

      {/* Role badge */}
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          padding: "2px 8px",
          borderRadius: 4,
          background: "rgba(88,166,255,0.12)",
          color: "#58A6FF",
          border: "1px solid rgba(88,166,255,0.25)",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        {userRole || "member"}
      </span>

      {/* Finance role override switcher — only shown on finance pages if user can override */}
      {isFinancePage && canOverride && onAdminViewRoleChange && (
        isMobile ? (
          <select
            value={adminViewRole}
            onChange={(e) => onAdminViewRoleChange(e.target.value)}
            style={{
              background: "#161B22",
              color: "#58A6FF",
              border: "1px solid rgba(88,166,255,0.25)",
              borderRadius: 6,
              padding: "4px 8px",
              fontSize: 11,
              fontWeight: 600,
              outline: "none",
              cursor: "pointer",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {FINANCE_OVERRIDE_ROLES.map((v) => (
              <option key={v.id} value={v.id} style={{ background: "#161B22", color: "#C9D1D9" }}>
                {v.label}
              </option>
            ))}
          </select>
        ) : (
          <div
            style={{
              display: "flex",
              gap: 2,
              background: "rgba(55,138,221,0.06)",
              padding: "3px",
              borderRadius: 8,
              border: "1px solid rgba(55,138,221,0.15)",
              flexShrink: 0,
            }}
          >
            {FINANCE_OVERRIDE_ROLES.map((v) => (
              <button
                key={v.id}
                onClick={() => onAdminViewRoleChange(v.id)}
                style={{
                  padding: "3px 9px",
                  borderRadius: 5,
                  fontSize: 10,
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  letterSpacing: "0.02em",
                  background: adminViewRole === v.id ? "#378ADD" : "transparent",
                  color: adminViewRole === v.id ? "#fff" : "#71717a",
                }}
              >
                {v.label}
              </button>
            ))}
          </div>
        )
      )}

      {/* Search / ⌘K trigger */}
      <button
        id="cmd-palette-trigger"
        onClick={() => openPalette()}
        aria-label="Open command palette (⌘K)"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: isMobile ? 0 : 8,
          padding: isMobile ? "6px 8px" : "5px 10px",
          background: "#21262D",
          border: "1px solid #30363D",
          borderRadius: 6,
          color: "#8B949E",
          fontSize: 12,
          cursor: "pointer",
          minWidth: isMobile ? 32 : 148,
          height: 32,
          flexShrink: 0,
          transition: "border-color 0.15s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#8B949E")}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#30363D")}
      >
        <Search size={13} />
        {!isMobile && <span style={{ flex: 1, textAlign: "left" }}>Cari modul, project...</span>}
        {!isMobile && (
          <kbd
            style={{
              fontSize: 10,
              background: "#0D1117",
              border: "1px solid #30363D",
              borderRadius: 4,
              padding: "1px 5px",
              fontFamily: "monospace",
              color: "#484F58",
            }}
          >
            ⌘K
          </kbd>
        )}
      </button>
    </div>
  );
}
