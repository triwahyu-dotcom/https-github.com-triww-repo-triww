import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function purgeGapempi() {
  console.log("Fetching Gapempi projects from Supabase...");
  const { data: projects, error: err1 } = await supabase.from('projects').select('id, data');
  
  if (err1) {
    console.error("Error fetching projects:", err1.message);
    return;
  }
  
  let deletedProjects = 0;
  for (const item of projects || []) {
      const p = item.data;
      if (p && p.client && p.client.toLowerCase().includes("gapempi")) {
          console.log(`Deleting zombie project: ${item.id} (${p.projectName || 'Unnamed'})`);
          const { error: delErr } = await supabase.from('projects').delete().eq('id', item.id);
          if (delErr) {
              console.error(`Failed to delete project ${item.id}:`, delErr.message);
          } else {
              deletedProjects++;
          }
      }
  }
  console.log(`Successfully deleted ${deletedProjects} zombie Gapempi projects from Supabase.`);

  console.log("Fetching Gapempi clients from Supabase...");
  const { data: clients, error: err2 } = await supabase.from('clients').select('id, data');
  
  if (err2) {
    console.error("Error fetching clients:", err2.message);
    return;
  }
  
  let deletedClients = 0;
  for (const item of clients || []) {
      const c = item.data;
      if (item.id.toLowerCase().includes("gapempi") || (c && c.name && c.name.toLowerCase().includes("gapempi"))) {
          console.log(`Deleting zombie client: ${item.id} (${c?.name || 'Unknown'})`);
          const { error: delErr } = await supabase.from('clients').delete().eq('id', item.id);
          if (delErr) {
              console.error(`Failed to delete client ${item.id}:`, delErr.message);
          } else {
              deletedClients++;
          }
      }
  }
  console.log(`Successfully deleted ${deletedClients} zombie Gapempi clients from Supabase.`);
}

purgeGapempi().catch(console.error);
