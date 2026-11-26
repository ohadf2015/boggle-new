-- Why a Teacher Pro teacher cancelled, captured in-app.
--
-- `cancel_reason` + `reason_source` are written by POST /api/subscription/cancel-reason
-- when a teacher on a cancelled (cancel_at_period_end) trial picks a one-tap reason
-- chip on the dashboard. Polar's own portal cancellation reason (webhook payload)
-- is telemetry-only (polarRevenue.ts); these columns are the app's own record.
-- `reason_source`: 'chip' today; reserved for the Polar-portal reason if we ever
-- mirror it onto the row ('portal'). Nullable text keeps every existing row valid.

alter table public.subscriptions
  add column if not exists cancel_reason text,
  add column if not exists reason_source text;

comment on column public.subscriptions.cancel_reason is 'One-tap teacher cancel reason: too_expensive | school_pays | just_testing | missing_feature (or free text later)';
comment on column public.subscriptions.reason_source is 'Where cancel_reason came from: chip | portal';
