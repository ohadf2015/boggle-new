-- =============================================
-- SECURITY: Revoke PUBLIC execute on upsert_push_token
-- Migration: 20260628010000
--
-- WHY
-- PostgreSQL grants EXECUTE to PUBLIC by default when a function is created.
-- Migration 066_push_notification_system.sql added:
--   GRANT EXECUTE ON FUNCTION upsert_push_token(...) TO authenticated;
-- but never revoked the implicit PUBLIC grant, meaning anon callers could also
-- invoke this SECURITY DEFINER function via /rest/v1/rpc/upsert_push_token.
-- The function uses auth.uid() internally so an anon call would write a null
-- user_id row into user_push_tokens — a data-integrity risk.
--
-- THE FIX
-- REVOKE from public (covers anon role too, since anon inherits PUBLIC).
-- Keep the explicit authenticated grant — push tokens are authenticated-only.
-- Zero behavior change for authenticated callers.
-- =============================================

REVOKE EXECUTE ON FUNCTION public.upsert_push_token(TEXT, VARCHAR, TEXT) FROM PUBLIC;

-- Re-assert the correct grant explicitly (idempotent, ensures no drift)
GRANT EXECUTE ON FUNCTION public.upsert_push_token(TEXT, VARCHAR, TEXT) TO authenticated;
