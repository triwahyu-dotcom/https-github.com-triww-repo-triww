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
  const [isMobile, setIsMobile] = useState(false);
  
  // Persist view mode and selected role in localStorage to survive reloads
  const [viewMode, setViewModeRaw] = useState<"monitoring" | "operational">("monitoring");
  const [adminViewRole, setAdminViewRoleRaw] = useState<string>("finance");

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
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
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const setViewMode = (mode: "monitoring" | "operational") => {
    setViewModeRaw(mode);
    localStorage.setItem("juara_finance_view_mode", mode);
  };

  const setAdminViewRole = (role: string) => {
    setAdminViewRoleRaw(role);
    localStorage.setItem("juara_finance_admin_role", role);
  };

  if (!role) return <div style={{ padding: '40px', textAlign: 'center' }}>Initializing Portal...</div>;

  // Toggle button for switching views (Always show when RBAC is disabled)
  const showToggle = true; 

  const renderOperational = () => {
    const activeRole = adminViewRole;

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
      <div className="finance-override-header" style={{ position: 'sticky', top: 0, zIndex: 1100, background: '#18181b', borderBottom: '1px solid #378ADD', padding: isMobile ? '12px 16px' : '12px 40px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '10px' : '20px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#378ADD', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Override View:</div>
          <div className="override-tabs" style={{ display: 'flex', gap: '4px', background: 'rgba(55,138,221,0.05)', padding: '4px', borderRadius: '10px', overflowX: 'auto', width: isMobile ? '100%' : 'auto' }}>
            {[
              { id: 'finance', label: 'Finance' },
              { id: 'procurement', label: 'Procurement' },
              { id: 'director', label: 'Director' },
              { id: 'pm', label: 'PM' }
            ].map(v => (
              <button
                key={v.id}
                onClick={() => setAdminViewRole(v.id)}
                style={{
                  padding: '8px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0,
                  background: adminViewRole === v.id ? '#378ADD' : 'transparent',
                  color: adminViewRole === v.id ? '#fff' : '#71717a'
                }}
              >
                {v.label}
              </button>
            ))}
        </div>
      </div>
      {renderOperational()}
      {showToggle && (
        <button 
          onClick={() => setViewMode("monitoring")}
          style={{ position: 'fixed', bottom: isMobile ? '80px' : '24px', right: '24px', background: '#378ADD', color: '#fff', border: 'none', borderRadius: '30px', padding: '12px 24px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', zIndex: 1000 }}
        >
          {isMobile ? '← Monitor' : '← Open Monitoring Center'}
        </button>
      )}
    </>
  );
}
