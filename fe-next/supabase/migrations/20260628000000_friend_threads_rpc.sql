-- Single-query replacement for the N+1 in friendMessages.getThreads().
-- Old path: 1 friendships query + (last-message + profile + unread) PER friend.
-- New path: one round-trip returning last message, profile, and unread count per thread.
--
-- SECURITY INVOKER (default): the caller's RLS runs, so friend_messages' existing
-- "view own messages" policy (auth.uid() = sender/recipient, soft-delete aware) is
-- reused verbatim. Server callers using the service-role client bypass RLS but are
-- still scoped by the p_user_id filter below.
CREATE OR REPLACE FUNCTION public.get_friend_threads(p_user_id uuid)
RETURNS TABLE (
  friend_id uuid,
  username text,
  display_name text,
  avatar_emoji text,
  avatar_color text,
  avatar_image text,
  avatar_config jsonb,
  last_seen_at timestamptz,
  last_message text,
  last_message_at timestamptz,
  last_message_sender_id uuid,
  unread_count bigint
)
LANGUAGE sql
STABLE
AS $$
  WITH friend_ids AS (
    SELECT CASE WHEN f.user_id = p_user_id THEN f.friend_id ELSE f.user_id END AS fid
    FROM public.friends f
    WHERE f.status = 'accepted'
      AND (f.user_id = p_user_id OR f.friend_id = p_user_id)
  ),
  last_msgs AS (
    SELECT DISTINCT ON (sub.other)
      sub.other, sub.message, sub.created_at, sub.sender_id
    FROM (
      SELECT
        CASE WHEN m.sender_id = p_user_id THEN m.recipient_id ELSE m.sender_id END AS other,
        m.message, m.created_at, m.sender_id
      FROM public.friend_messages m
      WHERE (m.sender_id = p_user_id AND m.deleted_for_sender = false)
         OR (m.recipient_id = p_user_id AND m.deleted_for_recipient = false)
    ) sub
    ORDER BY sub.other, sub.created_at DESC
  ),
  unread AS (
    SELECT m.sender_id, count(*) AS cnt
    FROM public.friend_messages m
    WHERE m.recipient_id = p_user_id
      AND m.read = false
      AND m.deleted_for_recipient = false
    GROUP BY m.sender_id
  )
  SELECT
    fi.fid,
    pr.username,
    pr.display_name,
    pr.avatar_emoji,
    pr.avatar_color,
    pr.avatar_image,
    pr.avatar_config,
    pr.last_seen_at,
    lm.message,
    lm.created_at,
    lm.sender_id,
    COALESCE(u.cnt, 0)
  FROM friend_ids fi
  JOIN last_msgs lm ON lm.other = fi.fid          -- INNER JOIN: friends with no messages are dropped (matches old `return null`)
  JOIN public.profiles pr ON pr.id = fi.fid
  LEFT JOIN unread u ON u.sender_id = fi.fid
  ORDER BY lm.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_friend_threads(uuid) TO authenticated;
