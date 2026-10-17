-- ============================================================================
-- workout_likes was readable without logging in. Restrict reads to signed-in
-- users who can see the liked workout (owner or friends), and keep
-- like/unlike working for your own rows.
--
-- Run once in the Supabase dashboard: SQL Editor -> New query. Safe to re-run.
-- Requires 20261013000000_app_store_readiness.sql (for can_view_shared_workout).
-- ============================================================================

do $$
declare
  p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'workout_likes' and cmd in ('SELECT', 'ALL')
  loop
    execute format('drop policy %I on public.workout_likes', p.policyname);
  end loop;
end $$;

alter table public.workout_likes enable row level security;

drop policy if exists "View likes on visible workouts" on public.workout_likes;
create policy "View likes on visible workouts" on public.workout_likes
  for select to authenticated using (
    user_id = auth.uid() or public.can_view_shared_workout(shared_workout_id::text)
  );

drop policy if exists "Users like as themselves" on public.workout_likes;
create policy "Users like as themselves" on public.workout_likes
  for insert to authenticated with check (
    user_id = auth.uid() and public.can_view_shared_workout(shared_workout_id::text)
  );

drop policy if exists "Users remove own likes" on public.workout_likes;
create policy "Users remove own likes" on public.workout_likes
  for delete to authenticated using (user_id = auth.uid());
