-- Player music/theme style personalization.
--
-- `player_style` is the genre the player picked (see lib/playerStyle/styles.ts).
-- NULL = the first-class "default" style (original track + base --accent), so
-- existing rows need NO backfill: NULL already means "default", which is exactly
-- the no-change experience we want for users who haven't chosen.
--
-- `player_style_modal_shown_at` gates the one-time style-choice popup for
-- existing users. NULL = not shown yet = eligible. New accounts set it when they
-- pass the onboarding style step; existing accounts get NULL → see the popup once.
--
-- Both columns are nullable with no default → added via missing-value, zero rows
-- rewritten, no Realtime WAL storm (profiles is published — see
-- .claude/rules/50-supabase-perf.md).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS player_style text DEFAULT NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS player_style_modal_shown_at timestamptz DEFAULT NULL;

COMMENT ON COLUMN public.profiles.player_style IS
  'Player-chosen music/theme genre style key (lib/playerStyle/styles.ts). NULL = default style (no override).';

COMMENT ON COLUMN public.profiles.player_style_modal_shown_at IS
  'When the one-time style-choice popup was shown. NULL = not yet shown (existing users are eligible).';
