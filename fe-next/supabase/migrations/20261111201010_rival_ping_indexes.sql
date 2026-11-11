-- Rival pings live in user_notifications with related_entity_type = 'rival_ping:<id>'
-- (notification_type stays 'social'; its CHECK is unchanged). The send route counts a
-- sender's pings in the last 24h on every ping; this keeps that count off a scan.
-- Plain, not partial: PostgREST may bind the LIKE pattern, which hides a partial predicate.
-- Recipient lookups already use idx_notifications_user_all (user_id, created_at DESC).
-- No realtime publication change: user_notifications is already published with a consumer.

CREATE INDEX IF NOT EXISTS idx_notifications_sender_created
  ON public.user_notifications (sender_id, created_at DESC)
  WHERE sender_id IS NOT NULL;
