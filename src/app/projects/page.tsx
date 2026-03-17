import { ProjectDashboard } from "@/components/project-dashboard";
import { buildIntegratedDashboards } from "@/lib/integration/view-models";
import { getProjectDashboardData } from "@/lib/project/store";
import { getDashboardData } from "@/lib/vendor/store";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const [projectData, vendorData] = await Promise.all([getProjectDashboardData(), getDashboardData()]);
  const integrated = await buildIntegratedDashboards(projectData, vendorData);

  return <ProjectDashboard initialData={integrated.projectData} />;
}
