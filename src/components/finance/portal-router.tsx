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

  useEffect(() => {
    const savedRole = localStorage.getItem("pm-role") || "pm";
    setRole(savedRole);
  }, []);

  if (!role) return <div style={{ padding: '40px', textAlign: 'center' }}>Initializing Portal...</div>;

  // Toggle button for switching views (Only for roles that need monitoring)
  const showToggle = role === "finance" || role === "pm";

  const renderOperational = () => {
    if (role === "finance") return <FinanceOpsDashboard {...props} />;
    if (role === "director") return <DirectorDashboard initialData={props.initialData} />;
    if (role === "procurement") return <ProcurementDashboard {...props} />;
    return <PMDashboard {...props} />;
  };

  if (viewMode === "monitoring" && (role === "finance" || role === "pm")) {
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
