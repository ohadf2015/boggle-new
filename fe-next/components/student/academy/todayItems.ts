import type { StudentLesson } from '@/hooks/useStudentProgress';
import type { VocabularyWord } from '@/lib/supabase/education/types';
import { nextOpenAssignment } from '@/components/student/nextOpenAssignment';
import { buildPracticeTiles, byGameFeel, readyTiles } from '@/lib/education/practicePicker';
import { lessonHref } from './academyNodes';

export interface StudentWarmup {
  assignmentId: string;
  lessonId: string;
  title: string;
  href: string;
  words: string[];
}

const LINKABLE_MODES = new Set(['blitz', 'matching', 'solo_board', 'warmup', 'spelling', 'flashcard']);
const SHOWN_WORDS = 3;

/** The class's next open homework, opened on its most game-like drill (or the game the teacher chose). */
export function studentWarmup(lessons: readonly StudentLesson[], locale: string, classroomId: string | null): StudentWarmup | null {
  const next = nextOpenAssignment(lessons, locale, classroomId);
  if (!next) return null;
  const entry = lessons.find((l) => l.lessonId === next.lessonId);
  const words: VocabularyWord[] = entry?.lesson?.words ?? [];
  let href = next.href;
  if (entry && lessonHref(entry, locale).type === 'lesson') {
    const tile = byGameFeel(readyTiles(buildPracticeTiles(words, { language: entry.lesson?.language })))
      .find((t) => !t.variant && LINKABLE_MODES.has(t.mode));
    if (tile) href = `${href}?mode=${tile.mode}`;
  }
  return {
    assignmentId: next.assignmentId,
    lessonId: next.lessonId,
    title: next.title,
    href,
    words: words.map((w) => w.word).filter(Boolean).slice(0, SHOWN_WORDS),
  };
}

export type TodayItemId = 'warmup' | 'chest' | 'streak';

export interface TodayItem {
  id: TodayItemId;
  done: boolean;
  count?: number;
}

export function buildTodayItems({ warmup, chestOpen, streak, streakDoneToday }: {
  warmup: StudentWarmup | null;
  chestOpen: boolean;
  streak: number;
  streakDoneToday: boolean;
}): TodayItem[] {
  return [
    { id: 'warmup', done: !warmup },
    { id: 'chest', done: !chestOpen },
    { id: 'streak', done: streakDoneToday, count: Math.max(0, streak) },
  ];
}
