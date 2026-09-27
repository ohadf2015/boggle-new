-- =============================================
-- SCHOOL LEADS rate-limit: boolean predicate (replaces the raw-count helper).
-- Migration: 20260608220000_school_lead_rate_limited_boolean
--
-- Security review: the previous count_recent_school_leads() returned a raw 24h
-- count to anon, letting a probe enumerate whether/how often an email submitted.
-- This replaces it with a boolean predicate — anon learns only "is this email at
-- the limit (>=3)", so 0/1/2 are indistinguishable. Case-insensitive on input
-- (emails are now canonicalised to lowercase at the app layer; lower(p_email)
-- guards older mixed-case rows too) and still SECURITY DEFINER so the anon route
-- can enforce the limit while school_leads SELECT stays admin-only.
-- =============================================

DROP FUNCTION IF EXISTS public.count_recent_school_leads(TEXT);

CREATE OR REPLACE FUNCTION public.school_lead_rate_limited(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*) >= 3
  FROM public.school_leads
  WHERE email = lower(p_email)
    AND created_at >= now() - interval '24 hours';
$$;

REVOKE ALL ON FUNCTION public.school_lead_rate_limited(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.school_lead_rate_limited(TEXT) TO anon, authenticated;

COMMENT ON FUNCTION public.school_lead_rate_limited(TEXT) IS
  'Rate-limit predicate for the public school-lead form. Returns true once an email has >=3 submissions in 24h. Boolean (not raw count) to avoid enumeration; SECURITY DEFINER so anon can call while school_leads SELECT stays admin-only.';
