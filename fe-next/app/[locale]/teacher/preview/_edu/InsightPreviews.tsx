'use client';

import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { EducationShell } from '@/components/education/shell/EducationShell';
import { ProGate } from '@/components/teacher/ProGate';
import { FreeWeekCard } from '@/components/teacher/analytics/free/FreeWeekInsight';
import { ClassroomPicker } from '@/components/teacher/reports/ClassroomPicker';
import { PreCheckoutExplainer } from '@/components/teacher/pro/PreCheckoutExplainer';
import UpgradePricingPageClient from '@/app/[locale]/teacher/upgrade/PageClient';
import { ReportsFreeInsightsView } from '@/app/[locale]/teacher/reports/ReportsFreeInsights';
import { ReportsShell } from '@/app/[locale]/teacher/reports/PageClient';
import { buildStudentPulses, type PulseRow } from '@/lib/education/pro/classInsights';
import { rankWeekHardestWords, toFreeClassPulse, type FreeClassInsight } from '@/lib/education/pro/freeClassInsight';
import type { ClassAnalytics } from '@/lib/education/pro/classAnalyticsServer';
import { FREE_PREVIEW_WORDS } from '@/lib/education/wordMasteryReport';
import { fixtureFor } from './fixtures';

type T = (key: string, params?: Record<string, string | number>) => string;
const noop = () => undefined;

const TODAY = new Date().toISOString().slice(0, 10);
const STAMP = `${TODAY}T07:39:11.540Z`;

/** The 11-11 playtest class: 8 students, 3 board rounds, 8 lesson words, 3 of them found by nobody. */
const PLAYTEST = [
  { id: 'p1', found: { 0: 2, 1: 1, 3: 2, 4: 1 }, attempts: 3, xp: 30, played: true },
  { id: 'p2', found: { 1: 1, 2: 1 }, attempts: 3, xp: 10, played: true },
  { id: 'p3', found: { 0: 2, 2: 1 }, attempts: 3, xp: 20, played: true },
  { id: 'p4', found: {}, attempts: 1, xp: 0, played: false },
  { id: 'p5', found: {}, attempts: 1, xp: 0, played: false },
  { id: 'p6', found: { 0: 1, 3: 1, 4: 1 }, attempts: 1, xp: 10, played: true },
  { id: 'p7', found: { 1: 1, 2: 1 }, attempts: 1, xp: 10, played: true },
  { id: 'p8', found: { 0: 1 }, attempts: 1, xp: 10, played: true },
] as const;

function playtestInsight(words: string[]): FreeClassInsight {
  const lesson = words.slice(0, 8);
  const rows: PulseRow[] = PLAYTEST.map((s) => ({
    student_id: s.id,
    total_xp: s.xp,
    last_practice_date: s.played ? TODAY : null,
    words_attempted: Object.fromEntries(
      lesson.map((w, i) => [w, { attempts: s.attempts, correct: (s.found as Record<number, number>)[i] ?? 0, lastAttemptAt: STAMP }]),
    ),
  }));
  const students = buildStudentPulses(rows, PLAYTEST.map((s) => s.id), TODAY);
  const sessions = PLAYTEST.flatMap((s) =>
    Array.from({ length: s.attempts }, (_, round) => {
      const found = lesson.filter((_, i) => ((s.found as Record<number, number>)[i] ?? 0) > round);
      return { studentId: s.id, results: { gameCode: `R${round}`, lessonWordsFound: found, lessonWordsMissed: lesson.filter((w) => !found.includes(w)) } };
    }),
  );
  const metrics = { students, totalStudents: students.length } as unknown as ClassAnalytics;
  const { hardestWords, sessions: count } = rankWeekHardestWords(sessions, FREE_PREVIEW_WORDS);
  return { pulse: toFreeClassPulse(metrics), hardestWords, sessionsThisWeek: count };
}

const EMPTY: FreeClassInsight = {
  pulse: { needsHelp: [], counts: { needsHelp: 0, inactive: 0, notStarted: 0, steady: 0, thriving: 0 }, totalStudents: 0 },
  hardestWords: [],
  sessionsThisWeek: 0,
};

function useInsightFixture(empty: boolean) {
  const { t: rawT, language } = useLanguage();
  const f = fixtureFor(language);
  const insight = useMemo(() => (empty ? EMPTY : playtestInsight(f.words)), [empty, f.words]);
  const names = useMemo(
    () => new Map(PLAYTEST.map((s, i) => [s.id, [f.shortRival, f.me, ...f.classmates, f.rival][i]])),
    [f],
  );
  return { t: rawT as T, language, f, insight, names };
}

/** Free analytics page body: the weekly card alone (no second Pro pitch); v=empty is the one-card empty state. */
export function AnalyticsInsightPreview({ v }: { v?: string }) {
  const { t, language, f, insight, names } = useInsightFixture(v === 'empty');
  return (
    <EducationShell scrollRegionLabel={t('teacher.shell.analyticsLabel')} contentClassName="p-4 md:px-8 md:py-6">
      <div className="mx-auto max-w-7xl space-y-4 md:space-y-5">
        <div>
          <p className="font-neo-body text-sm font-bold text-neo-cream/70">{t('teacher.classroom.cardClassReport')}</p>
          <h1 className="font-neo-display text-2xl font-bold leading-tight text-neo-cream md:text-3xl">{f.className}</h1>
        </div>
        <FreeWeekCard classroomId="p5b" locale={language} insight={insight} names={names} t={t} />
      </div>
    </EducationShell>
  );
}

/** Reports: v=free (real week for the oldest class, other classes named, compact Pro lock), v=empty, v=pro (class picker). */
export function ReportsPreview({ v }: { v?: string }) {
  const { t, language, f, insight, names } = useInsightFixture(v === 'empty');
  const classes = [
    { id: 'c1', name: f.className },
    { id: 'c2', name: language === 'he' ? 'ח2 אנגלית' : '8C English' },
    { id: 'c3', name: language === 'he' ? 'ט1 היסטוריה' : '9A History' },
  ];
  if (v === 'pro') {
    return (
      <ReportsShell>
        <div className="mx-auto w-full max-w-5xl">
          <h1 className="mb-4 font-neo-display text-2xl font-bold text-neo-white sm:text-3xl">{t('teacher.reports.title')}</h1>
          <ClassroomPicker classrooms={classes} onSelect={noop} />
        </div>
      </ReportsShell>
    );
  }
  return (
    <ReportsShell>
      <ProGate
        feature="reports"
        ctaKey="teacher.proGate.reports.cta"
        tone="calm"
        quiet={v === 'empty'}
        lockedTitle={
          <div className="mx-auto mb-4 flex w-full max-w-5xl flex-col gap-4 sm:mb-6">
            <div>
              <h1 className="font-neo-display text-2xl font-bold leading-tight text-neo-white sm:text-3xl">{t('teacher.reports.title')}</h1>
              <p className="mt-1 max-w-prose text-sm leading-snug text-neo-cream sm:text-base">{t('teacher.reports.lockedValue')}</p>
            </div>
            <ReportsFreeInsightsView free={classes[0]} others={classes.slice(1)}>
              <FreeWeekCard classroomId="c1" locale={language} insight={insight} names={names} t={t} proLine={false} />
            </ReportsFreeInsightsView>
          </div>
        }
      >
        {null}
      </ProGate>
    </ReportsShell>
  );
}

/** The real upgrade page; v=explainer opens the pre-checkout explainer over it. */
export function UpgradePreview({ v }: { v?: string }) {
  return (
    <>
      <UpgradePricingPageClient />
      {v === 'explainer' ? <PreCheckoutExplainer mode="trial" pending={false} onConfirm={noop} onBack={noop} /> : null}
    </>
  );
}
