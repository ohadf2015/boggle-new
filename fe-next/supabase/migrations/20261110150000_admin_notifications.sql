-- Admin-only notification feed (the bell in /admin). Written by server code via the
-- service role and by the user_reports trigger below; read through /api/admin/notifications.
-- RLS is enabled with NO policies on purpose: anon/authenticated get nothing, only the
-- service role (which bypasses RLS) can touch it.
-- NOT in the supabase_realtime publication: the bell polls (see .claude/rules/50-supabase-perf.md).

CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  severity text NOT NULL DEFAULT 'normal' CHECK (severity IN ('normal', 'high')),
  title text NOT NULL,
  body text,
  link text,
  -- A replayed webhook upserts onto this and adds nothing. NULLs never collide.
  dedupe_key text UNIQUE,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_created ON public.admin_notifications (created_at DESC);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Every new user report reaches the admin, whichever runtime wrote it (the Express
-- backend inserts into user_reports directly). Never blocks the report itself.
CREATE OR REPLACE FUNCTION public.notify_admins_on_user_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admin_notifications (kind, severity, title, body, link)
  VALUES ('user_report', 'normal', 'New user report', NEW.reason || ' · ' || NEW.target_type, '/admin/moderation');
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admins_on_user_report ON public.user_reports;
CREATE TRIGGER trg_notify_admins_on_user_report
  AFTER INSERT ON public.user_reports
  FOR EACH ROW EXECUTE FUNCTION public.notify_admins_on_user_report();

-- A SECURITY DEFINER trigger function must not be callable over /rest/v1/rpc.
REVOKE EXECUTE ON FUNCTION public.notify_admins_on_user_report() FROM PUBLIC, anon, authenticated;
