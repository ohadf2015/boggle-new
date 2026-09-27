/**
 * `/[locale]/student/lessons` — every lesson the student can open, in the
 * Academy frame. The map shows the next few as islands; this is the whole list,
 * reached from the map's dock.
 *
 * It used to be a server `redirect()` to `/student`, so the dock's "Lessons"
 * button bounced a student straight back to the map it was opened from — and
 * inherited the hub's wait on the profile row. Guard is session-only
 * (`useStudentSubpageGuard`).
 */

'use client';

import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useStudentProgress } from '@/hooks/useStudentProgress';
import { usePracticeLessons } from '@/hooks/usePracticeLessons';
import { useStudentClassroom } from '@/hooks/useStudentClassroom';
import { mergeStudentLessons } from '@/lib/education/mergeLessons';
import { AcademyPageFrame, FrameSkeleton } from '@/components/student/pages/AcademyPageFrame';
import { LessonCard, LessonsEmpty, LessonsFootnote, orderLessons } from '@/components/student/pages/LessonsList';
import { useStudentSubpageGuard } from '@/components/student/pages/useStudentSubpageGuard';
import { useSettledAfterProfile } from '@/components/student/pages/useSettledAfterProfile';
import { toneStyle } from '@/components/student/academy/chrome';

type T = (k: string, fallback?: string, params?: Record<string, unknown>) => string;

export default function StudentLessonsPageClient() {
  const { t: rawT, language } = useLanguage();
  const t = rawT as unknown as T;
  const { status } = useStudentSubpageGuard(language);
  const { lessons: assigned, isLoading } = useStudentProgress();
  const { lessons: practisable, isLoading: practisableLoading } = usePracticeLessons();
  const { level } = useStudentClassroom();
  // The redirect decides on the session; whether an EMPTY list is real waits
  // for lists fetched after the profile landed (the hooks gate on it).
  const { profile } = useAuth();
  const listsSettled = useSettledAfterProfile(!!profile, [assigned, practisable]);
  const lessons = useMemo(() => orderLessons(mergeStudentLessons(assigned, practisable)), [assigned, practisable]);
  const done = lessons.filter((l) => l.status === 'completed').length;

  const ready = status === 'ready';
  const listLoading = ready && (isLoading || practisableLoading || !listsSettled) && lessons.length === 0;

  const badge =
    ready && lessons.length > 0 ? (
      <span
        dir="auto"
        className={`inline-flex h-9 items-center rounded-full border-2 border-neo-black px-3 font-neo-display text-sm font-black text-neo-black`}
        style={toneStyle('gold', { shadow: 2, trim: 1 })}
      >
        {t('academy.pages.lessonsDone', '{done}/{total} done', { done, total: lessons.length })}
      </span>
    ) : undefined;

  return (
    <AcademyPageFrame
      title={t('academy.student.dockLessons', 'Lessons')}
      art="/images/education/node-lesson.webp"
      badge={badge}
      regionLabel={t('academy.pages.lessonsRegion', 'Your lessons')}
      pending={!ready}
      busy={listLoading}
    >
      {!ready || listLoading ? (
        <FrameSkeleton rows={4} />
      ) : (
        <div data-testid="student-lessons-content" className="h-full">
          {lessons.length === 0 ? (
            <LessonsEmpty locale={language} />
          ) : (
            <>
              <h2 className="sr-only">{t('academy.pages.lessonsRegion', 'Your lessons')}</h2>
              <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {lessons.map((entry) => (
                  <li key={entry.lessonId}>
                    <LessonCard entry={entry} level={level ?? null} locale={language} />
                  </li>
                ))}
              </ul>
              <LessonsFootnote />
            </>
          )}
        </div>
      )}
    </AcademyPageFrame>
  );
}
