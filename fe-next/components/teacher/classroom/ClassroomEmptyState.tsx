'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

const STEPS = [
  { n: '1', color: 'bg-neo-cyan', key: 'step1' },
  { n: '2', color: 'bg-neo-lime', key: 'step2' },
  { n: '3', color: 'bg-neo-pink', key: 'step3' },
] as const;

/** First visit to the Classes tab: what happens next, and one way in — the setup flow. */
export function ClassroomEmptyState({ createHref }: { createHref: string }) {
  const { t } = useLanguage();

  return (
    <section
      data-testid="classroom-empty-state"
      aria-labelledby="classroom-empty-title"
      className="rounded-neo-lg border-2 border-neo-black bg-neo-cream px-5 py-8 text-neo-black shadow-hard sm:px-8"
    >
      <div className="mb-6 text-center">
        <h2 id="classroom-empty-title" className="text-balance font-neo-display text-xl font-bold sm:text-2xl">
          {t('teacher.classroom.wizard.title')}
        </h2>
        <p className="mt-1 text-pretty font-neo-body text-sm font-bold text-neo-black/70">
          {t('teacher.classroom.wizard.subtitle')}
        </p>
      </div>

      <ol className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {STEPS.map((step) => (
          <li key={step.n} className="flex items-start gap-3 sm:flex-col sm:items-center sm:gap-2 sm:text-center">
            <span
              aria-hidden="true"
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-neo border-2 border-neo-black font-neo-display font-black tabular-nums text-neo-black shadow-hard-sm',
                step.color,
              )}
            >
              {step.n}
            </span>
            <div>
              <p className="text-balance font-neo-display font-bold">{t(`teacher.classroom.wizard.${step.key}.title`)}</p>
              <p className="mt-0.5 text-pretty font-neo-body text-sm font-bold text-neo-black/70">
                {t(`teacher.classroom.wizard.${step.key}.body`)}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <div className="flex justify-center">
        <Link
          href={createHref}
          data-testid="classroom-empty-create"
          className={cn(
            'inline-flex min-h-12 items-center gap-2 rounded-neo border-2 border-neo-black bg-neo-lime px-6 py-2.5',
            'font-neo-display text-lg font-black uppercase tracking-tight text-neo-black shadow-hard',
            'transition hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-y-0.5 active:shadow-hard-pressed',
            'focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan',
          )}
        >
          <Plus className="size-5" strokeWidth={3} aria-hidden="true" />
          {t('teacher.classroom.create')}
        </Link>
      </div>
    </section>
  );
}

export default ClassroomEmptyState;
