import { config } from "dotenv";
import path from "path";
config({ path: path.join(process.cwd(), ".env.local") });

import { supabase } from "../src/lib/supabase";
import { classifyVendor } from "./lib/migration-helpers";
import type { Vendor } from "../src/lib/vendor/types";

async function main() {
  console.log("\n=== JUARA VENDOR MIGRATION DRY-RUN ===\n");
  console.log("This is a PREVIEW. No changes will be saved.\n");
  
  if (!supabase) {
    console.error("Supabase client not initialized. Check .env.local");
    process.exit(1);
  }
  
  // Read vendor_state
  const { data, error } = await supabase
    .from("vendor_state")
    .select("data")
    .eq("id", "current")
    .single();
  
  if (error || !data) {
    console.error("Failed to read vendor_state:", error);
    process.exit(1);
  }
  
  const vendors: Vendor[] = (data as any).data?.vendors || [];
  console.log(`Total vendors in DB: ${vendors.length}\n`);
  
  // Classify all
  const results = vendors.map(classifyVendor);
  
  // Group by action
  const toDelete = results.filter(r => r.action === "delete");
  const toClassify = results.filter(r => r.action === "classify");
  const toSkip = results.filter(r => r.action === "skip");
  
  // Print summary
  console.log("=== SUMMARY ===");
  console.log(`To DELETE (dummy/test): ${toDelete.length}`);
  console.log(`To CLASSIFY (legacy): ${toClassify.length}`);
  console.log(`SKIP (already V2): ${toSkip.length}`);
  console.log("");
  
  // Print delete list
  if (toDelete.length > 0) {
    console.log("=== ENTRIES TO DELETE ===");
    toDelete.forEach((r, i) => {
      console.log(`${i+1}. "${r.vendor.name}" (${r.vendor.email || "no email"}) — ${r.reason}`);
    });
    console.log("");
  }
  
  // Print classification by confidence
  const high = toClassify.filter(r => r.confidence === "high");
  const medium = toClassify.filter(r => r.confidence === "medium");
  const low = toClassify.filter(r => r.confidence === "low");
  
  console.log("=== HIGH CONFIDENCE (will auto-classify) ===");
  high.forEach((r, i) => {
    console.log(
      `${i+1}. "${r.vendor.name}" → ${r.newEntityType} / ${r.newRelationshipType}`
    );
    console.log(`   reason: ${r.reason}`);
  });
  console.log(`\nTotal HIGH: ${high.length}\n`);
  
  console.log("=== MEDIUM CONFIDENCE (will classify but flag for review) ===");
  medium.forEach((r, i) => {
    console.log(
      `${i+1}. "${r.vendor.name}" → ${r.newEntityType} / ${r.newRelationshipType} [REVIEW]`
    );
    console.log(`   reason: ${r.reason}`);
  });
  console.log(`\nTotal MEDIUM: ${medium.length}\n`);
  
  console.log("=== LOW CONFIDENCE (will classify but URGENT review needed) ===");
  low.forEach((r, i) => {
    console.log(
      `${i+1}. "${r.vendor.name}" → ${r.newEntityType} / ${r.newRelationshipType} [URGENT REVIEW]`
    );
    console.log(`   reason: ${r.reason}`);
  });
  console.log(`\nTotal LOW: ${low.length}\n`);
  
  // Distribution by relationship type
  console.log("=== DISTRIBUTION BY RELATIONSHIP TYPE ===");
  const distribution: Record<string, number> = {};
  toClassify.forEach(r => {
    const key = r.newRelationshipType || "unknown";
    distribution[key] = (distribution[key] || 0) + 1;
  });
  Object.entries(distribution).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });
  console.log("");
  
  console.log("=== END DRY-RUN ===");
  console.log("\nNo changes were saved. Review output above.");
  console.log("If everything looks good, run: npx tsx scripts/migrate-legacy-vendors-apply.ts");
  console.log("");
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
