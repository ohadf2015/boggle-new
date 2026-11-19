'use client';

import type { ReactNode } from 'react';
import { m } from 'framer-motion';
import { CalendarClock, UsersRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NB_LINK } from '@/components/teacher/nb/nbStyles';

type T = (key: string, params?: Record<string, string | number>) => string;

const K = 'eduShell.setup.guide';
const SPRING = { type: 'spring', stiffness: 420, damping: 30 } as const;
const BIG_CHOICE =
  'flex min-h-[72px] w-full items-center gap-3 rounded-neo-lg border-[3px] border-neo-black px-4 py-3 text-start shadow-hard transition-[transform,box-shadow] duration-100 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-y-0.5 active:shadow-hard-pressed disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none motion-reduce:hover:translate-y-0';

export type GuideStage = 'ask' | 'plan';

function enter(reduced: boolean, delay = 0) {
  return reduced
    ? { initial: false as const }
    : { initial: { y: 14, scale: 0.98 }, animate: { y: 0, scale: 1 }, transition: { ...SPRING, delay } };
}

/** The class-ready question: bring the class in, try it privately first, or plan the next lesson. Nothing here starts a game. */
export function ClassReadyGuide({
  stage,
  ready,
  reduced,
  tryAsStudent,
  plan,
  onWithStudents,
  onAlone,
  t,
}: {
  stage: GuideStage;
  ready: boolean;
  reduced: boolean;
  /** The big secondary action; it opens a private practice round, never one students can see. */
  tryAsStudent?: ReactNode;
  plan: ReactNode;
  onWithStudents: () => void;
  onAlone: () => void;
  t: T;
}) {
  if (stage === 'plan') {
    return (
      <m.div key="plan" data-testid="setup-plan-lead" {...enter(reduced)} className="flex flex-col gap-3">
        {plan}
      </m.div>
    );
  }
  return (
    <m.div
      key="ask"
      data-testid="setup-together"
      {...enter(reduced)}
      className="flex flex-col gap-4 rounded-neo-xl border-[3px] border-neo-cream/50 bg-neo-navy-light p-4 shadow-hard-xl sm:p-6"
    >
      <h2 className="font-neo-display text-2xl font-black text-neo-cream sm:text-3xl">{t(`${K}.askTitle`)}</h2>
      <button type="button" data-testid="setup-together-now" data-hero="true" disabled={!ready} onClick={onWithStudents} className={cn(BIG_CHOICE, 'bg-neo-lime text-neo-black')}>
        <UsersRound className="size-7 shrink-0" aria-hidden="true" />
        <span className="min-w-0">
          <span className="block font-neo-display text-2xl font-black leading-tight">{t(`${K}.withStudents`)}</span>
          <span className="mt-0.5 block font-neo-body text-sm font-bold">{t(`${K}.withStudentsBody`)}</span>
        </span>
      </button>
      {tryAsStudent ? (
        <div data-testid="setup-try-hero" className="flex flex-col gap-1.5">
          {tryAsStudent}
          <p className="px-1 font-neo-body text-sm font-semibold text-neo-cream/75">{t(`${K}.tryBody`)}</p>
        </div>
      ) : null}
      <button type="button" data-testid="setup-together-later" disabled={!ready} onClick={onAlone} className={cn(NB_LINK, 'self-start')}>
        <CalendarClock className="size-4 shrink-0" aria-hidden="true" />
        {t(`${K}.alone`)}
      </button>
    </m.div>
  );
}

export default ClassReadyGuide;
