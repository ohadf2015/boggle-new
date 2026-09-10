/**
 * The express runner — the whole "teacher pressed GO LIVE" path, with no UI.
 *
 * The full lobby (ClassroomGameLobby) asks a teacher for a classroom, a lesson,
 * a mode and four settings before it will make a room. Every one of those has a
 * defensible answer the moment the teacher's words are known, so this path
 * answers them and provisions whatever is missing:
 *
 *   words  → the intent already resolved them on the dashboard
 *   lesson → a starter pack or a pasted list becomes a real lesson here
 *   class  → a first-time teacher gets one silently; students still join by code
 *   mode   → derived from whether the words carry definitions
 *
 * It is a plain async function on purpose: the socket round-trip is the
 * component's job, and everything up to the emit is testable without a DOM.
 *
 * It never resolves "successfully" with nothing to launch. Every dead end comes
 * back as a named failure so the caller can say what happened, out loud, in
 * front of a class (pitfalls class 4 — a silent abort is indistinguishable from
 * "still working").
 */

import type { Classroom, VocabularyLesson, VocabularyWord, Language } from '@/lib/supabase/education/types';
import { STARTER_LESSON_PACKS } from '@/lib/education/starterLessonPacks';
import { convertPackWordsToLessonWords } from '@/lib/education/createLessonFromPack';
import {
  VOCAB_QUIZ_DEFAULT_QUESTION_COUNT,
  VOCAB_QUIZ_DEFAULT_SECONDS,
  type ClassroomGameMode,
} from '@/shared/types/vocabQuiz';
import {
  pickQuickLaunchMode,
  type QuickLaunchIntent,
} from '@/components/teacher/dashboard/quickLaunchIntent';

/** Sane-by-default round: long enough to be a game, short enough to be a warm-up. */
export const EXPRESS_TIMER_MINUTES = 3;
export const EXPRESS_BOARD_SIZE = 'medium' as const;
export const EXPRESS_MIN_WORD_LENGTH = 3;

export type QuickLaunchStage = 'classroom' | 'lesson' | 'room';

export type QuickLaunchFailure =
  | { code: 'classroom'; reason?: string }
  | { code: 'lesson'; reason?: string }
  | { code: 'room'; reason?: string };

export interface QuickLaunchDeps {
  userId: string;
  teacherName: string;
  gameCode: string;
  /** Localised name for the classroom we mint for a teacher who has none. */
  defaultClassName: string;
  uiLanguage: string;
  listClassrooms: () => Promise<Classroom[]>;
  createClassroom: (
    name: string,
    language: Language
  ) => Promise<{ success: boolean; data?: Classroom; error?: string; code?: string }>;
  getLessonById: (id: string) => Promise<VocabularyLesson | null>;
  createLesson: (input: {
    name: string;
    description?: string;
    language: Language;
    words: VocabularyWord[];
  }) => Promise<{ data?: VocabularyLesson | null; error?: { message: string } | null }>;
  onStage: (stage: QuickLaunchStage) => void;
}

export interface CreateClassroomGamePayload {
  gameCode: string;
  classroomId: string;
  teacherId: string;
  teacherName: string;
  lessonIds: string[];
  lessonNames: string[];
  vocabularyWords: string[];
  settings: {
    timerMinutes: number;
    boardSize: 'small' | 'medium' | 'large';
    allowLateJoin: boolean;
    gameMode: ClassroomGameMode;
    playStyle: 'ffa';
    vocabQuizFocus?: 'any';
    vocabQuizQuestionCount?: number;
    vocabQuizSeconds?: number;
  };
}

export type QuickLaunchResult =
  | {
      ok: true;
      payload: CreateClassroomGamePayload;
      classroom: Classroom;
      lesson: VocabularyLesson;
    }
  | { ok: false; failure: QuickLaunchFailure };

function asLanguage(value: string | undefined, fallback: string): Language {
  const candidate = (value || fallback || 'en') as Language;
  return candidate;
}

/** The classroom the room hangs off — the teacher's first, or a fresh one. */
async function ensureClassroom(
  deps: QuickLaunchDeps,
  language: Language
): Promise<{ ok: true; classroom: Classroom } | { ok: false; failure: QuickLaunchFailure }> {
  let existing: Classroom[] = [];
  try {
    existing = await deps.listClassrooms();
  } catch (err) {
    return { ok: false, failure: { code: 'classroom', reason: String(err) } };
  }
  // `getClassrooms` orders newest-first, so a teacher with several classes
  // gets their most recently created one. This path exists to ask nothing, and
  // a live round is a four-hour Redis key, not an enrolment — the class a game
  // hangs off only decides whose roster the scores land against. A teacher who
  // needs a specific class uses Full setup.
  if (existing.length > 0) return { ok: true, classroom: existing[0] };

  const created = await deps.createClassroom(deps.defaultClassName, language);
  if (!created.success || !created.data) {
    // The class cap is the realistic case here, and it must be SAID — a free
    // teacher at the cap would otherwise watch a spinner forever.
    return { ok: false, failure: { code: 'classroom', reason: created.code || created.error } };
  }
  return { ok: true, classroom: created.data };
}

/** The lesson the round drills — looked up, or minted from a pack / a paste. */
async function ensureLesson(
  deps: QuickLaunchDeps,
  intent: QuickLaunchIntent
): Promise<{ ok: true; lesson: VocabularyLesson } | { ok: false; failure: QuickLaunchFailure }> {
  if (intent.source === 'lesson') {
    const lesson = intent.lessonId ? await deps.getLessonById(intent.lessonId) : null;
    if (!lesson) return { ok: false, failure: { code: 'lesson', reason: 'NOT_FOUND' } };
    if (!(lesson.words || []).some((w) => (w?.word || '').trim())) {
      return { ok: false, failure: { code: 'lesson', reason: 'EMPTY' } };
    }
    return { ok: true, lesson };
  }

  let words: VocabularyWord[] = [];
  let name = intent.title;
  let description = '';
  let language = asLanguage(intent.language, deps.uiLanguage);

  if (intent.source === 'pack') {
    const pack = STARTER_LESSON_PACKS.find((p) => p.nameKey === intent.packKey);
    if (!pack) return { ok: false, failure: { code: 'lesson', reason: 'PACK_NOT_FOUND' } };
    words = convertPackWordsToLessonWords(pack.words);
    language = pack.language;
    description = intent.title;
  } else {
    const pasted = (intent.words || []).filter((w) => w.trim());
    if (pasted.length === 0) return { ok: false, failure: { code: 'lesson', reason: 'EMPTY' } };
    words = pasted.map((word) => ({ word, canIntegrate: true }));
    name = intent.title;
  }

  const created = await deps.createLesson({ name, description, language, words });
  if (created.error || !created.data) {
    return { ok: false, failure: { code: 'lesson', reason: created.error?.message } };
  }
  return { ok: true, lesson: created.data };
}

export async function prepareQuickLaunch(
  deps: QuickLaunchDeps,
  intent: QuickLaunchIntent
): Promise<QuickLaunchResult> {
  const language = asLanguage(intent.language, deps.uiLanguage);

  deps.onStage('classroom');
  const classroomStep = await ensureClassroom(deps, language);
  if (!classroomStep.ok) return classroomStep;

  deps.onStage('lesson');
  const lessonStep = await ensureLesson(deps, intent);
  if (!lessonStep.ok) return lessonStep;

  deps.onStage('room');
  const lesson = lessonStep.lesson;
  const lessonWords = lesson.words || [];
  const vocabularyWords = [
    ...new Set(lessonWords.map((w) => (w?.word || '').trim()).filter(Boolean)),
  ];
  if (vocabularyWords.length === 0) {
    return { ok: false, failure: { code: 'lesson', reason: 'EMPTY' } };
  }

  const gameMode = pickQuickLaunchMode(lessonWords);
  const isQuiz = gameMode === 'vocab-quiz';

  return {
    ok: true,
    classroom: classroomStep.classroom,
    lesson,
    payload: {
      gameCode: deps.gameCode,
      classroomId: classroomStep.classroom.id,
      teacherId: deps.userId,
      teacherName: deps.teacherName,
      lessonIds: [lesson.id],
      lessonNames: [lesson.name],
      vocabularyWords,
      settings: {
        timerMinutes: EXPRESS_TIMER_MINUTES,
        boardSize: EXPRESS_BOARD_SIZE,
        allowLateJoin: true,
        gameMode,
        playStyle: 'ffa',
        ...(isQuiz
          ? {
              vocabQuizFocus: 'any' as const,
              vocabQuizQuestionCount: VOCAB_QUIZ_DEFAULT_QUESTION_COUNT,
              vocabQuizSeconds: VOCAB_QUIZ_DEFAULT_SECONDS,
            }
          : {}),
      },
    },
  };
}
