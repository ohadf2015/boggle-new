-- =============================================
-- Friends module read every other player's profile through a table it is not
-- allowed to read
-- Migration: 20260815100000_friends_read_public_profiles
--
-- `public.profiles` SELECT is own-row-only ("Users can read own profile",
-- qual `auth.uid() = id`), and PostgREST reports an RLS-filtered read as an
-- empty result with `error: null`. Every cross-player read in the friends
-- module therefore returned nothing, silently: the friends list, the incoming
-- and outgoing request lists, the blocked list, user search, and the DM thread
-- list all rendered empty with no error anywhere. Measured on prod as role
-- `authenticated` with a real player's uid, before this migration:
--
--   select … from public.friends         where status='accepted'  -> 3 rows
--   select … from public.profiles        where id in (<friends>)  -> 0 rows  ← the bug
--   select … from public.public_profiles where id in (<friends>)  -> 2 rows
--
-- `public.public_profiles` already existed as the safe projection of the table
-- (no email_unsubscribe_token, birth_year, is_admin/admin_role, ban_reason or
-- utm_*), granted to anon + authenticated. This is the same shape as the
-- 2026-08-12 leaderboard fix (20260812210000) — the client reads the public
-- projection, never the RLS-restricted table.
--
-- Two changes:
-- 1. The view gains `display_name` and `last_seen_at`. Both are already rendered
--    publicly (leaderboards show display_name; the online dot IS last_seen_at),
--    and the friends surfaces cannot work without them. Appended at the END —
--    CREATE OR REPLACE VIEW can only add columns, never reorder them.
-- 2. `get_friend_threads` joins the view instead of the table. It stays SECURITY
--    INVOKER on purpose: it takes p_user_id as an argument, so DEFINER would let
--    any caller read any player's DM list. Only the profile join needed fixing;
--    `friend_messages` RLS must keep applying to the caller.
--
-- NOTE FOR WHOEVER READS THE ADVISORS NEXT: `public_profiles` is a plain view
-- with definer semantics (no `security_invoker`), which is exactly what makes
-- the cross-player read work. Supabase's linter flags that shape. Do NOT
-- "remediate" it by setting security_invoker = on — that silently re-breaks
-- every friends surface in the same no-error way.
-- =============================================

-- =============================================
-- 1. public_profiles — append display_name + last_seen_at
-- =============================================

CREATE OR REPLACE VIEW public.public_profiles AS
SELECT
    id,
    username,
    avatar_emoji,
    avatar_color,
    avatar_image,
    avatar_config,
    player_title,
    current_level,
    prestige_level,
    total_games,
    total_score,
    total_words,
    casual_wins,
    ranked_games,
    ranked_wins,
    ranked_mmr,
    peak_mmr,
    longest_word,
    longest_word_length,
    unique_days_played,
    -- appended (existing column order above is load-bearing for CREATE OR REPLACE)
    display_name,
    last_seen_at
FROM public.profiles;

COMMENT ON VIEW public.public_profiles IS
    'Safe public projection of public.profiles. Definer semantics BY DESIGN: public.profiles is own-row-only under RLS, so every cross-player read (friends, search, head-to-head, DM threads, leaderboards) goes through here. Do not set security_invoker = on.';

-- The two new columns are only needed by SIGNED-IN flows (friends, DM threads,
-- search, word pacts, referral, quick-play). Keep them off the anon grant — a
-- logged-out client polling last_seen_at for every account is presence data
-- nobody asked to publish. anon keeps exactly the 20 columns it had before.
REVOKE SELECT ON public.public_profiles FROM anon;

GRANT SELECT (
    id,
    username,
    avatar_emoji,
    avatar_color,
    avatar_image,
    avatar_config,
    player_title,
    current_level,
    prestige_level,
    total_games,
    total_score,
    total_words,
    casual_wins,
    ranked_games,
    ranked_wins,
    ranked_mmr,
    peak_mmr,
    longest_word,
    longest_word_length,
    unique_days_played
) ON public.public_profiles TO anon;

GRANT SELECT ON public.public_profiles TO authenticated;

-- =============================================
-- 2. get_friend_threads — join the view, stay SECURITY INVOKER
-- =============================================

CREATE OR REPLACE FUNCTION public.get_friend_threads(p_user_id uuid)
RETURNS TABLE(
    friend_id uuid,
    username text,
    display_name text,
    avatar_emoji text,
    avatar_color text,
    avatar_image text,
    avatar_config jsonb,
    last_seen_at timestamp with time zone,
    last_message text,
    last_message_at timestamp with time zone,
    last_message_sender_id uuid,
    unread_count bigint
)
LANGUAGE sql
STABLE
SET search_path TO ''
AS $function$
  WITH friend_ids AS (
    SELECT CASE WHEN f.user_id = p_user_id THEN f.friend_id ELSE f.user_id END AS fid
    FROM public.friends f
    WHERE f.status = 'accepted'
      AND (f.user_id = p_user_id OR f.friend_id = p_user_id)
  ),
  last_msgs AS (
    SELECT DISTINCT ON (sub.other)
      sub.other, sub.message, sub.created_at, sub.sender_id
    FROM (
      SELECT
        CASE WHEN m.sender_id = p_user_id THEN m.recipient_id ELSE m.sender_id END AS other,
        m.message, m.created_at, m.sender_id
      FROM public.friend_messages m
      WHERE (m.sender_id = p_user_id AND m.deleted_for_sender = false)
         OR (m.recipient_id = p_user_id AND m.deleted_for_recipient = false)
    ) sub
    ORDER BY sub.other, sub.created_at DESC
  ),
  unread AS (
    SELECT m.sender_id, count(*) AS cnt
    FROM public.friend_messages m
    WHERE m.recipient_id = p_user_id
      AND m.read = false
      AND m.deleted_for_recipient = false
    GROUP BY m.sender_id
  )
  SELECT
    fi.fid,
    pr.username,
    pr.display_name,
    pr.avatar_emoji,
    pr.avatar_color,
    pr.avatar_image,
    pr.avatar_config,
    pr.last_seen_at,
    lm.message,
    lm.created_at,
    lm.sender_id,
    COALESCE(u.cnt, 0)
  FROM friend_ids fi
  JOIN last_msgs lm ON lm.other = fi.fid
  -- public_profiles, NOT profiles: the caller cannot SELECT another player's
  -- profile row, and this function is deliberately not SECURITY DEFINER.
  JOIN public.public_profiles pr ON pr.id = fi.fid
  LEFT JOIN unread u ON u.sender_id = fi.fid
  ORDER BY lm.created_at DESC;
$function$;

COMMENT ON FUNCTION public.get_friend_threads(uuid) IS
    'DM thread list. SECURITY INVOKER on purpose — p_user_id is an argument, so DEFINER would expose any player''s threads. Joins public.public_profiles because public.profiles is own-row-only under RLS.';
