'use client';

import type { ReactNode, Ref } from 'react';
import { EducationShell } from '@/components/education/shell/EducationShell';
import { cn } from '@/lib/utils';
import { HqLoadError } from '../hq/HqLoadError';
import { HomeSkeleton } from './HomeSkeleton';
import { HOME_FIRST_FRAME, HOME_GREETING_ROW, HOME_GRID_BASE, HOME_MAIN_COLUMN } from './homeLayout';
import { MascotBubble } from '../nb/MascotBubble';

type T = (key: string, params?: Record<string, string | number>) => string;

export interface TeacherHomeViewProps {
  t: T;
  isRTL: boolean;
  revealRef?: Ref<HTMLDivElement>;
  /** Shown as its own line only without a class desk; the desk carries it otherwise. */
  greeting: string;
  ready: boolean;
  error: boolean;
  onRetry: () => void;
  hasClasses: boolean;
  onboarding: ReactNode;
  desk: ReactNode;
  sessions: ReactNode | null;
  /** After the ready-made games: the week challenge and the next-lesson prompt. */
  below?: ReactNode;
  accountBanner: ReactNode | null;
  /** Billing trouble (declined renewal): before the desk, never below the fold. */
  alert?: ReactNode | null;
  proCard: ReactNode | null;
  /** Below the ready-made games: per-class seat counts and other things a teacher checks now and then. */
  footer?: ReactNode;
  welcome?: ReactNode;
  children?: ReactNode;
}

export function TeacherHomeView({
  t, isRTL, revealRef, greeting, ready, error, onRetry, hasClasses, onboarding, desk,
  sessions, below, accountBanner, alert = null, proCard, footer, welcome, children,
}: TeacherHomeViewProps) {
  const deskShown = ready && !error && hasClasses;
  return (
    <EducationShell
      className={cn(isRTL && 'rtl')}
      scrollRegionLabel={t('eduShell.home.regionLabel')}
      contentClassName="relative isolate"
    >
      {welcome}

      <div ref={revealRef} data-testid="teacher-home" className={HOME_GRID_BASE}>
        <div data-testid="home-first-frame" className={cn(HOME_MAIN_COLUMN, (deskShown || !ready) && HOME_FIRST_FRAME)}>
          {ready && !deskShown ? (
            <header data-tm data-testid="home-greeting-row" className={HOME_GREETING_ROW}>
              <MascotBubble pose="welcome" size={72} className="min-w-0 flex-1 max-sm:self-stretch lg:[&>img]:size-20">
                <h1 data-wipe suppressHydrationWarning className="font-neo-display text-lg font-black leading-tight text-neo-black sm:text-xl">
                  {greeting}
                </h1>
              </MascotBubble>
            </header>
          ) : null}

          {ready && alert ? <div data-testid="home-alert" className="min-w-0 [&>aside]:mt-1">{alert}</div> : null}

          {!ready ? <HomeSkeleton /> : error ? <HqLoadError onRetry={onRetry} /> : hasClasses ? desk : onboarding}

          {deskShown && proCard ? <div data-tm className="min-w-0">{proCard}</div> : null}
        </div>

        {sessions}
        {deskShown && below ? <div data-testid="home-below" className="flex min-w-0 flex-col gap-3 empty:hidden sm:gap-4">{below}</div> : null}
        {deskShown && accountBanner ? <div data-testid="home-account-banner" className="min-w-0">{accountBanner}</div> : null}
        {deskShown && footer ? <div data-testid="home-footer" className="min-w-0">{footer}</div> : null}
      </div>

      {children}
    </EducationShell>
  );
}
