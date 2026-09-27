-- Social-proof feed of notable quest completions ("X just beat a human rival").
-- Encourages other players to chase the same quests. Backend writes via
-- service-role (RLS bypassed); only brag-worthy completions are recorded
-- (PvP quests + Grand Slam), and only when the player opts in.
-- NOT added to supabase_realtime publication (polled via cached GET, no realtime
-- consumer) — see .claude/rules/50-supabase-perf.md.

CREATE TABLE IF NOT EXISTS public.quest_achievement_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  quest_id text NOT NULL,            -- daily quest id, or 'grand_slam'
  family text NOT NULL,              -- 'pvp' | 'discovery' | 'skill' | 'grand_slam'
  created_at timestamptz DEFAULT now()
);

-- Feed reads are always "latest N" — single index covers it.
CREATE INDEX IF NOT EXISTS idx_quest_feed_recent
  ON public.quest_achievement_feed(created_at DESC);

ALTER TABLE public.quest_achievement_feed ENABLE ROW LEVEL SECURITY;

-- Public social feed: any authenticated player may read it.
DROP POLICY IF EXISTS "Quest feed readable by authenticated" ON public.quest_achievement_feed;
CREATE POLICY "Quest feed readable by authenticated" ON public.quest_achievement_feed
  FOR SELECT USING (auth.role() = 'authenticated');

-- Writes happen via service-role only (RLS bypassed); no client INSERT policy.

-- Opt-out toggle. Default ON for 18+ audience (app dropped under-13 targeting,
-- see android-release-status). Players can hide their completions in settings.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS share_achievements boolean NOT NULL DEFAULT true;
