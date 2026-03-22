import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const PROJECTS_PATH = path.join(process.cwd(), "data/projects.json");
const CLIENTS_PATH = path.join(process.cwd(), "data/clients.json");

async function investigate() {
  console.log("=== LOCAL DATA ===");
  if (existsSync(CLIENTS_PATH)) {
      const clients = JSON.parse(readFileSync(CLIENTS_PATH, "utf8"));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const gapempiClients = (clients as any[]).filter((c: any) => c.name.toLowerCase().includes("gapempi") || (c.id && c.id.toLowerCase().includes("gapempi")));
      console.log(`Local Clients containing 'Gapempi': ${JSON.stringify(gapempiClients, null, 2)}`);
  }
  
  if (existsSync(PROJECTS_PATH)) {
      const projects = JSON.parse(readFileSync(PROJECTS_PATH, "utf8"));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const gapempiProjects = (projects as any[]).filter((p: any) => p.client && p.client.toLowerCase().includes("gapempi"));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      console.log(`Local Projects containing 'Gapempi': ${gapempiProjects.length} found. IDs: ${gapempiProjects.map((p: any) => p.id).join(', ')}`);
  }

  console.log("\n=== SUPABASE DATA ===");
  const { data: supClients } = await supabase.from('clients').select('id, data');
  const supGapempiClients = (supClients || []).filter(c => {
      const name = c.data?.name?.toLowerCase() || '';
      return name.includes("gapempi") || c.id.toLowerCase().includes("gapempi");
  });
  console.log(`Supabase Clients containing 'Gapempi':`);
  supGapempiClients.forEach(c => console.log(`ID: ${c.id}, Name: ${c.data?.name}`));

  const { data: supProjects } = await supabase.from('projects').select('id, data');
  const supGapempiProjects = (supProjects || []).filter(p => {
      const client = p.data?.client?.toLowerCase() || '';
      return client.includes("gapempi");
  });
  console.log(`Supabase Projects containing 'Gapempi': ${supGapempiProjects.length} found.`);
  supGapempiProjects.forEach(p => console.log(`Project ID: ${p.id}, Status: ${p.data?.status || 'unknown'}`));
}

investigate().catch(console.error);
