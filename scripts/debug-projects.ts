import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { readProjects } from "../src/lib/project/store";

async function main() {
  const projects = await readProjects();
  console.log("=== PROJECT AUDIT ===");
  console.log(`Total projects in Supabase: ${projects.length}`);
  
  let leadsSum = 0;
  let ongoingSum = 0;
  let billedSum = 0;
  let failedSum = 0;
  let othersSum = 0;
  
  let leadsCount = 0;
  let ongoingCount = 0;
  let billedCount = 0;
  let failedCount = 0;
  let othersCount = 0;

  for (const p of projects) {
    const val = typeof p.projectValue === 'number' ? p.projectValue : parseFloat((p.projectValue || "0").toString().replace(/[^0-9.-]+/g,"") || "0");
    const stage = p.currentStage;
    
    if (["lead", "pitching"].includes(stage)) {
      leadsSum += val;
      leadsCount++;
    } else if (["negotiation", "execution", "reporting", "finance"].includes(stage)) {
      ongoingSum += val;
      ongoingCount++;
    } else if (stage === "completed") {
      billedSum += val;
      billedCount++;
    } else if (stage === "lost") {
      failedSum += val;
      failedCount++;
    } else {
      othersSum += val;
      othersCount++;
      console.log(`Other Project: ${p.projectName} (Stage: ${stage}, Value: ${val})`);
    }
  }

  console.log("\nCounts:");
  console.log(`Leads: ${leadsCount}`);
  console.log(`Ongoing: ${ongoingCount}`);
  console.log(`Billed: ${billedCount}`);
  console.log(`Failed (Lost): ${failedCount}`);
  console.log(`Others: ${othersCount}`);
  
  console.log("\nSums:");
  console.log(`Leads Value: Rp ${leadsSum.toLocaleString('id-ID')}`);
  console.log(`Ongoing Value: Rp ${ongoingSum.toLocaleString('id-ID')}`);
  console.log(`Billed Value: Rp ${billedSum.toLocaleString('id-ID')}`);
  console.log(`Failed Value: Rp ${failedSum.toLocaleString('id-ID')}`);
  console.log(`Others Value: Rp ${othersSum.toLocaleString('id-ID')}`);
  
  const sumOfCategories = leadsSum + ongoingSum + billedSum;
  const grandTotal = projects.reduce((sum, p) => sum + (typeof p.projectValue === 'number' ? p.projectValue : parseFloat((p.projectValue || "0").toString().replace(/[^0-9.-]+/g,"") || "0")), 0);
  
  console.log("\nCalculated Sum of 3 Main Cards: Rp " + sumOfCategories.toLocaleString('id-ID'));
  console.log("Grand Total in DB: Rp " + grandTotal.toLocaleString('id-ID'));
  console.log("Difference: Rp " + (grandTotal - sumOfCategories).toLocaleString('id-ID'));
}

main().catch(console.error);
