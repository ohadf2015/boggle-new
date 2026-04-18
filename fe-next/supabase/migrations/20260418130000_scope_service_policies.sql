-- Scope broad "Service/Server" RLS policies to service_role (advisor 0024).
-- All flagged policies had USING/WITH CHECK = true but roles={public},
-- effectively granting anon + authenticated the same unrestricted access.
-- service_role bypasses RLS regardless, so scoping loses nothing and
-- removes the privilege escalation path. Narrow per-user SELECT policies
-- on each table continue to handle frontend reads.

ALTER POLICY "Service role can manage blast personal bests"        ON public.blast_personal_bests      TO service_role;
ALTER POLICY "Service can manage wotd"                             ON public.daily_word_of_day         TO service_role;
ALTER POLICY "Service can manage wotd players"                     ON public.daily_word_of_day_players TO service_role;
ALTER POLICY "Service can manage rivals"                           ON public.ghost_rivals              TO service_role;
ALTER POLICY "Service can insert guest sessions"                   ON public.guest_sessions            TO service_role;
ALTER POLICY "Service role can manage invalid word submissions"    ON public.invalid_word_submissions  TO service_role;
ALTER POLICY "Service can manage missions"                         ON public.player_daily_missions     TO service_role;
ALTER POLICY "Server manages ranked progress"                      ON public.ranked_progress           TO service_role;
ALTER POLICY "Service can insert single player scores"             ON public.single_player_leaderboard TO service_role;
ALTER POLICY "Service manages vault scores"                        ON public.vault_board_scores        TO service_role;
ALTER POLICY "Service manages vault"                               ON public.vault_boards              TO service_role;
ALTER POLICY "Service role has full access to wikipedia_word_candidates" ON public.wikipedia_word_candidates TO service_role;
ALTER POLICY "Service can manage pacts"                            ON public.word_pacts                TO service_role;
ALTER POLICY "Server can manage word scores"                       ON public.word_scores               TO service_role;
