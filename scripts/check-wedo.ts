import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data: projects } = await supabase.from('projects').select('id, data');
  console.log("PROJECTS WITH 'WE DO':");
  for (const item of projects || []) {
      const p = item.data;
      if (p?.client && String(p.client).toUpperCase().includes("WE DO")) {
          console.log(`- ${p.id}: ${p.client}`);
      }
  }

  const { data: clients } = await supabase.from('clients').select('id, name');
  console.log("CLIENTS WITH 'WE DO':");
  for (const c of clients || []) {
      if (c.name && String(c.name).toUpperCase().includes("WE DO")) {
          console.log(`- ${c.id}: ${c.name}`);
      }
  }
}

check().catch(console.error);
