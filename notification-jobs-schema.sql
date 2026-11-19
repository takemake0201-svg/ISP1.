-- Run after push-schema.sql. Notification metadata only; no task titles or notes.
create table if not exists public.ispi_notification_jobs (
 id bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 source_type text not null check (source_type in ('todo','schedule')),
 source_id text not null check (length(source_id) between 1 and 200),
 notify_at timestamptz not null,
 status text not null default 'pending' check (status in ('pending','processing','sent','cancelled','failed')),
 updated_at timestamptz not null default now(),
 unique(user_id,source_type,source_id)
);
create index if not exists ispi_notification_due on public.ispi_notification_jobs(notify_at) where status='pending';
alter table public.ispi_notification_jobs enable row level security;
revoke all on public.ispi_notification_jobs from anon;
grant select,insert,update on public.ispi_notification_jobs to authenticated;
grant usage,select on sequence public.ispi_notification_jobs_id_seq to authenticated;
drop policy if exists notification_own_select on public.ispi_notification_jobs;
create policy notification_own_select on public.ispi_notification_jobs for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists notification_own_insert on public.ispi_notification_jobs;
create policy notification_own_insert on public.ispi_notification_jobs for insert to authenticated with check ((select auth.uid())=user_id);
drop policy if exists notification_own_update on public.ispi_notification_jobs;
create policy notification_own_update on public.ispi_notification_jobs for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
-- A server-side function is needed to claim due jobs atomically; no client permission.
create or replace function public.ispi_claim_due_notifications(batch_size int default 50)
returns setof public.ispi_notification_jobs language plpgsql security definer set search_path=public as $$
begin
 return query
 with due as (
   select j.id from public.ispi_notification_jobs j
   where j.status='pending' and j.notify_at<=now()
   order by j.notify_at asc limit least(greatest(batch_size,1),100)
   for update skip locked
 )
 update public.ispi_notification_jobs j set status='processing',updated_at=now()
 from due where j.id=due.id returning j.*;
end $$;
revoke all on function public.ispi_claim_due_notifications(int) from public,anon,authenticated;
-- Only service_role may claim due jobs.
grant execute on function public.ispi_claim_due_notifications(int) to service_role;
