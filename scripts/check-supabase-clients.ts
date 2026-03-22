import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSupabase() {
  console.log("Fetching projects from Supabase...");
  const { data, error } = await supabase.from('projects').select('data');
  
  if (error) {
    console.error("Error fetching projects:", error.message);
    return;
  }
  
  const clients = new Set();
  const rawData = data || [];
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const item of (rawData as any[])) {
    const p = item.data;
    if (p && p.client) {
      clients.add(p.client);
    }
  }

  console.log("=== UNIQUE CLIENTS IN SUPABASE ===");
  for (const c of sorted(clients)) {
      const clientName = String(c);
      if (clientName.toUpperCase().includes("DJARUM") || clientName.toUpperCase().includes("MIREL")) {
          console.log(`'${clientName}'`);
      }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sorted(iterable: Iterable<any>): any[] {
    return Array.from(iterable).sort();
}

checkSupabase().catch(console.error);
