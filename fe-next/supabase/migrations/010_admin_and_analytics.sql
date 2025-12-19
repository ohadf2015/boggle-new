-- =============================================
-- ADMIN ROLE AND ANALYTICS TRACKING
-- Migration: 010_admin_and_analytics
-- =============================================

-- Add admin flag to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Add UTM tracking fields to profiles (track how users found the game)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS utm_source TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS utm_medium TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referrer TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country_code TEXT; -- ISO 3166-1 alpha-2

-- Create analytics_events table for tracking various events
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL, -- 'page_view', 'game_start', 'game_end', 'signup', etc.
    player_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    session_id TEXT, -- For anonymous tracking
    country_code TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    referrer TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_player_id ON analytics_events(player_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_country ON analytics_events(country_code);
CREATE INDEX IF NOT EXISTS idx_analytics_events_utm_source ON analytics_events(utm_source);

-- Index for admin lookup
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin) WHERE is_admin = TRUE;

-- Index for country analytics
CREATE INDEX IF NOT EXISTS idx_profiles_country ON profiles(country_code);

-- RLS for analytics_events - only service role can write, admins can read
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Allow admins to read analytics
CREATE POLICY "Admins can read analytics"
    ON analytics_events FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = TRUE
        )
    );

-- Service role bypass for inserts (handled by backend)
-- No INSERT/UPDATE/DELETE policies for regular users

-- Grant the specific admin user admin access
-- User ID: 9a4bd525-6517-488d-a4fa-ee20f76e06c9
UPDATE profiles
SET is_admin = TRUE
WHERE id = '9a4bd525-6517-488d-a4fa-ee20f76e06c9';

-- =============================================
-- ANALYTICS HELPER FUNCTIONS
-- =============================================

-- Function to get daily unique players
CREATE OR REPLACE FUNCTION get_daily_unique_players(target_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(DISTINCT player_id)
        FROM game_results
        WHERE DATE(created_at) = target_date
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get player count by date range
CREATE OR REPLACE FUNCTION get_unique_players_in_range(start_date DATE, end_date DATE)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(DISTINCT player_id)
        FROM game_results
        WHERE DATE(created_at) BETWEEN start_date AND end_date
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get cumulative game time in hours
CREATE OR REPLACE FUNCTION get_total_game_time_hours()
RETURNS NUMERIC AS $$
BEGIN
    RETURN (
        SELECT COALESCE(SUM(total_time_played) / 3600.0, 0)
        FROM profiles
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get games by country
CREATE OR REPLACE FUNCTION get_players_by_country()
RETURNS TABLE(country_code TEXT, player_count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT p.country_code, COUNT(*) as player_count
    FROM profiles p
    WHERE p.country_code IS NOT NULL
    GROUP BY p.country_code
    ORDER BY player_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get players by UTM source
CREATE OR REPLACE FUNCTION get_players_by_utm_source()
RETURNS TABLE(utm_source TEXT, player_count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT p.utm_source, COUNT(*) as player_count
    FROM profiles p
    WHERE p.utm_source IS NOT NULL
    GROUP BY p.utm_source
    ORDER BY player_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON COLUMN profiles.is_admin IS 'Whether user has admin dashboard access';
COMMENT ON COLUMN profiles.country_code IS 'ISO 3166-1 alpha-2 country code';
COMMENT ON COLUMN profiles.utm_source IS 'UTM source parameter from signup';
COMMENT ON TABLE analytics_events IS 'General analytics event tracking table';
