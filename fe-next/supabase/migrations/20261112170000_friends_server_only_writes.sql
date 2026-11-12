-- Friendship writes now go only through /api/friends/action (service role), which applies the
-- Families gate and notifies the other player. The old client policies let a sender flip its own
-- pending request to 'accepted' (UPDATE had no WITH CHECK) and let any user DM any other user.

DROP POLICY IF EXISTS "Users can send friend requests" ON public.friends;
DROP POLICY IF EXISTS "Users can update friend requests" ON public.friends;

DROP POLICY IF EXISTS "Users can send messages to friends" ON public.friend_messages;
CREATE POLICY "Users can send messages to friends" ON public.friend_messages
  FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) = sender_id
    AND EXISTS (
      SELECT 1 FROM public.friends f
      WHERE f.status = 'accepted'
        AND ((f.user_id = sender_id AND f.friend_id = recipient_id)
          OR (f.user_id = recipient_id AND f.friend_id = sender_id))
    )
  );
