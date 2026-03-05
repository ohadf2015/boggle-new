-- Weekly Leagues with Promotion/Relegation
-- Tables: leagues, league_members, league_history

-- Leagues table
CREATE TABLE IF NOT EXISTS public.leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier TEXT NOT NULL DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'diamond', 'ruby')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  week_start TIMESTAMPTZ NOT NULL,
  week_end TIMESTAMPTZ NOT NULL,
  member_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- League members table
CREATE TABLE IF NOT EXISTS public.league_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weekly_xp INTEGER NOT NULL DEFAULT 0,
  final_position INTEGER,
  display_name TEXT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (league_id, user_id)
);

-- League history table (records after weekly reset)
CREATE TABLE IF NOT EXISTS public.league_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  tier TEXT NOT NULL,
  position INTEGER NOT NULL,
  promoted BOOLEAN NOT NULL DEFAULT false,
  relegated BOOLEAN NOT NULL DEFAULT false,
  rewards_claimed BOOLEAN NOT NULL DEFAULT false,
  week_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_leagues_week_tier ON public.leagues (week_start, tier);
CREATE INDEX IF NOT EXISTS idx_leagues_status ON public.leagues (status);
CREATE INDEX IF NOT EXISTS idx_league_members_user ON public.league_members (user_id);
CREATE INDEX IF NOT EXISTS idx_league_members_league ON public.league_members (league_id);
CREATE INDEX IF NOT EXISTS idx_league_members_xp ON public.league_members (league_id, weekly_xp DESC);
CREATE INDEX IF NOT EXISTS idx_league_history_user ON public.league_history (user_id);
CREATE INDEX IF NOT EXISTS idx_league_history_week ON public.league_history (week_end);

-- Auto-increment member_count on insert
CREATE OR REPLACE FUNCTION public.update_league_member_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.leagues SET member_count = member_count + 1 WHERE id = NEW.league_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.leagues SET member_count = member_count - 1 WHERE id = OLD.league_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_league_member_count
AFTER INSERT OR DELETE ON public.league_members
FOR EACH ROW EXECUTE FUNCTION public.update_league_member_count();

-- RPC to atomically add XP to a player's league membership
CREATE OR REPLACE FUNCTION public.add_league_xp(p_user_id UUID, p_xp_amount INTEGER)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  UPDATE public.league_members
  SET weekly_xp = weekly_xp + p_xp_amount
  WHERE user_id = p_user_id
    AND league_id IN (
      SELECT l.id FROM public.leagues l
      WHERE l.status = 'active'
      ORDER BY l.week_start DESC
      LIMIT 1
    )
  RETURNING json_build_object('weekly_xp', weekly_xp) INTO v_result;

  RETURN v_result;
END;
$$;

-- RLS policies
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_history ENABLE ROW LEVEL SECURITY;

-- Everyone can read leagues and members (standings are public)
CREATE POLICY "Leagues are viewable by everyone"
  ON public.leagues FOR SELECT USING (true);

CREATE POLICY "League members are viewable by everyone"
  ON public.league_members FOR SELECT USING (true);

-- Users can only see their own history
CREATE POLICY "Users can view own league history"
  ON public.league_history FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can do everything (for backend operations)
CREATE POLICY "Service role full access on leagues"
  ON public.leagues FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on league_members"
  ON public.league_members FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on league_history"
  ON public.league_history FOR ALL
  USING (auth.role() = 'service_role');
