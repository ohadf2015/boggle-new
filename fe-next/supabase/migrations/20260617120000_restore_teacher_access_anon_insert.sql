-- =============================================
-- FIX: restore anonymous INSERT on teacher_access_requests.
-- Migration: 20260617120000_restore_teacher_access_anon_insert
--
-- WHAT BROKE
-- The public "Apply for free teacher access" form (/education/access ->
-- POST /api/education/access-request) is submitted by prospective teachers who
-- are NOT signed in — the whole point of the gate is that they apply BEFORE
-- having an account. The original schema (20260609120000) correctly modelled
-- this with:
--     CREATE POLICY tar_insert_any ON public.teacher_access_requests
--       FOR INSERT WITH CHECK (true);
--
-- On 2026-06-14 a nightly Supabase-advisor triage lane treated the always-true
-- INSERT as a spam vector and shipped (ad-hoc, via the Supabase MCP — never as a
-- committed migration) `fix_teacher_access_requests_insert_rls`, which DROPPED
-- tar_insert_any and created `tar_insert_authenticated` WITH CHECK
-- (auth.uid() IS NOT NULL). 20260615030000 then rewrote it to
-- WITH CHECK ((select auth.uid()) IS NOT NULL).
--
-- Effect: anonymous applicants can no longer INSERT, so the apply form's insert
-- fails under RLS, the route returns 500 ("insert failed: ..."), and the UI
-- shows the generic "Something went wrong" submit error. Reported by an
-- applicant (Anthony Rettig, anthony.r.rettig@mcpsmd.net) who could not submit.
--
-- THE FIX
-- A public apply form is anonymous BY DESIGN, so the INSERT policy cannot
-- require auth — restoring WITH CHECK (true) is the correct model, matching the
-- committed RLS test (lib/education/__tests__/rls.test.ts: "anon CAN insert").
-- This is an accepted always-true-INSERT exception, same class as web_vitals
-- anonymous telemetry; spam is mitigated at the application layer (the route's
-- per-email rate limit + future captcha), not by gating the public form behind
-- a login it cannot have. Idempotent: safe no-op where already correct.
-- =============================================

-- Remove the auth-gated policy shipped by the spam triage (both historical
-- names, in case either is the one present in a given environment).
DROP POLICY IF EXISTS tar_insert_authenticated ON public.teacher_access_requests;
DROP POLICY IF EXISTS tar_insert_any ON public.teacher_access_requests;

-- Restore the public apply-form INSERT: anyone may submit a request.
CREATE POLICY tar_insert_any
  ON public.teacher_access_requests FOR INSERT
  WITH CHECK (true);
