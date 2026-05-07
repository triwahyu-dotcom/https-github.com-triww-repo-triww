/**
 * scripts/migrate-apply.ts
 *
 * Applies vendor classification decisions from review JSON to the live
 * vendor_state document in Supabase.
 *
 * STRICT MATCH: vendor names in review JSON must exactly match names in DB
 * (case-insensitive, whitespace-trimmed). Any mismatch aborts the script —
 * NO fuzzy matching, NO silent skip.
 *
 * Usage:
 *   cd vendor-management-app
 *
 *   # Dry-run (default): preview diff, no DB write
 *   npx tsx --env-file=.env.local scripts/migrate-apply.ts
 *
 *   # Commit (writes to Supabase)
 *   npx tsx --env-file=.env.local scripts/migrate-apply.ts --commit
 *
 * Required:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 *   File: scripts/data/vendor_classifications_final.json
 *
 * Behavior:
 *   - Loads review JSON
 *   - Strict-matches each name to a DB vendor
 *   - For approved: updates entityType, relationshipType, version=2,
 *     updatedAt timestamp; preserves all other fields
 *   - For deleted: moves to data.archived_vendors[] with archived_at +
 *     archive_reason + archive_note
 *   - Aborts with diagnostics if ANY name doesn't match
 *   - Generates `scripts/migration-log_<ts>.json` even on dry-run
 */

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Decision = "approve" | "delete" | "needs_info" | null;

interface ReviewClassification {
  name: string;
  source_table: "high" | "medium" | "low" | "delete";
  decision: Decision;
  final_entity: "badan_usaha" | "perorangan" | null;
  final_relationship: string | null;
  sys_suggestion: string;
  ops_correction: string;
  issues: { sev: string; msg: string }[];
  note: string;
}

interface ReviewFile {
  generated_at: string;
  total_vendors: number;
  summary: { approved: number; deleted: number; needs_info: number; unreviewed: number };
  classifications: ReviewClassification[];
}

interface DBVendor {
  id?: string;
  name?: string;
  email?: string;
  type?: string;
  entityType?: string;
  relationshipType?: string;
  version?: number;
  updatedAt?: string;
  [k: string]: unknown;
}

interface VendorStateData {
  vendors: DBVendor[];
  archived_vendors?: (DBVendor & {
    archived_at?: string;
    archive_reason?: string;
    archive_note?: string;
  })[];
  [k: string]: unknown;
}

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

function fail(msg: string): never {
  console.error(`\n✗ ${msg}\n`);
  return process.exit(1);
}

const COMMIT = process.argv.includes("--commit");
const MODE = COMMIT ? "COMMIT" : "DRY-RUN";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) fail("NEXT_PUBLIC_SUPABASE_URL not set");
if (!SERVICE_ROLE_KEY) fail("SUPABASE_SERVICE_ROLE_KEY not set");

const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const REVIEW_PATH = path.join(
  process.cwd(),
  "scripts",
  "data",
  "vendor_classifications_final.json"
);

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function normalizeName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function archiveReasonFor(c: ReviewClassification): string {
  if (c.source_table === "delete") return "test_dummy";
  const lower = c.name.toLowerCase();
  if (lower.includes("manunggal sumber daya")) return "duplicate";
  if (lower.includes("alana")) return "out_of_scope_venue";
  return "manual";
}

function asJsonPretty(o: unknown): string {
  return JSON.stringify(o, null, 2);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n═══════════════════════════════════════════════════════════`);
  console.log(`  JUARA VMS — Migration Apply Script`);
  console.log(`  Mode: ${MODE}${COMMIT ? "" : "  (no DB write — preview only)"}`);
  console.log(`═══════════════════════════════════════════════════════════\n`);

  // 1. Load review JSON
  if (!fs.existsSync(REVIEW_PATH)) {
    fail(
      `Review file not found:\n  ${REVIEW_PATH}\n\nPut your exported JSON there as 'vendor_classifications_final.json'.`
    );
  }
  const review: ReviewFile = JSON.parse(fs.readFileSync(REVIEW_PATH, "utf-8"));
  console.log(`✓ Loaded review file`);
  console.log(`  Generated: ${review.generated_at}`);
  console.log(
    `  Summary: ${review.summary.approved} approved, ${review.summary.deleted} deleted, ${review.summary.needs_info} needs_info, ${review.summary.unreviewed} unreviewed`
  );

  if (review.summary.unreviewed > 0) {
    fail(
      `Review has ${review.summary.unreviewed} unreviewed vendors. Complete review first.`
    );
  }
  if (review.summary.needs_info > 0) {
    console.log(
      `  ⚠ ${review.summary.needs_info} vendors marked needs_info — they will be SKIPPED (left as-is)`
    );
  }

  // 2. Fetch current vendor_state
  console.log(`\n→ Fetching current vendor_state from Supabase...`);
  const { data: row, error } = await supabase
    .from("vendor_state")
    .select("*")
    .eq("id", "current")
    .single();
  if (error) fail(`Supabase fetch error: ${error.message}`);
  if (!row) fail("No row with id='current'");

  const currentData: VendorStateData = row.data ?? { vendors: [] };
  const dbVendors = currentData.vendors ?? [];
  const dbArchived = currentData.archived_vendors ?? [];
  console.log(`  Active vendors in DB: ${dbVendors.length}`);
  console.log(`  Archived vendors in DB: ${dbArchived.length}`);

  // 3. Build name index for strict matching
  const dbByName = new Map<string, { idx: number; vendor: DBVendor }>();
  const dupes: string[] = [];
  dbVendors.forEach((v, idx) => {
    const key = normalizeName(v.name ?? "");
    if (!key) return;
    if (dbByName.has(key)) {
      dupes.push(v.name ?? "<no name>");
    } else {
      dbByName.set(key, { idx, vendor: v });
    }
  });
  if (dupes.length) {
    console.log(`  ⚠ DB has ${dupes.length} duplicate name(s): ${dupes.join(", ")}`);
    console.log(`    First-occurrence wins for matching.`);
  }

  // 4. Strict-match every classification
  console.log(`\n→ Matching ${review.classifications.length} review entries to DB...`);
  type Match = { c: ReviewClassification; dbIdx: number; dbVendor: DBVendor };
  const matches: Match[] = [];
  const unmatched: ReviewClassification[] = [];

  for (const c of review.classifications) {
    const key = normalizeName(c.name);
    const found = dbByName.get(key);
    if (found) {
      matches.push({ c, dbIdx: found.idx, dbVendor: found.vendor });
    } else {
      unmatched.push(c);
    }
  }

  if (unmatched.length > 0) {
    console.error(`\n✗ ${unmatched.length} review entries have NO matching DB vendor:\n`);
    for (const c of unmatched) {
      console.error(`  - "${c.name}"  (table: ${c.source_table}, decision: ${c.decision})`);
    }
    console.error(
      `\nABORTING. Fix names in review JSON or DB and try again.\n` +
        `Hint: check whitespace, casing differences, or whether vendor was renamed.\n`
    );
    process.exit(1);
  }

  console.log(`✓ All ${matches.length} review entries matched to DB vendors`);

  // 5. Build mutation plan
  console.log(`\n→ Building mutation plan...\n`);

  const newVendors: DBVendor[] = [...dbVendors];
  const newArchived = [...dbArchived];
  const now = new Date().toISOString();

  const planLog: Array<{
    name: string;
    action: "update" | "archive" | "skip_needs_info";
    before?: { entityType?: string; relationshipType?: string; type?: string };
    after?: { entityType?: string; relationshipType?: string };
    archive_reason?: string;
    archive_note?: string;
    note?: string;
  }> = [];

  let countUpdate = 0;
  let countArchive = 0;
  let countSkipped = 0;

  for (const m of matches) {
    const { c, dbIdx, dbVendor } = m;

    if (c.decision === "needs_info") {
      countSkipped++;
      planLog.push({
        name: c.name,
        action: "skip_needs_info",
        note: c.note || undefined,
      });
      continue;
    }

    if (c.decision === "approve") {
      const before = {
        entityType: dbVendor.entityType,
        relationshipType: dbVendor.relationshipType,
        type: dbVendor.type,
      };
      const updated: DBVendor = {
        ...dbVendor,
        entityType: c.final_entity!,
        relationshipType: c.final_relationship!,
        version: 2,
        updatedAt: now,
      };
      newVendors[dbIdx] = updated;
      countUpdate++;

      planLog.push({
        name: c.name,
        action: "update",
        before,
        after: {
          entityType: updated.entityType,
          relationshipType: updated.relationshipType,
        },
        note: c.note || undefined,
      });
      continue;
    }

    if (c.decision === "delete") {
      const reason = archiveReasonFor(c);
      const archiveNote = `From migration ${now}: source_table=${c.source_table}`;
      newArchived.push({
        ...dbVendor,
        archived_at: now,
        archive_reason: reason,
        archive_note: archiveNote,
      });
      // Mark for removal — null out, filter at end
      newVendors[dbIdx] = null as unknown as DBVendor;
      countArchive++;

      planLog.push({
        name: c.name,
        action: "archive",
        archive_reason: reason,
        archive_note: archiveNote,
        note: c.note || undefined,
      });
      continue;
    }
  }

  // Filter out nulls (archived vendors removed from active list)
  const finalVendors = newVendors.filter((v): v is DBVendor => v !== null);

  // 6. Print plan summary
  console.log(`Plan summary:`);
  console.log(`  UPDATE (entityType + relationshipType set):  ${countUpdate}`);
  console.log(`  ARCHIVE (move to archived_vendors[]):         ${countArchive}`);
  console.log(`  SKIP (needs_info):                            ${countSkipped}`);
  console.log(`\n  Active vendors: ${dbVendors.length} → ${finalVendors.length}`);
  console.log(`  Archived:       ${dbArchived.length} → ${newArchived.length}`);

  // 7. Show diff sample
  console.log(`\n→ Sample diffs (first 5 updates):\n`);
  const updateSamples = planLog.filter((p) => p.action === "update").slice(0, 5);
  for (const p of updateSamples) {
    console.log(`  ${p.name}`);
    console.log(
      `    type:             ${p.before?.type ?? "—"}`
    );
    console.log(
      `    entityType:       ${p.before?.entityType ?? "—"}  →  ${p.after?.entityType}`
    );
    console.log(
      `    relationshipType: ${p.before?.relationshipType ?? "—"}  →  ${p.after?.relationshipType}`
    );
    console.log();
  }

  console.log(`→ Archive list:\n`);
  for (const p of planLog.filter((p) => p.action === "archive")) {
    console.log(`  ${p.name}  [${p.archive_reason}]`);
  }

  // 8. Write log file (always, even on dry-run)
  const pad = (n: number) => String(n).padStart(2, "0");
  const tsNow = new Date();
  const tsStr = `${tsNow.getFullYear()}-${pad(tsNow.getMonth() + 1)}-${pad(
    tsNow.getDate()
  )}_${pad(tsNow.getHours())}${pad(tsNow.getMinutes())}`;
  const logPath = path.join(
    process.cwd(),
    "scripts",
    `migration-log_${MODE.toLowerCase()}_${tsStr}.json`
  );
  fs.writeFileSync(
    logPath,
    asJsonPretty({
      mode: MODE,
      generated_at: tsNow.toISOString(),
      review_file: REVIEW_PATH,
      summary: {
        update: countUpdate,
        archive: countArchive,
        skip_needs_info: countSkipped,
        active_before: dbVendors.length,
        active_after: finalVendors.length,
        archived_before: dbArchived.length,
        archived_after: newArchived.length,
      },
      plan: planLog,
    }),
    "utf-8"
  );
  console.log(`\n✓ Migration log written: ${logPath}`);

  // 9. Commit or stop
  if (!COMMIT) {
    console.log(
      `\n──────────────────────────────────────────────────────────────`
    );
    console.log(`DRY-RUN complete. No DB changes made.`);
    console.log(`Review the log file, then re-run with --commit:\n`);
    console.log(`  npx tsx --env-file=.env.local scripts/migrate-apply.ts --commit\n`);
    return;
  }

  // 10. Sanity check before commit
  if (finalVendors.length + newArchived.length !== dbVendors.length + dbArchived.length) {
    fail(
      `Sanity check FAILED: vendor count mismatch.\n` +
        `  Before: ${dbVendors.length} active + ${dbArchived.length} archived = ${
          dbVendors.length + dbArchived.length
        }\n` +
        `  After:  ${finalVendors.length} active + ${newArchived.length} archived = ${
          finalVendors.length + newArchived.length
        }`
    );
  }

  console.log(`\n→ Writing to Supabase...`);
  const newData: VendorStateData = {
    ...currentData,
    vendors: finalVendors,
    archived_vendors: newArchived,
  };

  const { error: updErr } = await supabase
    .from("vendor_state")
    .update({ data: newData, updated_at: now })
    .eq("id", "current");

  if (updErr) fail(`Supabase update error: ${updErr.message}`);

  console.log(`\n✓ COMMIT successful.`);
  console.log(`  ${countUpdate} vendors updated to V2 schema`);
  console.log(`  ${countArchive} vendors moved to archive`);
  console.log(`  Verify in admin dashboard: /vendors\n`);
}

main().catch((err) => {
  console.error("\n✗ Unhandled error:", err);
  process.exit(1);
});
