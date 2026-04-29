import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hhqhahtyfziynjaaqiad.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhocWhhaHR5ZnppeW5qYWFxaWFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1OTgxODgsImV4cCI6MjA4OTE3NDE4OH0.zsxVSxY7SEoeiEOmjPQrKwiFw-DxX1NTUUQQw_aVzCg';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runCleanup() {
  console.log('Fetching projects to delete...');
  
  // First, find projects where data->>remark is "Imported from Screenshot"
  const { data, error: fetchError } = await supabase
    .from('projects')
    .select('id, data');

  if (fetchError) {
    console.error('Error fetching projects:', fetchError);
    return;
  }

  const toDelete = data.filter(p => p.data && p.data.remark === "Imported from Screenshot");
  
  if (toDelete.length === 0) {
    console.log('No projects found to delete.');
    return;
  }

  console.log(`Found ${toDelete.length} projects to delete. Cleaning up...`);

  for (const p of toDelete) {
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', p.id);

    if (deleteError) {
      console.error(`Error deleting project ${p.id}:`, deleteError);
    } else {
      console.log(`Successfully deleted: ${p.data.projectName}`);
    }
  }

  console.log('Cleanup complete.');
}

runCleanup();
