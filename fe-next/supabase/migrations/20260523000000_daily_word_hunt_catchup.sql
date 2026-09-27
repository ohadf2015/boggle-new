-- Catch-up support for daily Word Hunt.
-- 1) Flag attempts that were catch-up plays of a past daily. Catch-up plays
--    count toward personal stats + streak history but NOT weekly-chest cycle
--    continuity (anti-farm — see docs/specs/daily-catchup-chest-fairness.md).
ALTER TABLE public.daily_word_hunt_attempts
  ADD COLUMN IF NOT EXISTS is_catchup boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.daily_word_hunt_attempts.is_catchup IS
  'True when this attempt replayed a past daily (catch-up). Counts for personal stats, excluded from weekly-chest continuity.';

-- 2) Stats trigger must never regress last_played_date. A catch-up insert
--    carries an OLD puzzle_date; without GREATEST it would rewind a player's
--    last-played marker behind today and corrupt streak-at-risk logic.
CREATE OR REPLACE FUNCTION update_word_hunt_player_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_stats_id UUID;
  v_attempt_column TEXT;
BEGIN
  IF NEW.player_id IS NOT NULL THEN
    INSERT INTO word_hunt_player_stats (player_id, total_played, total_solved, current_streak, last_played_date)
    VALUES (NEW.player_id, 0, 0, 0, NEW.puzzle_date)
    ON CONFLICT (player_id) DO NOTHING;
    v_stats_id := (SELECT id FROM word_hunt_player_stats WHERE player_id = NEW.player_id);
  ELSIF NEW.guest_fingerprint IS NOT NULL THEN
    INSERT INTO word_hunt_player_stats (guest_fingerprint, total_played, total_solved, current_streak, last_played_date)
    VALUES (NEW.guest_fingerprint, 0, 0, 0, NEW.puzzle_date)
    ON CONFLICT (guest_fingerprint) DO NOTHING;
    v_stats_id := (SELECT id FROM word_hunt_player_stats WHERE guest_fingerprint = NEW.guest_fingerprint);
  ELSE
    RETURN NEW;
  END IF;

  IF NEW.solved THEN
    v_attempt_column := 'solved_in_' || NEW.attempts_used::TEXT;
    EXECUTE format('
      UPDATE word_hunt_player_stats
      SET
        total_played = total_played + 1,
        total_solved = total_solved + 1,
        %I = %I + 1,
        last_played_date = GREATEST(last_played_date, $1),
        updated_at = NOW()
      WHERE id = $2
    ', v_attempt_column, v_attempt_column)
    USING NEW.puzzle_date, v_stats_id;
  ELSE
    UPDATE word_hunt_player_stats
    SET
      total_played = total_played + 1,
      last_played_date = GREATEST(last_played_date, NEW.puzzle_date),
      updated_at = NOW()
    WHERE id = v_stats_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
