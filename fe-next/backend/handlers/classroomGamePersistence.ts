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
import type { Language } from '@/shared/types/game';
import logger from '../utils/logger.js';
import {
  buildClassroomGameCompletedEvents,
  captureEduServerEvents,
  type ClassroomPlayerOutcome,
} from '../utils/educationTelemetry';

import type { PlayerScore } from './classroomRoundParticipants.js';
import { recordClassroomRound } from './classroomRoundRecord';
import { awardLessonXp, retryDbWrite } from './classroomXpAward';
import {
  keyOf,
  loadLessonVocabulary,
  restrictToAsked,
  splitLessonWords,
  upsertLessonProgress,
  type LessonVocabulary,
} from './classroomLessonVocabulary';
import { loadTestAccountIds } from '@/lib/education/eduTestAccount';

export { playerScoresFromGameResults, roundHasStudents } from './classroomRoundParticipants.js';

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
  /**
   * The lesson words this game actually PUT IN FRONT of the student.
   *
   * Absent for board modes, where the whole lesson is on the grid and every
   * word really was attemptable. Present for a quiz, which asks a fixed number
   * of questions from a possibly much longer list — without it, every unasked
   * word lands in the teacher's "reteach these" column.
   */
  lessonWordsAsked?: string[];
  /** Per-question detail, when the mode has it. Quiz only today. */
  answers?: QuestionAnswer[];
  durationSeconds?: number;
  playerCount: number;
}

/** One question as this student answered it. */
export interface QuestionAnswer {
  /** The LESSON word drilled — not the answer text, which may be a synonym. */
  word: string;
  choiceIndex: number;
  correct: boolean;
  /** Time to answer, ms. */
  ms: number;
}

export interface PersistClassroomOptions {
  /**
   * Lesson words this game asked. Game-level: one question list is broadcast
   * to everyone. Omit (or pass empty, meaning "unknown") to keep the board
   * behaviour of treating every lesson word as attempted.
   */
  askedWords?: string[];
  /** Per-student per-question answers, keyed by Supabase auth id. */
  answersByUser?: Record<string, QuestionAnswer[]>;
}

/**
 * Everyone whose round should be recorded.
 *
 * `game.players` is the CLASSROOM roster, filled ONLY by the
 * `joinClassroomGame` socket event. Students who reach the room the ordinary
 * way — the join page, the projector code, `playerJoinHandler` — never emit
 * it, so that list is routinely EMPTY while a full class is playing. Looping
 * it alone is why game GHYRVS (2026-09-05, two students, ten questions,
 * everyone at the end screen) produced no rows, no error and no log, and why
 * `practice_sessions` held zero classroom-game rows in total.
 *
 * The people who actually played are in `playerScores`, which each mode builds
 * from its own live roster. The truth is the union of the two, keyed by user
 * id: the roster contributes students who joined and scored nothing, the
 * scores contribute students the roster never heard about.
 *
 * The teacher is dropped — they host, they do not compete, and a teacher row
 * would show up as a student in the report's word x student grid.
 */
function collectParticipants(
  game: ClassroomGame,
  playerScores?: PlayerScore[]
): PlayerScore[] {
  const byUser = new Map<string, PlayerScore>();
  const add = (userId: string | undefined | null, username?: string) => {
    if (!userId || userId === game.teacherId || byUser.has(userId)) return;
    byUser.set(userId, { userId, username, score: 0 });
  };
  for (const player of game.players ?? []) add(player?.userId, player?.username);
  for (const score of playerScores ?? []) add(score?.userId, score?.username);
  return [...byUser.values()];
}

/** Fails open: a lookup error keeps every participant rather than wiping the teacher's report. */
async function dropNonMembers(
  supabase: NonNullable<ReturnType<typeof getSupabase>>,
  game: ClassroomGame,
  participants: PlayerScore[]
): Promise<PlayerScore[]> {
  if (participants.length === 0) return participants;
  try {
    const { data, error } = await supabase
      .from('classroom_memberships')
      .select('student_id')
      .eq('classroom_id', game.classroomId)
      .in('student_id', participants.map((p) => p.userId));
    if (error) throw new Error(error.message);
    const members = new Set(((data ?? []) as Array<{ student_id: string }>).map((row) => row.student_id));
    const kept = participants.filter((p) => members.has(p.userId));
    if (kept.length < participants.length) {
      logger.warn(
        'CLASSROOM_GAME',
        `Game ${game.gameCode}: skipped ${participants.length - kept.length} player(s) who are not members of classroom ${game.classroomId}`
      );
    }
    return kept;
  } catch (err) {
    logger.error('CLASSROOM_GAME', `Membership lookup failed for game ${game.gameCode}, recording every player: ${(err as Error).message}`);
    return participants;
  }
}

export async function persistClassroomGameScores(
  game: ClassroomGame | null | undefined,
  playerScores?: PlayerScore[],
  options: PersistClassroomOptions = {}
): Promise<ClassroomGameReward[]> {
  if (!game) return [];

  // Idempotency guard: only persist once per game using Redis SET NX.
  //
  // The key is taken BEFORE we know whether there is anything to write, so
  // every path that writes nothing must give it back. Otherwise the first
  // caller to reach this function poisons the game code for 24 hours and the
  // path that really does have the results — the mode's own end handler — is
  // refused as a duplicate. That is exactly how GHYRVS was lost: the board
  // orphan guard force-ended the room, took the key with empty board results,
  // and the quiz's `finishQuiz` was turned away 29 seconds later.
  const redis = getRedisClient();
  const idempotencyKey = `classroom_game_persisted:${game.gameCode}`;
  let holdsKey = false;
  const releaseIdempotency = async (): Promise<void> => {
    if (!redis || !holdsKey) return;
    holdsKey = false;
    try {
      await redis.del(idempotencyKey);
    } catch (err) {
      logger.error(
        'CLASSROOM_GAME',
        `Failed to release the persistence lock for ${game.gameCode}: ${(err as Error).message}`
      );
    }
  };

  if (redis) {
    const acquired = await redis.set(idempotencyKey, '1', 'EX', 86400, 'NX');
    if (!acquired) {
      logger.info(
        'CLASSROOM_GAME',
        `Scores for game ${game.gameCode} already persisted — skipping duplicate`
      );
      return [];
    }
    holdsKey = true;
  }

  const supabase = getSupabase();
  if (!supabase) {
    logger.warn('CLASSROOM_GAME', 'Supabase not configured, skipping score persistence');
    await releaseIdempotency();
    return [];
  }

  const participants = await dropNonMembers(supabase, game, collectParticipants(game, playerScores));
  const teacherOnly = !!playerScores?.length && playerScores.every((s) => s.userId === game.teacherId);
  if (participants.length === 0 && teacherOnly) {
    logger.info('CLASSROOM_GAME', `Game ${game.gameCode}: practice round, only the teacher scored — nothing to record`);
    await releaseIdempotency();
    return [];
  }
  // Warn, do not info. A finished game that wrote nothing is the GHYRVS
  // failure (pitfall class 4): the persistence tests pin a warn that names
  // the game and "no participants" / "0 practice sessions". Teacher-only
  // practice is the info branch above. This message stays out of Sentry
  // (logger.ts) so issue 2GY does not reopen; do not drop the warn.
  if (participants.length === 0) {
    logger.warn(
      'CLASSROOM_GAME',
      `Game ${game.gameCode} ended with no participants to record ` +
        `(roster ${game.players?.length ?? 0}, scores ${playerScores?.length ?? 0}) — ` +
        `0 practice sessions written`
    );
    await releaseIdempotency();
    return [];
  }

  const lessonIds = game.lessonIds ?? [];
  if (lessonIds.length === 0) {
    logger.warn(
      'CLASSROOM_GAME',
      `Game ${game.gameCode} has no lesson IDs, skipping persistence`
    );
    await releaseIdempotency();
    return [];
  }

  const rewards: ClassroomGameReward[] = [];
  /** Per-player outcomes for `edu_classroom_game_completed` (emitted after the loop). */
  const outcomes: ClassroomPlayerOutcome[] = [];
  let sessionsWritten = 0;

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

  // Keys of the words this game actually asked, under the union's
  // normalization. Null for board modes → every lesson word stays attemptable.
  const askedKeys = options.askedWords && options.askedWords.length > 0
    ? new Set(options.askedWords.map((w) => keyOf(w, unionLanguage)))
    : null;
  const askedVocab = restrictToAsked(unionVocab, askedKeys);

  const durationSeconds = game.startedAt
    ? Math.max(0, Math.round((Date.now() - new Date(game.startedAt).getTime()) / 1000))
    : undefined;

  for (const player of participants) {
    let xpEarned = 0;
    // Telemetry-only mirrors of the per-player stats computed inside the try.
    // Declared out here so a mid-loop throw still reports what was known.
    let plScore = 0;
    let plFound = 0;
    let plAsked = 0;
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

      const { found: lessonWordsFound, missed: lessonWordsMissed } = splitLessonWords(askedVocab, foundKeys);
      const attempted = askedVocab.words.size;
      const correct = lessonWordsFound.length;
      plScore = score;
      plFound = correct;
      plAsked = attempted;

      const results: ClassroomSessionResults = {
        gameCode: game.gameCode,
        gameMode,
        lessonIds,
        lessonWordsFound,
        lessonWordsMissed,
        allWordsFound: wordsFound,
        // Only when we truly know — an absent field tells the report to keep
        // its "may include unasked words" caveat for older rows.
        ...(askedKeys ? { lessonWordsAsked: [...askedVocab.words.values()] } : {}),
        ...(options.answersByUser?.[player.userId]
          ? { answers: options.answersByUser[player.userId] }
          : {}),
        durationSeconds,
        playerCount: participants.length,
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
          `Failed to create practice session for ${player.userId} in game ${game.gameCode}: ` +
            `${sessionError.message}`
        );
        continue;
      }
      sessionsWritten += 1;

      // Lesson progress — the rows the teacher analytics read. One failure
      // must not hide the other lessons (or the XP below).
      for (const lessonId of lessonIds) {
        const lessonVocab = vocabByLesson.get(lessonId);
        if (!lessonVocab || lessonVocab.words.size === 0) continue;
        // Unasked words get no words_attempted entry at all — "not attempted",
        // never "missed". That distinction is the whole point of the asked set.
        const vocab = restrictToAsked(lessonVocab, askedKeys);
        if (vocab.words.size === 0) continue;
        try {
          await retryDbWrite(() => upsertLessonProgress(supabase, player.userId, lessonId, vocab, foundKeys, now));
        } catch (err) {
          logger.error(
            'CLASSROOM_GAME',
            `Failed to record lesson progress for ${player.userId} on lesson ${lessonId} ` +
              `(game ${game.gameCode}): ${(err as Error).message}`
          );
        }
      }

      xpEarned = await awardLessonXp(supabase, { userId: player.userId, lessonIds, score, gameCode: game.gameCode });
    } catch (error) {
      logger.error(
        'CLASSROOM_GAME',
        `Error persisting score for player ${player.userId}: ${error}`
      );
    }
    rewards.push({ userId: player.userId, xpEarned, lessonIds });
    outcomes.push({
      userId: player.userId,
      score: plScore,
      xpEarned,
      // ...Count, deliberately: the `results` blob above has its own
      // `lessonWordsFound` / `lessonWordsAsked` and those are string[].
      lessonWordsFoundCount: plFound,
      lessonWordsAskedCount: plAsked,
      isTestAccount: false,
    });
  }

  // The only place a real classroom practice completion is observable. The
  // browser-side `edu_practice_complete` cannot see this path at all — it lives
  // in PracticeSessionProvider, which this server never runs.
  const flagged = await loadTestAccountIds(supabase, [game.teacherId, ...outcomes.map((o) => o.userId)]);
  for (const o of outcomes) o.isTestAccount = flagged.has(game.teacherId) || flagged.has(o.userId);
  captureEduServerEvents(buildClassroomGameCompletedEvents(game, outcomes));

  if (sessionsWritten > 0) {
    await recordClassroomRound(game, {
      playerIds: participants.map((p) => p.userId),
      durationSeconds: game.startedAt
        ? Math.max(0, Math.round((Date.now() - new Date(game.startedAt).getTime()) / 1000))
        : null,
      startedAt: game.startedAt ? new Date(game.startedAt) : null,
    });
  }

  // The teacher's whole report hangs off these rows, so their count is the one
  // fact worth stating out loud. A round that wrote nothing releases the lock
  // so the mode's own end path still has a chance to write the real results.
  if (sessionsWritten === 0) {
    logger.warn(
      'CLASSROOM_GAME',
      `Game ${game.gameCode} wrote 0 practice sessions for ${participants.length} participants — ` +
        `the teacher's report will be empty`
    );
    await releaseIdempotency();
  } else {
    logger.info(
      'CLASSROOM_GAME',
      `Persisted ${sessionsWritten} practice session row(s) for game ${game.gameCode} ` +
        `(${participants.length} participants, classroom ${game.classroomId})`
    );
  }

  return rewards;
}
