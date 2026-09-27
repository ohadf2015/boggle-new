-- Fix SECURITY DEFINER view regression flagged by Supabase advisor.
-- Later migrations (054, 030, 020, 021, 20260414000000) recreated views without
-- security_invoker=on, reverting the hardening from 052 / 20260312100000.
-- ALTER VIEW is idempotent and does not require recreating the view body.

ALTER VIEW public.community_board_leaderboard   SET (security_invoker = on, security_barrier = on);
ALTER VIEW public.community_board_creator_stats SET (security_invoker = on, security_barrier = on);
ALTER VIEW public.daily_word_hunt_leaderboard   SET (security_invoker = on, security_barrier = on);
ALTER VIEW public.daily_word_wheel_leaderboard  SET (security_invoker = on, security_barrier = on);
ALTER VIEW public.daily_puzzle_leaderboard      SET (security_invoker = on, security_barrier = on);
ALTER VIEW public.word_hunt_alltime_leaderboard SET (security_invoker = on, security_barrier = on);
ALTER VIEW public.word_wheel_alltime_leaderboard SET (security_invoker = on, security_barrier = on);
