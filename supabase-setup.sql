-- SQL to create tables for Project Tracker Juara

-- Projects table
create table if not exists projects (
  id text primary key,
  data jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Clients table
create table if not exists clients (
  id text primary key,
  data jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Vendor state table (stores all vendors, contacts, etc. as one blob)
create table if not exists vendor_state (
  id text primary key default 'current',
  data jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Vendor ops state table (stores profiles, logic, etc. as one blob)
create table if not exists vendor_ops_state (
  id text primary key default 'current',
  data jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Note: In a real production app, it's better to use relational tables,
-- but this JSONB approach is best for migrating from file-based storage quickly.

-- Tabel untuk Akses Tim (Multi-user)
create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password text not null,
  name text,
  role text default 'admin',
  created_at timestamp with time zone default now()
);

-- Tambahkan user admin default ke team_members
insert into team_members (email, password, name)
values 
  ('admin@juara.local', 'juaraadmin', 'Super Admin'),
  ('widya@juaraevent.id', 'jbbs8899', 'widya'),
  ('leony@juaraevent.id', 'jbbs8899', 'leony'),
  ('ubaid@juaraevent.id', 'jbbs8899', 'ubaid'),
  ('sindy@juaraevent.id', 'jbbs8899', 'sindy')
on conflict (email) do nothing;

-- Finance Documents table (PO, SPK, CA, dll)
create table if not exists finance_documents (
  id text primary key,
  data jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Finance RFPs table
create table if not exists finance_rfps (
  id text primary key,
  data jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
