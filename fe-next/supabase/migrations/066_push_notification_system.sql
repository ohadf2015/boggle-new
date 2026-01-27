-- =============================================
-- PUSH NOTIFICATION SYSTEM
-- Migration: 066_push_notification_system
-- Description: Tables for push tokens and notification history
-- =============================================

-- =============================================
-- USER_PUSH_TOKENS TABLE
-- Stores FCM/APNs tokens for native mobile app push notifications
-- =============================================
CREATE TABLE IF NOT EXISTS user_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Token data
  token TEXT NOT NULL,
  platform VARCHAR(10) NOT NULL CHECK (platform IN ('ios', 'android', 'web')),

  -- Device identification (for token rotation and multi-device support)
  device_id TEXT NOT NULL,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one token per device per user
  CONSTRAINT unique_user_device_token UNIQUE (user_id, device_id)
);

-- Comments
COMMENT ON TABLE user_push_tokens IS 'FCM/APNs push notification tokens for native mobile apps';
COMMENT ON COLUMN user_push_tokens.token IS 'FCM registration token from device';
COMMENT ON COLUMN user_push_tokens.platform IS 'Device platform: ios, android, or web';
COMMENT ON COLUMN user_push_tokens.device_id IS 'Unique device identifier for multi-device support';
COMMENT ON COLUMN user_push_tokens.is_active IS 'False if token was invalidated by FCM';

-- Indexes for user_push_tokens
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_active
  ON user_push_tokens(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_push_tokens_token
  ON user_push_tokens(token) WHERE is_active = true;

-- Updated at trigger
CREATE TRIGGER update_user_push_tokens_updated_at
  BEFORE UPDATE ON user_push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- =============================================
-- USER_NOTIFICATIONS TABLE
-- History of all notifications sent to users (for in-app display and audit)
-- =============================================
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Notification content
  title VARCHAR(100) NOT NULL,
  body TEXT NOT NULL,
  notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('gift', 'system', 'achievement', 'social', 'marketing')),

  -- Optional image URL for rich notifications
  image_url TEXT,

  -- Optional reference to related entity (for deep linking)
  related_entity_type VARCHAR(50), -- 'gift', 'achievement', 'game', etc.
  related_entity_id UUID,

  -- Deep link for notification tap action
  action_url TEXT,

  -- Delivery tracking
  push_sent BOOLEAN DEFAULT FALSE,
  push_sent_at TIMESTAMPTZ,
  push_error TEXT,

  -- Read status (for in-app notifications)
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,

  -- Sender info (for gift notifications)
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments
COMMENT ON TABLE user_notifications IS 'Notification history for in-app display and audit trail';
COMMENT ON COLUMN user_notifications.notification_type IS 'Type: gift, system, achievement, social, marketing';
COMMENT ON COLUMN user_notifications.related_entity_id IS 'ID of related entity (gift ID, achievement ID, etc.)';
COMMENT ON COLUMN user_notifications.action_url IS 'Deep link path when notification is tapped';
COMMENT ON COLUMN user_notifications.push_sent IS 'Whether FCM push was sent successfully';
COMMENT ON COLUMN user_notifications.push_error IS 'Error message if push failed';

-- Indexes for user_notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON user_notifications(user_id, created_at DESC) WHERE NOT read;
CREATE INDEX IF NOT EXISTS idx_notifications_user_all
  ON user_notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_created
  ON user_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type
  ON user_notifications(notification_type);


-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- ==================== user_push_tokens RLS ====================

-- Users can view their own push tokens
DROP POLICY IF EXISTS "Users can view their own push tokens" ON user_push_tokens;
CREATE POLICY "Users can view their own push tokens"
  ON user_push_tokens FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own push tokens
DROP POLICY IF EXISTS "Users can insert their own push tokens" ON user_push_tokens;
CREATE POLICY "Users can insert their own push tokens"
  ON user_push_tokens FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own push tokens
DROP POLICY IF EXISTS "Users can update their own push tokens" ON user_push_tokens;
CREATE POLICY "Users can update their own push tokens"
  ON user_push_tokens FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own push tokens
DROP POLICY IF EXISTS "Users can delete their own push tokens" ON user_push_tokens;
CREATE POLICY "Users can delete their own push tokens"
  ON user_push_tokens FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ==================== user_notifications RLS ====================

-- Users can view their own notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON user_notifications;
CREATE POLICY "Users can view their own notifications"
  ON user_notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
DROP POLICY IF EXISTS "Users can update their own notifications" ON user_notifications;
CREATE POLICY "Users can update their own notifications"
  ON user_notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Service role can insert notifications for any user (used by backend)
-- Note: Backend uses service role key, not authenticated user
DROP POLICY IF EXISTS "Service role can insert notifications" ON user_notifications;
CREATE POLICY "Service role can insert notifications"
  ON user_notifications FOR INSERT TO service_role
  WITH CHECK (true);

-- Service role can update notifications (for push_sent tracking)
DROP POLICY IF EXISTS "Service role can update notifications" ON user_notifications;
CREATE POLICY "Service role can update notifications"
  ON user_notifications FOR UPDATE TO service_role
  USING (true)
  WITH CHECK (true);

-- Service role can read all notifications (for admin queries)
DROP POLICY IF EXISTS "Service role can read all notifications" ON user_notifications;
CREATE POLICY "Service role can read all notifications"
  ON user_notifications FOR SELECT TO service_role
  USING (true);

-- Service role can manage push tokens (for token invalidation)
DROP POLICY IF EXISTS "Service role can manage push tokens" ON user_push_tokens;
CREATE POLICY "Service role can manage push tokens"
  ON user_push_tokens FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);


-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to upsert push token (handles token rotation)
CREATE OR REPLACE FUNCTION upsert_push_token(
  p_token TEXT,
  p_platform VARCHAR(10),
  p_device_id TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_device_id TEXT;
  result_record RECORD;
BEGIN
  -- Use provided device_id or generate a random one
  v_device_id := COALESCE(p_device_id, gen_random_uuid()::text);

  -- Deactivate any existing tokens with the same token value from OTHER users
  -- (This handles the case where a user switches accounts on the same device)
  UPDATE user_push_tokens
  SET is_active = false, updated_at = NOW()
  WHERE token = p_token AND user_id != auth.uid();

  -- Upsert for current user
  INSERT INTO user_push_tokens (user_id, token, platform, device_id, is_active, last_used_at, updated_at)
  VALUES (auth.uid(), p_token, p_platform, v_device_id, true, NOW(), NOW())
  ON CONFLICT (user_id, device_id) DO UPDATE
  SET token = EXCLUDED.token,
      platform = EXCLUDED.platform,
      is_active = true,
      last_used_at = NOW(),
      updated_at = NOW()
  RETURNING * INTO result_record;

  RETURN json_build_object(
    'success', true,
    'token_id', result_record.id,
    'device_id', result_record.device_id
  );
END;
$$;

COMMENT ON FUNCTION upsert_push_token(TEXT, VARCHAR, TEXT) IS 'Register or update push token for current user. Handles token rotation and multi-device.';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION upsert_push_token(TEXT, VARCHAR, TEXT) TO authenticated;


-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM user_notifications
  WHERE user_id = auth.uid() AND NOT read;

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION get_unread_notification_count() IS 'Get count of unread notifications for current user';

GRANT EXECUTE ON FUNCTION get_unread_notification_count() TO authenticated;


-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE user_notifications
  SET read = true, read_at = NOW()
  WHERE user_id = auth.uid() AND NOT read;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN json_build_object(
    'success', true,
    'count', v_count
  );
END;
$$;

COMMENT ON FUNCTION mark_all_notifications_read() IS 'Mark all notifications as read for current user';

GRANT EXECUTE ON FUNCTION mark_all_notifications_read() TO authenticated;


-- =============================================
-- ENABLE REALTIME
-- Enable realtime for user_notifications so clients can subscribe
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE user_notifications;
