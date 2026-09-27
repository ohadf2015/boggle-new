-- =============================================
-- FRIENDS SOCIAL SYSTEM MIGRATION
-- Migration: 034_friends_social_system
-- Description: Complete friends feature with DM system and challenge invites
-- =============================================

-- =============================================
-- ENSURE UUID EXTENSION EXISTS
-- =============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- ADD LAST_SEEN_AT TO PROFILES (for online status)
-- =============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- Create index for online status queries
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen_at ON profiles(last_seen_at DESC);

-- =============================================
-- FRIEND MESSAGES TABLE
-- Direct messages between friends
-- =============================================
CREATE TABLE IF NOT EXISTS friend_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Message participants (must be friends)
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Message content
    message TEXT NOT NULL,

    -- Read status
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,

    -- Soft delete (messages deleted by one or both users)
    deleted_for_sender BOOLEAN DEFAULT FALSE,
    deleted_for_recipient BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CHECK (sender_id != recipient_id), -- Cannot message yourself
    CHECK (LENGTH(message) > 0 AND LENGTH(message) <= 1000) -- Max 1000 chars
);

-- =============================================
-- FRIEND CHALLENGES TABLE
-- Game challenge invites between friends
-- =============================================
CREATE TABLE IF NOT EXISTS friend_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Challenge participants (must be friends)
    challenger_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    challenged_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Challenge details
    challenge_id TEXT NOT NULL, -- Game/room identifier
    challenge_type TEXT NOT NULL CHECK (challenge_type IN ('new_game', 'join_room')),
    message TEXT, -- Optional message from challenger

    -- Game metadata (optional)
    game_mode TEXT, -- 'casual', 'ranked', 'daily', 'survival'
    game_language TEXT, -- 'en', 'he', 'sv', 'ja', 'es'

    -- Status: 'pending', 'accepted', 'declined', 'expired', 'completed'
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'completed')),

    -- Expiration (24 hours default)
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Constraints
    CHECK (challenger_id != challenged_id), -- Cannot challenge yourself
    CHECK (expires_at > created_at), -- Expiration must be after creation
    CHECK (LENGTH(message) IS NULL OR LENGTH(message) <= 200) -- Max 200 chars for message
);

-- =============================================
-- PERFORMANCE INDEXES
-- =============================================

-- Friend messages indexes
CREATE INDEX IF NOT EXISTS idx_friend_messages_sender ON friend_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_messages_recipient ON friend_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_friend_messages_created_at ON friend_messages(created_at DESC);

-- Composite index for conversation threads (sender + recipient)
CREATE INDEX IF NOT EXISTS idx_friend_messages_conversation
    ON friend_messages(sender_id, recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_friend_messages_conversation_reverse
    ON friend_messages(recipient_id, sender_id, created_at DESC);

-- Unread messages index (for fast unread count)
CREATE INDEX IF NOT EXISTS idx_friend_messages_unread
    ON friend_messages(recipient_id, read)
    WHERE read = FALSE AND deleted_for_recipient = FALSE;

-- Friend challenges indexes
CREATE INDEX IF NOT EXISTS idx_friend_challenges_challenger ON friend_challenges(challenger_id);
CREATE INDEX IF NOT EXISTS idx_friend_challenges_challenged ON friend_challenges(challenged_id);
CREATE INDEX IF NOT EXISTS idx_friend_challenges_status ON friend_challenges(status);
CREATE INDEX IF NOT EXISTS idx_friend_challenges_created_at ON friend_challenges(created_at DESC);

-- Pending challenges index (most common query)
CREATE INDEX IF NOT EXISTS idx_friend_challenges_pending
    ON friend_challenges(challenged_id, status)
    WHERE status = 'pending';

-- Expiration index (for cleanup job)
CREATE INDEX IF NOT EXISTS idx_friend_challenges_expires_at
    ON friend_challenges(expires_at)
    WHERE status = 'pending';

-- =============================================
-- TRIGGERS
-- =============================================

-- Updated_at trigger for friend_messages
DROP TRIGGER IF EXISTS friend_messages_updated_at ON friend_messages;
CREATE TRIGGER friend_messages_updated_at
    BEFORE UPDATE ON friend_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Updated_at trigger for friend_challenges
DROP TRIGGER IF EXISTS friend_challenges_updated_at ON friend_challenges;
CREATE TRIGGER friend_challenges_updated_at
    BEFORE UPDATE ON friend_challenges
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- VALIDATION FUNCTIONS
-- =============================================

-- Function: Verify users are friends before sending message
CREATE OR REPLACE FUNCTION verify_friendship_for_message()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if sender and recipient are friends
    IF NOT EXISTS (
        SELECT 1 FROM friends
        WHERE status = 'accepted'
        AND (
            (user_id = NEW.sender_id AND friend_id = NEW.recipient_id)
            OR (user_id = NEW.recipient_id AND friend_id = NEW.sender_id)
        )
    ) THEN
        RAISE EXCEPTION 'Users must be friends to send messages';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to friend_messages
DROP TRIGGER IF EXISTS verify_friendship_before_message ON friend_messages;
CREATE TRIGGER verify_friendship_before_message
    BEFORE INSERT ON friend_messages
    FOR EACH ROW
    EXECUTE FUNCTION verify_friendship_for_message();

-- Function: Verify users are friends before sending challenge
CREATE OR REPLACE FUNCTION verify_friendship_for_challenge()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if challenger and challenged are friends
    IF NOT EXISTS (
        SELECT 1 FROM friends
        WHERE status = 'accepted'
        AND (
            (user_id = NEW.challenger_id AND friend_id = NEW.challenged_id)
            OR (user_id = NEW.challenged_id AND friend_id = NEW.challenger_id)
        )
    ) THEN
        RAISE EXCEPTION 'Users must be friends to send challenges';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to friend_challenges
DROP TRIGGER IF EXISTS verify_friendship_before_challenge ON friend_challenges;
CREATE TRIGGER verify_friendship_before_challenge
    BEFORE INSERT ON friend_challenges
    FOR EACH ROW
    EXECUTE FUNCTION verify_friendship_for_challenge();

-- =============================================
-- AUTO-EXPIRATION FUNCTION
-- Automatically expire pending challenges after expires_at
-- =============================================
CREATE OR REPLACE FUNCTION expire_old_challenges()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE friend_challenges
    SET status = 'expired',
        updated_at = NOW()
    WHERE status = 'pending'
      AND expires_at < NOW();

    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- CLEANUP FUNCTION
-- Clean up fully deleted messages (deleted by both users)
-- =============================================
CREATE OR REPLACE FUNCTION cleanup_deleted_messages()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM friend_messages
    WHERE deleted_for_sender = TRUE
      AND deleted_for_recipient = TRUE
      AND created_at < NOW() - INTERVAL '30 days'; -- Keep for 30 days after deletion

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on tables
ALTER TABLE friend_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_challenges ENABLE ROW LEVEL SECURITY;

-- =============================================
-- FRIEND MESSAGES TABLE POLICIES
-- =============================================

-- Users can view messages they sent or received (unless deleted)
DROP POLICY IF EXISTS "Users can view own messages" ON friend_messages;
CREATE POLICY "Users can view own messages"
    ON friend_messages FOR SELECT
    USING (
        (auth.uid() = sender_id AND deleted_for_sender = FALSE)
        OR (auth.uid() = recipient_id AND deleted_for_recipient = FALSE)
    );

-- Users can send messages (insert)
DROP POLICY IF EXISTS "Users can send messages to friends" ON friend_messages;
CREATE POLICY "Users can send messages to friends"
    ON friend_messages FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id -- Only sender can create message
    );

-- Users can update messages (mark as read, soft delete)
DROP POLICY IF EXISTS "Users can update own messages" ON friend_messages;
CREATE POLICY "Users can update own messages"
    ON friend_messages FOR UPDATE
    USING (
        auth.uid() = sender_id
        OR auth.uid() = recipient_id
    )
    WITH CHECK (
        -- Recipients can mark as read
        (auth.uid() = recipient_id AND NEW.read = TRUE)
        -- Senders can soft-delete their copy
        OR (auth.uid() = sender_id AND NEW.deleted_for_sender = TRUE)
        -- Recipients can soft-delete their copy
        OR (auth.uid() = recipient_id AND NEW.deleted_for_recipient = TRUE)
    );

-- No direct deletes (use soft delete instead)
DROP POLICY IF EXISTS "Messages cannot be directly deleted" ON friend_messages;
CREATE POLICY "Messages cannot be directly deleted"
    ON friend_messages FOR DELETE
    USING (FALSE);

-- =============================================
-- FRIEND CHALLENGES TABLE POLICIES
-- =============================================

-- Users can view challenges they sent or received
DROP POLICY IF EXISTS "Users can view own challenges" ON friend_challenges;
CREATE POLICY "Users can view own challenges"
    ON friend_challenges FOR SELECT
    USING (
        auth.uid() = challenger_id
        OR auth.uid() = challenged_id
    );

-- Users can send challenges (insert)
DROP POLICY IF EXISTS "Users can send challenges to friends" ON friend_challenges;
CREATE POLICY "Users can send challenges to friends"
    ON friend_challenges FOR INSERT
    WITH CHECK (
        auth.uid() = challenger_id -- Only challenger can create
        AND status = 'pending' -- Must start as pending
    );

-- Users can update challenges (accept/decline/complete)
DROP POLICY IF EXISTS "Users can update own challenges" ON friend_challenges;
CREATE POLICY "Users can update own challenges"
    ON friend_challenges FOR UPDATE
    USING (
        auth.uid() = challenger_id
        OR auth.uid() = challenged_id
    )
    WITH CHECK (
        -- Challenged user can accept/decline
        (auth.uid() = challenged_id AND OLD.status = 'pending'
            AND NEW.status IN ('accepted', 'declined'))
        -- Either can mark as completed
        OR ((auth.uid() = challenger_id OR auth.uid() = challenged_id)
            AND NEW.status = 'completed')
    );

-- Users can delete challenges they're part of
DROP POLICY IF EXISTS "Users can delete own challenges" ON friend_challenges;
CREATE POLICY "Users can delete own challenges"
    ON friend_challenges FOR DELETE
    USING (
        auth.uid() = challenger_id
        OR auth.uid() = challenged_id
    );

-- =============================================
-- UTILITY VIEWS
-- =============================================

-- View: Active conversations (for inbox display)
CREATE OR REPLACE VIEW friend_conversations AS
SELECT DISTINCT ON (conversation_id)
    CASE
        WHEN m.sender_id < m.recipient_id
        THEN m.sender_id || '_' || m.recipient_id
        ELSE m.recipient_id || '_' || m.sender_id
    END AS conversation_id,
    m.sender_id,
    m.recipient_id,
    m.message AS last_message,
    m.created_at AS last_message_at,
    m.read AS last_message_read,
    -- Count unread for each user
    (SELECT COUNT(*) FROM friend_messages
     WHERE recipient_id = m.sender_id
     AND sender_id = m.recipient_id
     AND read = FALSE
     AND deleted_for_recipient = FALSE) AS unread_for_sender,
    (SELECT COUNT(*) FROM friend_messages
     WHERE recipient_id = m.recipient_id
     AND sender_id = m.sender_id
     AND read = FALSE
     AND deleted_for_recipient = FALSE) AS unread_for_recipient
FROM friend_messages m
WHERE deleted_for_sender = FALSE
   OR deleted_for_recipient = FALSE
ORDER BY conversation_id, created_at DESC;

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================
COMMENT ON TABLE friend_messages IS 'Direct messages between friends with soft delete support';
COMMENT ON TABLE friend_challenges IS 'Game challenge invites between friends with expiration';

COMMENT ON COLUMN friend_messages.deleted_for_sender IS 'Sender soft-deleted their copy of the message';
COMMENT ON COLUMN friend_messages.deleted_for_recipient IS 'Recipient soft-deleted their copy of the message';
COMMENT ON COLUMN friend_challenges.challenge_type IS 'new_game (create new game room) or join_room (join existing room)';
COMMENT ON COLUMN friend_challenges.expires_at IS 'Challenges expire after 24 hours by default';

COMMENT ON FUNCTION verify_friendship_for_message() IS 'Ensures users are friends before allowing DM';
COMMENT ON FUNCTION verify_friendship_for_challenge() IS 'Ensures users are friends before allowing challenge';
COMMENT ON FUNCTION expire_old_challenges() IS 'Marks pending challenges as expired after expiration time';
COMMENT ON FUNCTION cleanup_deleted_messages() IS 'Removes messages deleted by both sender and recipient after 30 days';
