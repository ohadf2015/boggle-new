'use client';

import Link from 'next/link';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  type TrialFirstSessionHrefs,
  type TrialFirstSessionState,
  type TrialFirstSessionStepId,
} from '@/lib/education/trialFirstSessionChecklist';
import { NB_PANEL, NB_PRIMARY, NB_SECONDARY } from '../nb/nbStyles';

type T = (key: string, params?: Record<string, string | number>) => string;

export interface TrialFirstSessionChecklistProps {
  checklist: TrialFirstSessionState;
  hrefs: TrialFirstSessionHrefs;
  onDismiss?: (step: TrialFirstSessionStepId) => void;
  onEngage?: (step: TrialFirstSessionStepId) => void;
  onOpenAssignment?: () => void;
  onSchedule?: () => void;
  t: T;
}

const STEP_HREF: Record<TrialFirstSessionStepId, keyof TrialFirstSessionHrefs> = {
  create_classroom: 'create_classroom',
  add_students: 'add_students',
  create_assignment: 'create_assignment',
  first_live_game: 'first_live_game',
};

/**
 * Trial first-session checklist. Rendered from the trial welcome and from
 * starter packs — not a second Home onboarding card.
 */
export function TrialFirstSessionChecklist({
  checklist,
  hrefs,
  onDismiss,
  onEngage,
  onOpenAssignment,
  onSchedule,
  t,
}: TrialFirstSessionChecklistProps) {
  if (!checklist.visible || !checklist.current) return null;
  const current = checklist.current;

  return (
    <section
      data-testid="trial-first-session"
      aria-labelledby="trial-first-session-title"
      className={cn(NB_PANEL, 'relative p-4 sm:p-5')}
    >
      {onDismiss ? (
        <button
          type="button"
          data-testid="trial-first-session-dismiss"
          onClick={() => onDismiss(current)}
          aria-label={t('eduShell.firstSession.dismiss')}
          className="absolute end-2 top-2 grid size-11 place-items-center rounded-neo text-neo-cream/70 hover:bg-neo-cream/10 hover:text-neo-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      ) : null}
      <div className="flex min-w-0 flex-col gap-4 pe-10">
        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="trial-first-session-title" className="font-neo-display text-xl font-black text-neo-cream sm:text-2xl">
              {t('eduShell.firstSession.title')}
            </h2>
            <span data-testid="trial-first-session-progress" className="font-neo-body text-xs font-bold text-neo-cream/80">
              {t('eduShell.firstSession.progress', { done: checklist.doneCount, total: checklist.steps.length })}
            </span>
          </div>
          <p className="mt-1 font-neo-body text-sm text-neo-cream/80">{t('eduShell.firstSession.subtitle')}</p>
        </div>
        <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {checklist.steps.map((step) => {
            const isCurrent = step.status === 'current';
            return (
              <li
                key={step.id}
                data-testid={`trial-first-session-step-${step.id}`}
                data-status={step.status}
                className={cn(
                  'flex min-w-0 flex-col justify-between gap-3 rounded-neo border-2 px-3 py-2.5',
                  isCurrent ? 'border-neo-lime bg-neo-lime/10' : 'border-neo-cream/25',
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'grid size-8 shrink-0 place-items-center rounded-full border-2 font-neo-display text-sm font-black',
                      step.done ? 'border-neo-black bg-neo-lime text-neo-black' : 'border-neo-cream/60 text-neo-cream',
                    )}
                  >
                    {step.done ? <Check className="size-4" strokeWidth={3} /> : step.index}
                  </span>
                  <span className={cn('font-neo-body text-sm font-bold', step.done ? 'text-neo-cream/60 line-through' : 'text-neo-cream')}>
                    {t(`eduShell.firstSession.steps.${step.id}.title`)}
                  </span>
                </div>
                {isCurrent ? (
                  <div className="flex flex-col gap-2">
                    <Link
                      href={hrefs[STEP_HREF[step.id]]}
                      data-testid="trial-first-session-cta"
                      onClick={(event) => {
                        onEngage?.(step.id);
                        if (step.id === 'create_assignment' && onOpenAssignment) {
                          event.preventDefault();
                          onOpenAssignment();
                        }
                      }}
                      className={cn(NB_PRIMARY, 'min-h-11 w-full px-3 py-2 text-center text-sm sm:w-auto sm:self-start')}
                    >
                      {t(`eduShell.firstSession.steps.${step.id}.cta`)}
                    </Link>
                    {step.id === 'first_live_game' ? (
                      <Link
                        href={hrefs.schedule_live_game}
                        data-testid="trial-first-session-schedule"
                        onClick={() => onSchedule?.()}
                        className={cn(NB_SECONDARY, 'min-h-11 w-full px-3 py-2 text-center text-sm sm:w-auto sm:self-start')}
                      >
                        {t('eduShell.firstSession.schedule')}
                      </Link>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
