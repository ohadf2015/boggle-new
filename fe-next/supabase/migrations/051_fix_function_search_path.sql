-- =============================================
-- SECURITY FIX: Fix function search_path vulnerabilities
-- Migration: 051_fix_function_search_path
-- Created: 2026-01-22
-- Priority: HIGH
--
-- This migration fixes 8 functions with mutable search_path
-- identified by Supabase Security Advisor
-- =============================================

-- =============================================
-- STEP 1: FIX TRIGGER FUNCTIONS
-- =============================================

-- Fix update_brain_training_updated_at (trigger function)
CREATE OR REPLACE FUNCTION public.update_brain_training_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix verify_friendship_for_message (trigger function)
CREATE OR REPLACE FUNCTION public.verify_friendship_for_message()
RETURNS trigger AS $$
BEGIN
    -- Check if sender and recipient are friends
    IF NOT EXISTS (
        SELECT 1 FROM public.friends
        WHERE status = 'accepted'
        AND (
            (user_id = NEW.sender_id AND friend_id = NEW.recipient_id)
            OR (user_id = NEW.recipient_id AND friend_id = NEW.sender_id)
        )
    ) THEN
        RAISE EXCEPTION 'Users must be friends to send messages';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix verify_friendship_for_challenge (trigger function)
CREATE OR REPLACE FUNCTION public.verify_friendship_for_challenge()
RETURNS trigger AS $$
BEGIN
    -- Check if challenger and challenged are friends
    IF NOT EXISTS (
        SELECT 1 FROM public.friends
        WHERE status = 'accepted'
        AND (
            (user_id = NEW.challenger_id AND friend_id = NEW.challenged_id)
            OR (user_id = NEW.challenged_id AND friend_id = NEW.challenger_id)
        )
    ) THEN
        RAISE EXCEPTION 'Users must be friends to send challenges';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================
-- STEP 2: FIX REGULAR FUNCTIONS
-- =============================================

-- Fix get_active_prompt_template
CREATE OR REPLACE FUNCTION public.get_active_prompt_template(
    p_template_type character varying,
    p_language character varying DEFAULT NULL::character varying
)
RETURNS TABLE(
    id bigint,
    template_type character varying,
    language character varying,
    name character varying,
    description text,
    template_content text,
    placeholders jsonb,
    version integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    FROM public.buzz_prompt_templates t
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
  FROM public.buzz_prompt_templates t
  WHERE t.template_type = p_template_type
    AND t.language IS NULL
    AND t.is_active = TRUE
  LIMIT 1;
END;
$$;

-- Fix claim_admin_gift
CREATE OR REPLACE FUNCTION public.claim_admin_gift(gift_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  gift_record RECORD;
  result JSON;
  badge_awarded BOOLEAN := FALSE;
BEGIN
  -- Lock the gift record for update
  SELECT * INTO gift_record
  FROM public.admin_gift_messages
  WHERE id = gift_id AND recipient_id = auth.uid() AND NOT claimed
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Gift not found, already claimed, or not yours'
    );
  END IF;

  -- Mark as claimed
  UPDATE public.admin_gift_messages
  SET claimed = true, claimed_at = NOW(), updated_at = NOW()
  WHERE id = gift_id;

  -- Award XP
  IF gift_record.xp_amount > 0 THEN
    UPDATE public.profiles
    SET total_xp = COALESCE(total_xp, 0) + gift_record.xp_amount,
        updated_at = NOW()
    WHERE id = gift_record.recipient_id;
  END IF;

  -- Award coins
  IF gift_record.coin_amount > 0 THEN
    UPDATE public.profiles
    SET total_coins = COALESCE(total_coins, 0) + gift_record.coin_amount,
        lifetime_coins_earned = COALESCE(lifetime_coins_earned, 0) + gift_record.coin_amount,
        updated_at = NOW()
    WHERE id = gift_record.recipient_id;
  END IF;

  -- Award badge if attached
  IF gift_record.badge_id IS NOT NULL THEN
    -- Check if player already has this badge
    IF NOT EXISTS (
      SELECT 1 FROM public.player_collectibles
      WHERE player_id = gift_record.recipient_id
      AND collectible_id = gift_record.badge_id
    ) THEN
      -- Insert the badge into player's collection
      INSERT INTO public.player_collectibles (player_id, collectible_id, acquired_at, is_equipped)
      VALUES (gift_record.recipient_id, gift_record.badge_id, NOW(), false);
      badge_awarded := TRUE;
    END IF;
  END IF;

  RETURN json_build_object(
    'success', true,
    'xp_awarded', gift_record.xp_amount,
    'coins_awarded', gift_record.coin_amount,
    'badge_id', gift_record.badge_id,
    'badge_awarded', badge_awarded
  );
END;
$$;

-- Fix expire_old_challenges
CREATE OR REPLACE FUNCTION public.expire_old_challenges()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE public.friend_challenges
    SET status = 'expired',
        updated_at = NOW()
    WHERE status = 'pending'
      AND expires_at < NOW();

    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$;

-- Fix cleanup_deleted_messages
CREATE OR REPLACE FUNCTION public.cleanup_deleted_messages()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.friend_messages
    WHERE deleted_for_sender = TRUE
      AND deleted_for_recipient = TRUE
      AND created_at < NOW() - INTERVAL '30 days';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- Fix can_access_feature_flag
CREATE OR REPLACE FUNCTION public.can_access_feature_flag(
    p_player_id uuid,
    p_flag_name character varying
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_flag_enabled BOOLEAN;
  v_admin_only BOOLEAN;
  v_rollout_percentage INTEGER;
  v_is_admin BOOLEAN;
  v_user_hash INTEGER;
BEGIN
  SELECT enabled, admin_only, rollout_percentage
  INTO v_flag_enabled, v_admin_only, v_rollout_percentage
  FROM public.feature_flags
  WHERE flag_name = p_flag_name;

  IF NOT FOUND OR NOT v_flag_enabled THEN
    RETURN FALSE;
  END IF;

  SELECT is_admin INTO v_is_admin
  FROM public.profiles
  WHERE id = p_player_id;

  IF v_is_admin THEN
    RETURN TRUE;
  END IF;

  IF v_admin_only THEN
    RETURN FALSE;
  END IF;

  IF v_rollout_percentage = 100 THEN
    RETURN TRUE;
  ELSIF v_rollout_percentage = 0 THEN
    RETURN FALSE;
  ELSE
    v_user_hash := (hashtext(p_player_id::TEXT) % 100);
    RETURN v_user_hash < v_rollout_percentage;
  END IF;
END;
$$;

-- =============================================
-- COMMENTS
-- =============================================
COMMENT ON FUNCTION public.update_brain_training_updated_at IS
    'Trigger function to update updated_at timestamp. Fixed search_path vulnerability.';
COMMENT ON FUNCTION public.verify_friendship_for_message IS
    'Validates sender and recipient are friends before allowing message. Fixed search_path vulnerability.';
COMMENT ON FUNCTION public.verify_friendship_for_challenge IS
    'Validates users are friends before allowing challenge. Fixed search_path vulnerability.';
COMMENT ON FUNCTION public.get_active_prompt_template IS
    'Gets active prompt template by type and optional language. Fixed search_path vulnerability.';
COMMENT ON FUNCTION public.claim_admin_gift IS
    'Claims an admin gift for the current user. Fixed search_path vulnerability.';
COMMENT ON FUNCTION public.expire_old_challenges IS
    'Expires pending challenges past their expiry date. Fixed search_path vulnerability.';
COMMENT ON FUNCTION public.cleanup_deleted_messages IS
    'Cleans up messages deleted by both parties after 30 days. Fixed search_path vulnerability.';
COMMENT ON FUNCTION public.can_access_feature_flag IS
    'Checks if a player can access a feature flag. Fixed search_path vulnerability.';
