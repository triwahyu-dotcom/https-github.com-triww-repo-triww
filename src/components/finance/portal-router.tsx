"use client";

import { useEffect, useState } from "react";
import { FinanceDashboardData } from "@/lib/finance/types";
import { ProjectRecord } from "@/lib/project/types";
import { PMDashboard } from "./pm-dashboard";
import { FinanceOpsDashboard } from "./finance-ops-dashboard";
import { DirectorApprovals as DirectorDashboard } from "./director-dashboard";
import { ProcurementDashboard } from "./procurement-dashboard";

interface Props {
  initialData: FinanceDashboardData;
  activeProjects: ProjectRecord[];
  availableVendors?: any[];
  availableFreelancers?: any[];
}

export function FinancePortalRouter(props: Props) {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const savedRole = localStorage.getItem("pm-role") || "pm";
    setRole(savedRole);
  }, []);

  if (!role) return <div style={{ padding: '40px', textAlign: 'center' }}>Initializing Portal...</div>;

  if (role === "finance") {
    return <FinanceOpsDashboard {...props} />;
  }

  if (role === "director") {
    return <DirectorDashboard initialData={props.initialData} />;
  }

  if (role === "procurement") {
    return <ProcurementDashboard {...props} />;
  }

  return <PMDashboard {...props} />;
}
