-- Migration: Fix sync_coins function ambiguity
--
-- Problem: Two sync_coins functions exist with different p_reason types:
--   1. p_reason character varying (older, references non-existent coin_transactions table)
--   2. p_reason text (newer, with proper auth checks)
--
-- This causes PostgreSQL error: "Could not choose the best candidate function"
-- when calling sync_coins from the frontend because both text and varchar
-- are valid implicit casts from a string literal.
--
-- Solution: Drop the older varchar version, keep only the text version.

-- Drop the older character varying version
-- This is the version with signature: (uuid, integer, character varying, jsonb)
DROP FUNCTION IF EXISTS public.sync_coins(uuid, integer, character varying, jsonb);

-- Verify only one function remains (the text version)
-- The remaining function should have signature: (uuid, integer, text, jsonb)
-- and return TABLE(success boolean, new_balance integer, error_message text)

-- Add a comment to the remaining function for documentation
COMMENT ON FUNCTION public.sync_coins(uuid, integer, text, jsonb) IS
  'Atomically add or spend coins from a user profile. Positive amounts add coins, negative amounts spend them. Returns success status and new balance. Requires authenticated user matching p_user_id.';
