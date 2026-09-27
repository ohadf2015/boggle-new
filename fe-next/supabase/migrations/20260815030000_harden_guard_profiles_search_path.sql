-- Fixes Supabase advisor: function_search_path_mutable on guard_profiles_privileged_columns.
-- Pure hardening (no unqualified table/function refs in body) — no behavior change.
ALTER FUNCTION public.guard_profiles_privileged_columns() SET search_path = '';
