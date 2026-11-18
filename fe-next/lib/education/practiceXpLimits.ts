import type { SupabaseClient } from "@supabase/supabase-js";
import type { PracticeSessionXp } from "@/backend/modules/educationXpManager";
import logger from "@/utils/logger";
import { REVIEW_RUN_SIZE } from "./missedWordsReview";
import { PRODUCE_DEFAULT_QUESTION_COUNT } from "./produceQuestions";
import { DEFAULT_QUESTION_COUNT } from "./vocabFocus";

/** About 20x the heaviest real day (480 XP); ten perfect 30-word decks at the top streak still fit. */
export const PRACTICE_DAILY_XP_CAP = 10_000;
export const PRACTICE_XP_LIMIT_TIMEOUT_MS = 1500;
/** Twice the largest real lesson (78 words), for rounds whose word list cannot be read. */
export const PRACTICE_FIXED_COUNT_CEILING = 160;

const DAY_MS = 86_400_000;
/** Every paid session earns at least the 20 XP daily base, so this many rows already reach the cap. */
const MAX_XP_ROWS = 500;
/** Short lessons still get full fixed-length runs, which repeat their words. */
const LONGEST_FIXED_RUN = Math.max(REVIEW_RUN_SIZE, DEFAULT_QUESTION_COUNT, PRODUCE_DEFAULT_QUESTION_COUNT);
const REPEAT_ALLOWANCE = 2;

export interface PracticeXpLimits {
  /** Null when the lesson has no readable word list. */
  deckSize: number | null;
  xpLast24h: number;
}

type SessionData = PracticeSessionXp["sessionData"];

const atMost = (value: number | undefined, limit: number) => (value === undefined ? undefined : Math.min(value, limit));

function countCeiling(deckSize: number | null): number {
  return deckSize ? Math.max(deckSize, LONGEST_FIXED_RUN) * REPEAT_ALLOWANCE : PRACTICE_FIXED_COUNT_CEILING;
}

/** Blitz reshuffles the deck, so its counts stay under its own per-session cap. */
export function capPracticeXpInput(sessionData: SessionData, deckSize: number | null): SessionData {
  const ceiling = countCeiling(deckSize);
  const capped: SessionData = { ...sessionData };
  const counts = ["cardsReviewed", "cardsCorrect", "pairsMatched", "totalPairs", "wordsSpelled", "spellingStreak"] as const;
  for (const key of counts) {
    if (key in capped) capped[key] = atMost(capped[key], ceiling);
  }
  if (capped.vocabularyWordsFound) capped.vocabularyWordsFound = capped.vocabularyWordsFound.slice(0, ceiling);
  return capped;
}

export function allowedPracticeXp(sessionXp: number, xpLast24h: number): number {
  return xpLast24h + sessionXp > PRACTICE_DAILY_XP_CAP ? 0 : sessionXp;
}

/** Null when the daily total cannot be read in time; the caller then saves the session without XP. */
export async function readPracticeXpLimits(
  getAdmin: () => SupabaseClient | null,
  { studentId, lessonId, nowMs }: { studentId: string; lessonId: string; nowMs: number },
): Promise<PracticeXpLimits | null> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const admin = getAdmin();
    if (!admin) throw new Error("service-role client unavailable");
    const timedOut = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new Error(`timed out after ${PRACTICE_XP_LIMIT_TIMEOUT_MS}ms`));
      }, PRACTICE_XP_LIMIT_TIMEOUT_MS);
    });
    const [lesson, sessions] = await Promise.allSettled([
      Promise.race([
        admin.from("vocabulary_lessons").select("words").eq("id", lessonId).abortSignal(controller.signal).maybeSingle(),
        timedOut,
      ]),
      Promise.race([
        admin
          .from("practice_sessions")
          .select("xp_awarded")
          .eq("student_id", studentId)
          .gte("completed_at", new Date(nowMs - DAY_MS).toISOString())
          .gt("xp_awarded", 0)
          .limit(MAX_XP_ROWS)
          .abortSignal(controller.signal),
        timedOut,
      ]),
    ]);
    if (sessions.status === "rejected") throw sessions.reason;
    if (sessions.value.error) throw new Error(`sessions: ${sessions.value.error.message}`);

    const lessonFailure = lesson.status === "rejected" ? lesson.reason : lesson.value.error;
    if (lessonFailure) logger.error("Practice XP deck size unavailable, using the fixed ceiling:", lessonFailure);
    const words = lesson.status === "fulfilled" ? (lesson.value.data as { words?: unknown } | null)?.words : null;
    return {
      deckSize: Array.isArray(words) && words.length > 0 ? words.length : null,
      xpLast24h: (sessions.value.data ?? []).reduce((sum, row) => sum + ((row as { xp_awarded: number }).xp_awarded ?? 0), 0),
    };
  } catch (err) {
    logger.error("Practice XP daily total unavailable, saving session without XP:", err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
