-- =============================================
-- REFERRAL SYSTEM MIGRATION
-- Migration: 021_referral_system
-- Description: Adds referral tracking and reward system
-- =============================================

-- =============================================
-- ADD REFERRAL FIELDS TO PROFILES TABLE
-- =============================================

-- Add referral_code (unique 6-character code for each user)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- Add referred_by (tracks who referred this user)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Add referral_count (denormalized count for performance)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;

-- Add referral_reward_xp (total XP earned from referrals)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS referral_reward_xp INTEGER DEFAULT 0;

-- =============================================
-- CREATE REFERRALS TRACKING TABLE
-- Detailed tracking of all referral events
-- =============================================
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    referred_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    referral_code TEXT NOT NULL,

    -- Tracking data
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    device_fingerprint TEXT,
    ip_address TEXT,

    -- Reward tracking
    reward_granted BOOLEAN DEFAULT FALSE,
    reward_type TEXT, -- 'xp', 'credits', 'achievement', etc.
    reward_amount INTEGER,
    reward_granted_at TIMESTAMPTZ,

    -- Milestones (referred user activity)
    referred_first_game_played BOOLEAN DEFAULT FALSE,
    referred_games_played INTEGER DEFAULT 0,
    referred_total_score INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_referral UNIQUE(referrer_id, referred_id)
);

-- =============================================
-- CREATE REFERRAL REWARDS TABLE
-- Track all rewards given through referral system
-- =============================================
CREATE TABLE IF NOT EXISTS referral_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    referral_id UUID REFERENCES referrals(id) ON DELETE SET NULL,

    -- Reward details
    reward_type TEXT NOT NULL, -- 'new_referral_xp', 'milestone_xp', 'achievement', etc.
    reward_description TEXT,
    xp_amount INTEGER DEFAULT 0,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PERFORMANCE INDEXES
-- =============================================

-- Profiles referral indexes
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON profiles(referred_by);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_count ON profiles(referral_count DESC);

-- Referrals table indexes
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referral_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_created_at ON referrals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referrals_reward_granted ON referrals(reward_granted);

-- Referral rewards indexes
CREATE INDEX IF NOT EXISTS idx_referral_rewards_player_id ON referral_rewards(player_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referral_id ON referral_rewards(referral_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_created_at ON referral_rewards(created_at DESC);

-- =============================================
-- TRIGGERS FOR REFERRALS TABLE
-- =============================================

-- Add updated_at trigger to referrals table
DROP TRIGGER IF EXISTS referrals_updated_at ON referrals;
CREATE TRIGGER referrals_updated_at
    BEFORE UPDATE ON referrals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- FUNCTION: Generate Referral Code
-- Generates a unique 6-character referral code
-- =============================================
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Exclude confusing characters
    result TEXT := '';
    i INTEGER;
    code_exists BOOLEAN;
BEGIN
    -- Try up to 10 times to generate a unique code
    FOR attempt IN 1..10 LOOP
        result := '';

        -- Generate 6-character code
        FOR i IN 1..6 LOOP
            result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
        END LOOP;

        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = result) INTO code_exists;

        IF NOT code_exists THEN
            RETURN result;
        END IF;
    END LOOP;

    -- If all attempts failed, use UUID-based code
    RETURN upper(substring(md5(random()::text) from 1 for 6));
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGER: Auto-generate referral code on profile creation
-- =============================================
CREATE OR REPLACE FUNCTION auto_generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.referral_code IS NULL THEN
        NEW.referral_code := generate_referral_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_auto_referral_code ON profiles;
CREATE TRIGGER profiles_auto_referral_code
    BEFORE INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_referral_code();

-- =============================================
-- TRIGGER: Update referral_count when new referral added
-- =============================================
CREATE OR REPLACE FUNCTION update_referral_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Increment referrer's referral count
    UPDATE profiles
    SET referral_count = referral_count + 1
    WHERE id = NEW.referrer_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS referrals_update_count ON referrals;
CREATE TRIGGER referrals_update_count
    AFTER INSERT ON referrals
    FOR EACH ROW
    EXECUTE FUNCTION update_referral_count();

-- =============================================
-- BACKFILL: Generate referral codes for existing users
-- =============================================
UPDATE profiles
SET referral_code = generate_referral_code()
WHERE referral_code IS NULL;

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================
COMMENT ON COLUMN profiles.referral_code IS 'Unique 6-character referral code for sharing';
COMMENT ON COLUMN profiles.referred_by IS 'User ID of the person who referred this user';
COMMENT ON COLUMN profiles.referral_count IS 'Number of users this person has referred';
COMMENT ON COLUMN profiles.referral_reward_xp IS 'Total XP earned from referring others';
COMMENT ON TABLE referrals IS 'Detailed tracking of referral relationships and rewards';
COMMENT ON TABLE referral_rewards IS 'History of all rewards granted through referral system';
