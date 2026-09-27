-- =============================================
-- SECURITY FIX: Enable RLS on unprotected tables
-- Migration: 050_security_fixes_rls
-- Created: 2026-01-22
-- Priority: CRITICAL
--
-- This migration addresses security vulnerabilities identified by Supabase Security Advisor:
-- 1. Tables without RLS enabled (referrals, referral_rewards, serp_api_logs, site_settings)
-- 2. Functions with mutable search_path
-- =============================================

-- =============================================
-- STEP 1: ENABLE RLS ON UNPROTECTED TABLES
-- =============================================

-- referrals table (contains IP addresses and device fingerprints!)
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- referral_rewards table
ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;

-- serp_api_logs table (internal API logs)
ALTER TABLE serp_api_logs ENABLE ROW LEVEL SECURITY;

-- site_settings table (configuration)
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- =============================================
-- STEP 2: CREATE RESTRICTIVE POLICIES FOR REFERRALS
-- =============================================

-- Users can only view their own referrals (as referrer or referred)
DROP POLICY IF EXISTS "Users can view own referrals" ON referrals;
CREATE POLICY "Users can view own referrals"
    ON referrals FOR SELECT
    USING (
        auth.uid() = referrer_id OR
        auth.uid() = referred_id
    );

-- Only service role can insert referrals (server-side only)
DROP POLICY IF EXISTS "Service role inserts referrals" ON referrals;
CREATE POLICY "Service role inserts referrals"
    ON referrals FOR INSERT
    WITH CHECK (false); -- Service role bypasses RLS

-- Only service role can update referrals
DROP POLICY IF EXISTS "Service role updates referrals" ON referrals;
CREATE POLICY "Service role updates referrals"
    ON referrals FOR UPDATE
    USING (false)
    WITH CHECK (false);

-- No one can delete referrals
DROP POLICY IF EXISTS "Referrals cannot be deleted" ON referrals;
CREATE POLICY "Referrals cannot be deleted"
    ON referrals FOR DELETE
    USING (false);

-- =============================================
-- STEP 3: CREATE RESTRICTIVE POLICIES FOR REFERRAL_REWARDS
-- =============================================

-- Users can only view their own rewards
DROP POLICY IF EXISTS "Users can view own rewards" ON referral_rewards;
CREATE POLICY "Users can view own rewards"
    ON referral_rewards FOR SELECT
    USING (auth.uid() = player_id);

-- Only service role can insert rewards
DROP POLICY IF EXISTS "Service role inserts rewards" ON referral_rewards;
CREATE POLICY "Service role inserts rewards"
    ON referral_rewards FOR INSERT
    WITH CHECK (false);

-- Rewards are immutable
DROP POLICY IF EXISTS "Rewards are immutable" ON referral_rewards;
CREATE POLICY "Rewards are immutable"
    ON referral_rewards FOR UPDATE
    USING (false);

DROP POLICY IF EXISTS "Rewards cannot be deleted" ON referral_rewards;
CREATE POLICY "Rewards cannot be deleted"
    ON referral_rewards FOR DELETE
    USING (false);

-- =============================================
-- STEP 4: CREATE RESTRICTIVE POLICIES FOR SERP_API_LOGS
-- =============================================

-- Only admins can view API logs
DROP POLICY IF EXISTS "Admins can view API logs" ON serp_api_logs;
CREATE POLICY "Admins can view API logs"
    ON serp_api_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

-- Only service role can insert logs
DROP POLICY IF EXISTS "Service role inserts logs" ON serp_api_logs;
CREATE POLICY "Service role inserts logs"
    ON serp_api_logs FOR INSERT
    WITH CHECK (false);

-- Logs are immutable
DROP POLICY IF EXISTS "Logs are immutable" ON serp_api_logs;
CREATE POLICY "Logs are immutable"
    ON serp_api_logs FOR UPDATE
    USING (false);

DROP POLICY IF EXISTS "Logs cannot be deleted" ON serp_api_logs;
CREATE POLICY "Logs cannot be deleted"
    ON serp_api_logs FOR DELETE
    USING (false);

-- =============================================
-- STEP 5: CREATE POLICIES FOR SITE_SETTINGS
-- =============================================

-- Anyone can read site settings (public configuration)
DROP POLICY IF EXISTS "Site settings are readable" ON site_settings;
CREATE POLICY "Site settings are readable"
    ON site_settings FOR SELECT
    USING (true);

-- Only admins can modify settings
DROP POLICY IF EXISTS "Admins can modify settings" ON site_settings;
CREATE POLICY "Admins can modify settings"
    ON site_settings FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

-- =============================================
-- STEP 6: FIX FUNCTION SEARCH_PATH VULNERABILITIES
-- =============================================

-- Fix generate_referral_code function
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    result TEXT := '';
    i INTEGER;
    code_exists BOOLEAN;
BEGIN
    FOR attempt IN 1..10 LOOP
        result := '';
        FOR i IN 1..6 LOOP
            result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
        END LOOP;
        SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = result) INTO code_exists;
        IF NOT code_exists THEN
            RETURN result;
        END IF;
    END LOOP;
    RETURN upper(substring(md5(random()::text) from 1 for 6));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix auto_generate_referral_code function
CREATE OR REPLACE FUNCTION auto_generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.referral_code IS NULL THEN
        NEW.referral_code := public.generate_referral_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix update_referral_count function
CREATE OR REPLACE FUNCTION update_referral_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.profiles
    SET referral_count = referral_count + 1
    WHERE id = NEW.referrer_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================
-- COMMENTS
-- =============================================
COMMENT ON POLICY "Users can view own referrals" ON referrals IS
    'Users can only see referrals where they are the referrer or the referred user';
COMMENT ON POLICY "Users can view own rewards" ON referral_rewards IS
    'Users can only see their own referral rewards';
COMMENT ON POLICY "Admins can view API logs" ON serp_api_logs IS
    'Only admin users can view internal API logs';
