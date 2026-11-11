'use client';

import type { StudentLesson } from '@/hooks/useStudentProgress';
import { AcademyHubView } from '@/components/student/academy/AcademyHubView';
import type { AcademyData } from '@/components/student/academy/useAcademyData';

const noop = () => undefined;
const DAY = 86_400_000;
const CLASS_ID = 'preview-class';

function word(w: string) {
  return { word: w, definition: '', level: 'core' };
}

function lesson(id: string, name: string, words: string[], status: StudentLesson['status'], dueInDays: number | null, mastered: string[] = []): StudentLesson {
  const dueDate = dueInDays == null ? null : new Date(Date.now() + dueInDays * DAY).toISOString();
  return {
    lessonId: id,
    status,
    classroomId: CLASS_ID,
    dueDate,
    assignedAt: new Date(Date.now() - 2 * DAY).toISOString(),
    assignment: { id: `a-${id}`, classroom_id: CLASS_ID, due_date: dueDate, created_at: new Date(Date.now() - 2 * DAY).toISOString() },
    lesson: { id, name, language: 'en', words: words.map(word) },
    progress: { words_mastered: mastered },
  } as unknown as StudentLesson;
}

const SPACE = lesson('l-space', 'Space words', ['orbit', 'comet', 'galaxy', 'crater', 'meteor', 'planet'], 'started', 1, ['orbit', 'comet']);
const WEATHER = lesson('l-weather', 'Wild weather', ['thunder', 'drizzle', 'blizzard', 'humid', 'breeze'], 'assigned', 4);
const ANIMALS = lesson('l-animals', 'Ocean animals', ['octopus', 'walrus', 'coral', 'squid'], 'completed', -1, ['octopus', 'walrus', 'coral', 'squid']);

function data(lessons: StudentLesson[], reviewCount: number, streakDoneToday: boolean): AcademyData {
  const fresh = lessons.length === 0;
  return {
    lessons,
    lessonsLoading: false,
    reviewLessonId: lessons[0]?.lessonId ?? '',
    reviewWords: [],
    reviewCount,
    streak: fresh ? 0 : 4,
    streakAtRisk: !fresh && !streakDoneToday,
    streakDoneToday,
    stars: fresh ? 0 : 5,
  };
}

const VARIANTS = {
  live: { lessons: [SPACE, WEATHER, ANIMALS], review: 3, done: false, live: true, classroom: true },
  practice: { lessons: [SPACE, WEATHER, ANIMALS], review: 3, done: false, live: false, classroom: true },
  done: { lessons: [{ ...SPACE, status: 'completed' as const }, { ...WEATHER, status: 'completed' as const }, ANIMALS], review: 0, done: true, live: false, classroom: true },
  noclass: { lessons: [], review: 0, done: false, live: false, classroom: false },
} as const;

export const STUDENT_HOME_VARIANTS = Object.keys(VARIANTS);

/** `?state=edu-student-home&v=live|practice|done|noclass`. */
export function StudentHomePreview({ v }: { v?: string }) {
  const f = VARIANTS[(v as keyof typeof VARIANTS) ?? 'practice'] ?? VARIANTS.practice;
  return (
    <AcademyHubView
      userId="preview-student"
      studentName="Maya"
      classroomId={f.classroom ? CLASS_ID : null}
      classroomName={f.classroom ? '7B English' : null}
      level="core"
      avatarConfig={null}
      profileXp={f.classroom ? 640 : 0}
      isGuest
      onSignOut={noop}
      data={data([...f.lessons], f.review, f.done)}
      liveGame={f.live ? { gameCode: 'K7Q2WM', teacherName: 'Ms. Levi', lessonNames: ['Space words'], classroomId: CLASS_ID, classroomName: '7B English', playerCount: 14 } : null}
      join={noop}
      isJoining={false}
      joinError={null}
      reward={null}
      clearReward={noop}
    />
  );
}
