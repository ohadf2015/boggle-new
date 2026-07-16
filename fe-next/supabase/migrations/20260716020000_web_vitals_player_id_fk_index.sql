-- Supabase advisor: table `public.web_vitals` has foreign key
-- `web_vitals_player_id_fkey` without a covering index. Every query
-- filtering or joining on player_id (perf dashboards, per-player analytics)
-- does a Seq Scan on the full table as it grows.
-- CONCURRENTLY: zero table lock, safe on a live instance.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_web_vitals_player_id
  ON public.web_vitals (player_id);
