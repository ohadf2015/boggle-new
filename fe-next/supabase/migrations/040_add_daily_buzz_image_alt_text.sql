-- Add image_alt_text column to daily_buzz_challenges table
-- Migration: 040_add_daily_buzz_image_alt_text.sql
-- Purpose: Store SEO-friendly alt text for Daily Buzz challenge images

ALTER TABLE daily_buzz_challenges
ADD COLUMN IF NOT EXISTS image_alt_text TEXT;

COMMENT ON COLUMN daily_buzz_challenges.image_alt_text IS 'SEO-friendly alt text for the hero image, describing the trending topic and category for search engines';
