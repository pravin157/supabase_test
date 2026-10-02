-- ============================================================================
-- Supabase Schema for User Profiles & Storage
-- Run this script in the Supabase Dashboard > SQL Editor
-- ============================================================================

-- 1. Create the `profiles` table
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Enable Row-Level Security (RLS)
alter table public.profiles enable row level security;

-- 3. RLS Policies
-- Allow anyone to read profiles
drop policy if exists "Allow public read access" on public.profiles;
create policy "Allow public read access"
  on public.profiles
  for select
  using (true);

-- Allow profile creation
drop policy if exists "Allow public insert access" on public.profiles;
create policy "Allow public insert access"
  on public.profiles
  for insert
  with check (true);

-- Allow profile update
drop policy if exists "Allow public update access" on public.profiles;
create policy "Allow public update access"
  on public.profiles
  for update
  using (true);

-- 4. Storage Bucket Configuration for 'avatars'
-- Inserts the avatars bucket if it doesn't already exist
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- Allow public read access to avatar files
drop policy if exists "Public Avatar Access" on storage.objects;
create policy "Public Avatar Access"
  on storage.objects
  for select
  using (bucket_id = 'avatars');

-- Allow public uploads to avatar bucket
drop policy if exists "Public Avatar Upload" on storage.objects;
create policy "Public Avatar Upload"
  on storage.objects
  for insert
  with check (bucket_id = 'avatars');
