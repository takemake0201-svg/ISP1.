-- Supabase SQL Editorで実行する。試験用プロジェクト推奨。
create table if not exists public.ispi_snapshots (
 user_id uuid primary key references auth.users(id) on delete cascade,
 payload jsonb not null,
 updated_at timestamptz not null default now()
);
alter table public.ispi_snapshots enable row level security;
revoke all on public.ispi_snapshots from anon;
grant select, insert, update on public.ispi_snapshots to authenticated;
drop policy if exists "ispi_select_own" on public.ispi_snapshots;
drop policy if exists "ispi_insert_own" on public.ispi_snapshots;
drop policy if exists "ispi_update_own" on public.ispi_snapshots;
create policy "ispi_select_own" on public.ispi_snapshots for select to authenticated using ((select auth.uid()) = user_id);
create policy "ispi_insert_own" on public.ispi_snapshots for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "ispi_update_own" on public.ispi_snapshots for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
