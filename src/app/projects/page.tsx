import { ProjectDashboard } from "@/components/projects/ProjectDashboard";
import { buildIntegratedDashboards } from "@/lib/integration/view-models";
import { getProjectDashboardData, readClients, readProjects } from "@/lib/project/store";
import { getDashboardData } from "@/lib/vendor/store";
import { getManPowerData } from "@/lib/manpower/store";
import { getTeamMembers } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const [projectData, vendorData, freelancerData, clients, teamMembers] = await Promise.all([
    getProjectDashboardData(),
    getDashboardData(),
    getManPowerData(),
    readClients(),
    getTeamMembers()
  ]);
  
  const integrated = await buildIntegratedDashboards(projectData, vendorData, freelancerData, clients);
  const finalProjectData = {
    ...integrated.projectData,
    teamMembers
  };

  return <ProjectDashboard initialData={finalProjectData as any} />;
}
