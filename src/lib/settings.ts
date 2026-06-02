import { getAdminClient } from "./supabase-admin";

export interface ModulePermissions {
  view: boolean;
  create?: boolean;
  edit?: boolean;
  delete?: boolean;
  approve?: boolean;
  role?: string; // For finance sub-role
}

export interface UserPermissionMatrix {
  projects: { view: boolean; create: boolean; edit: boolean; delete: boolean };
  crm: { view: boolean; edit: boolean };
  vendors: { view: boolean; edit: boolean };
  manpower: { view: boolean; edit: boolean };
  docs: { view: boolean; edit: boolean };
  finance: { view: boolean; create: boolean; approve: boolean; delete: boolean; role: "pm" | "finance" | "procurement" | "director" };
}

export interface UserSettings {
  is_active: boolean;
  permissions: UserPermissionMatrix;
}

export interface WorkspaceSettings {
  user_settings: Record<string, UserSettings>;
}

export const DEFAULT_ROLE_PERMISSIONS: Record<string, UserPermissionMatrix> = {
  admin: {
    projects: { view: true, create: true, edit: true, delete: true },
    crm: { view: true, edit: true },
    vendors: { view: true, edit: true },
    manpower: { view: true, edit: true },
    docs: { view: true, edit: true },
    finance: { view: true, create: true, approve: true, delete: true, role: "finance" },
  },
  director: {
    projects: { view: true, create: true, edit: true, delete: true },
    crm: { view: true, edit: true },
    vendors: { view: true, edit: true },
    manpower: { view: true, edit: true },
    docs: { view: true, edit: true },
    finance: { view: true, create: true, approve: true, delete: true, role: "director" },
  },
  finance: {
    projects: { view: true, create: false, edit: false, delete: false },
    crm: { view: true, edit: false },
    vendors: { view: true, edit: false },
    manpower: { view: true, edit: false },
    docs: { view: true, edit: true },
    finance: { view: true, create: true, approve: false, delete: true, role: "finance" },
  },
  procurement: {
    projects: { view: true, create: false, edit: false, delete: false },
    crm: { view: true, edit: false },
    vendors: { view: true, edit: true },
    manpower: { view: true, edit: false },
    docs: { view: true, edit: true },
    finance: { view: true, create: true, approve: false, delete: false, role: "procurement" },
  },
  pm: {
    projects: { view: true, create: true, edit: true, delete: false },
    crm: { view: true, edit: true },
    vendors: { view: true, edit: false },
    manpower: { view: true, edit: true },
    docs: { view: true, edit: true },
    finance: { view: true, create: true, approve: false, delete: false, role: "pm" },
  },
  ae: {
    projects: { view: true, create: true, edit: true, delete: false },
    crm: { view: true, edit: true },
    vendors: { view: true, edit: false },
    manpower: { view: true, edit: true },
    docs: { view: true, edit: true },
    finance: { view: true, create: true, approve: false, delete: false, role: "pm" },
  },
  hcga: {
    projects: { view: true, create: false, edit: false, delete: false },
    crm: { view: false, edit: false },
    vendors: { view: true, edit: true },
    manpower: { view: true, edit: true },
    docs: { view: true, edit: true },
    finance: { view: true, create: false, approve: false, delete: false, role: "pm" },
  },
  member: {
    projects: { view: true, create: false, edit: false, delete: false },
    crm: { view: false, edit: false },
    vendors: { view: false, edit: false },
    manpower: { view: false, edit: false },
    docs: { view: true, edit: false },
    finance: { view: false, create: false, approve: false, delete: false, role: "pm" },
  },
};

export async function readWorkspaceSettings(): Promise<WorkspaceSettings> {
  try {
    const client = await getAdminClient();
    const { data, error } = await client
      .from("vendor_ops_state")
      .select("data")
      .eq("id", "workspace_settings")
      .single();

    if (error || !data) {
      return { user_settings: {} };
    }

    return data.data as WorkspaceSettings;
  } catch (err) {
    console.error("Error reading workspace settings:", err);
    return { user_settings: {} };
  }
}

export async function writeWorkspaceSettings(settings: WorkspaceSettings): Promise<void> {
  const client = await getAdminClient();
  const { error } = await client
    .from("vendor_ops_state")
    .upsert({
      id: "workspace_settings",
      data: settings,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    throw new Error(`Failed to save settings: ${error.message}`);
  }
}

export function getUserPermissions(
  email: string,
  role: string,
  settings: WorkspaceSettings
): UserSettings {
  const cleanEmail = (email || "").trim().toLowerCase();
  const cleanRole = (role || "member").trim().toLowerCase();

  if (settings.user_settings && settings.user_settings[cleanEmail]) {
    return settings.user_settings[cleanEmail];
  }

  const defaultPermissions = DEFAULT_ROLE_PERMISSIONS[cleanRole] || DEFAULT_ROLE_PERMISSIONS.member;
  return {
    is_active: true,
    permissions: defaultPermissions,
  };
}
