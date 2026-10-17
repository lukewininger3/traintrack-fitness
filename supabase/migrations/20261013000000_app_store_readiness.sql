-- ============================================================================
-- App Store readiness: account deletion, reporting/blocking, feedback,
-- and tightening read access on profiles and comments.
--
-- Run this whole file once in the Supabase dashboard: SQL Editor -> New query.
-- It is safe to re-run.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Blocking
-- ----------------------------------------------------------------------------
create table if not exists public.user_blocks (
  blocker_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.user_blocks enable row level security;

drop policy if exists "Users manage their own blocks (select)" on public.user_blocks;
create policy "Users manage their own blocks (select)" on public.user_blocks
  for select to authenticated using (blocker_id = auth.uid());

drop policy if exists "Users manage their own blocks (insert)" on public.user_blocks;
create policy "Users manage their own blocks (insert)" on public.user_blocks
  for insert to authenticated with check (blocker_id = auth.uid());

drop policy if exists "Users manage their own blocks (delete)" on public.user_blocks;
create policy "Users manage their own blocks (delete)" on public.user_blocks
  for delete to authenticated using (blocker_id = auth.uid());


-- ----------------------------------------------------------------------------
-- 2. Reports (users can file them; only you can read them, from the dashboard)
-- ----------------------------------------------------------------------------
create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid default auth.uid() references auth.users (id) on delete set null,
  -- set null (not cascade) so the report history survives if you ban the user
  reported_user_id uuid references auth.users (id) on delete set null,
  content_type text not null check (content_type in ('user', 'comment', 'workout')),
  content_id text,
  content_snapshot text,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  created_at timestamptz not null default now()
);

alter table public.user_reports enable row level security;

drop policy if exists "Users can file reports" on public.user_reports;
create policy "Users can file reports" on public.user_reports
  for insert to authenticated with check (reporter_id = auth.uid());
-- No select/update/delete policies: reports are only visible to you in the
-- Supabase dashboard (Table Editor -> user_reports).


-- ----------------------------------------------------------------------------
-- 3. Feedback (anyone can send, including signed-out users; only you can read)
-- ----------------------------------------------------------------------------
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users (id) on delete set null,
  category text not null default 'general',
  message text not null check (char_length(message) between 1 and 5000),
  contact_email text,
  app_version text,
  platform text,
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

drop policy if exists "Anyone can send feedback" on public.feedback;
create policy "Anyone can send feedback" on public.feedback
  for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());


-- ----------------------------------------------------------------------------
-- 4. Account deletion
--    Deletes every row the user owns, then the login itself (auth.users).
--    Profile pictures in Storage are removed by the app before calling this.
-- ----------------------------------------------------------------------------
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  t text;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Social rows that reference the user through other column names
  if to_regclass('public.workout_likes') is not null then
    delete from public.workout_likes
      where user_id = uid
         or shared_workout_id in (select id from public.shared_workouts where user_id = uid);
  end if;
  if to_regclass('public.workout_comments') is not null then
    delete from public.workout_comments
      where user_id = uid
         or shared_workout_id in (select id from public.shared_workouts where user_id = uid);
  end if;
  if to_regclass('public.friendships') is not null then
    delete from public.friendships where user_id = uid or friend_id = uid;
  end if;
  if to_regclass('public.friend_requests') is not null then
    delete from public.friend_requests where from_user_id = uid or to_user_id = uid;
  end if;

  -- Every table keyed by user_id (skips any that don't exist in this project)
  foreach t in array array[
    'shared_workouts', 'workouts', 'workout_templates', 'custom_exercises',
    'personal_records', 'weight_entries', 'weight_settings', 'weekly_goals'
  ] loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t and column_name = 'user_id'
    ) then
      execute format('delete from public.%I where user_id = $1', t) using uid;
    end if;
  end loop;

  delete from public.profiles where id = uid;

  -- Finally remove the login. user_blocks / user_reports clean up via FKs.
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;


-- ----------------------------------------------------------------------------
-- 5. Privacy fix: profiles and comments were readable without logging in.
--    Drops every existing SELECT policy on these two tables and replaces them.
-- ----------------------------------------------------------------------------
do $$
declare
  p record;
begin
  for p in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles', 'workout_comments')
      and cmd in ('SELECT', 'ALL')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

-- An ALL policy may have been covering writes too, so make sure owners can
-- still write their own rows.
alter table public.profiles enable row level security;
alter table public.workout_comments enable row level security;

drop policy if exists "Signed-in users can view profiles" on public.profiles;
create policy "Signed-in users can view profiles" on public.profiles
  for select to authenticated using (true);

drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile" on public.profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Helper: can the current user see this shared workout's comments?
-- (owner, or a friend of the owner). Takes text so it works whether ids are
-- uuid or bigint. security definer so it works regardless
-- of the policies on shared_workouts / friendships.
create or replace function public.can_view_shared_workout(sw_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.shared_workouts sw
    where sw.id::text = sw_id
      and (
        sw.user_id = auth.uid()
        or exists (
          select 1 from public.friendships f
          where f.user_id = auth.uid() and f.friend_id = sw.user_id
        )
      )
  );
$$;

revoke all on function public.can_view_shared_workout(text) from public, anon;
grant execute on function public.can_view_shared_workout(text) to authenticated;

drop policy if exists "Friends can view comments" on public.workout_comments;
create policy "Friends can view comments" on public.workout_comments
  for select to authenticated using (
    (user_id = auth.uid() or public.can_view_shared_workout(shared_workout_id::text))
    and not exists (
      select 1 from public.user_blocks b
      where b.blocker_id = auth.uid() and b.blocked_id = workout_comments.user_id
    )
  );

drop policy if exists "Friends can comment" on public.workout_comments;
create policy "Friends can comment" on public.workout_comments
  for insert to authenticated with check (
    user_id = auth.uid() and public.can_view_shared_workout(shared_workout_id::text)
  );

drop policy if exists "Users delete own comments" on public.workout_comments;
create policy "Users delete own comments" on public.workout_comments
  for delete to authenticated using (
    user_id = auth.uid()
    or exists (
      select 1 from public.shared_workouts sw
      where sw.id = shared_workout_id and sw.user_id = auth.uid()
    )
  );


-- Shared workouts: only the owner and their friends (minus blocked users).
-- Only SELECT policies are replaced here so existing write/like policies keep working.
do $$
declare
  p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'shared_workouts' and cmd = 'SELECT'
  loop
    execute format('drop policy %I on public.shared_workouts', p.policyname);
  end loop;
end $$;

alter table public.shared_workouts enable row level security;

drop policy if exists "Owner and friends can view shared workouts" on public.shared_workouts;
create policy "Owner and friends can view shared workouts" on public.shared_workouts
  for select to authenticated using (
    public.can_view_shared_workout(id::text)
    and not exists (
      select 1 from public.user_blocks b
      where b.blocker_id = auth.uid() and b.blocked_id = shared_workouts.user_id
    )
  );


-- ----------------------------------------------------------------------------
-- 6. Review: list every table's policies. Anything granted to "anon" or
--    "public" with qual = true is readable by anyone with the app's key.
-- ----------------------------------------------------------------------------
select tablename, policyname, cmd, roles, qual
from pg_policies
where schemaname = 'public'
order by tablename, cmd;
