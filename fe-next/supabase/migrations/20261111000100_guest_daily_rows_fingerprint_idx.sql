-- The signup streak carry-over looks up unowned guest rows by guest_fingerprint
-- in the last 100 days. Word Wheel and Word Tower had no index for that, so the
-- lookup would scan. Partial: only guest rows (player_id IS NULL) are indexed.
-- CONCURRENTLY: run outside a transaction.

CREATE INDEX CONCURRENTLY IF NOT EXISTS daily_word_wheel_attempts_guest_fp_idx
  ON public.daily_word_wheel_attempts (guest_fingerprint, puzzle_date)
  WHERE player_id IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS daily_word_tower_attempts_guest_fp_idx
  ON public.daily_word_tower_attempts (guest_fingerprint, puzzle_date)
  WHERE player_id IS NULL;
