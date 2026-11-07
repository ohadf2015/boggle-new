'use client';

import type { ComponentType } from 'react';
import { BookOpen, ChevronDown, KeyRound, Projector, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NB_BLOCK, NB_PANEL, type NbColor } from '../nb/nbStyles';

type T = (key: string, params?: Record<string, string | number>) => string;

const TERMS: { id: 'joinCode' | 'board' | 'round' | 'wordList'; icon: ComponentType<{ className?: string }>; color: NbColor }[] = [
  { id: 'joinCode', icon: KeyRound, color: 'yellow' },
  { id: 'board', icon: Projector, color: 'cyan' },
  { id: 'round', icon: Timer, color: 'lime' },
  { id: 'wordList', icon: BookOpen, color: 'pink' },
];

function Terms({ t, className }: { t: T; className?: string }) {
  return (
    <dl className={cn('grid gap-3 sm:grid-cols-2 xl:grid-cols-4', className)}>
      {TERMS.map(({ id, icon: Icon, color }) => (
        <div key={id} data-testid={`home-how-${id}`} className="flex min-w-0 items-start gap-3">
          <span aria-hidden="true" className={cn('grid size-10 shrink-0 place-items-center rounded-neo border-[3px] shadow-hard', NB_BLOCK[color])}>
            <Icon className="size-5" />
          </span>
          <div className="min-w-0">
            <dt className="font-neo-display text-base font-black leading-tight text-neo-cream">{t(`eduShell.onboarding.howItWorks.${id}.title`)}</dt>
            <dd className="mt-0.5 font-neo-body text-sm font-semibold leading-snug text-neo-cream/80">{t(`eduShell.onboarding.howItWorks.${id}.body`)}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}

/**
 * The four words a new teacher meets on every screen (join code, board, round, word list),
 * each in one line. Open on wide screens, where it fills the space under the first-class card;
 * one tap away on a phone, so it never pushes the first step down.
 */
export function HomeHowItWorks({ t }: { t: T }) {
  const title = t('eduShell.onboarding.howItWorks.title');
  const hint = t('eduShell.onboarding.howItWorks.hint');
  return (
    <section data-testid="home-how-it-works" aria-label={title} className="min-w-0">
      <details className={cn(NB_PANEL, 'group p-0 sm:hidden')}>
        <summary className="flex min-h-[52px] cursor-pointer list-none items-center gap-2 px-4 py-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan [&::-webkit-details-marker]:hidden">
          <span className="min-w-0 flex-1">
            <span className="block font-neo-display text-lg font-black leading-tight">{title}</span>
            <span className="block font-neo-body text-xs font-semibold text-neo-cream/75">{hint}</span>
          </span>
          <ChevronDown className="size-5 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
        </summary>
        <Terms t={t} className="px-4 pb-4" />
      </details>
      <div className={cn(NB_PANEL, 'hidden flex-col gap-4 p-5 sm:flex lg:p-6')}>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <h2 className="font-neo-display text-2xl font-black leading-tight">{title}</h2>
          <p className="font-neo-body text-sm font-semibold text-neo-cream/75">{hint}</p>
        </div>
        <Terms t={t} />
      </div>
    </section>
  );
}

export default HomeHowItWorks;
