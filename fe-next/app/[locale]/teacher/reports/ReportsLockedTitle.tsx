'use client';

import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useClassrooms } from '@/hooks/useClassroom';
import { ReportsReteachPanel } from './ReportsReteachPanel';

/** A free teacher's reports page: the title, what Pro adds, and their own missed words in the clear. */
export function ReportsLockedTitle() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const { classrooms } = useClassrooms();
  return (
    <div className="mb-4 sm:mb-6">
      <h1 className="font-neo-display text-2xl font-bold leading-tight text-neo-white sm:text-3xl">{t('teacher.reports.title')}</h1>
      <p data-testid="reports-locked-value" className="mt-2 max-w-prose text-sm leading-snug text-neo-cream sm:text-base">
        {t(
          'teacher.reports.lockedValue',
          'The words your class missed are free on every game\'s results screen. Reports add who needs help, student by student, across all your games.'
        )}
      </p>
      {classrooms && classrooms.length > 0 ? (
        <div className="mt-4">
          <ReportsReteachPanel
            classrooms={classrooms}
            hideExample
            onOpenClass={(id) => router.push(`/${language}/teacher/reports?classroomId=${encodeURIComponent(id)}`)}
          />
        </div>
      ) : null}
    </div>
  );
}
