import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkKaltara() {
  const targetId = '1773652233930';
  console.log(`Checking ID ${targetId} in Supabase...`);
  
  const { data: byId, error: err1 } = await supabase.from('projects').select('*').eq('id', targetId);
  const { data: byDataId, error: err2 } = await supabase.from('projects').select('*').filter('data->>id', 'eq', targetId);

  if (err1 || err2) {
    console.error("Errors:", { err1, err2 });
  }

  console.log("Found by Row ID:", byId?.length || 0);
  console.log("Found by Data ID:", byDataId?.length || 0);

  if (byId && byId.length > 0) {
    console.log("Full data from Row ID match:", JSON.stringify(byId[0], null, 2));
  }
}

checkKaltara();
