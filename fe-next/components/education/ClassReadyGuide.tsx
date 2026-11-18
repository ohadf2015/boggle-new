'use client';

import type { ReactNode } from 'react';
import { m } from 'framer-motion';
import { CalendarClock, Check, EyeOff, UsersRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NB_LINK } from '@/components/teacher/nb/nbStyles';

type T = (key: string, params?: Record<string, string | number>) => string;

const K = 'eduShell.setup.guide';
const SPRING = { type: 'spring', stiffness: 420, damping: 30 } as const;
const CHOICE =
  'group flex w-full items-start gap-3 rounded-neo-lg border-[3px] border-neo-black p-3 text-start shadow-hard-sm transition-[transform,box-shadow] duration-100 hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0.5 active:shadow-hard-pressed disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none motion-reduce:hover:translate-y-0';

export type GuideStage = 'ask' | 'try' | 'plan';

function enter(reduced: boolean, delay = 0) {
  return reduced
    ? { initial: false as const }
    : { initial: { y: 14, scale: 0.98 }, animate: { y: 0, scale: 1 }, transition: { ...SPRING, delay } };
}

/** Three stops, so a new teacher can see that nothing goes live until the last one. */
export function ClassReadyRail({ current, reduced, t }: { current: 1 | 2; reduced: boolean; t: T }) {
  const steps = [`${K}.stepClass`, `${K}.stepReady`, `${K}.stepPlay`];
  return (
    <ol data-testid="setup-guide-rail" className="flex items-center gap-1.5">
      {steps.map((key, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={key} aria-current={active ? 'step' : undefined} className="flex min-w-0 flex-1 items-center gap-1.5">
            <m.span
              key={active ? 'active' : 'idle'}
              {...(active && !reduced ? { initial: { scale: 0.6 }, animate: { scale: 1 }, transition: SPRING } : { initial: false })}
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-neo-black font-neo-display text-xs font-black',
                done ? 'bg-neo-lime text-neo-black' : active ? 'bg-neo-cyan text-neo-black' : 'bg-neo-navy-light text-neo-cream/70',
              )}
            >
              {done ? <Check className="size-3.5" aria-hidden="true" /> : i + 1}
            </m.span>
            <span className={cn('truncate font-neo-body text-xs font-bold', active ? 'text-neo-cream' : 'text-neo-cream/65')}>{t(key)}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function ClassReadyGuide({
  stage,
  ready,
  reduced,
  rehearse,
  plan,
  onWithStudents,
  onAlone,
  onSkipTry,
  t,
}: {
  stage: GuideStage;
  ready: boolean;
  reduced: boolean;
  rehearse?: ReactNode;
  plan: ReactNode;
  onWithStudents: () => void;
  onAlone: () => void;
  onSkipTry: () => void;
  t: T;
}) {
  return (
    <div data-testid="setup-guide" className="flex flex-col gap-3 rounded-neo-lg border-[3px] border-neo-cream/50 bg-neo-navy-light p-3 sm:p-4">
      <ClassReadyRail current={1} reduced={reduced} t={t} />

      {stage === 'ask' ? (
        <m.div key="ask" data-testid="setup-together" {...enter(reduced)} className="flex flex-col gap-2.5">
          <h2 className="font-neo-display text-xl font-black text-neo-cream">{t(`${K}.askTitle`)}</h2>
          <m.button type="button" data-testid="setup-together-now" disabled={!ready} onClick={onWithStudents} {...enter(reduced, 0.05)} className={cn(CHOICE, 'bg-neo-lime text-neo-black')}>
            <UsersRound className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block font-neo-display text-lg font-black leading-tight">{t(`${K}.withStudents`)}</span>
              <span className="mt-0.5 block font-neo-body text-sm font-semibold">{t(`${K}.withStudentsBody`)}</span>
            </span>
          </m.button>
          <m.button type="button" data-testid="setup-together-later" disabled={!ready} onClick={onAlone} {...enter(reduced, 0.1)} className={cn(CHOICE, 'bg-neo-cream text-neo-black')}>
            <CalendarClock className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block font-neo-display text-lg font-black leading-tight">{t(`${K}.alone`)}</span>
              <span className="mt-0.5 block font-neo-body text-sm font-semibold">{t(`${K}.aloneBody`)}</span>
            </span>
          </m.button>
        </m.div>
      ) : null}

      {stage === 'try' ? (
        <m.div key="try" data-testid="setup-guide-try" {...enter(reduced)} className="flex flex-col items-start gap-2.5">
          <h2 className="font-neo-display text-xl font-black text-neo-cream">{t(`${K}.tryTitle`)}</h2>
          <p className="inline-flex items-start gap-2 font-neo-body text-sm font-semibold text-neo-cream/85">
            <EyeOff className="mt-0.5 size-4 shrink-0 text-neo-cyan" aria-hidden="true" />
            {t(`${K}.tryBody`)}
          </p>
          {rehearse}
          <button type="button" data-testid="setup-guide-skip-try" onClick={onSkipTry} className={NB_LINK}>
            {t(`${K}.skipTry`)}
          </button>
        </m.div>
      ) : null}

      {stage === 'plan' ? (
        <m.div key="plan" data-testid="setup-plan-lead" {...enter(reduced)}>
          {plan}
        </m.div>
      ) : null}
    </div>
  );
}

export default ClassReadyGuide;
