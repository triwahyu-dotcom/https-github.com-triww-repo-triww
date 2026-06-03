"use client";

import { useEffect, useState } from "react";
import { FinanceDashboardData } from "@/lib/finance/types";
import { ProjectRecord } from "@/lib/project/types";
import { PMDashboard } from "./pm-dashboard";
import { FinanceOpsDashboard } from "./finance-ops-dashboard";
import { DirectorApprovals as DirectorDashboard } from "./director-dashboard";
import { ProcurementDashboard } from "./procurement-dashboard";
import { FinanceMonitoringCenter } from "./finance-monitoring-center";

interface Props {
  initialData: FinanceDashboardData;
  activeProjects: ProjectRecord[];
  availableVendors?: any[];
  availableFreelancers?: any[];
}

export function FinancePortalRouter(props: Props) {
  const [role, setRole] = useState<string | null>(null);

  // Persist view mode and selected role in localStorage to survive reloads
  const [viewMode, setViewModeRaw] = useState<"monitoring" | "operational">("monitoring");
  const [adminViewRole, setAdminViewRoleRaw] = useState<string>("finance");

  const [hasFinanceAccess, setHasFinanceAccess] = useState<boolean>(true);

  useEffect(() => {
    // Restore states from localStorage
    const savedViewMode = localStorage.getItem("juara_finance_view_mode") as "monitoring" | "operational";
    if (savedViewMode) setViewModeRaw(savedViewMode);

    const savedAdminRole = localStorage.getItem("juara_finance_admin_role");
    if (savedAdminRole) setAdminViewRoleRaw(savedAdminRole);

    // Get role from cookie
    const cookies = document.cookie.split(';');
    const roleCookie = cookies.find(c => c.trim().startsWith('juara_user_role='));
    let savedRole = "";

    if (roleCookie) {
      savedRole = roleCookie.split('=')[1].toLowerCase();
    } else {
      savedRole = localStorage.getItem("pm-role") || "pm";
    }

    setRole(savedRole);

    // Fetch user custom permissions
    fetch("/api/settings/my-permissions")
      .then(res => res.json())
      .then(data => {
        if (data.permissions) {
          const hasAccess = data.permissions.finance?.view !== false;
          setHasFinanceAccess(hasAccess);

          const primaryRole = (data.role || "").toLowerCase().trim();
          const isAllowedOverride = data.permissions.finance?.approve === true || primaryRole === "admin" || primaryRole === "director";

          const assignedSubRole = data.permissions.finance?.role || "pm";
          if (!isAllowedOverride) {
            setAdminViewRoleRaw(assignedSubRole);
          } else {
            const savedAdminRole = localStorage.getItem("juara_finance_admin_role");
            setAdminViewRoleRaw(savedAdminRole || assignedSubRole);
          }
        }
      })
      .catch(err => console.error("Error fetching permissions in finance:", err));

    // Listen for role change events dispatched by WorkspaceShell TopMicroBar
    const handleRoleChange = (e: Event) => {
      const detail = (e as CustomEvent<{ role: string }>).detail;
      if (detail?.role) {
        setAdminViewRoleRaw(detail.role);
        localStorage.setItem("juara_finance_admin_role", detail.role);
      }
    };
    window.addEventListener("juara_finance_role_change", handleRoleChange);
    return () => window.removeEventListener("juara_finance_role_change", handleRoleChange);
  }, []);

  const setViewMode = (mode: "monitoring" | "operational") => {
    setViewModeRaw(mode);
    localStorage.setItem("juara_finance_view_mode", mode);
  };

  if (!hasFinanceAccess) {
    return (
      <div style={{ padding: '80px 40px', textAlign: 'center', background: 'var(--panel)', borderRadius: '12px', border: '1px solid var(--line)', margin: '40px' }}>
        <h2 style={{ color: '#eb5e28', marginBottom: '12px', fontSize: '18px', fontWeight: 700 }}>Akses Ditolak</h2>
        <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Anda tidak memiliki izin untuk mengakses Modul Finance &amp; RFP.</p>
      </div>
    );
  }

  if (!role) return <div style={{ padding: '40px', textAlign: 'center' }}>Initializing Portal...</div>;

  const renderOperational = () => {
    if (adminViewRole === "finance") return <FinanceOpsDashboard {...props} viewMode={viewMode} onViewModeChange={setViewMode} />;
    if (adminViewRole === "director") return <DirectorDashboard initialData={props.initialData} viewMode={viewMode} onViewModeChange={setViewMode} />;
    if (adminViewRole === "procurement") return <ProcurementDashboard {...props} viewMode={viewMode} onViewModeChange={setViewMode} />;
    return <PMDashboard {...props} viewMode={viewMode} onViewModeChange={setViewMode} />;
  };

  if (viewMode === "monitoring") {
    return (
      <FinanceMonitoringCenter 
        {...props} 
        viewMode={viewMode} 
        onViewModeChange={setViewMode} 
      />
    );
  }

  return renderOperational();
}

export function ViewSwitcher({
  viewMode,
  onViewModeChange,
}: {
  viewMode: "monitoring" | "operational";
  onViewModeChange: (mode: "monitoring" | "operational") => void;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        background: "rgba(255, 255, 255, 0.04)",
        padding: "3px",
        borderRadius: "8px",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        flexShrink: 0,
      }}
    >
      <button
        onClick={() => onViewModeChange("monitoring")}
        style={{
          padding: "5px 12px",
          borderRadius: "6px",
          fontSize: "11px",
          fontWeight: 600,
          border: "none",
          cursor: "pointer",
          transition: "all 0.15s ease",
          background: viewMode === "monitoring" ? "#378ADD" : "transparent",
          color: viewMode === "monitoring" ? "#fff" : "#8B949E",
        }}
      >
        Monitoring
      </button>
      <button
        onClick={() => onViewModeChange("operational")}
        style={{
          padding: "5px 12px",
          borderRadius: "6px",
          fontSize: "11px",
          fontWeight: 600,
          border: "none",
          cursor: "pointer",
          transition: "all 0.15s ease",
          background: viewMode === "operational" ? "rgba(255, 255, 255, 0.1)" : "transparent",
          color: viewMode === "operational" ? "#fff" : "#8B949E",
        }}
      >
        Operational
      </button>
    </div>
  );
}
