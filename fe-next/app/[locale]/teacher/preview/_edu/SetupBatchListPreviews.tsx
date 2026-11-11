'use client';

import { Plus } from 'lucide-react';
import { EducationShell } from '@/components/education/shell/EducationShell';
import { ClassCard } from '@/components/teacher/classroom/ClassCard';
import MyListCard from '@/components/teacher/lesson-creation/MyListCard';
import { TeacherLibrary } from '@/components/teacher/lesson-creation/library/TeacherLibrary';
import { NB_PRIMARY } from '@/components/teacher/nb/nbStyles';
import type { LibraryLesson } from '@/lib/education/libraryTypes';
import type { Language } from '@/lib/supabase/education/types';
import { cn } from '@/lib/utils';
import { fixtureFor } from './fixtures';
import { PreviewTeacherAuth, usePreviewT } from './SetupBatchPreviews';

const noop = () => undefined;
const COLORS = ['pink', 'cyan', 'yellow'] as const;

/** Classes tab: three cards; the oldest (first) is a free teacher's weekly-insight class. */
export function ClassesPreview() {
  const { t, language } = usePreviewT();
  const f = fixtureFor(language);
  const classes = [
    { id: 'p7b', name: f.className, language, join_code: 'BLDA7Q', member_count: 24 },
    { id: 'p8a', name: language === 'he' ? 'ח׳1 אנגלית' : '8A English', language, join_code: 'KITE43', member_count: 12 },
    { id: 'p6c', name: language === 'he' ? 'ו׳3 מילים' : '6C Spelling', language, join_code: 'MOON7Z', member_count: 0 },
  ];
  return (
    <PreviewTeacherAuth>
      <EducationShell scrollRegionLabel={t('teacher.nav.classes')} contentClassName="relative p-4 sm:p-6 lg:px-8 lg:py-5">
        <main className="relative mx-auto max-w-6xl space-y-4">
          <h1 className="font-neo-display text-2xl font-bold text-neo-cream sm:text-3xl">{t('academy.teacher.classesTitle')}</h1>
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {classes.map((c, i) => (
              <li key={c.id} className="flex">
                <ClassCard
                  classroom={c}
                  color={COLORS[i]}
                  expanded={false}
                  onToggleExpanded={noop}
                  onCopy={noop}
                  onShare={noop}
                  googleHref={null}
                  onEdit={noop}
                  onDelete={noop}
                  startGameHref="#"
                  classHref="#"
                  insightHref={i === 0 ? '#' : undefined}
                />
              </li>
            ))}
          </ul>
        </main>
      </EducationShell>
    </PreviewTeacherAuth>
  );
}

function lessonFixture(id: string, name: string, words: string[], language: string, isPublic = false): LibraryLesson {
  return {
    id, name, words: words.map((word) => ({ word, canIntegrate: true })), language: language as Language, is_public: isPublic,
    teacher_id: 'preview-teacher-dana', classroom_id: null, description: null, source_game_code: null,
    created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-01T00:00:00Z',
  };
}

/** Library first frame with three lists; v=empty renders the real library for a teacher with no lists. */
export function LibraryPreview({ v }: { v?: string }) {
  const { t, language } = usePreviewT();
  const f = fixtureFor(language);
  const lessons = [
    lessonFixture('l1', f.className, f.words, language, true),
    lessonFixture('l2', t('eduShell.setup.words.listName', { date: '11/4' }), f.words.slice(3, 11), language),
    lessonFixture('l3', t('eduShell.setup.words.listName', { date: '10/28' }), f.words.slice(0, 6), language),
  ];
  return (
    <PreviewTeacherAuth>
      <EducationShell scrollRegionLabel={t('teacher.nav.lessons')} contentClassName="p-4 sm:p-6 lg:p-8">
        <main className="mx-auto max-w-6xl">
          {v === 'empty' ? (
            <TeacherLibrary />
          ) : (
            <section className="space-y-3">
              <h1 className="font-neo-display text-2xl font-bold text-neo-white sm:text-3xl">{t('eduLibrary.title')}</h1>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="max-w-prose text-sm text-neo-cream/80 max-sm:hidden">{t('teacher.lesson.sectionHint')}</p>
                <button type="button" className={cn(NB_PRIMARY, 'min-h-11 px-4 text-sm')}>
                  <Plus className="size-5" strokeWidth={3} aria-hidden="true" />
                  {t('eduLibrary.editor.newList')}
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
                {lessons.map((lesson, i) => (
                  <MyListCard key={lesson.id} lesson={lesson} index={i} sharing={false} onHost={noop} onPractice={noop} onResults={noop} onEdit={noop} onToggleShare={noop} />
                ))}
              </div>
            </section>
          )}
        </main>
      </EducationShell>
    </PreviewTeacherAuth>
  );
}
