-- Supabase security-linter remediation for yuanjia.page
-- Run once in the Supabase SQL editor: Dashboard -> SQL -> New query -> paste -> Run.
-- Idempotent: safe to re-run.
--
-- Owner identity used to gate writes: user id (auth.uid())
--   6f96b524-d6d7-4912-8d26-f52fd29d6538
-- We gate on the user id (the JWT `sub` claim), not the email claim: `email`
-- was not resolving in the storage RLS context, while `sub` is always present.
--
-- Findings addressed here (SQL):
--   #2 rls_policy_always_true        -> public.site writes locked to the owner
--   #3 public_bucket_allows_listing  -> drop broad SELECT + lock photos writes
--   #1 function_search_path_mutable  -> pin set_resume_updated_at search_path
-- Findings handled in the dashboard (see bottom of file):
--   #4 auth_leaked_password_protection
--
-- NB: the avatar upload also required a CODE change. The @supabase/ssr cookie
-- client sends Storage uploads as `anon` (the storage-api doesn't honor the
-- forwarded user token, though PostgREST does), so no owner-scoped
-- `to authenticated` policy can pass. app/_lib/auth-action.ts uploads with a
-- Supabase secret key (sb_secret_…, the modern service_role replacement) via
-- SUPABASE_SECRET_KEY — bypassing RLS — gated by an explicit OWNER_ID check.
-- These storage policies remain as a backstop. Table writes were unaffected
-- (PostgREST forwards the user token already).


-- =========================================================================
-- #2  Lock writes to public.site to the owner only            (the real fix)
-- -------------------------------------------------------------------------
-- Before: policy "site write" used USING (true) / WITH CHECK (true) for the
-- `authenticated` role. Because login() uses Google OAuth with no allowlist,
-- *any* Google account that signs in is `authenticated` and could overwrite
-- bio / resume / avatar. We now require the owner's user id.
-- Public read stays open and is intentionally NOT touched.
-- =========================================================================

drop policy if exists "site write" on public.site;
create policy "site write"
  on public.site for update
  to authenticated
  using      (auth.uid() = '6f96b524-d6d7-4912-8d26-f52fd29d6538')
  with check (auth.uid() = '6f96b524-d6d7-4912-8d26-f52fd29d6538');

drop policy if exists "site insert" on public.site;
create policy "site insert"
  on public.site for insert
  to authenticated
  with check (auth.uid() = '6f96b524-d6d7-4912-8d26-f52fd29d6538');


-- =========================================================================
-- #3  Stop the public `photos` bucket from being listable, and lock writes
-- -------------------------------------------------------------------------
-- Avatars are read by their public object URL (/storage/v1/object/public/...),
-- which bypasses RLS for public buckets, so removing the SELECT policy does NOT
-- break image loading -- it only stops clients enumerating every filename.
-- The original write policies ("Access to all 1io9m69_0/1/3") only checked
-- bucket_id with no identity test, so anyone could upload / overwrite / delete.
-- =========================================================================

-- Drop the broad listing policy (public buckets don't need it).
drop policy if exists "Access to all 1io9m69_2" on storage.objects;

drop policy if exists "Access to all 1io9m69_1" on storage.objects;
drop policy if exists "photos owner insert" on storage.objects;
create policy "photos owner insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'photos' and auth.uid() = '6f96b524-d6d7-4912-8d26-f52fd29d6538');

drop policy if exists "Access to all 1io9m69_0" on storage.objects;
drop policy if exists "photos owner update" on storage.objects;
create policy "photos owner update"
  on storage.objects for update
  to authenticated
  using      (bucket_id = 'photos' and auth.uid() = '6f96b524-d6d7-4912-8d26-f52fd29d6538')
  with check (bucket_id = 'photos' and auth.uid() = '6f96b524-d6d7-4912-8d26-f52fd29d6538');

drop policy if exists "Access to all 1io9m69_3" on storage.objects;
drop policy if exists "photos owner delete" on storage.objects;
create policy "photos owner delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'photos' and auth.uid() = '6f96b524-d6d7-4912-8d26-f52fd29d6538');


-- =========================================================================
-- #1  Pin the search_path of set_resume_updated_at
-- -------------------------------------------------------------------------
-- The function body only calls now() (resolved from pg_catalog, which is
-- always implicitly first), so an empty search_path is safe and removes the
-- role-mutable-search_path warning.
-- =========================================================================

alter function public.set_resume_updated_at() set search_path = '';


-- =========================================================================
-- Verification
-- =========================================================================
-- select policyname, cmd, qual, with_check
--   from pg_policies where schemaname = 'public' and tablename = 'site';
-- select policyname, cmd, qual, with_check from pg_policies
--   where schemaname = 'storage' and tablename = 'objects';
-- select proname, proconfig from pg_proc where proname = 'set_resume_updated_at';


-- =========================================================================
-- #4  Leaked-password protection (dashboard only -- not SQL)
-- -------------------------------------------------------------------------
-- This site uses Google OAuth only; there are no passwords, so the finding is
-- effectively moot. Either option clears it:
--   (a) STRONGER: Dashboard -> Authentication -> Sign In / Providers ->
--       Email -> off. Removes password attack surface and clears the warning.
--   (b) Dashboard -> Authentication -> Policies (Password) ->
--       "Leaked password protection" -> on.
-- =========================================================================
