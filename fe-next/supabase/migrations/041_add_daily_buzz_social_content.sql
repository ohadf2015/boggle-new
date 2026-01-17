-- Add social_content column to daily_buzz_challenges table
-- Migration: 041_add_daily_buzz_social_content.sql
-- Purpose: Store AI-generated social media post content for X, Instagram, and TikTok

ALTER TABLE daily_buzz_challenges
ADD COLUMN IF NOT EXISTS social_content JSONB;

COMMENT ON COLUMN daily_buzz_challenges.social_content IS 'AI-generated social media post content for each platform (X, Instagram, TikTok) with platform-specific text and hashtags';

-- Example structure:
-- {
--   "x": { "text": "Today's trending...", "hashtags": ["LexiClash", "WordGame"] },
--   "instagram": { "caption": "...", "hashtags": [...] },
--   "tiktok": { "caption": "...", "hashtags": [...] }
-- }
