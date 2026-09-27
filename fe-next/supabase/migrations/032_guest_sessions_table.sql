-- =============================================
-- GUEST SESSIONS TABLE
-- Migration: 032_guest_sessions_table
-- Created: 2026-01-11
-- Purpose: Create guest_sessions table for tracking unauthenticated player sessions
-- =============================================

-- Guest Sessions table (tracks guest player sessions for analytics and conversion)
CREATE TABLE IF NOT EXISTS guest_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id TEXT NOT NULL UNIQUE, -- UUID stored as string from browser localStorage
    device_type TEXT,
    browser TEXT,
    language TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    referrer TEXT,
    country TEXT,
    first_visit_at TIMESTAMPTZ NOT NULL,
    last_visit_at TIMESTAMPTZ NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Link to user if they sign up
    linked_at TIMESTAMPTZ, -- When the guest session was linked to a user account
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for guest_sessions
CREATE INDEX IF NOT EXISTS idx_guest_sessions_session_id ON guest_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_guest_sessions_user_id ON guest_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_guest_sessions_last_visit ON guest_sessions(last_visit_at DESC);
CREATE INDEX IF NOT EXISTS idx_guest_sessions_utm_source ON guest_sessions(utm_source);

-- Enable RLS on guest_sessions
ALTER TABLE guest_sessions ENABLE ROW LEVEL SECURITY;

-- Guest Sessions RLS Policies
-- Service role can do anything (for API tracking)
-- Users can only view sessions linked to their account

CREATE POLICY "Users can view own guest sessions" ON guest_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service can insert guest sessions" ON guest_sessions
    FOR INSERT WITH CHECK (true); -- Service role bypasses this anyway

CREATE POLICY "Service can update guest sessions" ON guest_sessions
    FOR UPDATE USING (true); -- Service role bypasses this anyway

-- Comment explaining the table
COMMENT ON TABLE guest_sessions IS 'Tracks guest (unauthenticated) player sessions for analytics, conversion tracking, and session linking when users sign up';
COMMENT ON COLUMN guest_sessions.session_id IS 'UUID from browser localStorage (boggle_guest_session_id)';
COMMENT ON COLUMN guest_sessions.user_id IS 'Set when guest converts to registered user, links their guest activity';
COMMENT ON COLUMN guest_sessions.linked_at IS 'Timestamp when the guest session was linked to a user account';
