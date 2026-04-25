import { ProjectDashboard } from "@/components/projects/ProjectDashboard";
import { buildIntegratedDashboards } from "@/lib/integration/view-models";
import { getProjectDashboardData } from "@/lib/project/store";
import { getDashboardData } from "@/lib/vendor/store";
import { getManPowerData } from "@/lib/manpower/store";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const [projectData, vendorData, freelancerData] = await Promise.all([
    getProjectDashboardData(),
    getDashboardData(),
    getManPowerData()
  ]);
  const integrated = await buildIntegratedDashboards(projectData, vendorData, freelancerData);

  return <ProjectDashboard initialData={integrated.projectData} />;
}
