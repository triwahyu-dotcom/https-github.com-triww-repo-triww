import { readProjects } from "@/lib/project/store";
import { getTeamMembers } from "@/lib/auth";
import { readDocuments, readRFPs } from "@/lib/finance/store";
import WorkspaceHubClient from "@/components/projects/WorkspaceHubClient";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [projects, teamMembers, expenseDocuments, rfps] = await Promise.all([
    readProjects(),
    getTeamMembers(),
    readDocuments().catch(() => []),
    readRFPs().catch(() => []),
  ]);

  return (
    <WorkspaceHubClient
      projects={projects}
      teamMembers={teamMembers ?? []}
      expenseDocuments={expenseDocuments}
      rfps={rfps}
    />
  );
}
