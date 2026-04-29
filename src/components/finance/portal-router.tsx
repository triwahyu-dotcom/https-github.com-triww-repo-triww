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
  const [viewMode, setViewMode] = useState<"monitoring" | "operational">("monitoring");
  const [adminViewRole, setAdminViewRole] = useState<string>("finance");

  useEffect(() => {
    // Get role from cookie first
    const cookies = document.cookie.split(';');
    const roleCookie = cookies.find(c => c.trim().startsWith('juara_user_role='));
    let savedRole = "";
    
    if (roleCookie) {
      savedRole = roleCookie.split('=')[1].toLowerCase();
    } else {
      savedRole = localStorage.getItem("pm-role") || "pm";
    }
    
    setRole(savedRole);
  }, []);

  if (!role) return <div style={{ padding: '40px', textAlign: 'center' }}>Initializing Portal...</div>;

  // Toggle button for switching views (Always show when RBAC is disabled)
  const showToggle = true; // role === "finance" || role === "pm" || role === "ae" || role === "admin";

  const renderOperational = () => {
    const activeRole = role === "admin" ? adminViewRole : role;

    if (activeRole === "finance") return <FinanceOpsDashboard {...props} />;
    if (activeRole === "director") return <DirectorDashboard initialData={props.initialData} />;
    if (activeRole === "procurement") return <ProcurementDashboard {...props} />;
    return <PMDashboard {...props} />;
  };

  if (viewMode === "monitoring") {
    return (
      <>
        <FinanceMonitoringCenter {...props} />
        <button 
          onClick={() => setViewMode("operational")}
          style={{ position: 'fixed', bottom: '24px', right: '24px', background: '#3f3f46', color: '#fff', border: 'none', borderRadius: '30px', padding: '12px 24px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', zIndex: 1000 }}
        >
          Switch to Operational Dashboard →
        </button>
      </>
    );
  }

  return (
    <>
      {role === "admin" && (
        <div style={{ position: 'sticky', top: 0, zIndex: 1100, background: '#18181b', borderBottom: '1px solid #378ADD', padding: '12px 40px', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#378ADD', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Super Admin View Override:</div>
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(55,138,221,0.05)', padding: '4px', borderRadius: '10px' }}>
            {[
              { id: 'finance', label: 'Finance Ops' },
              { id: 'procurement', label: 'Procurement' },
              { id: 'director', label: 'C-Level (Director)' },
              { id: 'pm', label: 'Project Manager' }
            ].map(v => (
              <button
                key={v.id}
                onClick={() => setAdminViewRole(v.id)}
                style={{
                  padding: '8px 16px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                  background: adminViewRole === v.id ? '#378ADD' : 'transparent',
                  color: adminViewRole === v.id ? '#fff' : '#71717a'
                }}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {renderOperational()}
      {showToggle && (
        <button 
          onClick={() => setViewMode("monitoring")}
          style={{ position: 'fixed', bottom: '24px', right: '24px', background: '#378ADD', color: '#fff', border: 'none', borderRadius: '30px', padding: '12px 24px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', zIndex: 1000 }}
        >
          ← Open Monitoring Center
        </button>
      )}
    </>
  );
}
