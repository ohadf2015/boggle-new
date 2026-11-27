'use client';

import { useState } from 'react';
import { m } from 'framer-motion';
import { ChevronDown, ChevronUp, Clock, Gamepad2, Play, Puzzle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EDU_MOTION, pressClasses, pressMotion, useReducedMotionSafe } from './motion';
import { ARCADE_BLOCK } from '@/lib/education/arcadeAccent';
import { modeArcadeAccent } from './lobby/LobbyModeGrid';
import type { CatalogueMode, CatalogueModeKeys } from './ClassroomModeCatalogueData';

type T = (key: string, params?: Record<string, string | number>) => string;

export interface ClassroomModeSpotlightProps {
  mode: CatalogueMode;
  keys: CatalogueModeKeys;
  minutes: number;
  language: string;
  /** Page direction, so badges, icons and text sit on the reading side. */
  dir?: 'rtl' | 'ltr';
  busy?: boolean;
  blockedKey: string | null;
  onGoLive: () => void;
  t: T;
}

const CHIP =
  'inline-flex min-w-0 items-center gap-1 whitespace-nowrap rounded-full border border-neo-cream/35 edu-sky:border-edu-line px-2 py-0.5 font-neo-body text-xs font-bold text-neo-cream/80 edu-sky:text-edu-ink/80 @4xl/lobby:text-sm';
const EXPANDED_HIDE = 'group-has-[[data-lobby-expanded]]/lobby:hidden';

function Spec({ testId, icon: Icon, label, value, className }: { testId: string; icon: typeof Clock; label: string; value: string; className?: string }) {
  return (
    <div data-testid={testId} title={label} className={cn(CHIP, className)}>
      <Icon className="size-3.5 shrink-0" strokeWidth={2.5} aria-hidden="true" />
      <span data-spec="label" className="sr-only">{label}</span>
      <span data-spec="value">{value}</span>
    </div>
  );
}

/**
 * The ready panel: the game about to go live, big, and the one Start.
 * Cover art beside the name from a wide lobby, above it on a phone; specs and steps wait behind How it plays.
 * While the setup above it is expanded, the panel shrinks to the name and Start.
 */
export function ClassroomModeSpotlight({ mode, keys, minutes, dir, busy, blockedKey, onGoLive, t }: ClassroomModeSpotlightProps) {
  const [stepsOpen, setStepsOpen] = useState(false);
  const reduced = useReducedMotionSafe();
  const name = t(keys.name);
  const minutesLabel = t('education.modePicker.minutes', { count: minutes });
  return (
    <section
      data-testid="mode-spotlight"
      dir={dir}
      aria-live="polite"
      className="flex min-h-0 flex-1 flex-col gap-3 rounded-neo-xl border-[3px] border-neo-cream/40 edu-sky:border-edu-line bg-neo-navy-light edu-sky:bg-edu-surface p-3 shadow-hard-xl @4xl/lobby:flex-row @4xl/lobby:gap-8 @4xl/lobby:p-6 group-has-[[data-lobby-expanded]]/lobby:@4xl/lobby:p-4"
    >
      <div
        data-testid="spotlight-art"
        data-accent-decor
        className={cn('relative min-h-24 flex-1 overflow-hidden rounded-neo-lg border-2 border-neo-black', ARCADE_BLOCK[modeArcadeAccent(mode.id)], EXPANDED_HIDE)}
      >
        <m.img
          key={mode.id}
          src={mode.cover}
          alt=""
          aria-hidden="true"
          initial={reduced ? false : { scale: 0.92, rotate: -4 }}
          animate={{ scale: 1, rotate: -1 }}
          transition={reduced ? { duration: 0 } : EDU_MOTION.spring.pop}
          className="absolute inset-2 size-[calc(100%-1rem)] object-contain @4xl/lobby:inset-4 @4xl/lobby:size-[calc(100%-2rem)]"
        />
      </div>

      <div className="flex min-h-0 shrink-0 flex-col gap-3 @4xl/lobby:w-[46%] @4xl/lobby:justify-center group-has-[[data-lobby-expanded]]/lobby:@4xl/lobby:w-full group-has-[[data-lobby-expanded]]/lobby:@4xl/lobby:flex-row group-has-[[data-lobby-expanded]]/lobby:@4xl/lobby:items-center">
        <m.div
          key={mode.id}
          data-testid="spotlight-text"
          initial={reduced ? false : { y: EDU_MOTION.reveal.y }}
          animate={{ y: 0 }}
          transition={reduced ? { duration: 0 } : EDU_MOTION.spring.settle}
          className="flex min-h-0 min-w-0 flex-col gap-1.5 overflow-y-auto text-start @4xl/lobby:gap-2.5 group-has-[[data-lobby-expanded]]/lobby:@4xl/lobby:flex-1"
        >
          <span data-testid="spotlight-category" className={cn('font-neo-body text-xs font-black uppercase tracking-[0.08em] text-neo-cream/60 edu-sky:text-edu-ink/60 @4xl/lobby:text-sm', EXPANDED_HIDE)}>{t(keys.category)}</span>
          <h2 className="font-neo-display text-2xl font-bold leading-tight text-neo-cream edu-sky:text-edu-ink @4xl/lobby:text-5xl">{name}</h2>
          <p data-testid="spotlight-how" className={cn('font-neo-body text-sm leading-snug text-neo-cream/80 edu-sky:text-edu-ink/80 @4xl/lobby:text-lg', EXPANDED_HIDE)}>
            <span className="line-clamp-2 @4xl/lobby:line-clamp-none">{t(keys.how)}</span>
          </p>
          <button
            type="button"
            data-testid="how-it-plays-toggle"
            aria-expanded={stepsOpen}
            aria-controls="how-it-plays-details"
            title={t(stepsOpen ? 'eg2Modes.hideHowItPlays' : 'eg2Modes.howItPlays')}
            onClick={() => setStepsOpen((v) => !v)}
            className={cn('inline-flex min-h-11 items-center gap-1 self-start rounded-neo px-1 font-neo-body text-sm font-bold text-neo-cream/85 edu-sky:text-edu-ink/85 underline decoration-2 underline-offset-4 hover:text-neo-cream edu-sky:hover:text-edu-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cream edu-sky:focus-visible:ring-edu-line', EXPANDED_HIDE)}
          >
            {t(stepsOpen ? 'eg2Modes.hideHowItPlays' : 'eg2Modes.howItPlays')}
            {stepsOpen ? <ChevronUp className="size-4" strokeWidth={3} aria-hidden="true" /> : <ChevronDown className="size-4" strokeWidth={3} aria-hidden="true" />}
          </button>
          <div id="how-it-plays-details" className={cn('flex flex-col gap-2.5 empty:hidden', EXPANDED_HIDE)}>
          {stepsOpen ? (
            <>
              <div className="flex min-w-0 flex-wrap gap-1.5">
                <Spec testId="spec-duration" icon={Clock} label={t('eg2Modes.spec.duration')} value={minutesLabel} />
                <Spec testId="spec-complexity" icon={Puzzle} label={t('eg2Modes.spec.complexity')} value={t(keys.complexity)} />
                <Spec testId="spec-style" icon={Gamepad2} label={t('eg2Modes.spec.style')} value={t(keys.style)} />
              </div>
              <div data-testid="spotlight-best-for" className="flex flex-wrap items-center gap-1.5">
                <span className="font-neo-body text-sm font-bold text-neo-cream/60 edu-sky:text-edu-ink/60">{t('eg2Modes.bestForLabel')}</span>
                {keys.bestFor.map((k) => (
                  <span key={k} data-testid="best-for-chip" className={CHIP}>
                    {t(k)}
                  </span>
                ))}
              </div>
              <ol id="how-it-plays" data-testid="how-it-plays" aria-label={t('eg2Modes.howItPlays')} className="grid gap-1.5 text-start">
                {keys.steps.map((k, i) => (
                  <li key={k} className="flex items-start gap-2 font-neo-body text-sm leading-snug text-neo-cream/90 edu-sky:text-edu-ink/90">
                    <StepNumber n={i + 1} />
                    {t(k)}
                  </li>
                ))}
              </ol>
            </>
          ) : null}
          </div>
        </m.div>

        <div className="flex shrink-0 flex-col gap-1.5 group-has-[[data-lobby-expanded]]/lobby:@4xl/lobby:w-[24rem]">
          {blockedKey && (
            <p data-testid="go-live-blocked" role="status" className="text-center font-neo-body text-sm font-bold text-neo-cream/80 edu-sky:text-edu-ink/80">
              {t(blockedKey)}
            </p>
          )}
          <m.button
            type="button"
            data-testid="lobby-go-live"
            aria-label={t('education.modePicker.launch', { mode: name })}
            onClick={onGoLive}
            disabled={!!blockedKey || busy}
            {...(blockedKey || busy ? {} : pressMotion(reduced))}
            className={cn(
              'mb-1 flex min-h-[72px] w-full items-center justify-center gap-3 rounded-neo-lg border-[3px] border-neo-black edu-sky:border-neo-black px-4 py-2 @4xl/lobby:min-h-[88px]',
              'bg-neo-lime edu-sky:bg-neo-lime font-neo-display text-neo-black edu-sky:text-neo-black',
              pressClasses(4),
              'disabled:cursor-not-allowed disabled:border-neo-cream/20 edu-sky:disabled:border-edu-line/20 disabled:bg-neo-navy-light edu-sky:disabled:bg-edu-surface disabled:text-neo-cream/70 edu-sky:disabled:text-edu-ink/70',
            )}
          >
            <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full border-2 border-neo-cream/40 edu-sky:border-edu-line bg-neo-black/10 @4xl/lobby:size-12">
              <Play className={cn('size-5 shrink-0 fill-current @4xl/lobby:size-6', !reduced && !blockedKey && 'animate-pulse')} strokeWidth={3} />
            </span>
            <span className="flex min-w-0 flex-col items-start leading-tight">
              <span data-testid="go-live-label" className="whitespace-nowrap text-2xl font-black tracking-[0.01em] @4xl/lobby:text-3xl">
                {t('eduShell.home.startLive')}
              </span>
              <span className="font-neo-body text-sm font-bold opacity-80">
                {name} · {minutesLabel}
              </span>
            </span>
          </m.button>
        </div>
      </div>
    </section>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <span className="grid size-5 shrink-0 place-items-center rounded-full border border-neo-cream/40 edu-sky:border-edu-line font-neo-body text-xs font-bold text-neo-cream edu-sky:text-edu-ink @4xl/lobby:size-6">
      {n}
    </span>
  );
}

export default ClassroomModeSpotlight;
