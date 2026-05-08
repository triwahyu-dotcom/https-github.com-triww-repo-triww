import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      nama,
      no_hp,
      kota_domisili,
      posisi_utama,
      rate_estimate,
      nomor_ktp,
      bank_name,
      bank_account_number,
      bank_account_holder,
      last_events,
    } = body;

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

    if (!client) {
      throw new Error("Supabase is not initialized");
    }

    const newId = `fl-${Date.now()}`;
    const freelancerData = {
      id: newId,
      nama,
      no_hp,
      kota_domisili,
      posisi_utama,
      rate_estimate,
      nomor_ktp,
      rekening_bank: {
        nama_bank: bank_name,
        no_rekening: bank_account_number,
        nama_pemilik: bank_account_holder,
      },
      last_events,
      status: "new",
      assignment_history: [],
      total_event: 0,
      rating_avg: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Map form to JSONB table structure
    const { data, error } = await client
      .from("freelancers")
      .insert({
        id: newId,
        data: freelancerData,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error("[API manpower-intake] Supabase error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    console.error("[API manpower-intake] error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
