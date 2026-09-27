-- Blast v2: Core schema (progress, chests, level clears)

-- blast_progress: per-user session state
CREATE TABLE IF NOT EXISTS public.blast_progress (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_level int NOT NULL DEFAULT 1,
  max_level_cleared int NOT NULL DEFAULT 0,
  current_chest_number int NOT NULL DEFAULT 1,
  current_chest_progress numeric(3, 2) NOT NULL DEFAULT 0.00 CHECK (current_chest_progress >= 0 AND current_chest_progress <= 1.00),
  total_gems_collected int NOT NULL DEFAULT 0,
  total_coins_earned_blast int NOT NULL DEFAULT 0,
  unlocks_seen jsonb NOT NULL DEFAULT '{}',
  locale text DEFAULT 'en',
  last_played_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- blast_chests: per-user, per-chest contents committed at chest creation
CREATE TABLE IF NOT EXISTS public.blast_chests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chest_number int NOT NULL,
  tier text NOT NULL CHECK (tier IN ('wood', 'silver', 'gold', 'legendary')),
  contents jsonb NOT NULL,
  opened_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, chest_number)
);

-- blast_level_clears: per-user, per-level (unique) best record
CREATE TABLE IF NOT EXISTS public.blast_level_clears (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level_number int NOT NULL,
  locale text NOT NULL,
  submission_id uuid NOT NULL UNIQUE,
  stars int NOT NULL CHECK (stars BETWEEN 1 AND 3),
  coins_earned int NOT NULL DEFAULT 0,
  gems_collected int NOT NULL DEFAULT 0,
  hints_used int NOT NULL DEFAULT 0,
  cascades_triggered int NOT NULL DEFAULT 0,
  wrong_attempts int NOT NULL DEFAULT 0,
  time_seconds int NOT NULL,
  cleared_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, level_number)
);

-- RLS: each row scoped to auth.uid()
ALTER TABLE public.blast_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY blast_progress_select ON public.blast_progress
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY blast_progress_update ON public.blast_progress
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY blast_progress_insert ON public.blast_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.blast_chests ENABLE ROW LEVEL SECURITY;
CREATE POLICY blast_chests_select ON public.blast_chests
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY blast_chests_insert ON public.blast_chests
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY blast_chests_update ON public.blast_chests
  FOR UPDATE USING (auth.uid() = user_id);

ALTER TABLE public.blast_level_clears ENABLE ROW LEVEL SECURITY;
CREATE POLICY blast_level_clears_select ON public.blast_level_clears
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY blast_level_clears_insert ON public.blast_level_clears
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY blast_level_clears_update ON public.blast_level_clears
  FOR UPDATE USING (auth.uid() = user_id);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_blast_progress_user_id ON public.blast_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_blast_chests_user_chest ON public.blast_chests(user_id, chest_number);
CREATE INDEX IF NOT EXISTS idx_blast_level_clears_user_level ON public.blast_level_clears(user_id, level_number);

-- RPC helper: atomic progress update on level clear
CREATE OR REPLACE FUNCTION public.increment_blast_progress(
  p_user_id uuid,
  p_chest_progress_delta numeric,
  p_next_level int,
  p_coins_delta int
)
RETURNS TABLE (
  total_coins_earned_blast int,
  current_chest_progress numeric,
  current_chest_number int
) AS $$
BEGIN
  UPDATE public.blast_progress
  SET
    current_level = GREATEST(current_level, p_next_level),
    max_level_cleared = GREATEST(max_level_cleared, p_next_level - 1),
    total_coins_earned_blast = total_coins_earned_blast + p_coins_delta,
    current_chest_progress = LEAST(1.00, current_chest_progress + p_chest_progress_delta),
    updated_at = now()
  WHERE user_id = p_user_id;

  RETURN QUERY SELECT
    bp.total_coins_earned_blast,
    bp.current_chest_progress,
    bp.current_chest_number
  FROM public.blast_progress bp
  WHERE bp.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
