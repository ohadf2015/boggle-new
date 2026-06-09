-- User & message reports for moderation (Google Play "Social Apps & Features" policy).
-- Backend writes via service-role (RLS bypassed); RLS here is defense-in-depth.
-- NOT added to supabase_realtime publication (no realtime consumer) — see .claude/rules/50-supabase-perf.md.

CREATE TABLE IF NOT EXISTS public.user_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  target_type text NOT NULL CHECK (target_type IN ('user', 'direct_message', 'room_chat')),
  target_ref text,                 -- friend_messages.id for DMs (nullable)
  game_code text,                  -- room/game code for room_chat reports (nullable)
  message_snapshot jsonb,          -- denormalised snapshot for ephemeral room messages
  reason text NOT NULL CHECK (reason IN ('harassment', 'spam', 'inappropriate', 'other')),
  context text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  admin_notes text
);

CREATE INDEX IF NOT EXISTS idx_user_reports_target ON public.user_reports(target_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_reports_pending ON public.user_reports(status) WHERE status = 'pending';

ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reports insert by authenticated" ON public.user_reports;
CREATE POLICY "Reports insert by authenticated" ON public.user_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Admins read reports" ON public.user_reports;
CREATE POLICY "Admins read reports" ON public.user_reports
  FOR SELECT USING (public.is_admin_user());
