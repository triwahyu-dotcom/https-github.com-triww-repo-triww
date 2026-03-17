import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

const PROJECTS_PATH = path.join(process.cwd(), "data/projects.json");

const normalizationMap: Record<string, string> = {
  "DJARUM": "PT DJARUM",
  "DJARUM SUPER": "PT DJARUM",
  "DAIKIN": "PT DAIKIN AIRCONDITIONING INDONESIA"
};

async function normalizeClients() {
  if (!existsSync(PROJECTS_PATH)) {
    console.error("projects.json not found.");
    return;
  }

  const projects = JSON.parse(readFileSync(PROJECTS_PATH, "utf8"));
  let updatedCount = 0;
  const updatedProjects = [];

  for (const project of projects) {
    const currentClient = project.client;
    const normalizedTarget = normalizationMap[currentClient];

    if (normalizedTarget && currentClient !== normalizedTarget) {
      console.log(`Normalizing: ${project.id} | ${currentClient} -> ${normalizedTarget}`);
      project.client = normalizedTarget;
      
      // Update searchableText if it exists
      if (project.searchableText) {
          project.searchableText = project.searchableText.replace(currentClient.toLowerCase(), normalizedTarget.toLowerCase());
      }
      
      updatedCount++;
      updatedProjects.push(project);
    }
  }

  if (updatedCount > 0) {
    writeFileSync(PROJECTS_PATH, JSON.stringify(projects, null, 2));
    console.log(`Updated ${updatedCount} projects in projects.json.`);

    if (supabase) {
      console.log("Updating Supabase...");
      for (const project of updatedProjects) {
        const { error } = await supabase
          .from("projects")
          .upsert({ id: project.id, data: project });
        
        if (error) {
          console.error(`Error updating project ${project.id} in Supabase:`, error.message);
        } else {
          console.log(`Successfully updated project ${project.id} in Supabase.`);
        }
      }
      console.log("Supabase update complete.");
    } else {
      console.log("Supabase not configured, skipping cloud update.");
    }
  } else {
    console.log("No projects found requiring normalization.");
  }
}

normalizeClients().catch(console.error);
