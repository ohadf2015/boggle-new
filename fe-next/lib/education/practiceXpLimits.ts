import type { SupabaseClient } from "@supabase/supabase-js";
import type { PracticeSessionXp } from "@/backend/modules/educationXpManager";
import logger from "@/utils/logger";

/** About 20x the heaviest real day (480 XP); ten perfect 30-word decks at the top streak still fit. */
export const PRACTICE_DAILY_XP_CAP = 10_000;
export const PRACTICE_XP_LIMIT_TIMEOUT_MS = 1500;

const DAY_MS = 86_400_000;
/** Every paid session earns at least the 20 XP daily base, so this many rows already reach the cap. */
const MAX_XP_ROWS = 500;

export interface PracticeXpLimits {
  deckSize: number;
  xpLast24h: number;
}

type SessionData = PracticeSessionXp["sessionData"];

const atMost = (value: number | undefined, limit: number) => (value === undefined ? undefined : Math.min(value, limit));

/** Blitz reshuffles the deck, so its counts stay under its own per-session cap. */
export function capPracticeXpInput(sessionData: SessionData, deckSize: number): SessionData {
  const capped: SessionData = { ...sessionData };
  const counts = ["cardsReviewed", "cardsCorrect", "pairsMatched", "totalPairs", "wordsSpelled", "spellingStreak"] as const;
  for (const key of counts) {
    if (key in capped) capped[key] = atMost(capped[key], deckSize);
  }
  if (capped.vocabularyWordsFound) capped.vocabularyWordsFound = capped.vocabularyWordsFound.slice(0, deckSize);
  return capped;
}

export function allowedPracticeXp(sessionXp: number, xpLast24h: number): number {
  return xpLast24h + sessionXp > PRACTICE_DAILY_XP_CAP ? 0 : sessionXp;
}

/** Null when the limits cannot be read in time; the caller then saves the session without XP. */
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
    const [lesson, sessions] = await Promise.race([
      Promise.all([
        admin.from("vocabulary_lessons").select("words").eq("id", lessonId).abortSignal(controller.signal).maybeSingle(),
        admin
          .from("practice_sessions")
          .select("xp_awarded")
          .eq("student_id", studentId)
          .gte("completed_at", new Date(nowMs - DAY_MS).toISOString())
          .gt("xp_awarded", 0)
          .limit(MAX_XP_ROWS)
          .abortSignal(controller.signal),
      ]),
      timedOut,
    ]);
    if (lesson.error) throw new Error(`lesson: ${lesson.error.message}`);
    if (!lesson.data) throw new Error("lesson not found");
    if (sessions.error) throw new Error(`sessions: ${sessions.error.message}`);
    const words = (lesson.data as { words?: unknown }).words;
    return {
      deckSize: Array.isArray(words) ? words.length : 0,
      xpLast24h: (sessions.data ?? []).reduce((sum, row) => sum + ((row as { xp_awarded: number }).xp_awarded ?? 0), 0),
    };
  } catch (err) {
    logger.error("Practice XP limits unavailable, saving session without XP:", err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
