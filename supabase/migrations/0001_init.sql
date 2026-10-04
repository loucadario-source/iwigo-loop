-- IWIGO Loop — schéma initial
create extension if not exists "pgcrypto";

create type pillar as enum ('acquisition','fidelisation','actualite');
create type content_format as enum ('carousel','reel_script','static_post');
create type content_status as enum ('pending_review','changes_requested','approved','published','rejected','failed');
create type lead_category as enum ('permis_b','boite_auto','conduite_accompagnee','cpf','recuperation_points','autre');
create type lead_stage as enum ('nouveau','contacte','inscrit','perdu');
create type lead_source as enum ('ig_dm','ig_comment','ig_story_reply','fb_messenger','fb_comment','meta_lead_ad');

-- Charte générée par l'Agent Brand Scout
create table brand_profiles (
  id uuid primary key default gen_random_uuid(),
  version int not null,
  profile jsonb not null,            -- palette, fonts, logos, tone, sources
  is_active boolean not null default false,
  created_at timestamptz default now()
);
create unique index brand_one_active on brand_profiles (is_active) where is_active;

-- Configurées par l'Agent Contexte Local
create table agencies (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  city text not null,
  postal_code text not null,
  department text not null,
  covered_cities jsonb not null default '[]',   -- [{name, postal_code}]
  telegram_chat_id text,
  created_at timestamptz default now()
);

create table trends (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  source_url text,
  title text not null,
  summary text,
  pillar pillar not null,
  relevance_score int check (relevance_score between 0 and 100),
  suggested_angle text,
  is_regulatory boolean default false,
  dedup_hash text unique not null,
  status text not null default 'new' check (status in ('new','used','ignored')),
  detected_at timestamptz default now()
);
create index on trends (status, relevance_score desc);

create table contents (
  id uuid primary key default gen_random_uuid(),
  trend_id uuid references trends(id) on delete set null,
  parent_id uuid references contents(id),
  version int not null default 1,
  pillar pillar not null,
  format content_format not null,
  agency_slug text references agencies(slug),
  title text not null,
  body jsonb not null,
  caption text,
  hashtags text[] default '{}',
  cta text,
  sources text[] default '{}',
  needs_fact_check boolean default false,
  brand_check jsonb,
  brand_version int,
  status content_status not null default 'pending_review',
  telegram_message_id bigint,
  reviewed_by text,
  reviewed_at timestamptz,
  review_note text,
  approved_by text,
  scheduled_at timestamptz,
  published_at timestamptz,
  meta_post_ids jsonb,
  prompt_snapshot jsonb,
  created_at timestamptz default now(),
  constraint publish_requires_approval
    check (status <> 'published' or approved_by is not null)
);
create index on contents (status, created_at desc);

create table leads (
  id uuid primary key default gen_random_uuid(),
  meta_user_id text,
  source lead_source not null,
  full_name text, phone text, email text, city text,
  agency_slug text references agencies(slug),
  category lead_category not null default 'autre',
  category_confidence real,
  intent_summary text,
  stage lead_stage not null default 'nouveau',
  first_message text,
  meta_leadgen_id text unique,
  created_at timestamptz default now(),
  last_interaction_at timestamptz default now(),
  contacted_at timestamptz,
  enrolled_at timestamptz,
  unique (meta_user_id, source)
);
create index on leads (stage, agency_slug);

create table lead_interactions (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  direction text check (direction in ('in','out')),
  channel lead_source not null,
  message text,
  raw jsonb,
  created_at timestamptz default now()
);

create table agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent text not null,
  status text not null,
  items int default 0,
  detail jsonb,
  error text,
  started_at timestamptz default now(),
  finished_at timestamptz
);

-- Tout passe par la service_role côté serveur : on verrouille l'accès anon.
alter table brand_profiles enable row level security;
alter table agencies enable row level security;
alter table trends enable row level security;
alter table contents enable row level security;
alter table leads enable row level security;
alter table lead_interactions enable row level security;
alter table agent_runs enable row level security;
