const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase env vars missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  console.log('Checking "projects" table...');
  const { data, error } = await supabase.from('projects').select('*').limit(1);
  if (error) {
    console.error('Error fetching from "projects":', error.message);
    if (error.code === '42P01') {
      console.log('RESULT: Table "projects" DOES NOT EXIST.');
    }
  } else {
    console.log('RESULT: Table "projects" exists. Data count:', data.length);
  }

  console.log('\nChecking "clients" table...');
  const { data: cData, error: cError } = await supabase.from('clients').select('*').limit(1);
  if (cError) {
    console.error('Error fetching from "clients":', cError.message);
  } else {
    console.log('RESULT: Table "clients" exists. Data count:', cData.length);
  }
}

check();
