import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { readWorkspaceSettings, getUserPermissions } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const email = cookieStore.get("juara_user_email")?.value || "";
  const role = cookieStore.get("juara_user_role")?.value || "member";

  const settings = await readWorkspaceSettings();
  const userSettings = getUserPermissions(email, role, settings);

  return NextResponse.json({
    email,
    role,
    is_active: userSettings.is_active,
    permissions: userSettings.permissions
  });
}
