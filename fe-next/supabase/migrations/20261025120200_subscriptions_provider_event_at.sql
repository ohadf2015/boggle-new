-- Provider event time of the last webhook written to a subscription row.
-- Webhooks arrive out of order; the Polar handler skips an event older than this
-- so a delayed subscription.updated cannot resurrect a revoked Teacher Pro row.
-- The app tolerates this column being absent (writes without the guard).
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS provider_event_at timestamptz;
