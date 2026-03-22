import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { readFileSync, writeFileSync } from "fs";
import * as path from "path";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const CLIENTS_DB_PATH = path.join(process.cwd(), "data/clients.json");
const PROJECTS_DB_PATH = path.join(process.cwd(), "data/projects.json");

async function registerVirtualClients() {
  console.log("Loading local data...");
  const clientsData = JSON.parse(readFileSync(CLIENTS_DB_PATH, "utf-8"));
  const projectsData = JSON.parse(readFileSync(PROJECTS_DB_PATH, "utf-8"));

  // Create a map of existing strict clients by lowercase name and aliases
  const officialNames = new Set<string>();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  clientsData.forEach((c: any) => {
    officialNames.add(c.name.toLowerCase().trim());
    if (c.aliases) {
      c.aliases.forEach((a: string) => officialNames.add(a.toLowerCase().trim()));
    }
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const newClientsToRegister = new Map<string, any>();

  // Find clients in projects that aren't official yet
  console.log("Scanning projects for unregistered clients...");
  for (const p of projectsData) {
      const clientName = (p.client || "").trim();
      if (!clientName || clientName.toUpperCase() === "UNKNOWN") continue;
      
      const normalizedName = clientName.toLowerCase();
      
      if (!officialNames.has(normalizedName)) {
          if (!newClientsToRegister.has(normalizedName)) {
             const newId = normalizedName.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

             // Build new client record
             const newClient = {
                 id: newId,
                 name: clientName, // Keep original casing for display
                 type: "brand",
                 category: p.category || "BRAND",
                 relation: p.relation || "Brand",
                 health: "on_track",
                 status: "active",
                 totalProjectValue: 0,
                 totalProjectValueLabel: "Rp 0",
                 projectCount: 0,
                 activeProjectCount: 0,
                 contacts: [],
                 projects: []
             };
          
             newClientsToRegister.set(normalizedName, newClient);
             console.log(`Found unregistered client: "${clientName}" -> generated ID: ${newId}`);
          }
      }
  }

  if (newClientsToRegister.size === 0) {
      console.log("No new clients need to be registered.");
      return;
  }

  console.log(`\nRegistering ${newClientsToRegister.size} new clients...`);
  
  const newClientsList = Array.from(newClientsToRegister.values());
  const updatedClientsJson = [...clientsData, ...newClientsList];
  
  // 1. Update local JSON
  console.log("Writing to local clients.json...");
  writeFileSync(CLIENTS_DB_PATH, JSON.stringify(updatedClientsJson, null, 2));

  // 2. Update Supabase
  console.log("Pushing new clients to Supabase...");
  let successCount = 0;
  for (const client of newClientsList) {
       const { error } = await supabase.from('clients').upsert({ id: client.id, data: client });
       if (error) {
           console.error(`Failed to register ${client.name} in Supabase:`, error.message);
       } else {
           successCount++;
       }
  }

  console.log(`Successfully registered ${successCount}/${newClientsList.length} clients to Supabase.`);
  console.log("Done!");
}

registerVirtualClients().catch(console.error);
