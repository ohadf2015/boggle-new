-- Avatar parts out of reward chests (daily boxes + weekly chest).
--
-- One row per chest opening that rolled a part. The primary key is the
-- idempotency guard: a retried or double-tapped claim hits 23505 and reads the
-- row back instead of granting a second part. `duplicate` rows paid
-- `refund_coins` instead of a new part. Also the ledger for drop analytics.
-- Additive only; service-role only (RLS on, no policies); not in realtime.
CREATE TABLE IF NOT EXISTS public.avatar_part_drops (
  player_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source       text        NOT NULL CHECK (source IN ('day_clear', 'day_perfect', 'weekly_bronze', 'weekly_silver', 'weekly_gold')),
  source_key   text        NOT NULL,
  part_key     text        NOT NULL,
  rarity       text        NOT NULL CHECK (rarity IN ('rare', 'epic', 'legendary')),
  duplicate    boolean     NOT NULL DEFAULT false,
  refund_coins integer     NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, source, source_key)
);

ALTER TABLE public.avatar_part_drops ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.avatar_part_drops FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.avatar_part_drops TO service_role;
