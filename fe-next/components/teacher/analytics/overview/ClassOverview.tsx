'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { teacherFacingName } from '@/lib/education/rosterName';
import { getClassroomStudents } from '@/lib/supabase/education/classrooms';
import { StudentProgressReport } from '@/components/teacher/reports/StudentProgressReport';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import type { StudentStatus } from '@/lib/education/pro/classInsights';
import { useProClassAnalytics } from '../useProClassAnalytics';
import { ATTENTION, STATUSES, pct } from './overviewModel';
import { ActivityBars, PANEL, PANEL_TITLE, StatusStrip, StudentRow } from './overviewParts';

const ATTENTION_SHOWN = 6;
const STARS_SHOWN = 3;
const WORDS_SHOWN = 5;

interface Props {
  classroomId: string;
  /** Opens the drill-down for this student from outside (e.g. the roster tab). */
  openStudentId?: string | null;
  onOpenChange?: (studentId: string | null) => void;
}

export function ClassOverview({ classroomId, openStudentId, onOpenChange }: Props) {
  const { t, language } = useLanguage();
  const { metrics, isLoading, error, refresh } = useProClassAnalytics({ classroomId });
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [filter, setFilter] = useState<StudentStatus | null>(null);
  const [localOpen, setLocalOpen] = useState<string | null>(null);
  const open = openStudentId ?? localOpen;
  const setOpen = (id: string | null) => (onOpenChange ? onOpenChange(id) : setLocalOpen(id));

  useEffect(() => {
    let cancelled = false;
    getClassroomStudents(classroomId).then(({ data }) => {
      if (cancelled) return;
      setNames(new Map(data.map((s) => [s.student_id, teacherFacingName(s.roster_name, s.profiles, '')])));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [classroomId]);

  const students = useMemo(() => metrics?.students ?? [], [metrics]);
  const counts = useMemo(() => {
    const c = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<StudentStatus, number>;
    for (const s of students) c[s.status]++;
    return c;
  }, [students]);

  if (isLoading) {
    return <div aria-busy="true" className="h-40 rounded-neo-lg bg-neo-cream/10 motion-safe:animate-pulse" />;
  }
  if (error || !metrics) {
    return (
      <div className={PANEL} role="alert">
        <p className="font-neo-body font-bold text-neo-cream">{t('education.analytics.error')}</p>
        <button type="button" onClick={refresh} className="mt-2 min-h-11 rounded-neo border-2 border-neo-cream/60 px-4 font-neo-body font-bold text-neo-cream">
          {t('education.analytics.retry')}
        </button>
      </div>
    );
  }
  if (students.length === 0) {
    return <p className={`${PANEL} font-neo-body text-neo-cream`}>{t('education.analytics.noData')}</p>;
  }

  const today = metrics.dailyActive[metrics.dailyActive.length - 1]?.day ?? '';
  const nameOf = (id: string) => names.get(id) || t('education.analytics.overview.unnamed');
  const row = (p: (typeof students)[number]) => <StudentRow key={p.id} pulse={p} name={nameOf(p.id)} today={today} onOpen={setOpen} />;
  const attention = students.filter((s) => ATTENTION.has(s.status));
  const stars = students.filter((s) => s.status === 'thriving').sort((a, b) => b.xp - a.xp).slice(0, STARS_SHOWN);
  const roster = filter ? students.filter((s) => s.status === filter) : students;

  return (
    <div className="space-y-3">
      <StatusStrip counts={counts} active={filter} onToggle={(s) => setFilter((f) => (f === s ? null : s))} />

      <div className="grid gap-3 lg:grid-cols-2">
        <section data-testid="overview-attention" aria-labelledby="ov-attn" className={PANEL}>
          <h3 id="ov-attn" className={PANEL_TITLE}>{t('education.analytics.overview.attentionTitle')}</h3>
          {attention.length === 0 ? (
            <p className="mt-2 font-neo-body text-sm text-neo-cream/90">{t('education.analytics.overview.attentionEmpty')}</p>
          ) : (
            <ul className="mt-2 space-y-1.5">{attention.slice(0, ATTENTION_SHOWN).map(row)}</ul>
          )}
        </section>

        <section aria-labelledby="ov-act" className={PANEL}>
          <h3 id="ov-act" className={PANEL_TITLE}>{t('education.analytics.overview.activityTitle')}</h3>
          <p className="mb-2 font-neo-body text-xs text-neo-cream/80">{t('education.analytics.overview.activityHint')}</p>
          <ActivityBars days={metrics.dailyActive} locale={language} />
        </section>

        <section data-testid="overview-stars" aria-labelledby="ov-stars" className={PANEL}>
          <h3 id="ov-stars" className={PANEL_TITLE}>{t('education.analytics.overview.starsTitle')}</h3>
          {stars.length === 0 ? (
            <p className="mt-2 font-neo-body text-sm text-neo-cream/90">{t('education.analytics.overview.starsEmpty')}</p>
          ) : (
            <ul className="mt-2 space-y-1.5">{stars.map(row)}</ul>
          )}
        </section>

        <section aria-labelledby="ov-words" className={PANEL}>
          <h3 id="ov-words" className={PANEL_TITLE}>{t('education.analytics.overview.hardWordsTitle')}</h3>
          {metrics.commonMistakes.length === 0 ? (
            <p className="mt-2 font-neo-body text-sm text-neo-cream/90">{t('education.analytics.overview.hardWordsEmpty')}</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {metrics.commonMistakes.slice(0, WORDS_SHOWN).map((m) => (
                <li key={m.word} className="flex items-center justify-between gap-2 rounded-neo border-2 border-neo-cream/40 px-2.5 py-1.5">
                  <bdi className="font-neo-display font-bold text-neo-cream">{m.word}</bdi>
                  <span className="font-neo-body text-xs text-neo-cream/80">
                    {t('education.analytics.overview.hardWordsMeta', { count: m.studentCount, pct: pct(m.errorRate) })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section data-testid="overview-roster" aria-labelledby="ov-roster" className={PANEL}>
        <h3 id="ov-roster" className={PANEL_TITLE}>{t('education.analytics.overview.rosterTitle')}</h3>
        <ul className="mt-2 grid gap-1.5 md:grid-cols-2">{roster.map(row)}</ul>
      </section>

      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-h-[90dvh] max-w-3xl overflow-y-auto">
          <DialogTitle>{open ? nameOf(open) : ''}</DialogTitle>
          <DialogDescription className="sr-only">{t('education.analytics.overview.drillDescription')}</DialogDescription>
          {open && <StudentProgressReport studentId={open} classroomId={classroomId} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
