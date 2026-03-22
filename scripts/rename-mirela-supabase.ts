import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://hhqhahtyfziynjaaqiad.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhocWhhaHR5ZnppeW5qYWFxaWFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1OTgxODgsImV4cCI6MjA4OTE3NDE4OH0.zsxVSxY7SEoeiEOmjPQrKwiFw-DxX1NTUUQQw_aVzCg"
);

async function main() {
  // -------------------------------------------------------
  // 1. Update clients: find rows where data->>'name' = MIRELLA
  // -------------------------------------------------------
  console.log("=== Fetching all clients ===");
  const { data: allClients, error: ce } = await supabase.from("clients").select("id, data");
  if (ce) { console.error("clients fetch error:", ce.message); return; }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mirellaCLients = (allClients ?? []).filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (r: any) => typeof r.data?.name === "string" && r.data.name.toUpperCase() === "MIRELLA"
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  console.log(`Found ${mirellaCLients.length} client(s) with name MIRELLA:`, mirellaCLients.map((r: any) => r.id));

  for (const row of mirellaCLients) {
    const updated = { ...row.data, name: "MIRELA", aliases: (row.data.aliases ?? []).map((a: string) => a === "MIRELLA" ? "MIRELA" : a) };
    const { error } = await supabase.from("clients").update({ data: updated }).eq("id", row.id);
    if (error) console.error(`Failed to update client ${row.id}:`, error.message);
    else console.log(`✅ Updated client ${row.id} name -> MIRELA`);
  }

  // Also update the client ID if it's "mirella"
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mirellaById = (allClients ?? []).filter((r: any) => r.id === "mirella");
  for (const row of mirellaById) {
    // Insert with new id, delete old
    const updated = { ...row.data, name: "MIRELA" };
    const { error: insertErr } = await supabase.from("clients").upsert({ id: "mirela", data: updated });
    if (insertErr) console.error("Failed to insert new mirela client:", insertErr.message);
    else {
      const { error: delErr } = await supabase.from("clients").delete().eq("id", "mirella");
      if (delErr) console.error("Failed to delete old mirella client:", delErr.message);
      else console.log("✅ Renamed client id: mirella -> mirela");
    }
  }

  // -------------------------------------------------------
  // 2. Update projects: find rows where data->>'client' = MIRELLA
  // -------------------------------------------------------
  console.log("\n=== Fetching all projects ===");
  const { data: allProjects, error: pe } = await supabase.from("projects").select("id, data");
  if (pe) { console.error("projects fetch error:", pe.message); return; }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mirellaProjects = (allProjects ?? []).filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (r: any) => typeof r.data?.client === "string" && r.data.client.toUpperCase() === "MIRELLA"
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  console.log(`Found ${mirellaProjects.length} project(s) with client MIRELLA:`, mirellaProjects.map((r: any) => r.id));

  for (const row of mirellaProjects) {
    const updated = { ...row.data, client: "MIRELA" };
    const { error } = await supabase.from("projects").update({ data: updated }).eq("id", row.id);
    if (error) console.error(`Failed to update project ${row.id}:`, error.message);
    else console.log(`✅ Updated project ${row.id} client -> MIRELA`);
  }

  console.log("\nDone!");
}

main();
