import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hhqhahtyfziynjaaqiad.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhocWhhaHR5ZnppeW5qYWFxaWFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1OTgxODgsImV4cCI6MjA4OTE3NDE4OH0.zsxVSxY7SEoeiEOmjPQrKwiFw-DxX1NTUUQQw_aVzCg';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const updates = [
  { name: "JKTONE SERIES 2026", value: 2000000000, ae: "Echi" },
  { name: "AAUI CUP 2026", value: 5000000000, ae: "Echi" },
  { name: "DOA BERSAMA", value: 4000000000, ae: "Echi" },
  { name: "Launch Event Of Pelita Asa Movie", value: 65000000, ae: "Echi" },
  { name: "ADHYAKSA BILLYARD CUP", value: 300000000, ae: "Echi" },
  { name: "China Taiping Insurance Gathering (LOMBOK)", value: 400000000, ae: "Ari" },
  { name: "UPGRADING KARYAWAN", value: 450000000, ae: "Ubaidulloh" },
  { name: "Munas Sekar", value: 1000000000, ae: "Ubaidulloh" },
  { name: "FUN GOLF sponsored by INDOSAT", value: 500000000, ae: "Ari" },
  { name: "Signing Ceremony TelkomMetra x Fullerton Health", value: 700000000, ae: "Ubaidulloh" },
  { name: "7th Anniversary Prossi Clinic", value: 2000000000, ae: "Ubaidulloh" }
];

async function runUpdate() {
  console.log('Fetching all projects to match names...');
  const { data: projects, error: fetchError } = await supabase
    .from('projects')
    .select('id, data');

  if (fetchError) {
    console.error('Error fetching projects:', fetchError);
    return;
  }

  console.log(`Searching for matches among ${projects.length} projects...`);

  for (const update of updates) {
    // Find project by name (case-insensitive and partial match to be safe)
    const match = projects.find(p => 
      p.data && 
      (p.data.projectName?.toLowerCase() === update.name.toLowerCase() || 
       p.data.projectName?.toLowerCase().includes(update.name.toLowerCase()))
    );

    if (match) {
      console.log(`Found match for: ${update.name}. Updating...`);
      const newData = {
        ...match.data,
        projectValue: update.value,
        projectValueLabel: `Rp ${update.value.toLocaleString('id-ID')}`,
        owners: [update.ae], // Replace with new PIC
        activity: [
          ...(match.data.activity || []),
          { id: `act_${Date.now()}`, type: "update", message: `Value updated to ${update.value} and PIC changed to ${update.ae}`, timestampLabel: new Date().toLocaleString() }
        ]
      };

      const { error: updateError } = await supabase
        .from('projects')
        .update({ data: newData })
        .eq('id', match.id);

      if (updateError) {
        console.error(`Error updating ${update.name}:`, updateError);
      } else {
        console.log(`Successfully updated: ${update.name}`);
      }
    } else {
      console.warn(`No match found for project name: ${update.name}`);
    }
  }

  console.log('Update process complete.');
}

runUpdate();
