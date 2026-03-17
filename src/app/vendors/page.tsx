import { VendorDashboard } from "@/components/vendor-dashboard";
import { buildIntegratedDashboards } from "@/lib/integration/view-models";
import { getProjectDashboardData } from "@/lib/project/store";
import { getDashboardData } from "@/lib/vendor/store";

export const dynamic = "force-dynamic";

export default async function VendorsPage() {
  const [projectData, vendorData] = await Promise.all([getProjectDashboardData(), getDashboardData()]);
  const integrated = await buildIntegratedDashboards(projectData, vendorData);

  return <VendorDashboard initialData={integrated.vendorData} />;
}
