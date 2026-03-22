import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { readFileSync } from "node:fs";
import path from "node:path";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fix() {
  // 1. Fix BCA project searchableText newline
  console.log("Fixing BCA project searchableText...");
  const { data: bcaItem } = await supabase.from('projects')
    .select('id, data')
    .eq('id', 'we-do-bca-bca-wealth-summit-2026-4db27bd7')
    .single();

  if (bcaItem) {
    const p = bcaItem.data;
    if (p.searchableText?.includes("\n")) {
      p.searchableText = p.searchableText.replace(/\n/g, " ").toLowerCase();
      console.log("Fixed searchableText:", p.searchableText);
      await supabase.from('projects').upsert({ id: bcaItem.id, data: p });
    } else {
      console.log("BCA searchableText already clean:", p.searchableText);
    }
  }

  // 2. Sync updated clients.json to Supabase
  console.log("Syncing updated clients.json to Supabase...");
  const clientsPath = path.join(process.cwd(), "data/clients.json");
  const clients = JSON.parse(readFileSync(clientsPath, "utf-8"));
  
  let syncedCount = 0;
  for (const client of clients) {
    const { error } = await supabase.from("clients").upsert({ id: client.id, data: client });
    if (error) {
      console.error(`Error syncing client ${client.id}:`, error.message);
    } else {
      syncedCount++;
    }
  }
  console.log(`Synced ${syncedCount} clients to Supabase.`);
}

fix().catch(console.error);
