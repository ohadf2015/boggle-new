-- Daily Word Tower — per-mode attempts table + leaderboard view.
--
-- Word Tower was the only public daily mode with no daily-scoped score. Its
-- only store, `word_tower_progress`, is lifetime, auth-only and one row per
-- player, so the mode could not appear on any daily leaderboard.
--
-- Follows the established per-mode triplet (`daily_word_wheel_attempts` +
-- `_leaderboard`), NOT the legacy `daily_puzzle_attempts` — that table is
-- uniquely keyed (player_id, puzzle_date, language) with no mode discriminator,
-- so two modes sharing it would overwrite each other's row every day.
--
-- The score is BEST HEIGHT TODAY. The daily run is endless (a miss never ends
-- it and the tower persists across UTC days), so there is no terminal moment to
-- submit; the API keeps the max per (identity, date, language) instead.

CREATE TABLE IF NOT EXISTS public.daily_word_tower_attempts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  puzzle_date       DATE NOT NULL,
  language          TEXT NOT NULL DEFAULT 'en',
  player_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_fingerprint TEXT,
  -- Denormalized identity, COALESCEd by the view so a leaderboard read never
  -- depends on `profiles` being readable (its SELECT policy is own-row-only).
  display_name      TEXT,
  avatar_emoji      TEXT,
  avatar_color      TEXT,
  country_code      TEXT,
  -- Whole metres. INT (not NUMERIC) so ordering is numeric and matches the
  -- client's floor()'d daily best exactly.
  best_height_m     INTEGER NOT NULL DEFAULT 0,
  floors            INTEGER NOT NULL DEFAULT 0,
  longest_word      TEXT,
  completed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Exactly one identity per row.
  CONSTRAINT daily_word_tower_identity_chk
    CHECK ((player_id IS NOT NULL AND guest_fingerprint IS NULL)
        OR (player_id IS NULL AND guest_fingerprint IS NOT NULL))
);

-- Two SEPARATE uniques, mirroring the wheel table: a combined one would let a
-- guest row and a player row collide on NULLs.
CREATE UNIQUE INDEX IF NOT EXISTS unique_player_daily_word_tower
  ON public.daily_word_tower_attempts (player_id, puzzle_date, language)
  WHERE player_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS unique_guest_daily_word_tower
  ON public.daily_word_tower_attempts (guest_fingerprint, puzzle_date, language)
  WHERE guest_fingerprint IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_daily_word_tower_board
  ON public.daily_word_tower_attempts (puzzle_date, language, best_height_m DESC);

ALTER TABLE public.daily_word_tower_attempts ENABLE ROW LEVEL SECURITY;

-- Policies mirror daily_word_wheel_attempts exactly:
--   SELECT public (a leaderboard must be world-readable)
--   INSERT by the owning player or any guest row
--   UPDATE/DELETE service_role only — the keep-the-max merge runs server-side,
--   so a client can never lower or forge someone else's best.
DROP POLICY IF EXISTS rls_daily_word_tower_attempts_select_public ON public.daily_word_tower_attempts;
CREATE POLICY rls_daily_word_tower_attempts_select_public
  ON public.daily_word_tower_attempts FOR SELECT
  USING (true);

DROP POLICY IF EXISTS rls_daily_word_tower_attempts_insert_public ON public.daily_word_tower_attempts;
CREATE POLICY rls_daily_word_tower_attempts_insert_public
  ON public.daily_word_tower_attempts FOR INSERT
  WITH CHECK (
    ((SELECT auth.role()) = 'service_role')
    OR ((guest_fingerprint IS NOT NULL) AND (player_id IS NULL))
    OR ((SELECT auth.uid()) = player_id)
  );

DROP POLICY IF EXISTS rls_daily_word_tower_attempts_update_public ON public.daily_word_tower_attempts;
CREATE POLICY rls_daily_word_tower_attempts_update_public
  ON public.daily_word_tower_attempts FOR UPDATE
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

DROP POLICY IF EXISTS rls_daily_word_tower_attempts_delete_public ON public.daily_word_tower_attempts;
CREATE POLICY rls_daily_word_tower_attempts_delete_public
  ON public.daily_word_tower_attempts FOR DELETE
  USING ((SELECT auth.role()) = 'service_role');

-- Leaderboard view. The join on profiles is LEFT and every field COALESCEs onto
-- the row's own denormalized copy: `profiles` SELECT is own-row-only, so an
-- inner join here would silently return ZERO rows with error:null for everyone
-- but yourself — the exact failure that emptied four other leaderboards.
DROP VIEW IF EXISTS public.daily_word_tower_leaderboard;
CREATE VIEW public.daily_word_tower_leaderboard
WITH (security_invoker = on, security_barrier = on) AS
SELECT
  dwt.puzzle_date,
  dwt.language,
  dwt.player_id,
  dwt.guest_fingerprint,
  COALESCE(p.display_name, dwt.display_name, 'Guest Player'::text) AS display_name,
  COALESCE(p.avatar_emoji, dwt.avatar_emoji, '🏗️'::text)          AS avatar_emoji,
  COALESCE(p.avatar_color, dwt.avatar_color, '#6366f1'::text)      AS avatar_color,
  p.avatar_config                                                   AS custom_avatar,
  COALESCE(p.country_code, dwt.country_code)                        AS country_code,
  dwt.best_height_m,
  dwt.floors,
  dwt.longest_word,
  dwt.completed_at,
  ROW_NUMBER() OVER (
    PARTITION BY dwt.puzzle_date, dwt.language
    ORDER BY dwt.best_height_m DESC, dwt.floors DESC, dwt.completed_at
  ) AS rank_position
FROM public.daily_word_tower_attempts dwt
LEFT JOIN public.profiles p ON dwt.player_id = p.id;

GRANT SELECT ON public.daily_word_tower_leaderboard TO anon, authenticated;

-- NOTE: deliberately NOT added to the `supabase_realtime` publication. There is
-- no postgres_changes consumer for it, and publishing a table without one costs
-- WAL→JSON parse time on every write (see .claude/rules/50-supabase-perf.md).
