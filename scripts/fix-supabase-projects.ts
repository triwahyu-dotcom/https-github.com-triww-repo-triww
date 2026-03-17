import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixSupabaseProjects() {
  console.log("Fetching projects from Supabase projects table...");
  const { data: projects, error: err1 } = await supabase.from('projects').select('id, data');
  
  if (err1) {
    console.error("Error fetching projects:", err1.message);
    return;
  }
  
  let updatedCount = 0;
  for (const item of projects || []) {
      const p = item.data;
      const c = p?.client?.toUpperCase() || '';
      
      let targetClient = '';
      if (c === "DJARUM SUPE" || c === "DJARUM " || c === "DJARUM") {
          targetClient = "PT DJARUM";
      } else if (c === "MIRELA" || c === "MIRELLA") {
          targetClient = "MIRELA"; // or "MIRELLA"? Let's standardize to "MIRELLA"
      }
      
      if (targetClient && c !== targetClient.toUpperCase()) {
          console.log(`Fixing project ${p.id}: ${p.client} -> ${targetClient}`);
          p.client = targetClient;
          if (p.searchableText) {
              p.searchableText = p.searchableText.replace(new RegExp(c, 'i'), targetClient);
          }
          
          const { error: err2 } = await supabase.from('projects').upsert({ id: item.id, data: p });
          if (err2) {
              console.error(`Error updating project ${p.id}:`, err2.message);
          } else {
              updatedCount++;
          }
      }
  }
  
  console.log(`Updated ${updatedCount} projects in Supabase.`);
  
  console.log("Deleting rogue client 'djarum-supe' from Supabase...");
  const { error: err3 } = await supabase.from('clients').delete().eq('id', 'djarum-supe');
  if (err3) {
      console.error("Error deleting rogue client:", err3.message);
  } else {
      console.log("Rogue client 'djarum-supe' deleted successfully.");
  }
}

fixSupabaseProjects().catch(console.error);
