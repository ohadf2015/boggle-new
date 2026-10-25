import { STARTER_LESSON_PACKS } from '@/lib/education/starterLessonPacks';
import type { QuickLaunchIntent } from '@/components/teacher/dashboard/quickLaunchIntent';
import { REHEARSAL_FALLBACK_MODE } from './rehearsal';

interface LessonLike {
  id: string;
  name: string;
  language: string;
  words?: ReadonlyArray<{ word?: string }> | null;
}

interface Args {
  /** Newest first, as getLessons returns them. */
  lessons: ReadonlyArray<LessonLike>;
  uiLanguage: string;
  classroomId: string | undefined;
  packName: (nameKey: string) => string;
}

/** A rehearsal reuses the teacher's own list when there is one, so each tap does not leave a new list behind. */
export function buildRehearsalLaunch({ lessons, uiLanguage, classroomId, packName }: Args): Omit<QuickLaunchIntent, 'createdAt'> {
  const lesson = lessons.find((l) => (l.words ?? []).some((w) => (w?.word ?? '').trim()));
  const base = { classroomId, mode: REHEARSAL_FALLBACK_MODE };
  if (lesson) {
    return { ...base, source: 'lesson', lessonId: lesson.id, title: lesson.name, language: lesson.language };
  }
  const pack =
    STARTER_LESSON_PACKS.find((p) => p.language === uiLanguage) ??
    STARTER_LESSON_PACKS.find((p) => p.language === 'en') ??
    STARTER_LESSON_PACKS[0];
  return { ...base, source: 'pack', packKey: pack.nameKey, title: packName(pack.nameKey), language: pack.language };
}
