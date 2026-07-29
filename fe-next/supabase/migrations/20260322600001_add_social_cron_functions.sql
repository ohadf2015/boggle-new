-- Expire stale friend requests older than 30 days (F-23)
CREATE OR REPLACE FUNCTION expire_stale_friend_requests()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM friends
  WHERE status = 'pending'
    AND created_at < now() - interval '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Schedule: run daily at 3 AM UTC
SELECT cron.schedule(
  'expire-stale-friend-requests',
  '0 3 * * *',
  'SELECT expire_stale_friend_requests()'
);

-- Schedule: expire old challenges daily at 3:05 AM UTC
SELECT cron.schedule(
  'expire-old-challenges',
  '5 3 * * *',
  'SELECT expire_old_challenges()'
);
