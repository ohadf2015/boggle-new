-- Security advisor fixes 2026-06-13
--
-- 1. Re-revoke upsert_community_word from authenticated (advisor: authenticated_security_definer_function_executable).
--    The original REVOKE was in 20260429160000 but live DB has drifted.
--    No anon callsite exists: the only consumer is the server-side wordApprovalHandler
--    (service_role context). Re-applying the REVOKE is safe and reversible.
--
-- 2. Tighten web_vitals INSERT policy from always-true to player_id-owner check
--    (advisor: rls_policy_always_true). Allows anonymous inserts (player_id IS NULL)
--    and authenticated users inserting with their own id; blocks forged player_id.
--    The API route at app/api/web-vitals/route.ts always uses createClient() and
--    sets player_id: user?.id || null — this policy matches that exactly.
--
-- 3. Add explicit deny-all policy on offerwall_postbacks (advisor: rls_enabled_no_policy).
--    RLS is already ON; service_role bypasses RLS and is the only writer. Adding an
--    explicit RESTRICTIVE USING(false) policy silences the advisor while keeping the
--    security model: no client (anon/authenticated) can read or write this table.

-- 1. Re-revoke upsert_community_word
REVOKE EXECUTE ON FUNCTION public.upsert_community_word(text, text, uuid, text, boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.upsert_community_word(text, text, uuid, text, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.upsert_community_word(text, text, uuid, text, boolean) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_community_word(text, text, uuid, text, boolean) TO service_role;

-- 2. Fix web_vitals INSERT policy (drop always-true, add owner-aware check)
DROP POLICY IF EXISTS "Anyone can insert web vitals" ON public.web_vitals;

CREATE POLICY "Insert web vitals with owner check" ON public.web_vitals
  FOR INSERT
  WITH CHECK (
    player_id IS NULL OR player_id = auth.uid()
  );

-- 3. Explicit deny-all for offerwall_postbacks (service_role bypasses RLS)
CREATE POLICY "No direct client access" ON public.offerwall_postbacks
  AS RESTRICTIVE
  FOR ALL
  USING (false)
  WITH CHECK (false);
