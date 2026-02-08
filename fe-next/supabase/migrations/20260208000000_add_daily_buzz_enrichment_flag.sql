-- Add daily_buzz_enrichment feature flag (default: disabled)
-- Controls whether SERP API enrichment calls are made during Daily Buzz generation.
-- Each enrichment adds ~10 SERP API calls per language (news + related searches).
-- Disabling saves 91% of SERP API usage while keeping core trend data intact.

INSERT INTO feature_flags (flag_name, enabled, admin_only, rollout_percentage)
SELECT 'daily_buzz_enrichment', false, true, 100
WHERE NOT EXISTS (
  SELECT 1 FROM feature_flags WHERE flag_name = 'daily_buzz_enrichment'
);
