'use client';

import type { ReactNode, Ref } from 'react';
import { BarChart3, ChevronRight } from 'lucide-react';
import { EducationShell } from '@/components/education/shell/EducationShell';
import { cn } from '@/lib/utils';
import type { TeacherWeekSummary } from '@/lib/education/teacherWeekStats';
import type { TeacherWeekStatus } from '@/hooks/useTeacherWeekStats';
import { TeacherPlanBadge } from '../TeacherPlanBadge';
import { HqLoadError } from '../hq/HqLoadError';
import { EduMascot } from '@/components/education/EduMascot';
import { HomeWeekCard } from './HomeWeekCard';
import { HomeWeekChips } from './HomeWeekChips';
import { HomeRailSkeleton, HomeSkeleton } from './HomeSkeleton';
import { GAME_CARD, GAME_CARD_HOVER } from './homeStyles';

// From xl the rail runs beside the sessions too, so its class rows never push the sessions down.
const RAIL_SPAN = 'xl:row-[1/span_2]';
export const SESSIONS_BESIDE_RAIL = 'lg:col-span-2 xl:col-span-1 xl:col-start-1';

type T = (key: string, params?: Record<string, string | number>) => string;

export interface TeacherHomeViewProps {
  t: T;
  isRTL: boolean;
  revealRef?: Ref<HTMLDivElement>;
  greeting: string;
  /** null hides the cue line; '' keeps its height while the cue settles. */
  cue: string | null;
  hasPro: boolean;
  ready: boolean;
  error: boolean;
  onRetry: () => void;
  hasClasses: boolean;
  onboarding: ReactNode;
  desk: ReactNode;
  sessions: ReactNode | null;
  accountBanner: ReactNode | null;
  hasRail: boolean;
  week: { summary: TeacherWeekSummary | null; status: TeacherWeekStatus; classCount: number; classes?: ReactNode } | null;
  onOpenReports: (() => void) | null;
  proCard: ReactNode | null;
  welcome?: ReactNode;
  children?: ReactNode;
}

export function TeacherHomeView({
  t, isRTL, revealRef, greeting, cue, hasPro, ready, error, onRetry, hasClasses, onboarding, desk,
  sessions, accountBanner, hasRail, week, onOpenReports, proCard, welcome, children,
}: TeacherHomeViewProps) {
  const showSessions = sessions !== null;
  return (
    <EducationShell
      className={cn(isRTL && 'rtl')}
      scrollRegionLabel={t('eduShell.home.regionLabel')}
      contentClassName="relative isolate"
    >
      {welcome}

      <div
        ref={revealRef}
        data-testid="teacher-home"
        className={cn(
          'mx-auto grid w-full max-w-[1280px] gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4 lg:gap-5 lg:px-8 lg:py-5 lg:[@media(max-height:820px)]:gap-4 lg:[@media(max-height:820px)]:py-3',
          hasRail && 'lg:grid-cols-[minmax(0,1fr)_20rem]',
          showSessions && 'lg:min-h-full',
          showSessions && (accountBanner ? 'lg:grid-rows-[auto_1fr_auto]' : 'lg:grid-rows-[auto_1fr]'),
        )}
      >
        <div className="flex min-w-0 flex-col gap-3 sm:gap-4 lg:col-start-1 lg:row-start-1">
          <header data-tm className="flex items-start justify-between gap-3">
            <span data-testid="home-greeting-mascot" aria-hidden="true" className="-my-1 block size-11 shrink-0 animate-edu-bob sm:size-14 [@media(max-height:820px)]:size-9">
              <EduMascot moment="welcome" size={56} className="size-full" />
            </span>
            <div className="min-w-0 flex-1">
              <h1 data-wipe suppressHydrationWarning className="font-neo-display text-xl font-black text-neo-cream sm:text-2xl">
                {greeting}
              </h1>
              {cue !== null ? (
                <p data-testid="home-coach-cue" suppressHydrationWarning className="mt-0.5 min-h-5 font-neo-body text-sm font-semibold text-neo-cream/75 max-sm:hidden [@media(max-height:760px)]:hidden">
                  {cue || null}
                </p>
              ) : null}
            </div>
            <div className="mt-0.5 flex shrink-0 items-center gap-1.5 lg:hidden">
              {ready && !error && hasClasses && week?.summary && week.status === 'ready' ? (
                <HomeWeekChips summary={week.summary} classCount={week.classCount} t={t} />
              ) : null}
              {hasPro ? <TeacherPlanBadge quiet className="shrink-0" /> : null}
            </div>
          </header>

          {!ready ? <HomeSkeleton /> : error ? <HqLoadError onRetry={onRetry} /> : hasClasses ? desk : onboarding}
        </div>

        {sessions}
        {ready && !error && hasClasses && accountBanner ? (
          <div data-testid="home-account-banner" className={cn('min-w-0', hasRail && 'lg:col-span-2')}>{accountBanner}</div>
        ) : null}

        {hasRail ? (
          <aside aria-label={t('eduShell.home.railLabel')} className={cn('flex min-w-0 flex-col gap-4 lg:col-start-2 lg:row-start-1', showSessions && RAIL_SPAN)}>
            {!ready ? <HomeRailSkeleton /> : week ? (
              <div data-tm className="max-lg:hidden">
                <HomeWeekCard summary={week.summary} status={week.status} classCount={week.classCount} t={t} childrenClassName="max-xl:hidden">{week.classes}</HomeWeekCard>
              </div>
            ) : null}
            {!ready || !onOpenReports ? null : (
              <div data-testid="home-weekly-reports" data-tm className="max-lg:hidden">
                <button
                  type="button"
                  aria-haspopup="dialog"
                  onClick={onOpenReports}
                  className={cn(GAME_CARD, GAME_CARD_HOVER, 'group flex w-full items-center gap-3 px-3 py-2.5 text-start focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cream')}
                >
                  <span data-accent-decor className="grid size-9 shrink-0 -rotate-3 place-items-center rounded-neo border-2 border-neo-black bg-neo-purple shadow-hard-sm">
                    <BarChart3 className="edu-wiggle-on-hover size-5 text-neo-cream" strokeWidth={2.5} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-neo-display text-base font-bold text-neo-cream">{t('eduShell.home.weeklyReports')}</span>
                    <span className="block font-neo-body text-xs font-semibold leading-snug text-neo-cream/70 [@media(max-height:820px)]:sr-only">{t('eduShell.home.weeklyReportsHint')}</span>
                  </span>
                  <ChevronRight className="size-5 shrink-0 text-neo-cream/70 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 motion-reduce:transition-none" aria-hidden="true" />
                </button>
              </div>
            )}
            {proCard ? <div data-tm>{proCard}</div> : null}
          </aside>
        ) : null}
      </div>

      {children}
    </EducationShell>
  );
}
