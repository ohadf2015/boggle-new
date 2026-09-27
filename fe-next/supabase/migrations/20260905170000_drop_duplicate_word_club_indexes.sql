-- 20260322221554_growth_retention_indexes (idx_word_club_members_user,
-- idx_word_clubs_owner) and the later 20260628020000 /
-- 20260630020000 perf-advisor fixes (idx_word_clubs_owner_id,
-- idx_word_club_members_user_id) each independently added a covering index
-- for the same FK column under a different name -- both migrations existed
-- in the repo without either author knowing about the other's index. Applying
-- the full migration history on 2026-09-05 left true duplicates. Keep the
-- more descriptively FK-named index from each pair.
DROP INDEX IF EXISTS public.idx_word_club_members_user;
DROP INDEX IF EXISTS public.idx_word_clubs_owner;
