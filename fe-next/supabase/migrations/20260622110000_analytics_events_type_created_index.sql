-- Perf 2026-06-22 — analytics_events was being sequentially scanned (3,632 seq
-- scans vs 4 idx scans; 27k rows / 13MB; pkey-only, no secondary index).
--
-- The admin game-logs reader (app/api/admin/game-logs/route.ts) filters
--   event_type IN ('game_started','game_completed','game_abandoned')
--   AND created_at BETWEEN start AND end
--   ORDER BY created_at DESC
-- A composite (event_type, created_at DESC) index serves the IN filter, the
-- range, and the sort in one Bitmap Index Scan (verified via EXPLAIN: seq scan
-- -> Bitmap Index Scan on idx_analytics_events_type_created).
--
-- Reversible: DROP INDEX IF EXISTS public.idx_analytics_events_type_created;
CREATE INDEX IF NOT EXISTS idx_analytics_events_type_created
  ON public.analytics_events (event_type, created_at DESC);
