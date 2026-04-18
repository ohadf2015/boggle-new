-- Revoke API access to analytics materialized views (advisor 0016).
-- MVs don't enforce RLS — any role with SELECT sees everything. Keep
-- access to service_role + postgres only (backend + admin paths).

REVOKE ALL ON public.mv_dau_mau       FROM anon, authenticated;
REVOKE ALL ON public.mv_cheat_signals FROM anon, authenticated;
