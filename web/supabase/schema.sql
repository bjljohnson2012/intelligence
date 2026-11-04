-- Free Supabase Postgres. Apply when a project exists. Do not invent keys.
-- Dates on gtm_milestones are nullable: the 2027 pack does not date quarters.
-- Putting a guessed quarter in start_date would be a false record.

create extension if not exists vector;

create table if not exists document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_name text not null,
  source_url text,
  page_number integer,
  content text not null,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create table if not exists competitor_matrix (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  tier text,
  strengths text[],
  weaknesses text[],
  feature_parity_json jsonb,
  logo_status text not null default 'explicit_unknown',
  last_updated timestamptz not null default now()
);

create table if not exists gtm_milestones (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  stream text,
  status text,
  start_date date,
  end_date date,
  quarter text,
  owner text,
  detail text,
  source text not null
);

create index if not exists document_chunks_embedding_idx
  on document_chunks using hnsw (embedding vector_cosine_ops);

create table if not exists auth_rate_buckets (
  bucket_key text primary key,
  count integer not null,
  reset_at timestamptz not null
);

create table if not exists auth_codes (
  email text primary key,
  code_hash text not null,
  code_salt text not null,
  expires_at timestamptz not null,
  attempts integer not null
);

create table if not exists auth_last_sent (
  email text primary key,
  sent_at timestamptz not null
);
