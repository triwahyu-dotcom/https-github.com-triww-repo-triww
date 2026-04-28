import { ProjectDashboard } from "@/components/projects/ProjectDashboard";
import { buildIntegratedDashboards } from "@/lib/integration/view-models";
import { getProjectDashboardData, getJsonClients } from "@/lib/project/store";
import { getDashboardData } from "@/lib/vendor/store";
import { getManPowerData } from "@/lib/manpower/store";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const [projectData, vendorData, freelancerData, clients] = await Promise.all([
    getProjectDashboardData(),
    getDashboardData(),
    getManPowerData(),
    getJsonClients()
  ]);
  const integrated = await buildIntegratedDashboards(projectData, vendorData, freelancerData, clients);

  return <ProjectDashboard initialData={integrated.projectData as any} />;
}
