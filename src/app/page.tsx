import { readProjects } from "@/lib/project/store";
import { getTeamMembers } from "@/lib/auth";
import WorkspaceHubClient from "@/components/projects/WorkspaceHubClient";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [projects, teamMembers] = await Promise.all([
    readProjects(),
    getTeamMembers(),
  ]);

  return (
    <WorkspaceHubClient
      projects={projects}
      teamMembers={teamMembers ?? []}
    />
  );
}
