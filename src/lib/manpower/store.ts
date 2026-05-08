import { MOCK_FREELANCERS } from "@/app/manpower/freelancer/_data/mockFreelancers";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Freelancer } from "@/app/manpower/freelancer/_types/freelancer";

export async function getManPowerData(): Promise<Freelancer[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      // Fail loudly in production if key is missing
      if (process.env.VERCEL && !serviceKey) {
        throw new Error("SUPABASE_SERVICE_ROLE_KEY is required in production");
      }

      let client = supabase!;
      if (supabaseUrl && serviceKey) {
        const { createClient } = await import('@supabase/supabase-js');
        client = createClient(supabaseUrl, serviceKey);
      }

      const { data, error } = await client
        .from('freelancers')
        .select('data')
        .order('updated_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map(item => item.data as Freelancer);
      }
    } catch (e) {
      console.error("[ManpowerStore] fetch error:", e);
    }
  }

  // Fallback to mock data if Supabase is not configured or fails
  return MOCK_FREELANCERS;
}

export async function saveManPowerData(freelancer: Freelancer): Promise<void> {
  if (!isSupabaseConfigured()) {
    console.warn("Supabase not configured, cannot persist manpower data.");
    return;
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    // Fail loudly in production
    if (process.env.VERCEL && !serviceKey) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is required in production");
    }

    let client = supabase!;
    if (supabaseUrl && serviceKey) {
      const { createClient } = await import('@supabase/supabase-js');
      client = createClient(supabaseUrl, serviceKey);
    }

    const { error } = await client
      .from('freelancers')
      .upsert({
        id: freelancer.id,
        data: freelancer,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) throw error;
  } catch (e: any) {
    console.error("[ManpowerStore] save error:", e.message);
    throw new Error(`Gagal menyimpan data manpower: ${e.message}`);
  }
}
