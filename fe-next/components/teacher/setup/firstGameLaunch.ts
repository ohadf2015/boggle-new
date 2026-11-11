import { isMultiWordTerm } from '@/lib/education/singleWordTerm';
import { convertPackWordsToLessonWords } from '@/lib/education/createLessonFromPack';
import { createLessonAndAssign, type CreateLessonFn } from '@/lib/education/createLessonWithAssignment';
import type { StarterLessonPack } from '@/lib/education/starterLessonPacks';
import type { Language } from '@/lib/supabase/education/types';
import { parsePastedWords, type QuickLaunchIntent } from '@/components/teacher/dashboard/quickLaunchIntent';

export type FirstGameChoice =
  | { kind: 'paste'; words: string[] }
  | { kind: 'pack'; pack: StarterLessonPack; lessonId: string | null }
  | { kind: 'saved'; lessonId: string; fallback: StarterLessonPack; fallbackTitle: string };

export type FirstGameIntent = Omit<QuickLaunchIntent, 'createdAt'>;

export interface FirstGameLaunch {
  intent: FirstGameIntent;
  assignFailed: boolean;
  /** The teacher's saved list was not found, so the fallback pack ran instead. */
  listMissing?: boolean;
}

const SAVED_LISTS_KEY = 'lexiclash:firstGameSavedLists';

/** The board cannot place a phrase, so "rely on" never counts toward the list. */
export function readPasted(raw: string): { words: string[]; skipped: number } {
  const entries = parsePastedWords(raw);
  const words = entries.filter((w) => !isMultiWordTerm(w));
  return { words, skipped: entries.length - words.length };
}

function listKey(classroomId: string, choice: Exclude<FirstGameChoice, { kind: 'saved' }>): string {
  const content = choice.kind === 'paste' ? `paste:${choice.words.map((w) => w.toLocaleLowerCase()).join('\n')}` : `pack:${choice.pack.nameKey}`;
  return `${classroomId}|${content}`;
}

function readSavedLists(): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(SAVED_LISTS_KEY) ?? '{}');
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function rememberSavedList(key: string, lessonId: string): void {
  try {
    sessionStorage.setItem(SAVED_LISTS_KEY, JSON.stringify({ ...readSavedLists(), [key]: lessonId }));
  } catch {
    return;
  }
}

/** A failed lookup is not proof the list is gone, so only a clean "not there" triggers a new save. */
async function stillThere(lessonId: string, lessonExists: (id: string) => Promise<boolean>): Promise<boolean> {
  return lessonExists(lessonId).catch(() => true);
}

/** The first game is always Classic, on a list saved to this class; when the save fails the lobby makes the list itself. */
export async function firstGameIntent({
  choice,
  classroomId,
  language,
  title,
  teacherId,
  createLesson,
  lessonExists,
}: {
  choice: FirstGameChoice;
  classroomId: string;
  language: string;
  title: string;
  teacherId: string;
  createLesson: CreateLessonFn;
  lessonExists: (id: string) => Promise<boolean>;
}): Promise<FirstGameLaunch> {
  if (choice.kind === 'saved') {
    if (await stillThere(choice.lessonId, lessonExists)) {
      return { intent: { classroomId, mode: 'classic', title, language, source: 'lesson', lessonId: choice.lessonId }, assignFailed: false };
    }
    const fallback = await firstGameIntent({ choice: { kind: 'pack', pack: choice.fallback, lessonId: null }, classroomId, language, title: choice.fallbackTitle, teacherId, createLesson, lessonExists });
    return { ...fallback, listMissing: true };
  }
  const listLanguage = choice.kind === 'pack' ? choice.pack.language : language;
  const base = { classroomId, mode: 'classic' as const, title, language: listLanguage };
  const key = listKey(classroomId, choice);
  const known = [choice.kind === 'pack' ? choice.lessonId : null, readSavedLists()[key]].filter((id): id is string => Boolean(id));
  for (const id of known) {
    if (await stillThere(id, lessonExists)) return { intent: { ...base, source: 'lesson', lessonId: id }, assignFailed: false };
  }

  const words = choice.kind === 'paste' ? choice.words.map((word) => ({ word, canIntegrate: true })) : convertPackWordsToLessonWords(choice.pack.words);
  const saved = await createLessonAndAssign({
    lesson: { name: title, language: listLanguage as Language, words, classroomId },
    teacherId,
    createLesson,
  }).catch(() => null);
  const lessonId = saved?.success ? saved.lesson?.id : null;
  if (lessonId) {
    rememberSavedList(key, lessonId);
    return { intent: { ...base, source: 'lesson', lessonId }, assignFailed: !saved?.assigned };
  }
  const intent: FirstGameIntent = choice.kind === 'paste' ? { ...base, source: 'paste', words: choice.words } : { ...base, source: 'pack', packKey: choice.pack.nameKey };
  return { intent, assignFailed: false };
}
