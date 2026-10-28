'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EduMascot } from '@/components/education/EduMascot';
import type { HomeOnboarding, HomeOnboardingStepId } from '@/lib/education/homeOnboarding';
import { PANEL, PRIMARY_BUTTON, SECONDARY_BUTTON } from './homeStyles';

type T = (key: string, params?: Record<string, string | number>) => string;

/** tryDemo with a room already open reads as "get students in", not "open another room". */
function stepCopyKey(onboarding: HomeOnboarding, stepId: HomeOnboardingStepId, field: 'body' | 'cta'): string {
  const suffix =
    stepId === 'tryDemo' && onboarding.awaitingPlayers && onboarding.current === 'tryDemo'
      ? `${field}AwaitingPlayers`
      : field;
  return `eduShell.onboarding.steps.${stepId}.${suffix}`;
}

export interface HomeOnboardingCardProps {
  onboarding: HomeOnboarding;
  /** Where each step's button goes. */
  hrefs: Record<HomeOnboardingStepId, string>;
  onStepStart?: (id: HomeOnboardingStepId) => void;
  onDismiss?: () => void;
  /** `full` replaces the hero for a teacher with no class; `compact` sits above it. */
  variant: 'full' | 'compact';
  t: T;
  /** Full variant only: a quiet action under the step button. */
  secondary?: ReactNode;
}

/** First run in three steps: create a class, share the code, try a 2-minute game. */
export function HomeOnboardingCard({ onboarding, hrefs, onStepStart, onDismiss, variant, t, secondary }: HomeOnboardingCardProps) {
  const current = onboarding.current ?? 'tryDemo';
  const full = variant === 'full';
  if (!full) return <CompactOnboarding onboarding={onboarding} current={current} hrefs={hrefs} onStepStart={onStepStart} onDismiss={onDismiss} t={t} />;
  return (
    <section
      data-testid="home-onboarding"
      aria-labelledby="home-onboarding-title"
      className={cn(PANEL, 'relative overflow-hidden p-4 sm:p-6', full && 'sm:grid sm:grid-cols-[minmax(0,1fr)_14rem] sm:items-center sm:gap-6')}
    >
      {onboarding.dismissible && onDismiss ? (
        <button
          type="button"
          data-testid="home-onboarding-dismiss"
          onClick={onDismiss}
          aria-label={t('eduShell.onboarding.dismiss')}
          className="absolute end-2 top-2 grid size-11 place-items-center rounded-neo text-neo-cream/70 transition-colors hover:bg-neo-cream/10 hover:text-neo-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      ) : null}
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex items-center gap-3">
          <EduMascot moment="welcome" size={56} className={cn('size-14 shrink-0', full && 'sm:hidden')} />
          <div className="min-w-0 pe-10">
            <h2 id="home-onboarding-title" className={cn('font-neo-display font-black leading-tight text-neo-cream', full ? 'text-2xl sm:text-3xl' : 'text-xl')}>
              {t(full ? 'eduShell.onboarding.title' : 'eduShell.onboarding.titleCompact')}
            </h2>
            <p className="mt-1 font-neo-body text-sm text-neo-cream/80">
              {t('eduShell.onboarding.progress', { done: onboarding.doneCount, total: onboarding.steps.length })}
            </p>
          </div>
        </div>

        <ol className={cn('grid gap-2', !full && 'sm:grid-cols-3')}>
          {onboarding.steps.map((step, i) => (
            <li
              key={step.id}
              data-testid={`home-onboarding-step-${step.id}`}
              data-status={step.status}
              className={cn(
                'flex items-center gap-3 rounded-neo border-[2px] px-3 py-2.5',
                step.status === 'current' ? 'border-neo-lime bg-neo-lime/10' : 'border-neo-cream/20',
                // Above the hero on a phone, only the next step earns the height.
                !full && step.status !== 'current' && 'max-sm:hidden',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'grid size-8 shrink-0 place-items-center rounded-full border-[2px] font-neo-display text-sm font-black',
                  step.status === 'done' ? 'border-neo-black bg-neo-lime text-neo-black' : 'border-neo-cream/60 text-neo-cream',
                )}
              >
                {step.status === 'done' ? <Check className="size-4" strokeWidth={3} /> : i + 1}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className={cn('font-neo-body text-sm font-bold', step.status === 'done' ? 'text-neo-cream/60 line-through' : 'text-neo-cream')}>
                  {t(`eduShell.onboarding.steps.${step.id}.title`)}
                </span>
                {step.status === 'current' ? (
                  <span className="font-neo-body text-xs text-neo-cream/75">{t(stepCopyKey(onboarding, step.id, 'body'))}</span>
                ) : null}
              </span>
            </li>
          ))}
        </ol>

        <Link
          href={hrefs[current]}
          data-testid="home-onboarding-cta"
          onClick={() => onStepStart?.(current)}
          // Beside the hero's Start live game, this is the secondary action, never a second lime slab.
          className={cn(full ? PRIMARY_BUTTON : SECONDARY_BUTTON, 'w-full sm:w-auto sm:self-start')}
        >
          {t(stepCopyKey(onboarding, current, 'cta'))}
        </Link>
        {secondary}
      </div>
      {full ? (
        <EduMascot moment="welcome" animate size={224} className="mx-auto hidden size-56 sm:block" />
      ) : null}
    </section>
  );
}

function CompactOnboarding({
  onboarding,
  current,
  hrefs,
  onStepStart,
  onDismiss,
  t,
}: Omit<HomeOnboardingCardProps, 'variant'> & { current: HomeOnboardingStepId }) {
  return (
    <section
      data-testid="home-onboarding"
      aria-labelledby="home-onboarding-title"
      className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 rounded-neo border-[2px] border-neo-cream/25 bg-neo-navy/60 py-1.5 pe-1.5 ps-3"
    >
      <ol aria-label={t('eduShell.onboarding.titleCompact')} className="flex shrink-0 gap-1">
        {onboarding.steps.map((step) => (
          <li
            key={step.id}
            data-testid={`home-onboarding-step-${step.id}`}
            data-status={step.status}
            className={cn(
              'h-2.5 w-5 rounded-full border-[2px] border-neo-black sm:w-7',
              step.status === 'done' ? 'bg-neo-lime' : step.status === 'current' ? 'bg-neo-lime/35' : 'bg-neo-cream/15',
            )}
          >
            <span className="sr-only">{t(`eduShell.onboarding.steps.${step.id}.title`)}</span>
          </li>
        ))}
      </ol>
      <h2 id="home-onboarding-title" className="min-w-0 flex-1 truncate font-neo-body text-sm font-bold text-neo-cream">
        {t(`eduShell.onboarding.steps.${current}.title`)}
      </h2>
      <div className="flex min-w-0 items-center justify-end gap-1 max-sm:basis-full">
        <Link
          href={hrefs[current]}
          data-testid="home-onboarding-cta"
          onClick={() => onStepStart?.(current)}
          className={cn(SECONDARY_BUTTON, 'min-h-[44px] min-w-0 flex-1 whitespace-nowrap px-3 py-1.5 text-sm sm:flex-none sm:px-4')}
        >
          {t(stepCopyKey(onboarding, current, 'cta'))}
        </Link>
        {onboarding.dismissible && onDismiss ? (
          <button
            type="button"
            data-testid="home-onboarding-dismiss"
            onClick={onDismiss}
            aria-label={t('eduShell.onboarding.dismiss')}
            className="grid size-11 shrink-0 place-items-center rounded-neo text-neo-cream/70 transition-colors hover:bg-neo-cream/10 hover:text-neo-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </section>
  );
}

export default HomeOnboardingCard;
