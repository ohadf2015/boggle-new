'use client';

import { useSearchParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import type { StudentLesson } from '@/hooks/useStudentProgress';
import { AcademyPageFrame } from '@/components/student/pages/AcademyPageFrame';
import { LessonCard, LessonsEmpty, LessonsFootnote } from '@/components/student/pages/LessonsList';

const words = (list: string) => list.split(' ').map((word) => ({ word }));
const DAY = 86_400_000;

const LESSONS = [
  { lessonId: 'l1', status: 'assigned', dueDate: new Date(Date.now() + 2 * DAY).toISOString(), lesson: { id: 'l1', name: 'Space words', words: words('orbit comet planet galaxy nebula eclipse') } },
  { lessonId: 'l2', status: 'started', progress: { words_mastered: ['tide', 'coral'] }, lesson: { id: 'l2', name: 'Ocean life', words: words('tide coral reef whale kelp') } },
  { lessonId: 'l3', status: 'completed', progress: { words_mastered: ['seed', 'root', 'leaf', 'stem'] }, lesson: { id: 'l3', name: 'Plants and gardens', words: words('seed root leaf stem') } },
  { lessonId: 'l4', status: 'completed', progress: { words_mastered: ['rain'] }, lesson: { id: 'l4', name: 'Weather', words: words('rain snow storm cloud') } },
] as unknown as StudentLesson[];

/** `/student/lessons/preview` = a filled list, `?view=empty` = nothing assigned yet. */
export default function LessonsPreviewClient() {
  const { t, language } = useLanguage() as unknown as { t: (k: string, f?: string) => string; language: string };
  const empty = useSearchParams()?.get('view') === 'empty';
  return (
    <AcademyPageFrame title={t('academy.student.dockLessons', 'Lessons')} art="/images/education/node-lesson.webp" regionLabel={t('academy.pages.lessonsRegion', 'Your lessons')}>
      {empty ? (
        <LessonsEmpty locale={language} />
      ) : (
        <>
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {LESSONS.map((entry) => (
              <li key={entry.lessonId}>
                <LessonCard entry={entry} level={null} locale={language} />
              </li>
            ))}
          </ul>
          <LessonsFootnote />
        </>
      )}
    </AcademyPageFrame>
  );
}
