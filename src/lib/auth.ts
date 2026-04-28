import { cookies } from "next/headers";
import { supabase } from "./supabase";

export const ADMIN_SESSION_COOKIE = "juara_admin_session";
// Membaca kredensial dari environment variables jika ada (sebagai fallback/darurat)
const DEFAULT_ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export function getAdminCredentials() {
  return {
    email: DEFAULT_ADMIN_EMAIL,
    password: DEFAULT_ADMIN_PASSWORD,
  };
}

export async function validateTeamMember(email?: string, password?: string) {
  if (!email || !password) return false;

  // 1. Cek kredensial dari Environment Variables (Vercel Settings) jika ada
  if (DEFAULT_ADMIN_EMAIL && DEFAULT_ADMIN_PASSWORD) {
    if (email === DEFAULT_ADMIN_EMAIL && password === DEFAULT_ADMIN_PASSWORD) {
      return true;
    }
  }

  // 2. Cek di tabel team_members Supabase (Utama)
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

