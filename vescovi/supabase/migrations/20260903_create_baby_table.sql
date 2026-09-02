-- Migration: create baby table
-- Date: 2026-09-03

-- Ensure pgcrypto is available for gen_random_uuid()
create extension if not exists "pgcrypto";

create table if not exists public.baby (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  predicted_name text not null,
  predicted_date date,
  predicted_weight numeric,
  predicted_height numeric,
  created_at timestamptz default now()
);

-- Optional: comment on table
comment on table public.baby is 'Pronostics pour le bébé à naître (page /baby)';
