import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hhqhahtyfziynjaaqiad.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhocWhhaHR5ZnppeW5qYWFxaWFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1OTgxODgsImV4cCI6MjA4OTE3NDE4OH0.zsxVSxY7SEoeiEOmjPQrKwiFw-DxX1NTUUQQw_aVzCg';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const updates = [
  { dbName: "China Taiping Insurance Gathering", value: 400000000, ae: "Ari" },
  { dbName: "Fun Golf INDOSAT", value: 500000000, ae: "Ari" }
];

async function runUpdate() {
  const { data: projects, error: fetchError } = await supabase
    .from('projects')
    .select('id, data');

  if (fetchError) {
    console.error('Error:', fetchError);
    return;
  }

  for (const update of updates) {
    const match = projects.find(p => p.data && p.data.projectName === update.dbName);

    if (match) {
      const newData = {
        ...match.data,
        projectValue: update.value,
        projectValueLabel: `Rp ${update.value.toLocaleString('id-ID')}`,
        owners: [update.ae],
        activity: [
          ...(match.data.activity || []),
          { id: `act_${Date.now()}`, type: "update", message: `Value updated and PIC changed to ${update.ae}`, timestampLabel: new Date().toLocaleString() }
        ]
      };

      await supabase.from('projects').update({ data: newData }).eq('id', match.id);
      console.log(`Updated: ${update.dbName}`);
    }
  }
}

runUpdate();
