-- Fix calculate_lesson_mastery: its body counted the lesson's words from a
-- table `vocabulary_words` that was never created (058 referenced it; the real
-- word list lives in vocabulary_lessons.words, a jsonb array of
-- {word, definition?, ...}). Every call failed with 42P01 -> PostgREST 404,
-- so signed-in students always read mastery 'not_started' (the route swallows
-- the error) and the LESSON_MASTERY_BONUS XP path was unreachable.
--
-- The rewrite keeps the contract — same signature, same 60% coverage /
-- 40% flashcard-accuracy weighting, same 0.8 / 0.4 / >0 thresholds and the
-- same four return values — and mirrors the guest formula in
-- lib/education/practiceGuestProgress.ts:
--   * lesson words come from vocabulary_lessons.words (non-empty `word` keys)
--   * found words are case-folded (lower + trim) before DISTINCT, like the
--     guest record
--   * coverage is capped at 1 (a solo board can credit real words outside the
--     lesson list)
-- NULL arguments (used by check-schema-drift.mjs as a smoke probe) return
-- 'not_started' without error.

CREATE OR REPLACE FUNCTION calculate_lesson_mastery(
    p_student_id UUID,
    p_lesson_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_words INTEGER;
    v_words_found INTEGER;
    v_flashcard_accuracy NUMERIC;
    v_mastery_score NUMERIC;
BEGIN
    -- Total words in the lesson, from the jsonb list (migration 056).
    SELECT COUNT(*) INTO v_total_words
    FROM jsonb_array_elements(
        COALESCE(
            (SELECT words FROM vocabulary_lessons WHERE id = p_lesson_id),
            '[]'::jsonb
        )
    ) AS entry
    WHERE jsonb_typeof(entry) = 'object'
    AND btrim(COALESCE(entry->>'word', ''), E' \t\r\n') <> '';

    IF v_total_words = 0 THEN
        RETURN 'not_started';
    END IF;

    -- Distinct lesson words found across all practice sessions, case-folded
    -- like the guest record so 'Apple' and 'apple' are one word.
    SELECT COUNT(DISTINCT lower(btrim(word, E' \t\r\n'))) INTO v_words_found
    FROM practice_sessions ps,
         LATERAL unnest(ps.vocabulary_words_found) AS word
    WHERE ps.student_id = p_student_id
    AND ps.lesson_id = p_lesson_id;

    -- Flashcard accuracy
    SELECT
        CASE
            WHEN SUM(cards_reviewed) > 0
            THEN SUM(cards_correct)::NUMERIC / SUM(cards_reviewed)::NUMERIC
            ELSE 0
        END INTO v_flashcard_accuracy
    FROM practice_sessions
    WHERE student_id = p_student_id
    AND lesson_id = p_lesson_id
    AND practice_type = 'flashcard';

    -- Weighted: 60% word coverage (capped at 1), 40% flashcard accuracy
    v_mastery_score := (LEAST(v_words_found::NUMERIC / v_total_words::NUMERIC, 1) * 0.6) +
                       (COALESCE(v_flashcard_accuracy, 0) * 0.4);

    IF v_mastery_score >= 0.8 THEN
        RETURN 'mastered';
    ELSIF v_mastery_score >= 0.4 THEN
        RETURN 'practicing';
    ELSIF v_mastery_score > 0 THEN
        RETURN 'started';
    ELSE
        RETURN 'not_started';
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION calculate_lesson_mastery(UUID, UUID) TO authenticated;
