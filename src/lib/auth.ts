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
  const cleanEmail = email?.trim().toLowerCase();
  const cleanPassword = password?.trim();

  console.log("Login attempt:", { email: cleanEmail, hasPassword: !!cleanPassword });
  console.log("Expected Admin:", { email: DEFAULT_ADMIN_EMAIL, pass: DEFAULT_ADMIN_PASSWORD });

  if (!cleanEmail || !cleanPassword) {
    console.log("Login failed: Missing email or password");
    return null;
  }

  // 1. Cek kredensial dari Environment Variables (Vercel Settings) sebagai Admin Utama
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (adminEmail && adminPassword) {
    const isEmailMatch = cleanEmail === adminEmail.toLowerCase().trim();
    const isPasswordMatch = cleanPassword === adminPassword.trim();
    
    console.log("Admin Check:", { 
      attempt: cleanEmail, 
      expected: adminEmail.toLowerCase().trim(),
      isEmailMatch, 
      isPasswordMatch 
    });

    if (isEmailMatch && isPasswordMatch) {
      console.log("✅ Admin match found!");
      return { email: cleanEmail, role: "admin", name: "Super Admin" };
    }
  }

  // FAIL-SAFE: Jalur darurat untuk Director (Eka)
  if (cleanEmail === "ekamarutha@juaraevent.id" && cleanPassword === "juara2026") {
    console.log("✅ Fail-safe login for Director");
    return { email: cleanEmail, role: "Director", name: "Eka" };
  }
 else {
    console.log("⚠️ Warning: ADMIN_EMAIL or ADMIN_PASSWORD is not set in process.env");
  }

  // 2. Cek di tabel team_members Supabase (User lainnya)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.log("⚠️ Supabase credentials missing in process.env");
    return null;
  }

  // Use the admin client to verify the team member
  const { createClient } = require('@supabase/supabase-js');
  const adminClient = createClient(supabaseUrl, serviceKey);
  
  const { data, error } = await adminClient
    .from("team_members")
    .select("id, email, password, role, name")
    .eq("email", cleanEmail)
    .single();

  if (error || !data) {
    console.log("❌ User not found in DB or query error");
    return null;
  }

  if (data.password !== cleanPassword) {
    console.log("❌ Password mismatch in DB");
    return null;
  }

  console.log("✅ DB match found for:", cleanEmail);

  return {
    id: data.id,
    email: data.email,
    role: data.role || "member",
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
    console.error("Error fetching team members:", JSON.stringify(error, null, 2));
    return [];
  }

  return data;
}

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_SESSION_COOKIE)?.value === "active";
}

