'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useClassrooms } from '@/hooks/useClassroom';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { useTeacherWeekStats } from '@/hooks/useTeacherWeekStats';
import { hasProAccess } from '@/lib/education/teacherPlanGate';
import { NeoPanel } from '@/components/ui/panel';

type T = (key: string, params?: Record<string, string | number>) => string;

/** What a free teacher gets on Results before the Pro lock: their own totals, from the Home week read. */
export function ReportsFreeSummary() {
  const { t: rawT, language } = useLanguage();
  const t = rawT as T;
  const { hasPro, loading, accessTrialExpires } = useTeacherPro();
  const { classrooms, isLoading } = useClassrooms();
  const [nowMs] = useState(() => Date.now());
  const locked = !loading && !hasProAccess({ hasPro, accessTrialExpires: accessTrialExpires ?? null }, nowMs);
  const week = useTeacherWeekStats(classrooms ?? [], locked && !isLoading, language);
  if (!locked || week.status !== 'ready' || !week.summary) return null;
  const stats = [
    { id: 'games', value: week.summary.gamesLast30d, label: t('teacher.reports.freeSummary.games') },
    { id: 'students', value: week.summary.totalStudents, label: t('teacher.reports.freeSummary.students') },
    { id: 'classes', value: week.summary.activeClasses, label: t('teacher.reports.freeSummary.classes') },
  ];
  return (
    <NeoPanel asChild tone="card" shadow="lg" radius="neo-lg" className="mx-auto mb-4 flex w-full max-w-5xl flex-col gap-3 p-4">
      <section data-testid="reports-free-summary" aria-labelledby="reports-free-summary-title">
        <h2 id="reports-free-summary-title" className="font-neo-display text-lg font-black">{t('teacher.reports.freeSummary.title')}</h2>
        <dl className="grid grid-cols-3 gap-2">
          {stats.map((s) => (
            <div key={s.id} className="flex flex-col gap-0.5 rounded-neo border-2 border-neo-cream/30 p-2">
              <dt className="font-neo-body text-xs font-bold leading-tight text-neo-cream/80">{s.label}</dt>
              <dd data-testid={`reports-free-${s.id}`} className="font-neo-display text-2xl font-black tabular-nums">{s.value}</dd>
            </div>
          ))}
        </dl>
        <p className="font-neo-body text-sm font-semibold text-neo-cream/80">{t('teacher.reports.freeSummary.hint')}</p>
      </section>
    </NeoPanel>
  );
}

export default ReportsFreeSummary;
