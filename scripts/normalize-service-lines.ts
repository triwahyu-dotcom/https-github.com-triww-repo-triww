import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { readFileSync, writeFileSync } from "fs";
import * as path from "path";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const PROJECTS_DB_PATH = path.join(process.cwd(), "data/projects.json");

const SERVICE_LINE_MAPPING: Record<string, string> = {
  "em": "Event Management",
  "event managament": "Event Management",
  "sem": "Sport Event Management",
};

async function normalizeServiceLines() {
  console.log("Loading local projects data...");
  const projectsData = JSON.parse(readFileSync(PROJECTS_DB_PATH, "utf-8"));

  let updatedCount = 0;
  const projectsToUpdate: any[] = [];

  for (const p of projectsData) {
      if (!p.serviceLine) continue;
      
      const currentSlLower = p.serviceLine.trim().toLowerCase();
      let newSl = p.serviceLine.trim();

      // Apply mapping 
      if (SERVICE_LINE_MAPPING[currentSlLower]) {
        newSl = SERVICE_LINE_MAPPING[currentSlLower];
      } else {
         // Default capitalization for others if they are just lowercase
         if (newSl && newSl === newSl.toLowerCase()) {
             newSl = newSl.split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
         }
      }

      if (p.serviceLine !== newSl) {
          console.log(`Normalizing '${p.serviceLine}' -> '${newSl}' (Project: ${p.projectName})`);
          p.serviceLine = newSl;
          projectsToUpdate.push(p);
          updatedCount++;
      }
  }

  if (updatedCount === 0) {
      console.log("No service lines needed normalization.");
      return;
  }

  console.log(`\nUpdating ${updatedCount} projects...`);
  
  // 1. Update local JSON
  console.log("Writing to local projects.json...");
  writeFileSync(PROJECTS_DB_PATH, JSON.stringify(projectsData, null, 2));

  // 2. Update Supabase
  console.log("Pushing updated projects to Supabase...");
  let successCount = 0;
  for (const project of projectsToUpdate) {
       const { error } = await supabase.from('projects').upsert({ id: project.id, data: project });
       if (error) {
           console.error(`Failed to update project ${project.id} in Supabase:`, error.message);
       } else {
           successCount++;
       }
  }

  console.log(`Successfully updated ${successCount}/${updatedCount} projects in Supabase.`);
  console.log("Done!");
}

normalizeServiceLines().catch(console.error);
