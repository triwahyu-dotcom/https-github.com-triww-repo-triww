import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const DATA_DIR = path.join(process.cwd(), "data");

async function migrateFile(filename: string, tableName: string, idField: string | null = "id") {
  const filePath = path.join(DATA_DIR, filename);
  if (!existsSync(filePath)) {
    console.log(`File ${filename} not found, skipping.`);
    return;
  }

  console.log(`Migrating ${filename} to table ${tableName}...`);
  const content = JSON.parse(readFileSync(filePath, "utf8"));
  
  if (Array.isArray(content)) {
    for (const item of content) {
      const id = idField ? item[idField] : "current";
      const { error } = await supabase.from(tableName).upsert({ id, data: item });
      if (error) console.error(`Error migrating item ${id}:`, error.message);
    }
  } else {
    const { error } = await supabase.from(tableName).upsert({ id: "current", data: content });
    if (error) console.error(`Error migrating ${filename}:`, error.message);
  }
  console.log(`Finished migrating ${filename}.`);
}

async function main() {
  await migrateFile("projects.json", "projects", "id");
  await migrateFile("clients.json", "clients", "id");
  await migrateFile("vendor-state.json", "vendor_state", null);
  await migrateFile("vendor-ops-state.json", "vendor_ops_state", null);
}

main().catch(console.error);
