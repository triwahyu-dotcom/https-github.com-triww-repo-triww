import { getProjectDashboardData, readJsonProjects } from "../src/lib/project/store";
async function run() {
  const data = await getProjectDashboardData();
  console.log("Service Lines from getProjectDashboardData:", data.serviceLines);
}
run();
