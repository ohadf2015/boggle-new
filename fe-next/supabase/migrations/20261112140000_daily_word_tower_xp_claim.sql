-- The daily tower is flushed on every exit; XP is granted once a day, claimed by setting this.
ALTER TABLE public.daily_word_tower_attempts
  ADD COLUMN IF NOT EXISTS xp_granted_at timestamptz;
