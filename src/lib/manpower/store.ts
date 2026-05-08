import { MOCK_FREELANCERS } from "@/app/manpower/freelancer/_data/mockFreelancers";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { getAdminClient } from "@/lib/supabase-admin";
import { Freelancer } from "@/app/manpower/freelancer/_types/freelancer";

export async function getManPowerData(): Promise<Freelancer[]> {
  if (isSupabaseConfigured()) {
    try {
      const client = await getAdminClient();

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
    const client = await getAdminClient();

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
