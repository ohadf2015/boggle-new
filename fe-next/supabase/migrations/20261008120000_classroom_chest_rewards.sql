-- Durable end-of-game chest for classroom live games.
-- One row per (game, round, student). The unique key is the second line of
-- defence behind the Redis claim-once key; a replay cannot write a second chest.
-- Students read only their own rows. Writes are service-role only (no insert
-- policy for authenticated). ON DELETE CASCADE so account deletion is not blocked.

CREATE TABLE IF NOT EXISTS public.classroom_chest_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_code text NOT NULL,
  round_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rarity text NOT NULL CHECK (rarity IN ('common', 'rare', 'epic')),
  xp integer NOT NULL CHECK (xp >= 0),
  item_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT classroom_chest_rewards_once UNIQUE (game_code, round_id, user_id)
);

CREATE INDEX IF NOT EXISTS classroom_chest_rewards_user_idx
  ON public.classroom_chest_rewards (user_id, created_at DESC);

ALTER TABLE public.classroom_chest_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS classroom_chest_rewards_select_own ON public.classroom_chest_rewards;
CREATE POLICY classroom_chest_rewards_select_own
  ON public.classroom_chest_rewards
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

REVOKE ALL ON public.classroom_chest_rewards FROM anon;
GRANT SELECT ON public.classroom_chest_rewards TO authenticated;
