-- Welcome email idempotency: one-time stamp per user.
-- The send path (lib/welcomeEmail.ts) does an atomic claim:
--   UPDATE profiles SET welcome_email_sent_at = now()
--   WHERE id = $1 AND welcome_email_sent_at IS NULL
--     AND created_at > now() - interval '48 hours'
--   RETURNING ...
-- Winning the claim (exactly one row) is what makes the send idempotent under a
-- double SIGNED_IN (React StrictMode / multi-tab). The created_at window keeps
-- this to NEW signups only — existing users who log in after deploy have NULL
-- here but an old created_at, so they are never mailed.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS welcome_email_sent_at TIMESTAMPTZ;
