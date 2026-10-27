-- =============================================
-- READ-ONLY audit (t_d6bc130f, UR P3 2026-10-27): teachers whose
-- teacher_activation_live_started_at stamp does NOT correspond to a real
-- classroom round. No writes — paste into the Supabase SQL editor or run via
-- psql against hdtmpkicuxvtmvrmtybx. Output feeds the owner's backfill
-- decision; this card deliberately does not backfill.
--
-- Background: before 20261027120000_teacher_activation_room_opened, the stamp
-- fired at ROOM CREATION, so "ran a live game" was true for teachers with 0
-- students. New meaning: first classroom round with player_count >= 2
-- completes (same predicate as the access-trial clock).
-- =============================================

-- (a) Summary: how many real teachers carry the stamp vs how many earned it.
SELECT
  count(*) FILTER (WHERE p.teacher_activation_live_started_at IS NOT NULL) AS stamped_teachers,
  count(*) FILTER (WHERE r.first_real_round_at IS NOT NULL) AS teachers_with_real_round,
  count(*) FILTER (
    WHERE p.teacher_activation_live_started_at IS NOT NULL
      AND (r.first_real_round_at IS NULL OR p.teacher_activation_live_started_at < r.first_real_round_at)
  ) AS stamp_without_prior_real_round
FROM public.profiles p
LEFT JOIN LATERAL (
  SELECT min(cr.completed_at) AS first_real_round_at
  FROM public.classroom_rounds cr
  WHERE cr.teacher_id = p.id AND cr.player_count >= 2
) r ON true
WHERE p.user_role = 'teacher'
  AND p.is_anonymous IS NOT TRUE
  AND COALESCE(p.is_test_account, false) = false
  AND p.email NOT LIKE '%@lexiclash.test';

-- (b) Row-level list for the backfill decision: every real teacher whose
-- stamp precedes their first >=2-player round (or who has no such round).
SELECT
  p.id,
  p.email,
  p.created_at AS signed_up_at,
  p.teacher_activation_live_started_at AS stamped_at,
  r.first_real_round_at,
  CASE
    WHEN r.first_real_round_at IS NULL THEN 'no_real_round'
    ELSE 'stamp_predates_first_real_round'
  END AS mismatch
FROM public.profiles p
LEFT JOIN LATERAL (
  SELECT min(cr.completed_at) AS first_real_round_at
  FROM public.classroom_rounds cr
  WHERE cr.teacher_id = p.id AND cr.player_count >= 2
) r ON true
WHERE p.user_role = 'teacher'
  AND p.is_anonymous IS NOT TRUE
  AND COALESCE(p.is_test_account, false) = false
  AND p.email NOT LIKE '%@lexiclash.test'
  AND p.teacher_activation_live_started_at IS NOT NULL
  AND (r.first_real_round_at IS NULL OR p.teacher_activation_live_started_at < r.first_real_round_at)
ORDER BY p.teacher_activation_live_started_at;
