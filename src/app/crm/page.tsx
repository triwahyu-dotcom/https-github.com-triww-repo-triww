import { CRMDashboard } from "@/components/crm/CrmDashboard";
import { getProjectDashboardData } from "@/lib/project/store";
import { getCRMDashboardData } from "@/lib/crm/store";

export const dynamic = "force-dynamic";

export default async function CRMPage() {
  const { projects } = await getProjectDashboardData();
  const crmData = await getCRMDashboardData(projects);

  return <CRMDashboard initialData={crmData} />;
}
