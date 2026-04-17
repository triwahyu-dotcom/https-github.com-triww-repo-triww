// Migration script: Upload all local JSON data to Supabase
// Run: node scripts/migrate-to-supabase.mjs

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'data');

// Load env manually
const envPath = join(ROOT, '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const env = Object.fromEntries(
  envContent.split('\n')
    .filter(line => line.includes('=') && !line.startsWith('#'))
    .map(line => {
      const idx = line.indexOf('=');
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    })
);

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL'];
const SUPABASE_KEY = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function migrateTable(jsonFile, tableName, idField = 'id') {
  const filePath = join(DATA_DIR, jsonFile);
  if (!existsSync(filePath)) {
    console.log(`⚠️  Skipped ${jsonFile} — file not found`);
    return;
  }

  const records = JSON.parse(readFileSync(filePath, 'utf-8'));
  console.log(`\n📦 Migrating ${records.length} records → ${tableName}...`);

  let upserted = 0, failed = 0;
  for (const record of records) {
    const { error } = await supabase
      .from(tableName)
      .upsert({ id: record[idField], data: record }, { onConflict: 'id' });

    if (error) {
      console.error(`  ❌ Failed [${record[idField]}]: ${error.message}`);
      failed++;
    } else {
      upserted++;
    }
  }

  console.log(`  ✅ ${upserted} upserted, ❌ ${failed} failed`);
}

async function main() {
  console.log('🚀 Starting migration to Supabase...');
  console.log(`   URL: ${SUPABASE_URL}`);

  await migrateTable('expense_documents.json', 'finance_documents');
  await migrateTable('rfps.json', 'finance_rfps');
  await migrateTable('projects.json', 'projects');
  await migrateTable('clients.json', 'clients');

  // vendor_state is a single object, not an array
  const vsPath = join(DATA_DIR, 'vendor-state.json');
  if (existsSync(vsPath)) {
    console.log('\n📦 Migrating vendor-state...');
    const state = JSON.parse(readFileSync(vsPath, 'utf-8'));
    const { error } = await supabase
      .from('vendor_state')
      .upsert({ id: 'current', data: state }, { onConflict: 'id' });
    if (error) console.error(`  ❌ vendor_state failed: ${error.message}`);
    else console.log('  ✅ vendor_state upserted');
  }

  console.log('\n🎉 Migration complete!');
}

main().catch(console.error);
