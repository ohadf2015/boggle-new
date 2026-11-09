'use client';

import type { MouseEvent, ReactNode } from 'react';
import Link from 'next/link';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EduMascot } from '@/components/education/EduMascot';
import {
  homeNextStep,
  type HomeNextStep,
  type HomeOnboarding,
  type HomeOnboardingStepId,
} from '@/lib/education/homeOnboarding';
import { SECONDARY_BUTTON } from './homeStyles';
import { NB_BLOCK, NB_PANEL, NB_PRIMARY } from '../nb/nbStyles';

type T = (key: string, params?: Record<string, string | number>) => string;

export interface HomeOnboardingCardProps {
  onboarding: HomeOnboarding;
  hrefs: Record<HomeOnboardingStepId, string>;
  shareCardShown?: boolean;
  onStepStart?: (id: HomeOnboardingStepId) => void;
  onDismiss?: () => void;
  /** `full` replaces the hero for a teacher with no class; `compact` sits above it. */
  variant: 'full' | 'compact';
  t: T;
  /** Full variant only: a quiet action under the step button. */
  secondary?: ReactNode;
}

interface CardCopy {
  steps: { id: string; title: string; done: boolean; current: boolean }[];
  heading: string;
  title: string;
  body: string | null;
  cta: string;
  href: string;
  onClick?: (e: MouseEvent) => void;
  onDismiss?: () => void;
}

function onboardingKey(step: HomeNextStep, field: 'title' | 'body' | 'cta'): string {
  const suffix = step.id === 'tryDemo' && step.awaitingPlayers ? `${field}AwaitingPlayers` : field;
  return `eduShell.onboarding.steps.${step.id}.${suffix}`;
}

function cardCopy(step: HomeNextStep, props: HomeOnboardingCardProps): CardCopy {
  const { t } = props;
  return {
    steps: props.onboarding.steps.map((s) => ({
      id: s.id,
      title: t(`eduShell.onboarding.steps.${s.id}.title`),
      done: s.status === 'done',
      current: s.id === step.id,
    })),
    heading: t('eduShell.onboarding.title'),
    title: t(onboardingKey(step, 'title')),
    body: t(onboardingKey(step, 'body')),
    cta: t(onboardingKey(step, 'cta')),
    href: props.hrefs[step.id],
    onClick: () => props.onStepStart?.(step.id),
    onDismiss: step.dismissible ? props.onDismiss : undefined,
  };
}

const DISMISS =
  'grid size-11 shrink-0 place-items-center rounded-neo text-neo-cream/70 transition-colors hover:bg-neo-cream/10 hover:text-neo-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan';

/** Home's one next-step card: the 3-step first-run list; gone when done. */
export function HomeOnboardingCard(props: HomeOnboardingCardProps) {
  const { onboarding, shareCardShown, variant, t, secondary } = props;
  const step = homeNextStep({ onboarding, shareCardShown });
  if (!step) return null;
  const copy = cardCopy(step, props);
  const dismissLabel = t('eduShell.onboarding.dismiss');
  const progress = t('eduShell.onboarding.progress', { done: step.done, total: step.total });

  if (variant === 'compact') {
    return (
      <section
        data-testid="home-onboarding"
        data-source={step.source}
        aria-labelledby="home-onboarding-title"
        className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 rounded-neo border-2 border-neo-cream/35 bg-neo-navy py-1.5 pe-1.5 ps-3"
      >
        <ol aria-label={`${copy.heading} · ${progress}`} className="flex shrink-0 gap-1">
          {copy.steps.map((s) => (
            <li
              key={s.id}
              data-testid={`home-onboarding-step-${s.id}`}
              data-status={s.done ? 'done' : s.current ? 'current' : 'todo'}
              className={cn(
                'h-2 w-5 rounded-full sm:w-7',
                s.done ? 'bg-neo-cream' : s.current ? 'bg-neo-cream/50' : 'bg-neo-cream/15',
              )}
            >
              <span className="sr-only">{s.title}</span>
            </li>
          ))}
        </ol>
        <h2 id="home-onboarding-title" className="min-w-0 flex-1 font-neo-body text-sm font-bold leading-snug text-neo-cream">
          {copy.title}
        </h2>
        <div className="flex min-w-0 items-center justify-end gap-1 max-sm:basis-full">
          <Link
            href={copy.href}
            data-testid="home-onboarding-cta"
            onClick={copy.onClick}
            className={cn(SECONDARY_BUTTON, 'min-h-[44px] min-w-0 flex-1 whitespace-nowrap px-3 py-1.5 text-sm sm:flex-none sm:px-4')}
          >
            {copy.cta}
          </Link>
          {copy.onDismiss ? (
            <button type="button" data-testid="home-onboarding-dismiss" onClick={copy.onDismiss} aria-label={dismissLabel} className={DISMISS}>
              <X className="size-5" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section
      data-testid="home-onboarding"
      data-source={step.source}
      aria-labelledby="home-onboarding-title"
      className={cn(NB_PANEL, NB_BLOCK.purple, 'relative overflow-hidden p-4 sm:grid sm:grid-cols-[minmax(0,1fr)_14rem] sm:items-center sm:gap-6 sm:p-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:p-8')}
    >
      {copy.onDismiss ? (
        <button type="button" data-testid="home-onboarding-dismiss" onClick={copy.onDismiss} aria-label={dismissLabel} className={cn(DISMISS, 'absolute end-2 top-2')}>
          <X className="size-5" aria-hidden="true" />
        </button>
      ) : null}
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex items-center gap-3">
          <EduMascot moment="firstClass" size={72} className="size-[72px] shrink-0 drop-shadow-[3px_3px_0_rgb(var(--neo-black))] sm:hidden" />
          <div className="min-w-0 pe-10">
            <h2 id="home-onboarding-title" className="font-neo-display text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">
              {copy.heading}
            </h2>
            <p className="mt-1 font-neo-body text-sm font-bold text-white/85">{progress}</p>
          </div>
        </div>

        <ol className="flex flex-wrap gap-2">
          {copy.steps.map((s, i) => (
            <li
              key={s.id}
              data-testid={`home-onboarding-step-${s.id}`}
              data-status={s.done ? 'done' : s.current ? 'current' : 'todo'}
              aria-current={s.current ? 'step' : undefined}
              className={cn(
                'flex min-h-[44px] items-center gap-2 rounded-neo-pill border-[3px] border-neo-black py-1 pe-3 ps-1 shadow-hard-lg',
                s.current ? 'bg-neo-yellow text-neo-black' : 'bg-neo-navy-light text-neo-cream',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'grid size-7 shrink-0 place-items-center rounded-full border-[2px] border-neo-black font-neo-display text-xs font-black',
                  s.done ? 'bg-neo-lime text-neo-black' : 'bg-neo-cream text-neo-black',
                )}
              >
                {s.done ? <Check className="size-4" strokeWidth={3} /> : i + 1}
              </span>
              <span className={cn('font-neo-body text-sm font-black', s.done && 'line-through opacity-60')}>{s.title}</span>
            </li>
          ))}
        </ol>

        {copy.body ? <p className="font-neo-body text-base font-semibold text-white/90">{copy.body}</p> : null}

        <Link href={copy.href} data-testid="home-onboarding-cta" onClick={copy.onClick} className={cn(NB_PRIMARY, 'min-h-[60px] w-full text-2xl sm:w-auto sm:self-start sm:px-8')}>
          {copy.cta}
        </Link>
        {secondary}
      </div>
      <EduMascot moment="firstClass" size={288} className="mx-auto hidden size-52 drop-shadow-[5px_5px_0_rgb(var(--neo-black))] sm:block lg:size-72" />
    </section>
  );
}

export default HomeOnboardingCard;
