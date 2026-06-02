import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { ADMIN_SESSION_COOKIE, validateTeamMember } from "@/lib/auth";
import { readWorkspaceSettings, getUserPermissions } from "@/lib/settings";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { email?: string; password?: string };
  
  const user = await validateTeamMember(body.email, body.password);

  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // Cek keaktifan user
  const settings = await readWorkspaceSettings();
  const userSettings = getUserPermissions(body.email || "", user.role, settings);
  if (!userSettings.is_active) {
    return NextResponse.json(
      { error: "Akun Anda dinonaktifkan oleh Administrator. Hubungi Super Admin." },
      { status: 403 }
    );
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, "active", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  // Store role in a separate cookie for UI filtering (not for security-critical logic, use session for that)
  cookieStore.set("juara_user_role", user.role, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  cookieStore.set("juara_user_name", user.name || "", {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  cookieStore.set("juara_user_email", (body.email || "").toLowerCase().trim(), {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return NextResponse.json({ ok: true, role: user.role });
}


