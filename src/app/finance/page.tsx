import { FinancePortalRouter } from "@/components/finance/portal-router";
import { getFinanceDashboardData } from "@/lib/finance/store";
import { getProjectDashboardData } from "@/lib/project/store";
import { getDashboardData as getVendorDashboardData } from "@/lib/vendor/store";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const financeData = await getFinanceDashboardData();
  const { projects } = await getProjectDashboardData();
  const vendorDashboard = await getVendorDashboardData();
  
  // Only pass active projects that are in execution or finance to create RFPs against
  const activeProjects = projects.filter(p => !["failed", "leads"].includes(p.section));

  return <FinancePortalRouter initialData={financeData} activeProjects={activeProjects} availableVendors={vendorDashboard.vendorDetails} />;
}
