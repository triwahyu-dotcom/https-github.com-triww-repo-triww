import { config } from "dotenv";
import path from "path";
config({ path: path.join(process.cwd(), ".env.local") });

import { supabase } from "../src/lib/supabase";
import { classifyVendor } from "./lib/migration-helpers";
import type { Vendor } from "../src/lib/vendor/types";
import * as readline from "readline";
import * as fs from "fs";

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  console.log("\n=== JUARA VENDOR MIGRATION APPLY ===\n");
  console.log("WARNING: This will modify the database.\n");
  
  const confirm1 = await ask("Type 'YES' to continue (anything else cancels): ");
  if (confirm1 !== "YES") {
    console.log("Cancelled.");
    return;
  }
  
  if (!supabase) {
    console.error("Supabase client not initialized.");
    return;
  }
  
  // Read current state
  const { data, error } = await supabase
    .from("vendor_state")
    .select("data, updated_at")
    .eq("id", "current")
    .single();
  
  if (error || !data) {
    console.error("Failed to read vendor_state:", error);
    return;
  }
  
  // Backup
  const backupDir = path.join(process.cwd(), "backups");
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `vendor_state_${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));
  console.log(`✓ Backup saved to: ${backupPath}\n`);
  
  const state = (data as any).data;
  const vendors: Vendor[] = state.vendors || [];
  
  // Classify
  const results = vendors.map(classifyVendor);
  const toDelete = results.filter(r => r.action === "delete");
  const toClassify = results.filter(r => r.action === "classify");
  
  console.log(`Plan:`);
  console.log(`  - DELETE: ${toDelete.length} dummy entries`);
  console.log(`  - CLASSIFY: ${toClassify.length} legacy vendors`);
  console.log("");
  
  const confirm2 = await ask("Type 'APPLY' to proceed (anything else cancels): ");
  if (confirm2 !== "APPLY") {
    console.log("Cancelled. Backup retained.");
    return;
  }
  
  // Build new vendors array
  const newVendors: Vendor[] = [];
  for (const result of results) {
    if (result.action === "delete") continue; // skip
    if (result.action === "skip") {
      newVendors.push(result.vendor);
      continue;
    }
    // classify
    newVendors.push({
      ...result.vendor,
      entityType: result.newEntityType,
      relationshipType: result.newRelationshipType,
      submissionMetadata: {
        formVersion: "v2.0-migrated",
        submittedAt: result.vendor.createdAt || new Date().toISOString(),
      },
      // Flag for review (store in a custom field)
      ...(result.flagForReview ? { needsReview: true } : {}),
      updatedAt: new Date().toISOString(),
    } as any);
  }
  
  state.vendors = newVendors;
  
  // Save
  const { error: updateError } = await supabase
    .from("vendor_state")
    .update({ data: state, updated_at: new Date().toISOString() })
    .eq("id", "current");
  
  if (updateError) {
    console.error("Failed to save:", updateError);
    console.log(`Backup is at: ${backupPath}`);
    return;
  }
  
  console.log(`\n✓ Migration complete.`);
  console.log(`  - Total vendors before: ${vendors.length}`);
  console.log(`  - Total vendors after: ${newVendors.length}`);
  console.log(`  - Deleted: ${toDelete.length}`);
  console.log(`  - Classified: ${toClassify.length}`);
  console.log(`\nBackup at: ${backupPath}`);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
