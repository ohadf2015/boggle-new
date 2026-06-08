-- =============================================
-- SCHOOL LEADS rate-limit count helper.
-- Migration: 20260608210000_school_leads_rate_limit_fn
--
-- The /api/education/school-lead route runs as the anonymous/cookie Supabase
-- client. school_leads SELECT is admin-only (to protect lead emails), so a plain
-- `select count(*)` from the route returns 0 under RLS — silently disabling the
-- per-email rate limit and leaving the public endpoint spammable.
--
-- This SECURITY DEFINER function returns ONLY a count for a given email in the
-- last 24h. It bypasses RLS for the count without exposing any row data, so the
-- admin-only SELECT policy stays intact. Granted to anon + authenticated so the
-- public route can call it via rpc().
-- =============================================

CREATE OR REPLACE FUNCTION public.count_recent_school_leads(p_email TEXT)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.school_leads
  WHERE email = p_email
    AND created_at >= now() - interval '24 hours';
$$;

REVOKE ALL ON FUNCTION public.count_recent_school_leads(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.count_recent_school_leads(TEXT) TO anon, authenticated;

COMMENT ON FUNCTION public.count_recent_school_leads(TEXT) IS
  'Rate-limit helper for the public school-lead form. Returns only a 24h count for an email; SECURITY DEFINER so the anon route can enforce limits while school_leads SELECT stays admin-only.';
