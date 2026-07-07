-- Consumers already exist in code (lib/supabaseRealtime.ts, lib/supabaseRealtimeNotifications.ts)
-- but the tables were never (re-)added to the publication after the 2026-05-06 CPU
-- incident cleanup, so all 5 features silently fell back to polling. Daily audit +
-- 3-strike auto-remediation (see .claude/rules/50-supabase-perf.md) will auto-drop
-- any table that proves too hot.
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.leaderboard;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_lesson_progress;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_results;
