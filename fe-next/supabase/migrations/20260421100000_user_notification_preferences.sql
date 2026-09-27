-- =============================================
-- USER NOTIFICATION PREFERENCES
-- Per-user controls for push notifications: master switch + per-category.
-- Read in backend/modules/pushNotificationTriggers.ts before every send.
-- No row = defaults (all categories on, weekly summary off, master on).
-- =============================================

CREATE TABLE IF NOT EXISTS user_notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Master switch: false = suppress ALL push notifications for this user.
  push_enabled BOOLEAN NOT NULL DEFAULT TRUE,

  -- Per-category toggles (defaults match client DEFAULT_CATEGORY_PREFERENCES).
  daily_challenge BOOLEAN NOT NULL DEFAULT TRUE,
  streak_warning  BOOLEAN NOT NULL DEFAULT TRUE,
  friend_invites  BOOLEAN NOT NULL DEFAULT TRUE,
  weekly_summary  BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  user_notification_preferences IS 'Per-user push notification preferences (master + category toggles).';
COMMENT ON COLUMN user_notification_preferences.push_enabled IS 'Master switch. False suppresses all push sends regardless of category flags.';

CREATE TRIGGER update_user_notification_preferences_updated_at
  BEFORE UPDATE ON user_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- ==================== RLS ====================

DROP POLICY IF EXISTS "Users can view own notification preferences" ON user_notification_preferences;
CREATE POLICY "Users can view own notification preferences"
  ON user_notification_preferences FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own notification preferences" ON user_notification_preferences;
CREATE POLICY "Users can insert own notification preferences"
  ON user_notification_preferences FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notification preferences" ON user_notification_preferences;
CREATE POLICY "Users can update own notification preferences"
  ON user_notification_preferences FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own notification preferences" ON user_notification_preferences;
CREATE POLICY "Users can delete own notification preferences"
  ON user_notification_preferences FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Service role: full access for backend preference gate + cron batch reads.
DROP POLICY IF EXISTS "Service role manages notification preferences" ON user_notification_preferences;
CREATE POLICY "Service role manages notification preferences"
  ON user_notification_preferences FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
