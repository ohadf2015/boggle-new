/**
 * Classroom Game Persistence
 *
 * Persists classroom MP game scores to `practice_sessions`, awards
 * education XP via the `award_education_xp` RPC, and — the part the teacher
 * analytics actually read — upserts `student_lesson_progress` for every
 * human player × lesson so "which words did the class struggle with",
 * "students needing help" and the vocabulary heatmap reflect live games,
 * not only solo practice. Extracted from classroomGameHandler.ts so the
 * data path can be unit-tested in isolation.
 *
 * F-05: When a game covers multiple lessons, XP is split evenly across
 *       all lessonIds instead of being attributed to lessonIds[0] only.
 * F-06: `mode` column stores the real game mode (classic/wordHunt/blast)
 *       and `classroom_id` is populated so analytics can distinguish
 *       classroom MP games from solo practice. `practice_type` remains
 *       'solo_board' because of the CHECK constraint from migration 058.
 *
 * XP columns (`total_xp`, `current_level`, streaks, …) are NEVER written
 * here — only through the RPC. The progress upsert touches exactly
 * `words_attempted`, `words_mastered` and `started_at`.
 */

import { getSupabase } from '../modules/supabase/client.js';
import { getRedisClient } from '../redisClient.js';
import type { ClassroomGame } from '../modules/classroomGameManager.js';
import { matchKey } from '../modules/classroomSummary.js';
import { normalizeWord } from '@/shared/utils/wordNormalization';
import type { Language } from '@/shared/types/game';
import logger from '../utils/logger.js';

type PlayerScore = { userId: string; score: number; wordsFound?: string[]; username?: string };

/**
 * Per-player reward summary returned from persistClassroomGameScores.
 * The classroomGameEnded broadcast uses this to tell each client how much
 * XP the server awarded, so the frontend can drive LevelUpCelebration /
 * AchievementUnlockModal via a level-diff detector.
 */
export type ClassroomGameReward = {
  userId: string;
  xpEarned: number;
  lessonIds: string[];
};

/** Shape stored in `practice_sessions.results` for classroom games. */
export interface ClassroomSessionResults {
  gameCode: string;
  gameMode: string;
  lessonIds: string[];
  /** Lesson words this player found, in the teacher's display form. */
  lessonWordsFound: string[];
  /** Lesson words this player did NOT find, in the teacher's display form. */
  lessonWordsMissed: string[];
  /** Every validated word the player found, as received (lesson or not). */
  allWordsFound: string[];
  durationSeconds?: number;
  playerCount: number;
}

interface WordAttempt {
  attempts: number;
  correct: number;
  lastAttemptAt: string;
}

/** One lesson's vocabulary, keyed for matching. `display` keeps the teacher's form. */
interface LessonVocabulary {
  language: Language;
  /** matchKey → display word */
  words: Map<string, string>;
}

const HEBREW_RE = /[\u0590-\u05FF]/;

/**
 * Hebrew words are normalized as Hebrew no matter what the lesson claims to
 * be — mirrors `normalizeForStorage` on the client so keys written here and
 * keys written by solo practice land on the same `words_attempted` entry.
 */
function effectiveLanguage(word: string, language: Language): Language {
  return HEBREW_RE.test(word) ? 'he' : language;
}

function keyOf(word: string, language: Language): string {
  return matchKey(word, effectiveLanguage(word, language));
}

/** Storage key for `words_attempted` — lowercase / finals collapsed, like `normalizeForStorage`. */
function storageKey(word: string, language: Language): string {
  return normalizeWord(word.trim(), effectiveLanguage(word, language));
}

function buildVocabulary(rawWords: unknown, language: Language): LessonVocabulary {
  const words = new Map<string, string>();
  const list = Array.isArray(rawWords) ? rawWords : [];
  for (const entry of list) {
    const raw = typeof entry === 'string' ? entry : (entry as { word?: unknown })?.word;
    if (typeof raw !== 'string' || raw.trim() === '') continue;
    const key = keyOf(raw, language);
    if (!words.has(key)) words.set(key, raw.trim());
  }
  return { language, words };
}

/**
 * Load each lesson's own vocabulary in ONE query. Falls back to the game's
 * union vocabulary (attributed to every lesson) when the lookup fails, and
 * says so loudly — a silent empty map here would make every game look like
 * "no lesson words attempted".
 */
async function loadLessonVocabulary(
  supabase: NonNullable<ReturnType<typeof getSupabase>>,
  game: ClassroomGame
): Promise<Map<string, LessonVocabulary>> {
  const byLesson = new Map<string, LessonVocabulary>();
  const lessonIds = game.lessonIds ?? [];
  const unionLanguage: Language = (game.vocabularyWords ?? []).some((w) => HEBREW_RE.test(w)) ? 'he' : 'en';

  try {
    const { data, error } = await supabase
      .from('vocabulary_lessons')
      .select('id, words, language')
      .in('id', lessonIds);

    if (error) throw new Error(error.message);

    for (const row of (data ?? []) as Array<{ id: string; words: unknown; language?: string }>) {
      byLesson.set(row.id, buildVocabulary(row.words, (row.language as Language) || unionLanguage));
    }
    for (const lessonId of lessonIds) {
      if (!byLesson.has(lessonId)) {
        logger.warn(
          'CLASSROOM_GAME',
          `Lesson ${lessonId} not found for game ${game.gameCode} — progress for it will be skipped`
        );
      }
    }
  } catch (err) {
    logger.error(
      'CLASSROOM_GAME',
      `Failed to load lesson vocabulary for game ${game.gameCode} (${(err as Error).message}); ` +
        `falling back to the game's ${game.vocabularyWords?.length ?? 0} union words for all lessons`
    );
    byLesson.clear();
    for (const lessonId of lessonIds) {
      byLesson.set(lessonId, buildVocabulary(game.vocabularyWords ?? [], unionLanguage));
    }
  }
  return byLesson;
}

/** Split a lesson's words into found / missed (display form) for one player. */
function splitLessonWords(vocab: LessonVocabulary, foundKeys: Set<string>) {
  const found: string[] = [];
  const missed: string[] = [];
  for (const [key, display] of vocab.words) {
    (foundKeys.has(key) ? found : missed).push(display);
  }
  return { found, missed };
}

/**
 * Read-modify-write of `student_lesson_progress` for one student × lesson.
 * Every lesson word counts as attempted; found words also count as correct
 * and join `words_mastered` (deduped by normalized key).
 */
async function upsertLessonProgress(
  supabase: NonNullable<ReturnType<typeof getSupabase>>,
  studentId: string,
  lessonId: string,
  vocab: LessonVocabulary,
  foundKeys: Set<string>,
  now: string
): Promise<void> {
  const { data: existing, error: readError } = await supabase
    .from('student_lesson_progress')
    .select('words_attempted, words_mastered, started_at')
    .eq('student_id', studentId)
    .eq('lesson_id', lessonId)
    .maybeSingle();

  if (readError) throw new Error(`read progress: ${readError.message}`);

  const wordsAttempted: Record<string, WordAttempt> = {
    ...((existing?.words_attempted as Record<string, WordAttempt> | null) ?? {}),
  };
  const wordsMastered: string[] = [...((existing?.words_mastered as string[] | null) ?? [])];
  const masteredKeys = new Set(wordsMastered.map((w) => keyOf(w, vocab.language)));

  for (const [key, display] of vocab.words) {
    const found = foundKeys.has(key);
    const sKey = storageKey(display, vocab.language);
    const prev = wordsAttempted[sKey];
    wordsAttempted[sKey] = {
      attempts: (prev?.attempts ?? 0) + 1,
      correct: (prev?.correct ?? 0) + (found ? 1 : 0),
      lastAttemptAt: now,
    };
    if (found && !masteredKeys.has(key)) {
      masteredKeys.add(key);
      wordsMastered.push(display);
    }
  }

  const { error: upsertError } = await supabase
    .from('student_lesson_progress')
    .upsert(
      {
        student_id: studentId,
        lesson_id: lessonId,
        words_attempted: wordsAttempted,
        words_mastered: wordsMastered,
        started_at: existing?.started_at ?? now,
      },
      { onConflict: 'student_id,lesson_id' }
    );

  if (upsertError) throw new Error(`upsert progress: ${upsertError.message}`);
}

/**
 * Adapter for the server-side game-end path (gameLifecycle/gameScores.ts):
 * turns the validated results payload + the room's user map into the
 * `playerScores` shape `persistClassroomGameScores` consumes. Bots and
 * guests (no auth user id) are dropped — neither has lesson progress.
 * A duplicate word scores zero but the student DID find it, so it counts;
 * only the validator's rejection means "not found".
 */
export function playerScoresFromGameResults(
  results: Array<{
    username: string;
    totalScore: number;
    wordDetails?: Array<{ word: string; validated: boolean; isDuplicate?: boolean }>;
  }>,
  users: Record<string, { authUserId?: string | null; isBot?: boolean } | undefined>
): PlayerScore[] {
  const scores: PlayerScore[] = [];
  for (const result of results) {
    const user = users[result.username];
    if (!user || user.isBot || !user.authUserId) continue;
    scores.push({
      userId: user.authUserId,
      username: result.username,
      score: result.totalScore,
      wordsFound: (result.wordDetails ?? []).filter((d) => d.validated).map((d) => d.word),
    });
  }
  return scores;
}

export async function persistClassroomGameScores(
  game: ClassroomGame | null | undefined,
  playerScores?: PlayerScore[]
): Promise<ClassroomGameReward[]> {
  if (!game) return [];

  // Idempotency guard: only persist once per game using Redis SET NX
  const redis = getRedisClient();
  if (redis) {
    const idempotencyKey = `classroom_game_persisted:${game.gameCode}`;
    const acquired = await redis.set(idempotencyKey, '1', 'EX', 86400, 'NX');
    if (!acquired) {
      logger.info(
        'CLASSROOM_GAME',
        `Scores for game ${game.gameCode} already persisted — skipping duplicate`
      );
      return [];
    }
  }

  const supabase = getSupabase();
  if (!supabase) {
    logger.warn('CLASSROOM_GAME', 'Supabase not configured, skipping score persistence');
    return [];
  }

  const lessonIds = game.lessonIds ?? [];
  if (lessonIds.length === 0) {
    logger.warn(
      'CLASSROOM_GAME',
      `Game ${game.gameCode} has no lesson IDs, skipping persistence`
    );
    return [];
  }

  const rewards: ClassroomGameReward[] = [];

  // Anchor the session row to the first lesson to avoid inflating
  // `board_sessions` counts in analytics views. Multi-lesson attribution
  // is handled at the XP + progress layers below (F-05).
  const primaryLessonId = lessonIds[0];
  const gameMode = game.settings?.gameMode ?? 'classic';
  const now = new Date().toISOString();

  // One lesson lookup per game, shared by every player below.
  const vocabByLesson = await loadLessonVocabulary(supabase, game);

  // Union of all lessons' words → what the session row reports as "attempted".
  const unionWords = new Map<string, string>();
  let unionLanguage: Language = 'en';
  for (const vocab of vocabByLesson.values()) {
    unionLanguage = vocab.language;
    for (const [key, display] of vocab.words) if (!unionWords.has(key)) unionWords.set(key, display);
  }
  const unionVocab: LessonVocabulary = { language: unionLanguage, words: unionWords };

  const durationSeconds = game.startedAt
    ? Math.max(0, Math.round((Date.now() - new Date(game.startedAt).getTime()) / 1000))
    : undefined;

  for (const player of game.players) {
    let xpEarned = 0;
    try {
      const playerScore = playerScores?.find(ps => ps.userId === player.userId);
      const score = playerScore?.score ?? 0;
      const wordsFound = playerScore?.wordsFound ?? [];

      // Keys the player found, under every lesson's normalization (lessons in
      // one game share a language in practice; keying per language is cheap).
      const foundKeys = new Set<string>();
      for (const word of wordsFound) {
        foundKeys.add(keyOf(word, unionLanguage));
        for (const vocab of vocabByLesson.values()) foundKeys.add(keyOf(word, vocab.language));
      }

      const { found: lessonWordsFound, missed: lessonWordsMissed } = splitLessonWords(unionVocab, foundKeys);
      const attempted = unionWords.size;
      const correct = lessonWordsFound.length;

      const results: ClassroomSessionResults = {
        gameCode: game.gameCode,
        gameMode,
        lessonIds,
        lessonWordsFound,
        lessonWordsMissed,
        allWordsFound: wordsFound,
        durationSeconds,
        playerCount: game.players.length,
      };

      const { error: sessionError } = await supabase
        .from('practice_sessions')
        .insert({
          student_id: player.userId,
          lesson_id: primaryLessonId,
          classroom_id: game.classroomId, // F-06
          practice_type: 'solo_board',     // constrained by 058 CHECK
          mode: gameMode,                  // F-06: real mode
          total_score: score,
          score,
          words_found: wordsFound,
          vocabulary_words_found: lessonWordsFound,
          words_attempted: attempted,
          words_correct: correct,
          accuracy: attempted > 0 ? Math.round((correct / attempted) * 100) : null,
          duration_seconds: durationSeconds ?? null,
          results,
          completed_at: now,
        });

      if (sessionError) {
        logger.error(
          'CLASSROOM_GAME',
          `Failed to create practice session for ${player.userId}: ${sessionError.message}`
        );
        continue;
      }

      // Lesson progress — the rows the teacher analytics read. One failure
      // must not hide the other lessons (or the XP below).
      for (const lessonId of lessonIds) {
        const vocab = vocabByLesson.get(lessonId);
        if (!vocab || vocab.words.size === 0) continue;
        try {
          await upsertLessonProgress(supabase, player.userId, lessonId, vocab, foundKeys, now);
        } catch (err) {
          logger.error(
            'CLASSROOM_GAME',
            `Failed to record lesson progress for ${player.userId} on lesson ${lessonId} ` +
              `(game ${game.gameCode}): ${(err as Error).message}`
          );
        }
      }

      // F-05: Split XP across all lessons covered by this game.
      if (score > 0) {
        const totalXp = Math.max(10, Math.floor(score / 10));
        const perLessonXp = Math.floor(totalXp / lessonIds.length);
        if (perLessonXp === 0) {
          rewards.push({ userId: player.userId, xpEarned: 0, lessonIds });
          continue;
        }
        xpEarned = totalXp;

        for (const lessonId of lessonIds) {
          const { error: xpError } = await supabase.rpc('award_education_xp', {
            p_student_id: player.userId,
            p_xp_amount: perLessonXp,
            p_lesson_id: lessonId,
          });

          if (xpError) {
            logger.error(
              'CLASSROOM_GAME',
              `Failed to award XP for ${player.userId} on lesson ${lessonId}: ${xpError.message}`
            );
          } else {
            logger.info(
              'CLASSROOM_GAME',
              `Awarded ${perLessonXp} XP to ${player.userId} for lesson ${lessonId} (game ${game.gameCode})`
            );
          }
        }
      }
    } catch (error) {
      logger.error(
        'CLASSROOM_GAME',
        `Error persisting score for player ${player.userId}: ${error}`
      );
    }
    rewards.push({ userId: player.userId, xpEarned, lessonIds });
  }

  return rewards;
}
