import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixWeDoClients() {
  console.log("Fetching projects from Supabase projects table...");
  const { data: projects, error: err1 } = await supabase.from('projects').select('id, data');
  
  if (err1) {
    console.error("Error fetching projects:", err1.message);
    return;
  }
  
  let updatedCount = 0;
  for (const item of projects || []) {
      const p = item.data;
      const c = p?.client || '';
      
      if (c && typeof c === 'string' && c.toUpperCase().includes("WE DO") && c.toUpperCase().includes("GENERALI")) {
          const targetClient = "WE DO";
          console.log(`Fixing project ${p.id}: ${p.client.replace(/\n/g, ' ')} -> ${targetClient}`);
          p.client = targetClient;
          
          if (p.searchableText) {
              p.searchableText = p.searchableText.replace(/we do\s*\(generali\)/ig, targetClient.toLowerCase());
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
}

fixWeDoClients().catch(console.error);
