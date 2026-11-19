'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { teacherFacingName } from '@/lib/education/rosterName';
import { getClassroomStudents } from '@/lib/supabase/education/classrooms';
import { StudentProgressReport } from '@/components/teacher/reports/StudentProgressReport';
import { ClassFocusWords } from '@/components/teacher/reports/ClassFocusWords';
import { ReportDisclosure } from '@/components/teacher/reports/FullReportDisclosure';
import { REPORT_HERO_PANEL } from '@/components/teacher/reports/reteachParts';
import { Dialog } from '@/components/ui/dialog';
import { NbDialogBody, NbDialogContent, NbDialogHeader } from '@/components/teacher/nb/NbDialog';
import type { StudentStatus } from '@/lib/education/pro/classInsights';
import type { ResultsSurface } from '@/components/education/results/trackResultsAction';
import { useProClassAnalytics } from '../useProClassAnalytics';
import { ATTENTION, STATUSES, pct } from './overviewModel';
import { ActivityBars, PANEL, PANEL_TITLE, StatusLine, StatusStrip, StudentRow } from './overviewParts';

const ATTENTION_SHOWN = 6;
const STARS_SHOWN = 3;
const MOSTLY_ZERO = 3;

interface Props {
  classroomId: string;
  classroomName: string;
  /** Where a practice tap is reported from. */
  surface?: ResultsSurface;
  /** Opens the drill-down for this student from outside (e.g. the roster tab). */
  openStudentId?: string | null;
  onOpenChange?: (studentId: string | null) => void;
}

export function ClassOverview({ classroomId, classroomName, surface = 'class_report', openStudentId, onOpenChange }: Props) {
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

  const focusWords = (
    <ClassFocusWords classroomId={classroomId} classroomName={classroomName} fallback={metrics?.commonMistakes ?? []} surface={surface} />
  );
  const withFocus = (status: ReactNode) => (
    <div className="space-y-3">
      {status}
      <div data-testid="overview-focus" className={REPORT_HERO_PANEL}>{focusWords}</div>
    </div>
  );

  if (isLoading) {
    return withFocus(<div aria-busy="true" className="h-16 rounded-neo-lg bg-neo-cream/10 motion-safe:animate-pulse" />);
  }
  if (error || !metrics) {
    return withFocus(
      <div className={PANEL} role="alert">
        <p className="font-neo-body font-bold text-neo-cream">{t('education.analytics.error')}</p>
        <button type="button" onClick={refresh} className="mt-2 min-h-11 rounded-neo border-2 border-neo-cream/60 px-4 font-neo-body font-bold text-neo-cream">
          {t('education.analytics.retry')}
        </button>
      </div>
    );
  }
  if (students.length === 0) {
    return withFocus(<p className="font-neo-body text-neo-cream">{t('education.analytics.noData')}</p>);
  }

  const today = metrics.dailyActive[metrics.dailyActive.length - 1]?.day ?? '';
  const nameOf = (id: string) => names.get(id) || t('education.analytics.overview.unnamed');
  const row = (p: (typeof students)[number]) => <StudentRow key={p.id} pulse={p} name={nameOf(p.id)} today={today} onOpen={setOpen} />;
  const attention = students.filter((s) => ATTENTION.has(s.status));
  const stars = students.filter((s) => s.status === 'thriving').sort((a, b) => b.xp - a.xp).slice(0, STARS_SHOWN);
  const roster = filter ? students.filter((s) => s.status === filter) : students;
  const rosterList = <ul className="mt-2 grid gap-1.5 md:grid-cols-2">{roster.map(row)}</ul>;
  const onToggle = (s: StudentStatus) => setFilter((f) => (f === s ? null : s));
  const mostlyZero = STATUSES.filter((s) => counts[s] === 0).length >= MOSTLY_ZERO;
  const hasActivity = metrics.dailyActive.some((d) => d.count > 0);

  return (
    <div className="space-y-3">
      {mostlyZero ? <StatusLine counts={counts} active={filter} onToggle={onToggle} /> : <StatusStrip counts={counts} active={filter} onToggle={onToggle} />}

      <div data-testid="overview-focus" className={`${REPORT_HERO_PANEL} grid gap-6 lg:grid-cols-2 [&>:only-child]:lg:col-span-2`}>
        {attention.length > 0 ? (
          <section data-testid="overview-attention" aria-labelledby="ov-attn" className="min-w-0">
            <h2 id="ov-attn" className={PANEL_TITLE}>{t('education.analytics.overview.attentionTitle')}</h2>
            <ul className="mt-2 space-y-1.5 max-sm:[&>li:nth-child(n+4)]:hidden">{attention.slice(0, ATTENTION_SHOWN).map(row)}</ul>
          </section>
        ) : null}
        {focusWords}
      </div>

      {hasActivity || stars.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2 [&>:only-child]:lg:col-span-2">
          {hasActivity ? (
            <section data-testid="overview-activity" aria-labelledby="ov-act" className={PANEL}>
              <h3 id="ov-act" className={PANEL_TITLE}>{t('education.analytics.overview.activityTitle')}</h3>
              <p className="mb-2 font-neo-body text-xs text-neo-cream/80">{t('education.analytics.overview.activityHint')}</p>
              <ActivityBars days={metrics.dailyActive} locale={language} />
            </section>
          ) : null}
          {stars.length > 0 ? (
            <section data-testid="overview-stars" aria-labelledby="ov-stars" className={PANEL}>
              <h3 id="ov-stars" className={PANEL_TITLE}>{t('education.analytics.overview.starsTitle')}</h3>
              <ul className="mt-2 space-y-1.5">{stars.map(row)}</ul>
            </section>
          ) : null}
        </div>
      ) : null}

      {filter ? (
        <section data-testid="overview-roster" aria-labelledby="ov-roster" className={PANEL}>
          <h3 id="ov-roster" className={PANEL_TITLE}>{t(`education.analytics.overview.status.${filter}`)}</h3>
          {rosterList}
        </section>
      ) : (
        <ReportDisclosure
          testId="overview-roster-fold"
          icon={Users}
          accent="cyan"
          title={t('education.analytics.overview.rosterTitle')}
          hint={String(students.length)}
        >
          {(isOpen) => (isOpen ? rosterList : null)}
        </ReportDisclosure>
      )}

      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <NbDialogContent size="xl" phone="full">
          <NbDialogHeader
            title={open ? <bdi>{nameOf(open)}</bdi> : ''}
            srDescription={t('education.analytics.overview.drillDescription')}
            closeLabel={t('common.close')}
          />
          <NbDialogBody>{open && <StudentProgressReport studentId={open} classroomId={classroomId} />}</NbDialogBody>
        </NbDialogContent>
      </Dialog>
    </div>
  );
}
