-- Jalankan SQL ini di Supabase SQL Editor:
-- https://supabase.com/dashboard/project/hhqhahtyfziynjaaqiad/sql/new

CREATE TABLE IF NOT EXISTS vendor_identity_state (
  id text PRIMARY KEY,
  data jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_vendor_links (
  id text PRIMARY KEY,
  data jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_vendor_shortlists (
  id text PRIMARY KEY,
  data jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE vendor_identity_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_vendor_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_vendor_shortlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "allow_all_vendor_identity_state" ON vendor_identity_state FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "allow_all_project_vendor_links" ON project_vendor_links FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "allow_all_project_vendor_shortlists" ON project_vendor_shortlists FOR ALL USING (true) WITH CHECK (true);
