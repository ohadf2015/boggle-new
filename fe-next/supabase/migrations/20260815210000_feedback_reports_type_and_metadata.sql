-- app/api/feedback/route.ts has been writing a "rich row" with `type` + `metadata`
-- since the feedback redesign, with a base-row fallback so a report is never lost
-- when the columns are absent. The columns were never actually added, so the rich
-- insert failed on EVERY report and all diagnostic metadata (url, screen, touch,
-- platform, connection, hasScreenshot) was silently discarded.
-- Sentry JAVASCRIPT-NEXTJS-1XQ: "Could not find the 'metadata' column of
-- 'feedback_reports' in the schema cache".
ALTER TABLE public.feedback_reports
  ADD COLUMN IF NOT EXISTS type text,
  ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Triage filters by report type ("bug" / "idea" / ...).
CREATE INDEX IF NOT EXISTS idx_feedback_reports_type
  ON public.feedback_reports (type, created_at DESC);
