-- Revoke EXECUTE on upsert_level_completion from all non-service roles.
-- Supabase advisor flagged this SECURITY DEFINER function as executable by
-- `authenticated` via /rest/v1/rpc. Verified 2026-06-12: no TS callsite exists
-- (processCompletion.ts uses direct .from('level_completions') inserts via
-- service-role API route, not this RPC). Revoking has zero behavior impact.
REVOKE EXECUTE ON FUNCTION public.upsert_level_completion(
  uuid, integer, integer, integer, integer, integer
) FROM anon, authenticated, public;
