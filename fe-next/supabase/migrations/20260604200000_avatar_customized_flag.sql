-- Avatar "make it yours" nudge — deliberate-customization signal.
--
-- On signup every user gets a RANDOM avatar (getRandomAvatarConfig), so the
-- avatar_config alone can never tell us whether the user actually chose it.
-- This boolean is the dedicated signal: it flips true the moment a user saves
-- from the avatar builder (set at the useProfileManagement.updateUserProfile
-- chokepoint — the silent auto-assign and signup-insert paths use the lower
-- level lib functions and never trip it).
--
-- BACKFILL DIRECTION IS LOAD-BEARING: existing rows must read TRUE
-- ("treat as already customized"). No heuristic can distinguish an existing
-- real customizer from an existing random-holder (same config space), so
-- defaulting existing users to FALSE would wrongly nudge people who chose
-- their avatar months ago. Only genuinely-new accounts (which insert with the
-- DEFAULT false) are ever eligible for the nudge.
--
-- NO-ROW-REWRITE: we add the column with DEFAULT true (PG15 stores the
-- constant as a missing-value → existing rows read true with zero rows
-- touched), then flip the default to false so only FUTURE inserts are eligible.
-- This avoids a full-table UPDATE, which would fire one Realtime WAL event per
-- row (profiles publication) — see .claude/rules/50-supabase-perf.md.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_customized boolean NOT NULL DEFAULT true;

ALTER TABLE public.profiles
  ALTER COLUMN avatar_customized SET DEFAULT false;

COMMENT ON COLUMN public.profiles.avatar_customized IS
  'True once the user deliberately saved an avatar from the builder. Added DEFAULT true (backfills existing rows as already-customized via missing-value, no rewrite) then default flipped to false so only new accounts are eligible for the "make it yours" nudge.';
