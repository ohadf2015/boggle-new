import { isMultiWordTerm } from '@/lib/education/singleWordTerm';
import type { Classroom, VocabularyLesson, VocabularyWord, Language } from '@/lib/supabase/education/types';
import { STARTER_LESSON_PACKS } from '@/lib/education/starterLessonPacks';
import { convertPackWordsToLessonWords } from '@/lib/education/createLessonFromPack';
import type { ClassroomGameMode } from '@/shared/types/vocabQuiz';
import { resolveIntentMode, type QuickLaunchIntent } from '@/components/teacher/dashboard/quickLaunchIntent';

export type QuickLaunchFailure = { code: 'classroom' | 'lesson'; reason?: string };

export interface QuickLaunchProvisionDeps {
  /** Localised name for the class minted for a teacher who has none. */
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
  onStep?: (step: QuickLaunchFailure['code']) => void;
}

export type QuickLaunchProvision =
  | { ok: true; classroomId: string; lessonId: string; mode: ClassroomGameMode }
  | { ok: false; failure: QuickLaunchFailure };

type Step<T> = { ok: true; value: T } | { ok: false; failure: QuickLaunchFailure };

async function ensureClassroom(deps: QuickLaunchProvisionDeps, language: Language, preferredId?: string): Promise<Step<Classroom>> {
  let existing: Classroom[];
  try {
    existing = await deps.listClassrooms();
  } catch (err) {
    return { ok: false, failure: { code: 'classroom', reason: String(err) } };
  }
  // `getClassrooms` is newest-first; the HQ class chip wins only while the teacher still owns it.
  if (existing.length > 0) {
    return { ok: true, value: existing.find((c) => c.id === preferredId) ?? existing[0] };
  }
  const created = await deps.createClassroom(deps.defaultClassName, language);
  if (!created.success || !created.data) {
    return { ok: false, failure: { code: 'classroom', reason: created.code || created.error } };
  }
  return { ok: true, value: created.data };
}

async function ensureLesson(deps: QuickLaunchProvisionDeps, intent: QuickLaunchIntent): Promise<Step<VocabularyLesson>> {
  if (intent.source === 'lesson') {
    const lesson = intent.lessonId ? await deps.getLessonById(intent.lessonId) : null;
    if (!lesson) return { ok: false, failure: { code: 'lesson', reason: 'NOT_FOUND' } };
    if (!(lesson.words || []).some((w) => (w?.word || '').trim())) {
      return { ok: false, failure: { code: 'lesson', reason: 'EMPTY' } };
    }
    return { ok: true, value: lesson };
  }

  let words: VocabularyWord[];
  let language = (intent.language || deps.uiLanguage || 'en') as Language;
  let description = '';
  if (intent.source === 'pack') {
    const pack = STARTER_LESSON_PACKS.find((p) => p.nameKey === intent.packKey);
    if (!pack) return { ok: false, failure: { code: 'lesson', reason: 'PACK_NOT_FOUND' } };
    words = convertPackWordsToLessonWords(pack.words);
    language = pack.language;
    description = intent.title;
  } else {
    // The board cannot place a phrase like "rely on".
    const pasted = (intent.words || []).filter((w) => w.trim() && !isMultiWordTerm(w));
    if (pasted.length === 0) return { ok: false, failure: { code: 'lesson', reason: 'EMPTY' } };
    words = pasted.map((word) => ({ word, canIntegrate: true }));
  }

  const created = await deps.createLesson({ name: intent.title, description, language, words });
  if (created.error || !created.data) return { ok: false, failure: { code: 'lesson', reason: created.error?.message } };
  return { ok: true, value: created.data };
}

/** Resolves a quick-launch intent into a class, a lesson and a mode the lobby can open preselected. */
export async function provisionQuickLaunch(deps: QuickLaunchProvisionDeps, intent: QuickLaunchIntent): Promise<QuickLaunchProvision> {
  const language = (intent.language || deps.uiLanguage || 'en') as Language;
  deps.onStep?.('classroom');
  const classroom = await ensureClassroom(deps, language, intent.classroomId);
  if (!classroom.ok) return classroom;
  let lesson: Step<VocabularyLesson>;
  deps.onStep?.('lesson');
  try {
    lesson = await ensureLesson(deps, intent);
  } catch (err) {
    return { ok: false, failure: { code: 'lesson', reason: String(err) } };
  }
  if (!lesson.ok) return lesson;
  return {
    ok: true,
    classroomId: classroom.value.id,
    lessonId: lesson.value.id,
    mode: resolveIntentMode(intent.mode, lesson.value.words || []),
  };
}

/** `?flow=` of the lobby opened already decided, after provisioning (and on a reload of it). */
export const QUICK_PRESENTATION_FLOW = 'quick';
