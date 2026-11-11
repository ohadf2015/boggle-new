'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Play } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { hasProAccess } from '@/lib/education/teacherPlanGate';
import { teacherHostHref } from '@/lib/education/teacherHostHref';
import { teacherFacingName } from '@/lib/education/rosterName';
import { getClassroomStudents } from '@/lib/supabase/education/classrooms';
import type { FreeClassInsight } from '@/lib/education/pro/freeClassInsight';
import { FREE_PREVIEW_WORDS } from '@/lib/education/wordMasteryReport';
import { FreeGameHeadlineCard } from '@/components/teacher/rounds/FreeGameHeadlineCard';
import { ProInsightLink } from '@/components/teacher/pro/ProInsightLink';
import { STATUS_VIEW } from '../overview/overviewModel';
import { PANEL, PANEL_TITLE } from '../overview/overviewParts';
import { useFreeClassInsight, type FreeClassInsightState } from './useFreeClassInsight';

type T = (key: string, params?: Record<string, string | number>) => string;

const NEEDS_HELP_SHOWN = 6;
const START_BUTTON =
  'inline-flex min-h-12 items-center gap-2 self-start rounded-neo border-[3px] border-neo-black bg-neo-lime px-5 font-neo-display text-base font-black text-neo-black shadow-hard transition-shadow hover:shadow-hard-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan';

/** What the week card resolved to, so the page's Pro lock can wait for it and stay quiet beside an empty class. */
export type FreeWeekStatus = 'pending' | 'empty' | 'data' | 'none';

export function isEmptyWeek(insight: FreeClassInsight): boolean {
  return insight.sessionsThisWeek === 0 && insight.hardestWords.length === 0 && insight.pulse.needsHelp.length === 0;
}

function weekStatus(entitlementLoading: boolean, free: boolean, state: FreeClassInsightState): FreeWeekStatus {
  if (entitlementLoading) return 'pending';
  if (!free) return 'none';
  if (state.kind === 'loading' || state.kind === 'idle') return 'pending';
  if (state.kind === 'free') return isEmptyWeek(state.insight) ? 'empty' : 'data';
  return 'none';
}

/** A free teacher's proof for their one free class: this week's who-needs-help and hardest words. Pro sees the full page instead. */
export function FreeWeekInsight({ classroomId, locale, onStatus }: { classroomId: string; locale: string; onStatus?: (status: FreeWeekStatus) => void }) {
  const { t: rawT } = useLanguage();
  const t = rawT as T;
  const entitlement = useTeacherPro();
  const [nowMs] = useState(() => Date.now());
  const free = !entitlement.loading && !hasProAccess(entitlement, nowMs);
  const state = useFreeClassInsight(classroomId, free);
  const status = weekStatus(entitlement.loading, free, state);
  useEffect(() => {
    onStatus?.(status);
  }, [onStatus, status]);

  if (!free || state.kind === 'idle') return null;
  if (state.kind === 'loading') {
    return <div aria-busy="true" className="h-40 rounded-neo-xl bg-neo-cream/10 motion-safe:animate-pulse" />;
  }
  if (state.kind === 'locked') return <FreeGameHeadlineCard classroomId={classroomId} />;
  if (state.kind === 'error') {
    return (
      <div className={PANEL} role="alert">
        <p className="font-neo-body font-bold text-neo-cream">{t('education.analytics.error')}</p>
        <button type="button" onClick={() => void state.retry()} className="mt-2 min-h-11 rounded-neo border-2 border-neo-cream/60 px-4 font-neo-body font-bold text-neo-cream">
          {t('education.analytics.retry')}
        </button>
      </div>
    );
  }
  return <WeekCard classroomId={classroomId} locale={locale} insight={state.insight} t={t} />;
}

function WeekCard({ classroomId, locale, insight, t }: { classroomId: string; locale: string; insight: FreeClassInsight; t: T }) {
  const names = useRosterNames(classroomId);
  return <FreeWeekCard classroomId={classroomId} locale={locale} insight={insight} names={names} t={t} />;
}

export function FreeWeekCard({ classroomId, locale, insight, names, t }: { classroomId: string; locale: string; insight: FreeClassInsight; names: Map<string, string>; t: T }) {
  const { needsHelp } = insight.pulse;

  if (isEmptyWeek(insight)) {
    return (
      <section data-testid="free-week-insight" data-state="empty" aria-labelledby="free-week-title" className={PANEL}>
        <h2 id="free-week-title" className={PANEL_TITLE}>{t('teacher.weekInsight.emptyTitle')}</h2>
        <p className="mb-3 mt-1 font-neo-body text-sm text-neo-cream/90">{t('teacher.weekInsight.emptyBody')}</p>
        <Link href={teacherHostHref(locale, { classroomId })} data-testid="free-week-start-game" className={START_BUTTON}>
          <Play className="size-4" aria-hidden="true" />
          {t('teacher.weekInsight.startGame')}
        </Link>
      </section>
    );
  }

  return (
    <section data-testid="free-week-insight" data-state="data" aria-labelledby="free-week-title" className={`${PANEL} flex flex-col gap-3`}>
      <div className="grid gap-3 lg:grid-cols-2">
        <div>
          <h2 id="free-week-title" className={PANEL_TITLE}>{t('teacher.weekInsight.title')}</h2>
          {needsHelp.length === 0 ? (
            <p className="mt-2 font-neo-body text-sm text-neo-cream/90">{t('teacher.weekInsight.nobodyStuck')}</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {needsHelp.slice(0, NEEDS_HELP_SHOWN).map((s) => {
                const view = STATUS_VIEW[s.status];
                const Icon = view.icon;
                return (
                  <li key={s.id} data-testid="free-week-needs-help-row" className={`flex items-center justify-between gap-2 rounded-neo border-2 px-2.5 py-1.5 ${view.chip}`}>
                    <bdi className="min-w-0 truncate font-neo-body font-bold text-neo-cream">{names.get(s.id) || t('education.analytics.overview.unnamed')}</bdi>
                    <span className={`inline-flex shrink-0 items-center gap-1 font-neo-body text-xs font-bold ${view.text}`}>
                      <Icon className="size-3.5" aria-hidden="true" />
                      {t(`education.analytics.overview.status.${s.status}`)}
                    </span>
                  </li>
                );
              })}
              {needsHelp.length > NEEDS_HELP_SHOWN ? (
                <li className="font-neo-body text-xs font-bold text-neo-cream/80">{t('teacher.weekInsight.more', { count: needsHelp.length - NEEDS_HELP_SHOWN })}</li>
              ) : null}
            </ul>
          )}
        </div>
        <div>
          <h3 className={PANEL_TITLE}>{t('teacher.weekInsight.hardestTitle')}</h3>
          {insight.hardestWords.length === 0 ? (
            <p className="mt-2 font-neo-body text-sm text-neo-cream/90">{t('education.analytics.overview.hardWordsEmpty')}</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {insight.hardestWords.slice(0, FREE_PREVIEW_WORDS).map((w) => (
                <li key={w.word} data-testid="free-week-hard-word" className="flex items-center justify-between gap-2 rounded-neo border-2 border-neo-cream/40 px-2.5 py-1.5">
                  <bdi className="font-neo-display font-bold text-neo-cream">{w.display}</bdi>
                  <span className="font-neo-body text-xs text-neo-cream/80">{t('teacher.weekInsight.missed', { pct: w.missRate })}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <ProInsightLink placement="analytics_week_insight" language={locale} label={t('teacher.weekInsight.proLine')} proLabel={t('eduShell.nav.pro')} />
    </section>
  );
}

function useRosterNames(classroomId: string): Map<string, string> {
  const [names, setNames] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    let cancelled = false;
    getClassroomStudents(classroomId)
      .then(({ data }) => {
        if (!cancelled) setNames(new Map(data.map((s) => [s.student_id, teacherFacingName(s.roster_name, s.profiles, '')])));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [classroomId]);
  return names;
}
