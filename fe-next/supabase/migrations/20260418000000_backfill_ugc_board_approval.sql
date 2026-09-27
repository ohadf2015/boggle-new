-- Approve all community boards stuck in pending.
-- Moderation queue was never shipped; boards were invisible to gallery+RLS.
UPDATE community_boards
SET moderation_status = 'approved'
WHERE moderation_status = 'pending';
