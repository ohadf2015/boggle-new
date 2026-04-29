-- The 4 remaining auth_rls_initplan hits weren't auth.<fn>() calls —
-- they were current_setting('app.guest_session_id', true) re-evaluated
-- per row. Wrap in (SELECT ...) so it becomes a one-shot initplan.

ALTER POLICY "Users can read their own game sessions" ON public.game_sessions
  USING ((user_id = (SELECT auth.uid())) OR (guest_session_id = (SELECT current_setting('app.guest_session_id'::text, true))));

ALTER POLICY "Users can update their own game sessions" ON public.game_sessions
  USING ((user_id = (SELECT auth.uid())) OR (guest_session_id = (SELECT current_setting('app.guest_session_id'::text, true))));

ALTER POLICY "Users can read their own guest session" ON public.guest_sessions
  USING ((session_id = (SELECT current_setting('app.guest_session_id'::text, true))) OR (user_id = (SELECT auth.uid())));

ALTER POLICY "Users can update their own guest session" ON public.guest_sessions
  USING ((session_id = (SELECT current_setting('app.guest_session_id'::text, true))) OR (user_id = (SELECT auth.uid())));
