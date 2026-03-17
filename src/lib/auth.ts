import { cookies } from "next/headers";
import { supabase } from "./supabase";

export const ADMIN_SESSION_COOKIE = "juara_admin_session";
const DEFAULT_ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@juara.local";
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "juaraadmin";

export function getAdminCredentials() {
  return {
    email: DEFAULT_ADMIN_EMAIL,
    password: DEFAULT_ADMIN_PASSWORD,
  };
}

export async function validateTeamMember(email?: string, password?: string) {
  if (!email || !password) return false;

  // 1. Cek kredensial default dari env (untuk darurat/setup awal)
  const defaultCreds = getAdminCredentials();
  if (email === defaultCreds.email && password === defaultCreds.password) {
    return true;
  }

  // 2. Cek di tabel team_members Supabase
  if (!supabase) return false;
  
  const { data, error } = await supabase
    .from("team_members")
    .select("id")
    .eq("email", email)
    .eq("password", password)
    .single();

  if (error || !data) {
    return false;
  }

  return true;
}

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_SESSION_COOKIE)?.value === "active";
}

