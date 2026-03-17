import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const PROJECTS_PATH = path.join(process.cwd(), "data/projects.json");
const CLIENTS_PATH = path.join(process.cwd(), "data/clients.json");

const mirellaClient = {
  id: "mirella",
  name: "MIRELLA",
  aliases: ["MIRELA"],
  type: "BRAND",
  category: "Client",
  projects: []
};

async function fixMirella() {
  console.log("Adding MIRELLA to local clients.json...");
  if (existsSync(CLIENTS_PATH)) {
    const clients = JSON.parse(readFileSync(CLIENTS_PATH, "utf8"));
    const exists = clients.some((c: any) => c.id === "mirella");
    if (!exists) {
      clients.push(mirellaClient);
      writeFileSync(CLIENTS_PATH, JSON.stringify(clients, null, 2));
      console.log("Done adding to clients.json");
    }
  }

  console.log("Adding MIRELLA to Supabase clients table...");
  await supabase.from("clients").upsert({ id: "mirella", data: mirellaClient });

  console.log("Updating projects in local projects.json...");
  if (existsSync(PROJECTS_PATH)) {
    const projects = JSON.parse(readFileSync(PROJECTS_PATH, "utf8"));
    let updated = 0;
    for (const p of projects) {
        if (p.client && p.client.toUpperCase().includes("MIREL")) {
            p.client = "MIRELLA";
            updated++;
        }
    }
    if (updated > 0) {
        writeFileSync(PROJECTS_PATH, JSON.stringify(projects, null, 2));
        console.log(`Updated ${updated} projects in projects.json`);
    }
  }

  console.log("Updating projects in Supabase...");
  const { data: projData } = await supabase.from("projects").select("id, data");
  let supUpdated = 0;
  for (const item of projData || []) {
      const p = item.data;
      if (p.client && p.client.toUpperCase().includes("MIREL") && p.client !== "MIRELLA") {
          p.client = "MIRELLA";
          await supabase.from("projects").upsert({ id: item.id, data: p });
          supUpdated++;
      }
  }
  console.log(`Updated ${supUpdated} projects in Supabase.`);
}

fixMirella().catch(console.error);
