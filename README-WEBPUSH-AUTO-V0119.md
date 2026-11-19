# ISP-Ⅰ v0.11.9 — ToDo / Schedule Web Push reservations

## What changed
- ToDo deadline minus 60 minutes; schedule start minus 30 minutes.
- Completion, deletion and date changes update/cancel notification reservations.
- Only source type, local record ID, notification time, and account ID go to Supabase. Task names, notes, and entire app snapshots are NOT uploaded.
- Pending changes are queued in localStorage when offline or logged out and retried on reconnection. Cloud snapshot sync remains paused.
- `sw.js` now displays generic reminder notifications.

## Required server deployment (not performed by ZIP installation)
1. Back up your Supabase project. In SQL Editor run `supabase/notification-jobs-schema.sql` after existing `push-schema.sql`.
2. Deploy Edge Function `ispi-notification-dispatch` with the existing VAPID secrets plus `NOTIFICATION_CRON_SECRET` (a long random secret). Do NOT expose this secret in the browser.
3. Configure a server-side scheduler (e.g. Supabase Cron with Vault/pg_net, or an external secure scheduler) to POST to `/functions/v1/ispi-notification-dispatch` every minute, supplying `x-ispi-cron-secret`. Configure Edge Function JWT verification appropriately for your server-to-server scheduler, and protect it with the custom secret. Never embed the secret in public SQL or the web app.
4. Register a device in Web Push settings and sign in to Supabase. Create a test schedule at least 32 minutes in the future or a ToDo at least 62 minutes in the future. Check `ispi_notification_jobs` and scheduled function logs.
5. Check cancellation, offline retry, and multi-device behavior. Keep backups before testing.

## Important limitations
- This build has not been deployed or tested against your Supabase project. Automatic push will NOT work until server setup is complete.
- A cancellation racing with an already claimed send cannot always prevent delivery. Existing Push messages cannot be recalled.
- Job claiming uses `processing`; add a server-side recovery policy for stranded jobs before production use.
- The browser queue is device-local and not encrypted. Signing into a different account before flushing requires care; avoid using shared devices. Do not use this prototype as a critical deadline reminder.
- No notification will be queued for events whose reminder time has already passed. The old common lead-minute setting remains for legacy/ICS flows and does not override the new fixed Web Push offsets.
