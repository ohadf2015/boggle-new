'use client';

import type { ReactNode, Ref } from 'react';
import { EducationShell } from '@/components/education/shell/EducationShell';
import { cn } from '@/lib/utils';
import type { TeacherWeekSummary } from '@/lib/education/teacherWeekStats';
import type { TeacherWeekStatus } from '@/hooks/useTeacherWeekStats';
import { TeacherPlanBadge } from '../TeacherPlanBadge';
import { HqLoadError } from '../hq/HqLoadError';
import { GAME_CARD, STICKER } from './homeStyles';
import { HomeRailSkeleton, HomeSkeleton } from './HomeSkeleton';
import { MascotBubble } from '../nb/MascotBubble';

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
  /** Billing trouble (declined renewal): under the greeting, before the desk, never below the fold. */
  alert?: ReactNode | null;
  hasRail: boolean;
  week: { summary: TeacherWeekSummary | null; status: TeacherWeekStatus; classCount: number; classes?: ReactNode } | null;
  proCard: ReactNode | null;
  /** Wide screens: the private practice round, in the rail so the desk keeps one Start button. */
  practice?: ReactNode;
  /** Below the ready-made games: per-class seat counts and other things a teacher checks now and then. */
  footer?: ReactNode;
  /** Desktop: the games row fills the leftover height. Off for a short desk, so what follows sits right under it. */
  fillHeight?: boolean;
  welcome?: ReactNode;
  children?: ReactNode;
}

export function TeacherHomeView({
  t, isRTL, revealRef, greeting, cue, hasPro, ready, error, onRetry, hasClasses, onboarding, desk,
  sessions, accountBanner, alert = null, hasRail, week, proCard, practice, footer, fillHeight = true, welcome, children,
}: TeacherHomeViewProps) {
  const showSessions = sessions !== null;
  const stretch = showSessions && fillHeight;
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
          stretch && 'lg:min-h-full',
          stretch && (accountBanner ? 'lg:grid-rows-[auto_1fr_auto]' : 'lg:grid-rows-[auto_1fr]'),
        )}
      >
        <div className="flex min-w-0 flex-col gap-3 sm:gap-4 lg:col-start-1 lg:row-start-1">
          <header data-tm data-testid="home-greeting-row" className="flex items-start justify-between gap-3 max-sm:flex-col max-sm:gap-2">
            {/* The mascot says hello and the one thing worth doing today, like a teammate would. */}
            <MascotBubble pose={hasClasses ? 'gameStart' : 'welcome'} size={72} className="min-w-0 flex-1 max-sm:self-stretch lg:[&>img]:size-20">
              <h1 data-wipe suppressHydrationWarning className="font-neo-display text-lg font-black leading-tight text-neo-black sm:text-xl">
                {greeting}
              </h1>
              {cue !== null ? (
                <p data-testid="home-coach-cue" suppressHydrationWarning className="min-h-5 font-neo-body text-sm font-semibold text-neo-black/80">
                  {cue || null}
                </p>
              ) : null}
            </MascotBubble>
            <div data-testid="home-greeting-stats" className="mt-0.5 flex shrink-0 items-center gap-1.5 empty:hidden max-sm:mt-0 max-sm:ps-20 lg:hidden">
              {hasPro ? <TeacherPlanBadge quiet className="shrink-0" /> : null}
            </div>
          </header>

          {ready && alert ? <div data-testid="home-alert" className="min-w-0 [&>aside]:mt-1">{alert}</div> : null}

          {!ready ? <HomeSkeleton /> : error ? <HqLoadError onRetry={onRetry} /> : hasClasses ? desk : onboarding}
        </div>

        {sessions}
        {ready && !error && hasClasses && accountBanner ? (
          <div data-testid="home-account-banner" className={cn('min-w-0', hasRail && 'lg:col-span-2')}>{accountBanner}</div>
        ) : null}
        {ready && !error && hasClasses && footer ? (
          <div data-testid="home-footer" className={cn('min-w-0', hasRail && SESSIONS_BESIDE_RAIL)}>{footer}</div>
        ) : null}

        {hasRail ? (
          <aside aria-label={t('eduShell.home.railLabel')} className={cn('flex min-w-0 flex-col gap-4 lg:col-start-2 lg:row-start-1', showSessions && RAIL_SPAN)}>
            {!ready ? <HomeRailSkeleton /> : week?.classes ? (
              <section data-tm data-testid="home-week" aria-labelledby="home-week-title" className={cn(GAME_CARD, 'flex flex-col gap-2.5 p-3 max-lg:hidden')}>
                <h2 id="home-week-title" data-accent-decor className={cn(STICKER, 'self-start bg-neo-pink text-neo-cream')}>{t('eduShell.home.yourClasses')}</h2>
                {week.classes}
              </section>
            ) : null}
            {ready && !error && hasClasses && practice ? <div data-tm className="max-lg:hidden">{practice}</div> : null}
            {proCard ? <div data-tm>{proCard}</div> : null}
          </aside>
        ) : null}
      </div>

      {children}
    </EducationShell>
  );
}
