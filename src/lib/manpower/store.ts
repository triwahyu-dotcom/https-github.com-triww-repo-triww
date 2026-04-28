import { MOCK_FREELANCERS } from "@/app/manpower/freelancer/_data/mockFreelancers";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Freelancer } from "@/app/manpower/freelancer/_types/freelancer";

export async function getManPowerData(): Promise<Freelancer[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase!
        .from('freelancers')
        .select('data')
        .order('updated_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map(item => item.data as Freelancer);
      }
    } catch (e) {
      console.error("Failed to fetch from Supabase, falling back to mock data", e);
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

  const { error } = await supabase!
    .from('freelancers')
    .upsert({
      id: freelancer.id,
      data: freelancer,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });

  if (error) {
    throw new Error(`Failed to save manpower data: ${error.message}`);
  }
}
