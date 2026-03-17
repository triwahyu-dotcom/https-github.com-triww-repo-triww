import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const SERVICE_LINE_MAPPING: Record<string, string> = {
  "em": "Event Management",
  "event managament": "Event Management",
  "event management": "Event Management",
  "sem": "Sport Event Management",
  "afm": "AFM",
  "test": "Other",
  "tba": "Other",
  "-": "Other"
};

async function normalizeSupabaseServiceLines() {
  console.log("Fetching projects directly from Supabase...");
  const { data: dbProjects, error: fetchError } = await supabase.from('projects').select('id, data');
  
  if (fetchError || !dbProjects) {
    console.error("Failed to fetch from Supabase:", fetchError);
    return;
  }

  const projectsData = dbProjects.map(row => row.data);
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
         // Default capitalization for others
         if (newSl && newSl === newSl.toLowerCase()) {
             newSl = newSl.split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
         }
      }

      if (p.serviceLine !== newSl) {
          console.log(`Normalizing '${p.serviceLine}' -> '${newSl}' (Project: ${p.projectName || p.id})`);
          p.serviceLine = newSl;
          projectsToUpdate.push(p);
          updatedCount++;
      }
  }

  if (updatedCount === 0) {
      console.log("No service lines needed normalization in Supabase.");
      return;
  }

  console.log(`\nUpdating ${updatedCount} projects in Supabase...`);
  
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

normalizeSupabaseServiceLines().catch(console.error);
