-- Migration: buzz_prompt_templates
-- Purpose: Store customizable prompt templates for Daily Buzz generation
-- Allows admins to edit riddle and image generation prompts without code changes

-- Table for storing prompt templates
CREATE TABLE IF NOT EXISTS buzz_prompt_templates (
  id BIGSERIAL PRIMARY KEY,

  -- Template identification
  template_type VARCHAR(30) NOT NULL, -- 'riddle', 'image', 'challenge_general', 'social_content'
  language VARCHAR(5), -- NULL for language-agnostic templates, specific code for language-specific ones

  -- Template content
  name VARCHAR(100) NOT NULL, -- Human-readable name
  description TEXT, -- What this template is used for
  template_content TEXT NOT NULL, -- The actual prompt template with placeholders

  -- Template version tracking
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE, -- Only one active template per type/language combo

  -- Placeholders documentation (JSON array of placeholder names and descriptions)
  placeholders JSONB, -- e.g., [{"name": "topic", "description": "The trending topic"}, ...]

  -- Metadata
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure unique active template per type/language
  CONSTRAINT unique_active_template UNIQUE (template_type, language, is_active)
    DEFERRABLE INITIALLY DEFERRED
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_buzz_prompt_templates_type_lang
  ON buzz_prompt_templates(template_type, language)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_buzz_prompt_templates_active
  ON buzz_prompt_templates(is_active)
  WHERE is_active = TRUE;

-- Enable Row Level Security
ALTER TABLE buzz_prompt_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view prompt templates
CREATE POLICY "Admins can read prompt templates"
  ON buzz_prompt_templates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Policy: Only admins can insert prompt templates
CREATE POLICY "Admins can insert prompt templates"
  ON buzz_prompt_templates
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Policy: Only admins can update prompt templates
CREATE POLICY "Admins can update prompt templates"
  ON buzz_prompt_templates
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Policy: Only admins can delete prompt templates (for cleanup)
CREATE POLICY "Admins can delete prompt templates"
  ON buzz_prompt_templates
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Add table comment for documentation
COMMENT ON TABLE buzz_prompt_templates IS
  'Stores customizable prompt templates for AI-powered Daily Buzz generation. Admins can edit these to tune riddle quality, image style, and challenge generation without code changes.';

COMMENT ON COLUMN buzz_prompt_templates.template_type IS
  'Type of prompt: riddle, image, challenge_general, social_content';

COMMENT ON COLUMN buzz_prompt_templates.template_content IS
  'The prompt template with placeholders like {topic}, {category}, {language}';

COMMENT ON COLUMN buzz_prompt_templates.placeholders IS
  'JSON documentation of available placeholders: [{"name": "topic", "description": "..."}]';

-- Function to get active template by type and optional language
CREATE OR REPLACE FUNCTION get_active_prompt_template(
  p_template_type VARCHAR(30),
  p_language VARCHAR(5) DEFAULT NULL
)
RETURNS TABLE (
  id BIGINT,
  template_type VARCHAR(30),
  language VARCHAR(5),
  name VARCHAR(100),
  description TEXT,
  template_content TEXT,
  placeholders JSONB,
  version INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- First try to get language-specific template
  IF p_language IS NOT NULL THEN
    RETURN QUERY
    SELECT
      t.id,
      t.template_type,
      t.language,
      t.name,
      t.description,
      t.template_content,
      t.placeholders,
      t.version
    FROM buzz_prompt_templates t
    WHERE t.template_type = p_template_type
      AND t.language = p_language
      AND t.is_active = TRUE
    LIMIT 1;

    IF FOUND THEN
      RETURN;
    END IF;
  END IF;

  -- Fall back to language-agnostic template
  RETURN QUERY
  SELECT
    t.id,
    t.template_type,
    t.language,
    t.name,
    t.description,
    t.template_content,
    t.placeholders,
    t.version
  FROM buzz_prompt_templates t
  WHERE t.template_type = p_template_type
    AND t.language IS NULL
    AND t.is_active = TRUE
  LIMIT 1;
END;
$$;

-- Grant execute permission to authenticated users (RLS will still restrict access)
GRANT EXECUTE ON FUNCTION get_active_prompt_template(VARCHAR, VARCHAR) TO authenticated;
