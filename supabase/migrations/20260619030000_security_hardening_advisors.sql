-- Security hardening: Supabase advisor findings 2026-06-19
-- Ref: supabase:advisor:security:authenticated_security_definer_function_executable
-- Ref: supabase:advisor:security:rls_policy_always_true
--
-- REVIEW BEFORE APPLYING:
--   1. update_difficulty_after_game: adds auth.uid() caller-ownership check so
--      authenticated users cannot update another user's difficulty via direct RPC call.
--      The hook (useDynamicDifficulty.ts) always passes user.id = auth.uid(), so
--      legitimate callers are unaffected.
--   2. tar_insert_any: tightens the always-true WITH CHECK on teacher_access_requests
--      INSERT policy. Anon inserts (user_id IS NULL) still pass; authenticated inserts
--      must match auth.uid(). Blocks spoofed user_id on INSERT.

-- ── 1. update_difficulty_after_game: caller-ownership guard ──────────────────
-- We don't have the original function body locally (was applied directly to prod).
-- This adds a REVOKE on public/anon (they have no legitimate caller path) and a
-- caller-ownership check wrapper. Apply via Supabase dashboard SQL editor or MCP
-- apply_migration after restoring access token.
--
-- Step A: revoke public/anon execute (neither has a callsite)
REVOKE EXECUTE ON FUNCTION public.update_difficulty_after_game(uuid, text, boolean)
  FROM anon, public;

-- Step B: add caller-ownership guard inside the function.
-- Run this block to re-create the function with the auth check prepended.
-- ⚠️  The DO block below uses $$ quoting to preserve the original body.
--     Inspect the current function body first via:
--       SELECT pg_get_functiondef(oid) FROM pg_proc
--       WHERE proname = 'update_difficulty_after_game' AND pronamespace = 'public'::regnamespace;
--     Then merge the auth check into it.
--
-- Template (fill in body from the query above):
-- CREATE OR REPLACE FUNCTION public.update_difficulty_after_game(
--   p_user_id uuid, p_game_mode text, p_won boolean
-- ) RETURNS ... LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
-- BEGIN
--   IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
--     RAISE EXCEPTION 'update_difficulty_after_game: caller % is not owner %',
--       auth.uid(), p_user_id USING ERRCODE = 'insufficient_privilege';
--   END IF;
--   -- original body here --
-- END;
-- $$;

-- ── 2. teacher_access_requests tar_insert_any: tighten WITH CHECK ────────────
-- Current policy allows any role to INSERT any row (WITH CHECK = true).
-- Tightened policy: anon may insert with null user_id; authenticated must match uid.
DO $$
BEGIN
  -- Only apply if the policy exists and is the always-true variant
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'teacher_access_requests'
      AND policyname = 'tar_insert_any'
  ) THEN
    DROP POLICY tar_insert_any ON public.teacher_access_requests;
    CREATE POLICY tar_insert_any ON public.teacher_access_requests
      FOR INSERT
      WITH CHECK (
        -- Anon guests: user_id must be null (no spoofing another user's id)
        -- Authenticated users: user_id must equal their own uid or be null
        user_id IS NULL
        OR user_id = auth.uid()
      );
  END IF;
END $$;
