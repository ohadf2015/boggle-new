'use client';

import Link from 'next/link';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  TrialChecklistState,
  TrialChecklistStepId,
} from '@/lib/education/trialChecklistProgress';
import { PANEL, PRIMARY_BUTTON } from './homeStyles';

type T = (key: string, params?: Record<string, string | number>) => string;

export interface TrialActivationChecklistProps {
  checklist: TrialChecklistState;
  hrefs: Record<TrialChecklistStepId, string>;
  onDismiss?: () => void;
  onOpenAssignment?: () => void;
  t: T;
}

/**
 * Day-0 activation banner for Polar Teacher Pro trial teachers on Teacher HQ.
 * Shows all three steps on mobile and desktop, with a CTA on the current step.
 */
export function TrialActivationChecklist({
  checklist,
  hrefs,
  onDismiss,
  onOpenAssignment,
  t,
}: TrialActivationChecklistProps) {
  if (!checklist.visible) return null;

  return (
    <section
      data-testid="trial-activation-checklist"
      aria-labelledby="trial-activation-checklist-title"
      className={cn(PANEL, 'relative overflow-hidden p-4 sm:p-6')}
    >
      {onDismiss ? (
        <button
          type="button"
          data-testid="trial-checklist-dismiss"
          onClick={onDismiss}
          aria-label={t('eduShell.trialChecklist.dismiss')}
          className="absolute end-2 top-2 grid size-11 min-h-[44px] min-w-[44px] place-items-center rounded-neo text-neo-cream/70 transition-colors hover:bg-neo-cream/10 hover:text-neo-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      ) : null}

      <div className="flex min-w-0 flex-col gap-4">
        <div className="min-w-0 pe-10">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2
              id="trial-activation-checklist-title"
              className="font-neo-display text-xl font-black leading-tight text-neo-cream sm:text-2xl"
            >
              {t('eduShell.trialChecklist.title')}
            </h2>
            <span
              data-testid="trial-checklist-progress"
              className="font-neo-body text-xs font-bold text-neo-cream/80"
            >
              {t('eduShell.trialChecklist.progress', {
                done: checklist.doneCount,
                total: checklist.steps.length,
              })}
            </span>
          </div>
          <p className="mt-1 font-neo-body text-sm text-neo-cream/80">
            {t('eduShell.trialChecklist.subtitle')}
          </p>
        </div>

        <ol className="grid gap-2 sm:grid-cols-3">
          {checklist.steps.map((step, i) => {
            const isDone = step.status === 'done';
            const isCurrent = step.status === 'current';
            return (
              <li
                key={step.id}
                data-testid={`trial-checklist-step-${step.id}`}
                data-status={step.status}
                className={cn(
                  'flex flex-col justify-between gap-3 rounded-neo border-[2px] px-3 py-2.5',
                  isCurrent ? 'border-neo-lime bg-neo-lime/10' : 'border-neo-cream/20',
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'grid size-8 shrink-0 place-items-center rounded-full border-[2px] font-neo-display text-sm font-black',
                      isDone
                        ? 'border-neo-black bg-neo-lime text-neo-black'
                        : 'border-neo-cream/60 text-neo-cream',
                    )}
                  >
                    {isDone ? <Check className="size-4" strokeWidth={3} /> : i + 1}
                  </span>
                  <span
                    className={cn(
                      'font-neo-body text-sm font-bold',
                      isDone ? 'text-neo-cream/60 line-through' : 'text-neo-cream',
                    )}
                  >
                    {t(`eduShell.trialChecklist.steps.${step.id}.title`)}
                  </span>
                </div>

                {isCurrent ? (
                  <Link
                    href={hrefs[step.id]}
                    data-testid="trial-checklist-cta"
                    onClick={(e) => {
                      if (step.id === 'first_assignment' && onOpenAssignment) {
                        e.preventDefault();
                        onOpenAssignment();
                      }
                    }}
                    className={cn(
                      PRIMARY_BUTTON,
                      'min-h-[44px] w-full px-4 py-2 text-sm sm:w-auto sm:self-start',
                    )}
                  >
                    {t(`eduShell.trialChecklist.steps.${step.id}.cta`)}
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

export default TrialActivationChecklist;
