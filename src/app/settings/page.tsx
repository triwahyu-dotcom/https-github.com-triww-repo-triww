import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE } from "@/lib/auth";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import SettingsClient from "@/components/settings/SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const authenticated = cookieStore.get(ADMIN_SESSION_COOKIE)?.value === "active";
  const userRole = (cookieStore.get("juara_user_role")?.value || "").toLowerCase();

  if (!authenticated || (userRole !== "admin" && userRole !== "director")) {
    redirect("/projects");
  }

  return (
    <WorkspaceShell title="" eyebrow="">
      <SettingsClient />
    </WorkspaceShell>
  );
}
