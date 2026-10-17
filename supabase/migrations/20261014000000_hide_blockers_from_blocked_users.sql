-- ============================================================================
-- Hide a user's profile from anyone they have blocked, so the blocked user
-- can't find them in search or open their profile.
--
-- The blocker can still see the people they blocked (needed for the
-- Blocked Users screen in Settings).
--
-- Run once in the Supabase dashboard: SQL Editor -> New query. Safe to re-run.
-- ============================================================================

-- True when `profile_owner` has blocked the current user. security definer
-- because user_blocks rows are only readable by the blocker.
create or replace function public.has_blocked_me(profile_owner uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_blocks b
    where b.blocker_id = profile_owner and b.blocked_id = auth.uid()
  );
$$;

revoke all on function public.has_blocked_me(uuid) from public, anon;
grant execute on function public.has_blocked_me(uuid) to authenticated;

drop policy if exists "Signed-in users can view profiles" on public.profiles;
create policy "Signed-in users can view profiles" on public.profiles
  for select to authenticated using (not public.has_blocked_me(id));

-- Also refuse friend requests to someone who has blocked you. "as restrictive"
-- means this applies on top of whatever insert policy already exists.
drop policy if exists "No requests to users who blocked you" on public.friend_requests;
create policy "No requests to users who blocked you" on public.friend_requests
  as restrictive for insert to authenticated
  with check (not public.has_blocked_me(to_user_id));
