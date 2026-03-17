import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSupabaseClients() {
  const { data, error } = await supabase.from('clients').select('id, data');
  
  if (error) {
    console.error("Error fetching clients:", error.message);
    return;
  }
  
  console.log("=== ALL SUPABASE CLIENTS ===");
  for (const item of data || []) {
      const c = item.data;
      console.log(`ID: ${item.id} | Name: ${c?.name} | Aliases: ${c?.aliases?.join(', ')}`);
  }
}

checkSupabaseClients().catch(console.error);
