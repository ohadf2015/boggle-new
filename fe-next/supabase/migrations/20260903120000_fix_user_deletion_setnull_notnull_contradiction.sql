-- =============================================
-- Fix: user deletion is broken for every player archived into a season
-- leaderboard (a GDPR right-to-erasure hole).
-- Migration: 20260903120000_fix_user_deletion_setnull_notnull_contradiction
--
-- WHAT'S BROKEN
-- `DELETE /api/account/delete` calls `auth.admin.deleteUser()`, which cascades
-- auth.users -> profiles (ON DELETE CASCADE, 001_initial_schema.sql:15) ->
-- every FK'd table. season_leaderboards.player_id is declared
--   REFERENCES profiles(id) ON DELETE SET NULL
-- (20260426160000_seasons_infrastructure.sql:40) while ALSO being NOT NULL.
-- The SET NULL action and the NOT NULL constraint contradict each other, so
-- the delete fails for anyone who ever appears in an archived season board
-- (anyone who existed at a season boundary):
--
--   ERROR: 23502: null value in column "player_id" of relation
--     "season_leaderboards" violates not-null constraint
--   CONTEXT: UPDATE ONLY "public"."season_leaderboards" SET "player_id" = NULL ...
--
-- Verified live: information_schema shows player_id is_nullable = NO, and
-- pg_constraint shows the FK's confdeltype = 'n' (SET NULL). Same query
-- against the whole schema --
--
--   SELECT con.conname, con.conrelid::regclass, a.attname
--   FROM pg_constraint con
--   JOIN unnest(con.conkey) WITH ORDINALITY AS k(attnum, ord) ON true
--   JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = k.attnum
--   WHERE con.contype = 'f' AND con.confdeltype = 'n' AND a.attnotnull = true;
--
-- -- found exactly ONE other instance of the identical pattern:
-- admin_gift_messages.sender_id (042_admin_gift_messages.sql:7). Both are
-- fixed here; nothing else in the schema has this contradiction.
--
-- FIX CHOICE: drop NOT NULL and keep the row (anonymize), not ON DELETE
-- CASCADE (delete the row).
--   - season_leaderboards is a historical record ("who was #1 in Season 3").
--     CASCADE would silently rewrite that history and shift rank_position /
--     entry_count for everyone else on the board every time one archived
--     player later deletes their account -- the wrong blast radius for an
--     unrelated user's erasure request.
--   - get_past_season_leaderboard already LEFT JOINs profiles
--     (20260812210000_fix_leaderboard_rpcs_rls_and_avatars.sql:180), so a
--     null-player row still renders instead of silently vanishing from the
--     product -- "preserved" means actually visible, not just present in
--     the table.
--   - That alone would leave season_leaderboards.username -- a NOT NULL,
--     denormalized copy of the handle taken at archive time -- holding the
--     deleted player's name forever. That's a second copy of PII, not
--     erasure. The trigger below scrubs username/display_name for that
--     player's archived rows in the SAME delete, BEFORE the cascade removes
--     the profile, so "anonymized" is actually true: the score/rank history
--     survives, the identity doesn't.
--   - admin_gift_messages.sender_id is the same contradiction but doesn't
--     need a trigger: the row belongs to recipient_id (ON DELETE CASCADE --
--     it dies with the recipient, not the sender), and there's no
--     denormalized sender-name column, so dropping NOT NULL alone already
--     makes the sender anonymous.
--
-- NOTE: season_leaderboards has UNIQUE(season_id, player_id). Postgres
-- treats NULLs as distinct in a unique index, so many anonymized rows per
-- season is fine, and the ON CONFLICT (season_id, player_id) upserts in
-- process_season_reset / season_score_from_events simply never match a
-- null-player row -- correct, since a deleted player can't re-earn a slot.
-- =============================================

BEGIN;

ALTER TABLE public.season_leaderboards
  ALTER COLUMN player_id DROP NOT NULL;

ALTER TABLE public.admin_gift_messages
  ALTER COLUMN sender_id DROP NOT NULL;

-- Scrub the denormalized username/display_name for a player's archived
-- leaderboard rows BEFORE the profile row is actually removed (and the FK
-- SET NULL fires), while player_id can still be used to find them.
CREATE OR REPLACE FUNCTION public.anonymize_season_leaderboards_on_profile_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.season_leaderboards
  SET username = 'Deleted Player',
      display_name = NULL
  WHERE player_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS anonymize_season_leaderboards_before_profile_delete ON public.profiles;

CREATE TRIGGER anonymize_season_leaderboards_before_profile_delete
  BEFORE DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.anonymize_season_leaderboards_on_profile_delete();

COMMENT ON FUNCTION public.anonymize_season_leaderboards_on_profile_delete() IS
  'BEFORE DELETE ON profiles: scrubs the denormalized username/display_name this player left in season_leaderboards before the FK ON DELETE SET NULL nulls player_id, so account deletion is a real anonymization, not just a nulled foreign key.';

COMMENT ON COLUMN public.season_leaderboards.player_id IS
  'Nullable: ON DELETE SET NULL when the profile is deleted (GDPR erasure). A null player_id is an anonymized archived leaderboard entry -- the row (score/rank/history) survives, the identity does not. See anonymize_season_leaderboards_on_profile_delete().';

COMMENT ON COLUMN public.admin_gift_messages.sender_id IS
  'Nullable: ON DELETE SET NULL when the sending admin''s profile is deleted. The row belongs to recipient_id (ON DELETE CASCADE); a null sender just means "an admin, no longer identifiable" -- no denormalized sender name exists to scrub.';

COMMIT;
