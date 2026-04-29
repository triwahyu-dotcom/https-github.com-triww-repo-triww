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
  if (!email || !password) return null;

  // 1. Cek kredensial dari Environment Variables (Vercel Settings) sebagai Admin Utama
  if (DEFAULT_ADMIN_EMAIL && DEFAULT_ADMIN_PASSWORD) {
    if (email === DEFAULT_ADMIN_EMAIL && password === DEFAULT_ADMIN_PASSWORD) {
      return { email, role: "admin", name: "Super Admin" };
    }
  }

  // 2. Cek di tabel team_members Supabase (User lainnya)
  if (!supabase) return null;
  
  const { data, error } = await supabase
    .from("team_members")
    .select("id, email, role, name")
    .eq("email", email)
    .eq("password", password)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    email: data.email,
    role: data.role || "member", // Default role if not set
    name: data.name || "Team Member"
  };
}

export async function getTeamMembers() {
  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from("team_members")
    .select("id, name, email, role")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching team members:", error);
    return [];
  }

  return data;
}

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_SESSION_COOKIE)?.value === "active";
}

