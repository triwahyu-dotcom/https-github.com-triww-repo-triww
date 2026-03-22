import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function cleanup() {
  const clientsPath = path.join(process.cwd(), "data/clients.json");
  let clients = JSON.parse(readFileSync(clientsPath, "utf-8"));

  // Remove the bad 'we-do-generali' entry with newline in name
  const before = clients.length;
  clients = clients.filter((c: any) => {
    if (c.id === "we-do-generali") {
      console.log(`Removing from local: ${c.id} (name: ${JSON.stringify(c.name)})`);
      return false;
    }
    return true;
  });
  console.log(`Removed ${before - clients.length} bad entries from clients.json`);

  // Save cleaned file
  writeFileSync(clientsPath, JSON.stringify(clients, null, 2));

  // Delete from Supabase too
  const { error } = await supabase.from('clients').delete().eq('id', 'we-do-generali');
  if (error) {
    console.error("Error deleting we-do-generali from Supabase:", error.message);
  } else {
    console.log("Deleted we-do-generali from Supabase");
  }

  // Sync updated clients.json to Supabase
  let syncCount = 0;
  for (const client of clients) {
    const { error: e2 } = await supabase.from("clients").upsert({ id: client.id, data: client });
    if (!e2) syncCount++;
  }
  console.log(`Synced ${syncCount} clients to Supabase.`);
}

cleanup().catch(console.error);
