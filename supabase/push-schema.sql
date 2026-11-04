-- Run in Supabase SQL Editor after reviewing. Does not touch ISP-I snapshots.
create table if not exists public.ispi_push_subscriptions (
 id bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 endpoint text not null unique check (length(endpoint) between 30 and 2048),
 p256dh text not null check (length(p256dh) between 40 and 200),
 auth_key text not null check (length(auth_key) between 12 and 100),
 created_at timestamptz not null default now(),
 last_test_at timestamptz
);
create index if not exists ispi_push_subscriptions_user_idx on public.ispi_push_subscriptions(user_id);
alter table public.ispi_push_subscriptions enable row level security;
revoke all on public.ispi_push_subscriptions from anon;
grant select, insert, update, delete on public.ispi_push_subscriptions to authenticated;
grant usage, select on sequence public.ispi_push_subscriptions_id_seq to authenticated;
drop policy if exists "push_select_own" on public.ispi_push_subscriptions;
create policy "push_select_own" on public.ispi_push_subscriptions for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists "push_insert_own" on public.ispi_push_subscriptions;
create policy "push_insert_own" on public.ispi_push_subscriptions for insert to authenticated with check ((select auth.uid())=user_id);
drop policy if exists "push_update_own" on public.ispi_push_subscriptions;
create policy "push_update_own" on public.ispi_push_subscriptions for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists "push_delete_own" on public.ispi_push_subscriptions;
create policy "push_delete_own" on public.ispi_push_subscriptions for delete to authenticated using ((select auth.uid())=user_id);
