import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase environment variables are missing in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifySetup() {
  console.log('🔍 Verifying Supabase setup...');

  // 1. Check projects table
  const { count: projectCount, error: projectError } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true });

  if (projectError) {
    console.error('❌ Error accessing projects table:', projectError.message);
  } else {
    console.log('✅ projects table is accessible. Count:', projectCount);
  }

  // 2. Check team_members table
  const { data: teamMembers, error: teamError } = await supabase
    .from('team_members')
    .select('email, name');

  if (teamError) {
    console.error('❌ Error accessing team_members table:', teamError.message);
    if (teamError.code === '42P01') {
      console.log('💡 Table "team_members" does not exist. Please run supabase-setup.sql in Supabase SQL Editor.');
    }
  } else {
    console.log('✅ team_members table is accessible.');
    console.log('👥 Team Members found:');
    teamMembers?.forEach(tm => console.log(`   - ${tm.name} (${tm.email})`));
  }

  // 3. Check vendor_state table
  const { error: vendorError } = await supabase
    .from('vendor_state')
    .select('id')
    .limit(1);

  if (vendorError) {
    console.error('❌ Error accessing vendor_state table:', vendorError.message);
  } else {
    console.log('✅ vendor_state table is accessible.');
  }

  console.log('\n✨ Verification complete.');
}

verifySetup().catch(err => {
  console.error('💥 Verification failed:', err);
  process.exit(1);
});
