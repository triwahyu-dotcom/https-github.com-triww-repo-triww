/**
 * scripts/backup-vendor-state.ts
 *
 * Backs up the entire vendor_state row from Supabase to a timestamped JSON file.
 * Run this BEFORE any migration script.
 *
 * Usage:
 *   cd vendor-management-app
 *   npx tsx --env-file=.env.local scripts/backup-vendor-state.ts
 *
 * Output:
 *   scripts/backups/vendor_state_YYYY-MM-DD_HHmm.json
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

function fail(msg: string): never {
  console.error(`\n✗ ${msg}\n`);
  return process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) fail("NEXT_PUBLIC_SUPABASE_URL not set in .env.local");
if (!SERVICE_ROLE_KEY) {
  fail(
    "SUPABASE_SERVICE_ROLE_KEY not set in .env.local. Get it from:\n" +
      "  https://supabase.com/dashboard/project/<project>/settings/api\n" +
      "  → 'service_role' key (red/secret)"
  );
}

const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  console.log("→ Connecting to Supabase...");
  console.log(`  URL: ${SUPABASE_URL}`);

  const { data, error } = await supabase
    .from("vendor_state")
    .select("*")
    .eq("id", "current")
    .single();

  if (error) fail(`Supabase error: ${error.message}`);
  if (!data) fail("No row found with id='current' in vendor_state");

  const vendors = data.data?.vendors ?? [];
  const archived = data.data?.archived_vendors ?? [];

  console.log(`✓ Fetched vendor_state row`);
  console.log(`  Active vendors: ${vendors.length}`);
  console.log(`  Archived vendors: ${archived.length}`);

  // Build timestamp: 2026-05-07_1547
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
    now.getDate()
  )}_${pad(now.getHours())}${pad(now.getMinutes())}`;

  const backupDir = path.join(process.cwd(), "scripts", "backups");
  fs.mkdirSync(backupDir, { recursive: true });

  const filename = `vendor_state_${ts}.json`;
  const filepath = path.join(backupDir, filename);

  fs.writeFileSync(
    filepath,
    JSON.stringify(
      {
        backed_up_at: now.toISOString(),
        source: { url: SUPABASE_URL, table: "vendor_state", id: "current" },
        row: data,
      },
      null,
      2
    ),
    "utf-8"
  );

  const sizeKB = (fs.statSync(filepath).size / 1024).toFixed(1);
  console.log(`\n✓ Backup written:`);
  console.log(`  ${filepath}`);
  console.log(`  ${sizeKB} KB`);
  console.log(`\nKeep this file safe before running migration.`);
}

main().catch((err) => {
  console.error("\n✗ Unhandled error:", err);
  process.exit(1);
});
