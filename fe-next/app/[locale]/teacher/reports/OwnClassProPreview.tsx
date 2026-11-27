'use client';

import { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getClassroomStudents } from '@/lib/supabase/education/classrooms';
import { teacherFacingName } from '@/lib/education/rosterName';
import { pluralKey } from '@/lib/i18n/pluralKey';

const MORE_KEYS = {
  one: 'teacher.reports.ownPreview.more_one',
  few: 'teacher.reports.ownPreview.more_few',
  other: 'teacher.reports.ownPreview.more_other',
};

const ROWS_SHOWN = 6;
const COLUMNS = ['accuracy', 'mastered', 'missed'] as const;

interface RosterStudent {
  id: string;
  name: string;
}

/** A free teacher's own roster with the per-student columns Pro fills in, locked. Names only: no score reaches a free browser. */
export function OwnClassProPreview({ classroomId, className }: { classroomId: string; className: string }) {
  const { t } = useLanguage();
  const [roster, setRoster] = useState<Awaited<ReturnType<typeof getClassroomStudents>>['data']>([]);
  useEffect(() => {
    let cancelled = false;
    getClassroomStudents(classroomId)
      .then(({ data }) => {
        if (!cancelled) setRoster(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [classroomId]);
  const unnamed = t('education.analytics.overview.unnamed');
  const students = roster.map((s) => ({ id: s.student_id, name: teacherFacingName(s.roster_name, s.profiles, unnamed) }));
  return <OwnClassProPreviewView className={className} students={students} />;
}

export function OwnClassProPreviewView({ className, students }: { className: string; students: readonly RosterStudent[] }) {
  const { t, language } = useLanguage();
  if (students.length === 0) return null;
  const hidden = students.length - ROWS_SHOWN;
  return (
    <section
      data-testid="own-class-pro-preview"
      aria-labelledby="own-class-pro-preview-title"
      className="rounded-neo-xl border-[3px] border-edu-line bg-edu-surface p-4 shadow-hard-lg sm:p-5"
    >
      <h2 id="own-class-pro-preview-title" className="font-neo-display text-lg font-black leading-tight text-edu-ink sm:text-xl">
        {t('teacher.reports.ownPreview.title', { class: className })}
      </h2>
      <p data-testid="own-preview-line" className="mt-1 max-w-prose font-neo-body text-sm leading-snug text-edu-ink/90">
        {t('teacher.reports.ownPreview.line')}
      </p>
      <div role="table" aria-label={t('teacher.reports.ownPreview.title', { class: className })} className="mt-3">
        <div role="row" className={`${GRID} border-b-2 border-edu-line/20 pb-1.5`}>
          <span role="columnheader" className="font-neo-body text-xs font-bold text-edu-ink/80">
            {t('teacher.reports.ownPreview.columns.student')}
          </span>
          {COLUMNS.map((c) => (
            <span key={c} role="columnheader" className="text-end font-neo-body text-xs font-bold text-edu-ink/80">
              {t(`teacher.reports.ownPreview.columns.${c}`)}
            </span>
          ))}
        </div>
        {students.slice(0, ROWS_SHOWN).map((s) => (
          <div key={s.id} role="row" data-testid="own-preview-row" className={`${GRID} border-b border-edu-line/10 py-2`}>
            <bdi role="cell" data-testid="own-preview-name" className="min-w-0 truncate font-neo-body text-sm font-bold text-edu-ink">
              {s.name}
            </bdi>
            {COLUMNS.map((c) => (
              <span key={c} role="cell" data-testid="own-preview-locked" className="flex items-center justify-end gap-1.5">
                <span className="sr-only">{t('teacher.reports.ownPreview.locked')}</span>
                <span aria-hidden="true" className="h-3 w-full max-w-14 rounded-full bg-edu-ink/20 blur-[1px]" />
                <Lock aria-hidden="true" className="size-3.5 shrink-0 text-edu-ink/60" />
              </span>
            ))}
          </div>
        ))}
      </div>
      {hidden > 0 ? (
        <p data-testid="own-preview-more" className="mt-2 font-neo-body text-xs font-bold text-edu-ink/80">
          {t(pluralKey(MORE_KEYS, hidden, language), { count: hidden })}
        </p>
      ) : null}
    </section>
  );
}

const GRID = 'grid grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] items-center gap-2 sm:gap-4';
