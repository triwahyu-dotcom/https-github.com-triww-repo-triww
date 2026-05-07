# JUARA VMS — Migration Runbook (P2)

Migration `vendor_state` legacy → V2 schema using reviewed classifications.

---

## Files

```
scripts/
  backup-vendor-state.ts                       # Step 1: backup
  migrate-apply.ts                              # Step 2 & 3: dry-run / commit
  data/
    vendor_classifications_final.json           # Reviewed decisions (input)
  backups/                                      # Auto-created by backup script
    vendor_state_2026-05-07_HHmm.json
  migration-log_dry-run_2026-05-07_HHmm.json   # Auto-created by dry-run
  migration-log_commit_2026-05-07_HHmm.json    # Auto-created by commit
```

---

## Pre-flight

### 1. Add service role key to `.env.local`

```bash
# .env.local (existing)
NEXT_PUBLIC_SUPABASE_URL=https://hhqhahtyfziynjaaqiad.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# ADD THIS LINE:
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

Get the value from:
https://supabase.com/dashboard/project/hhqhahtyfziynjaaqiad/settings/api
→ Project API keys → `service_role` (red/secret)

### 2. Confirm `.env.local` is gitignored

```bash
grep -F ".env.local" .gitignore
```

If output is empty, add `.env.local` to `.gitignore`. **Do not commit the service role key.**

### 3. Confirm review JSON is in place

```bash
ls -lh scripts/data/vendor_classifications_final.json
```

Expected: ~25 KB file with 81 classifications.

---

## Run sequence

### Step 1 — Backup

```bash
cd vendor-management-app
npx tsx --env-file=.env.local scripts/backup-vendor-state.ts
```

Expected output:
```
✓ Fetched vendor_state row
  Active vendors: 81
  Archived vendors: 0
✓ Backup written:
  scripts/backups/vendor_state_2026-05-07_HHmm.json
```

**Do not skip this step.** If anything goes wrong, this file is your only recovery path.

### Step 2 — Dry-run

```bash
npx tsx --env-file=.env.local scripts/migrate-apply.ts
```

This:
- Loads the review JSON
- Strict-matches every name against DB (aborts on any mismatch)
- Builds the mutation plan (UPDATE / ARCHIVE / SKIP)
- Prints summary + sample diffs
- Writes log to `scripts/migration-log_dry-run_*.json`
- **Does NOT write to Supabase**

Expected outcome:
```
Plan summary:
  UPDATE:  72
  ARCHIVE: 9
  SKIP:    0
```

If you see name mismatches → script aborts with the unmatched list. Fix in review JSON or rename in DB, then re-run.

### Step 3 — Review the dry-run log

Open `scripts/migration-log_dry-run_<timestamp>.json` and verify:

- All 9 archived vendors are correct (5 test/dummy + Jakarta + PT Manunggal duplicate + GServices + ALANA)
- Sample updates look right (entityType + relationshipType set)
- Counts: 72 update + 9 archive = 81 total

Spot-check a few specific vendors to make sure their entity/relationship matches what you set in the review tool.

### Step 4 — Commit

```bash
npx tsx --env-file=.env.local scripts/migrate-apply.ts --commit
```

This:
- Re-fetches vendor_state (in case it changed)
- Re-runs the same plan
- Writes the new `data` JSONB to Supabase
- Logs to `scripts/migration-log_commit_*.json`

Expected output:
```
✓ COMMIT successful.
  72 vendors updated to V2 schema
  9 vendors moved to archive
```

### Step 5 — Verify

1. Open admin dashboard: http://localhost:3000/vendors (or production)
2. Check vendor count: should show 72 (not 81)
3. Spot-check: click a few vendors to verify they show V2 chips (entityType + relationshipType)
4. Specifically verify:
   - Aldo Printing → perorangan + vendor_supply
   - BLACK Rndr → perorangan + vendor_service
   - PT. Sewatoilet Jakarta → badan_usaha + vendor_rental
5. The archive list (9 vendors) is in `data.archived_vendors` — not visible in admin yet (that's a future UI add)

---

## Rollback

If anything looks wrong after commit:

```bash
# Find latest backup
ls -lt scripts/backups/

# Manual rollback via Supabase dashboard SQL editor:
# UPDATE vendor_state
# SET data = '<paste contents of backup .row.data here>'::jsonb
# WHERE id = 'current';
```

Or write a `restore-from-backup.ts` script if needed (ask Claude).

---

## Safeguards baked into the script

- **Strict name matching** — case-insensitive trim, but no fuzzy. Mismatch aborts.
- **Sanity check before commit** — vendor count before vs after must balance (active + archived).
- **Auto-log on every run** — both dry-run and commit produce a JSON log for audit.
- **Service role used** — no RLS surprises, no silent failures.
- **Preserves all other vendor fields** — script only touches `entityType`, `relationshipType`, `version`, `updatedAt`. Email, bank info, documents, etc. untouched.

---

## What this migration does NOT do

- Does NOT set `umkm_status` for `perorangan + vendor_supply` vendors (defaulted to undefined → effectively `unknown`). Tim ops follow-up later via admin dashboard.
- Does NOT set `collective_info` for kolektif vendors (BLACK Rndr, SRI LESTARI RENT CAR, etc.). Add via admin dashboard or Form V2 later.
- Does NOT update Form V1 page — that's the cutover step (P4) after Form V2 visual overhaul (P1).
