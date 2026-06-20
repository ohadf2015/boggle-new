-- Avatar Glow-Up (Track B) — per-user AI hero portrait of the config-built avatar.
-- ADDITIVE & FLAG-DARK: these columns are null today; the feature is gated behind
-- the `avatar-glow-up` PostHog flag (off) and a server-side Higgsfield credential
-- that is not yet provisioned. Nothing reads these as non-null until then.
--
-- All columns are nullable with no default ⇒ no table rewrite, instant on prod.
-- See docs/superpowers/specs/2026-06-20-higgsfield-avatar-system-design.md (Track B).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_render_url       TEXT,
  ADD COLUMN IF NOT EXISTS avatar_render_status    TEXT,
  ADD COLUMN IF NOT EXISTS avatar_render_seed_hash TEXT;

-- Status is a small closed enum; guard at the column level (NULL allowed = no render).
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_avatar_render_status_chk;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_avatar_render_status_chk
  CHECK (avatar_render_status IS NULL
         OR avatar_render_status IN ('pending', 'ready', 'failed'));

COMMENT ON COLUMN public.profiles.avatar_render_url IS
  'Glow-Up: hosted URL of the AI hero portrait. Additive — never replaces the live SVG avatar in leaderboards/in-game.';
COMMENT ON COLUMN public.profiles.avatar_render_status IS
  'Glow-Up: pending | ready | failed. Only ''ready'' renders are displayed.';
COMMENT ON COLUMN public.profiles.avatar_render_seed_hash IS
  'Glow-Up: djb2 hash of the avatar_config the portrait was generated from. Mismatch ⇒ stale ⇒ fall back to live SVG.';
