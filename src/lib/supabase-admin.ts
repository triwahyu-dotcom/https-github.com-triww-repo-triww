import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "./supabase";

/**
 * Mendapatkan Supabase Client dengan Service Role Key (Admin).
 * Digunakan untuk operasi server-side yang membutuhkan bypass RLS.
 * 
 * @returns Supabase Client (Admin)
 * @throws Error jika kredensial tidak ditemukan di lingkungan produksi
 */
export async function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Validasi kritis untuk lingkungan Vercel (Produksi)
  if (process.env.VERCEL && !serviceKey) {
    console.error("[SupabaseAdmin] CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing in Vercel.");
    throw new Error("Konfigurasi keamanan database (Service Role) tidak ditemukan di server produksi.");
  }

  // Fallback ke anon client jika di local dev tanpa service key
  if (!supabaseUrl || !serviceKey) {
    if (isSupabaseConfigured()) {
      return supabase!;
    }
    throw new Error("Kredensial Supabase tidak ditemukan. Periksa file .env.local atau Vercel Settings.");
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
