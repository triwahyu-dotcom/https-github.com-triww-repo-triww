import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSupabaseClients() {
  console.log("Fetching clients from Supabase clients table...");
  const { data, error } = await supabase.from('clients').select('data');
  
  if (error) {
    console.error("Error fetching clients:", error.message);
    return;
  }
  
  for (const item of data || []) {
      const c = item.data;
      if (c && c.name) {
          if (c.name.toUpperCase().includes("DJARUM") || c.name.toUpperCase().includes("MIREL")) {
              console.log(`Found client: "${c.name}" with id: ${c.id}`);
          }
      }
  }
}

checkSupabaseClients().catch(console.error);
