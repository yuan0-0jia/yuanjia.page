-- Resume table — singleton row (id=0) holding the full Resume JSON.
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query → paste → Run).
--
-- Read path:  public anon role can SELECT.
-- Write path: authenticated role can INSERT / UPDATE.
-- Fallback:   when data IS NULL, the app falls back to RESUME from app/resume/data.ts.

-- 1. Table
create table if not exists public.resume (
  id int primary key,
  data jsonb,
  updated_at timestamptz not null default now()
);

-- 2. Seed the singleton row (do nothing on conflict so re-running is safe)
insert into public.resume (id, data) values (0, null)
  on conflict (id) do nothing;

-- 3. Row Level Security
alter table public.resume enable row level security;

drop policy if exists "Anyone can read resume" on public.resume;
create policy "Anyone can read resume"
  on public.resume for select
  using (true);

drop policy if exists "Authenticated users can update resume" on public.resume;
create policy "Authenticated users can update resume"
  on public.resume for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can insert resume" on public.resume;
create policy "Authenticated users can insert resume"
  on public.resume for insert
  with check (auth.role() = 'authenticated');

-- 4. Auto-bump updated_at on every UPDATE
create or replace function public.set_resume_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_set_resume_updated_at on public.resume;
create trigger trg_set_resume_updated_at
  before update on public.resume
  for each row
  execute function public.set_resume_updated_at();
