-- Fixes Supabase advisor: function_search_path_mutable on
-- update_parental_consent_updated_at (introduced by 20260204220000, which
-- shipped before this file's guard did not exist for it since the table
-- creation itself had been failing in production until 2026-09-05).
-- Pure hardening (no unqualified table/function refs in body) — no behavior change.
ALTER FUNCTION public.update_parental_consent_updated_at() SET search_path = public;
