import { FinancePortalRouter } from "@/components/finance/portal-router";
import { getFinanceDashboardData } from "@/lib/finance/store";
import { getProjectDashboardData } from "@/lib/project/store";
import { getDashboardData as getVendorDashboardData } from "@/lib/vendor/store";
import { getManPowerData } from "@/lib/manpower/store";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const [financeData, projectData, vendorDashboard, freelancerData] = await Promise.all([
    getFinanceDashboardData(),
    getProjectDashboardData(),
    getVendorDashboardData(),
    getManPowerData()
  ]);
  
  const { projects } = projectData;
  
  // Pass all projects that are in an active/billable stage — so PO/RFP can be created
  const activeProjects = projects.filter(p =>
    !["lost", "cancelled", "completed"].includes(p.currentStage)
  );

  return (
    <FinancePortalRouter 
      initialData={financeData} 
      activeProjects={activeProjects} 
      availableVendors={vendorDashboard.vendorDetails} 
      availableFreelancers={freelancerData}
    />
  );
}
