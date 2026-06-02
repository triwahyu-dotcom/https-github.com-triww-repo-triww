import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { ADMIN_SESSION_COOKIE } from "@/lib/auth";
import { 
  readWorkspaceSettings, 
  writeWorkspaceSettings, 
  getUserPermissions,
  UserPermissionMatrix,
  DEFAULT_ROLE_PERMISSIONS
} from "@/lib/settings";

export const dynamic = "force-dynamic";

// Helper check authorization: Only admin/director allowed
async function checkAuth() {
  const cookieStore = await cookies();
  const authenticated = cookieStore.get(ADMIN_SESSION_COOKIE)?.value === "active";
  const userRole = (cookieStore.get("juara_user_role")?.value || "").toLowerCase();

  return authenticated && (userRole === "admin" || userRole === "director");
}

// GET: Fetch all team members merged with custom settings
export async function GET() {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const client = await getAdminClient();
    
    // Fetch all members from team_members table
    const { data: members, error: dbError } = await client
      .from("team_members")
      .select("id, name, email, role, password, created_at")
      .order("name", { ascending: true });

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    // Fetch workspace settings
    const settings = await readWorkspaceSettings();

    // Merge members with settings
    const mergedMembers = (members || []).map((m: any) => {
      const userEmail = (m.email || "").toLowerCase().trim();
      const userSettings = getUserPermissions(userEmail, m.role, settings);
      
      return {
        id: m.id,
        name: m.name,
        email: m.email,
        role: m.role,
        password: m.password, // Plain text password (as requested)
        created_at: m.created_at,
        is_active: userSettings.is_active,
        permissions: userSettings.permissions,
      };
    });

    return NextResponse.json({ members: mergedMembers });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Add a new team member
export async function POST(request: NextRequest) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, email, password, role, is_active, permissions } = body;

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const client = await getAdminClient();

    // 1. Insert user into team_members table
    const { data: newUser, error: insertError } = await client
      .from("team_members")
      .insert({
        name,
        email: cleanEmail,
        password,
        role: role || "member",
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json({ error: "Email sudah terdaftar di database." }, { status: 400 });
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // 2. Initialize and save custom settings
    const settings = await readWorkspaceSettings();
    if (!settings.user_settings) settings.user_settings = {};

    const defaultPermissions = DEFAULT_ROLE_PERMISSIONS[(role || "member").toLowerCase()] || DEFAULT_ROLE_PERMISSIONS.member;

    settings.user_settings[cleanEmail] = {
      is_active: is_active !== undefined ? is_active : true,
      permissions: permissions || defaultPermissions,
    };

    await writeWorkspaceSettings(settings);

    return NextResponse.json({ 
      ok: true, 
      member: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        is_active: settings.user_settings[cleanEmail].is_active,
        permissions: settings.user_settings[cleanEmail].permissions
      } 
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT: Update an existing team member
export async function PUT(request: NextRequest) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, name, email, password, role, is_active, permissions } = body;

    if (!id || !email || !name) {
      return NextResponse.json({ error: "ID, Name, and Email are required." }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const client = await getAdminClient();

    // First fetch original user details to see if email changed
    const { data: originalUser, error: fetchErr } = await client
      .from("team_members")
      .select("email")
      .eq("id", id)
      .single();

    if (fetchErr || !originalUser) {
      return NextResponse.json({ error: "Team member not found." }, { status: 404 });
    }

    const originalEmail = originalUser.email.toLowerCase().trim();

    // 1. Update team_members table row
    const updatePayload: any = {
      name,
      email: cleanEmail,
      role: role || "member",
    };

    if (password) {
      updatePayload.password = password;
    }

    const { error: updateError } = await client
      .from("team_members")
      .update(updatePayload)
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 2. Update custom settings
    const settings = await readWorkspaceSettings();
    if (!settings.user_settings) settings.user_settings = {};

    // Remove old email key if changed
    if (originalEmail !== cleanEmail) {
      delete settings.user_settings[originalEmail];
    }

    const defaultPermissions = DEFAULT_ROLE_PERMISSIONS[(role || "member").toLowerCase()] || DEFAULT_ROLE_PERMISSIONS.member;

    settings.user_settings[cleanEmail] = {
      is_active: is_active !== undefined ? is_active : true,
      permissions: permissions || settings.user_settings[originalEmail]?.permissions || defaultPermissions,
    };

    await writeWorkspaceSettings(settings);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Permanently delete a team member
export async function DELETE(request: NextRequest) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required." }, { status: 400 });
    }

    const client = await getAdminClient();

    // Get user details first
    const { data: user, error: fetchErr } = await client
      .from("team_members")
      .select("email")
      .eq("id", id)
      .single();

    if (fetchErr || !user) {
      return NextResponse.json({ error: "Team member not found." }, { status: 404 });
    }

    const cleanEmail = user.email.toLowerCase().trim();

    // 1. Delete from database
    const { error: deleteError } = await client
      .from("team_members")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // 2. Remove from custom settings mapping
    const settings = await readWorkspaceSettings();
    if (settings.user_settings && settings.user_settings[cleanEmail]) {
      delete settings.user_settings[cleanEmail];
      await writeWorkspaceSettings(settings);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
