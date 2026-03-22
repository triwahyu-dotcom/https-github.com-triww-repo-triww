import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugProjects() {
  const { data: projects } = await supabase.from('projects').select('id, data');
  
  for (const item of projects || []) {
      const p = item.data;
      // Print ANY project that has WE DO in the id or in the client name
      if (item.id.includes("we-do")) {
          console.log(`=== Project ID: ${item.id} ===`);
          console.log(`client: ${JSON.stringify(p?.client)}`);
          console.log(`projectName: ${JSON.stringify(p?.projectName)}`);
          console.log(`---`);
      }
  }
}

debugProjects().catch(console.error);
