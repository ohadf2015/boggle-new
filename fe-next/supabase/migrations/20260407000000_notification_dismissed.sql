-- Add dismissed column to user_notifications for persistent dismissal
ALTER TABLE user_notifications
  ADD COLUMN IF NOT EXISTS dismissed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS dismissed_at timestamptz;

-- Index for efficient filtering of non-dismissed notifications
CREATE INDEX IF NOT EXISTS idx_user_notifications_dismissed
  ON user_notifications (user_id, dismissed)
  WHERE dismissed = false;

-- Function to dismiss all notifications for current user
CREATE OR REPLACE FUNCTION dismiss_all_notifications()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE user_notifications
  SET dismissed = true, dismissed_at = now(),
      read = true, read_at = COALESCE(read_at, now())
  WHERE user_id = auth.uid()
    AND dismissed = false;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN json_build_object('count', updated_count);
END;
$$;
