-- Migration: Add Wikipedia word source tracking
-- Purpose: Track word sources and cache Wikipedia-sourced word candidates

-- Add source tracking columns to daily_target_words
ALTER TABLE daily_target_words
ADD COLUMN IF NOT EXISTS word_source TEXT DEFAULT 'static',
ADD COLUMN IF NOT EXISTS source_article_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN daily_target_words.word_source IS 'Source of the word: static, wikipedia, ai, admin';
COMMENT ON COLUMN daily_target_words.source_article_url IS 'URL of the Wikipedia article if word_source is wikipedia';

-- Create table for caching Wikipedia word candidates
CREATE TABLE IF NOT EXISTS wikipedia_word_candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    language TEXT NOT NULL,
    fetch_date DATE NOT NULL,
    word TEXT NOT NULL,
    source_article_title TEXT,
    source_article_url TEXT,
    interestingness_score INTEGER DEFAULT 0,
    validation_status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_wiki_word_per_date UNIQUE(language, word, fetch_date)
);

-- Add comments for documentation
COMMENT ON TABLE wikipedia_word_candidates IS 'Cache of word candidates extracted from Wikipedia featured content';
COMMENT ON COLUMN wikipedia_word_candidates.validation_status IS 'Validation status: pending, valid, invalid';
COMMENT ON COLUMN wikipedia_word_candidates.interestingness_score IS 'Score 0-100 based on uniqueness and topic relevance';

-- Create index for efficient queries by date and language
CREATE INDEX IF NOT EXISTS idx_wiki_candidates_date_lang
ON wikipedia_word_candidates(fetch_date, language);

-- Create index for finding valid candidates
CREATE INDEX IF NOT EXISTS idx_wiki_candidates_valid
ON wikipedia_word_candidates(language, validation_status, interestingness_score DESC)
WHERE validation_status = 'valid';
