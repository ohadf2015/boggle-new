-- Supabase advisor `rls_disabled_in_public` (2026-09-27, project hdtmpkicuxvtmvrmtybx):
-- admin_alerts, game_audit_log and seasons were created without RLS, so anyone with the
-- project URL + anon key could read/edit/delete them via PostgREST.
--
-- All server access goes through the service role (backend/modules/seasonManager.ts,
-- backend/routes/dailyChallenge/seasonLeaderboard.ts, admin routes), which bypasses RLS.

-- admin_alerts: admin dashboard only.
ALTER TABLE public.admin_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_alerts_admin_only ON public.admin_alerts
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- game_audit_log: replay/anti-cheat data. RLS on with no policy = service role only.
ALTER TABLE public.game_audit_log ENABLE ROW LEVEL SECURITY;

-- seasons: public metadata (name/theme/dates) read by the daily_season_* views; read-only.
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY seasons_select_all ON public.seasons
  FOR SELECT TO anon, authenticated
  USING (true);
