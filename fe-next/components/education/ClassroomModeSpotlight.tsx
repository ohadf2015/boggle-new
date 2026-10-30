'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Clock, Gamepad2, Puzzle, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  'inline-flex min-w-0 items-center gap-1 whitespace-nowrap rounded-full border border-neo-cream/35 px-2 py-0.5 font-neo-body text-xs font-bold text-neo-cream/80 @4xl/lobby:text-sm';

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
 * The ready panel: what is about to go live, and the one GO LIVE.
 * Phones get a dock (thumb, name, minutes, button) under the picker; from lg it is
 * a column with the mode's cover, a short description and the steps when there is room.
 */
export function ClassroomModeSpotlight({ mode, keys, minutes, dir, busy, blockedKey, onGoLive, t }: ClassroomModeSpotlightProps) {
  const [stepsOpen, setStepsOpen] = useState(false);
  const name = t(keys.name);
  return (
    <section
      data-testid="mode-spotlight"
      dir={dir}
      aria-live="polite"
      className="flex flex-col gap-2 rounded-neo-lg border-2 border-neo-cream/35 bg-neo-navy-light p-2.5 shadow-hard @4xl/lobby:h-full @4xl/lobby:gap-3 @4xl/lobby:p-4"
    >
      {/* In the two-column lobby the middle is a size container: art, best-for and steps step aside by the panel height, which stays true under the TV zoom. */}
      <div className="flex min-w-0 flex-col gap-2 @4xl/lobby:min-h-0 @4xl/lobby:flex-1 @4xl/lobby:gap-3 @4xl/lobby:overflow-hidden @4xl/lobby:[container-type:size]">
        <div
          data-testid="spotlight-art"
          data-accent-decor
          className={cn('hidden rounded-neo border-2 border-neo-black p-3 @4xl/lobby:block [@container(max-height:419px)]:hidden', ARCADE_BLOCK[modeArcadeAccent(mode.id)])}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- static poster cover */}
          <img
            key={mode.id}
            src={mode.cover}
            alt=""
            aria-hidden="true"
            className="aspect-[16/9] w-full -rotate-1 rounded-neo border-2 border-neo-black object-cover object-[50%_28%] shadow-hard [@container(max-height:519px)]:aspect-[5/2]"
          />
        </div>

        <div
          key={mode.id}
          data-testid="spotlight-text"
          className="flex min-w-0 items-center gap-2.5 text-start motion-safe:animate-[edu-ready-swap_220ms_cubic-bezier(0.23,1,0.32,1)] @4xl/lobby:flex-col @4xl/lobby:items-stretch @4xl/lobby:gap-2"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- static poster cover */}
          <img
            src={mode.cover}
            alt=""
            aria-hidden="true"
            className="size-11 shrink-0 rounded-neo border border-neo-cream/35 object-cover object-[50%_28%] @4xl/lobby:hidden"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1 @4xl/lobby:gap-2">
            <span className="hidden font-neo-body text-sm font-bold text-neo-cream/60 @4xl/lobby:block">{t(keys.category)}</span>
            <h2 className="font-neo-display text-lg font-bold leading-tight text-neo-cream @4xl/lobby:text-3xl">{name}</h2>
            <p className="hidden font-neo-body text-base leading-snug text-neo-cream/80 @4xl/lobby:block">{t(keys.how)}</p>
            <div className="flex min-w-0 flex-wrap gap-1.5">
              <Spec testId="spec-duration" icon={Clock} label={t('eg2Modes.spec.duration')} value={t('education.modePicker.minutes', { count: minutes })} />
              <Spec testId="spec-complexity" icon={Puzzle} label={t('eg2Modes.spec.complexity')} value={t(keys.complexity)} className="hidden @4xl/lobby:inline-flex" />
              <Spec testId="spec-style" icon={Gamepad2} label={t('eg2Modes.spec.style')} value={t(keys.style)} className="hidden @4xl/lobby:inline-flex" />
            </div>
          </div>
          <button
            type="button"
            data-testid="how-it-plays-toggle"
            aria-expanded={stepsOpen}
            aria-label={t(stepsOpen ? 'eg2Modes.hideHowItPlays' : 'eg2Modes.howItPlays')}
            title={t(stepsOpen ? 'eg2Modes.hideHowItPlays' : 'eg2Modes.howItPlays')}
            onClick={() => setStepsOpen((v) => !v)}
            className="grid size-11 shrink-0 place-items-center self-center rounded-neo border-2 border-neo-cream/35 text-neo-cream transition-colors duration-150 hover:border-neo-cream/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cream @4xl/lobby:hidden"
          >
            {stepsOpen ? <ChevronUp className="size-5" strokeWidth={3} aria-hidden="true" /> : <ChevronDown className="size-5" strokeWidth={3} aria-hidden="true" />}
          </button>
        </div>

        <div className="hidden flex-wrap items-center gap-1.5 @4xl/lobby:flex [@container(max-height:519px)]:hidden">
          <span className="font-neo-body text-sm font-bold text-neo-cream/60">{t('eg2Modes.bestForLabel')}</span>
          {keys.bestFor.map((k) => (
            <span key={k} data-testid="best-for-chip" className={CHIP}>
              {t(k)}
            </span>
          ))}
        </div>

        {stepsOpen && (
          <ol data-testid="how-it-plays" className="grid gap-1.5 @4xl/lobby:hidden">
            {keys.steps.map((k, i) => (
              <li key={k} className="flex items-start gap-2 font-neo-body text-xs font-bold leading-snug text-neo-cream/90">
                <StepNumber n={i + 1} />
                {t(k)}
              </li>
            ))}
          </ol>
        )}

        <ol
          data-testid="how-it-plays-inline"
          aria-label={t('eg2Modes.howItPlays')}
          className="hidden flex-col gap-2 text-start @4xl/lobby:flex [@container(max-height:559px)]:hidden"
        >
          {keys.steps.map((k, i) => (
            <li key={k} className="flex items-start gap-2.5 font-neo-body text-sm leading-snug text-neo-cream/85">
              <StepNumber n={i + 1} />
              {t(k)}
            </li>
          ))}
        </ol>
      </div>

      <div className="flex shrink-0 flex-col gap-1.5">
        {blockedKey && (
          <p data-testid="go-live-blocked" role="status" className="text-center font-neo-body text-xs font-bold text-neo-cream/80 @4xl/lobby:text-sm">
            {t(blockedKey)}
          </p>
        )}
        <button
          type="button"
          data-testid="lobby-go-live"
          aria-label={t('education.modePicker.launch', { mode: name })}
          onClick={onGoLive}
          disabled={!!blockedKey || busy}
          className={cn(
            'flex min-h-14 w-full items-center justify-center gap-2.5 rounded-neo-lg border-[3px] border-neo-black px-4 py-1.5 @4xl/lobby:min-h-16',
            'bg-neo-lime font-neo-display text-neo-black shadow-hard',
            'transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] [@media(hover:hover)]:hover:-translate-y-0.5 active:scale-[0.97] motion-reduce:transition-none',
            'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cream focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy',
            'disabled:cursor-not-allowed disabled:bg-neo-navy-light disabled:text-neo-cream/70 disabled:shadow-none disabled:hover:translate-y-0',
          )}
        >
          <Radio className="size-6 shrink-0" strokeWidth={3} aria-hidden="true" />
          <span className="flex min-w-0 flex-col items-start leading-tight">
            <span data-testid="go-live-label" className="whitespace-nowrap text-xl font-black @4xl/lobby:text-2xl">
              {t('teacher.playNow.goLive')}
            </span>
            <span className="font-neo-body text-xs font-bold opacity-80 @4xl/lobby:text-sm">{name}</span>
          </span>
        </button>
      </div>
    </section>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <span className="grid size-5 shrink-0 place-items-center rounded-full border border-neo-cream/40 font-neo-body text-[0.7rem] font-bold text-neo-cream @4xl/lobby:size-6 @4xl/lobby:text-xs">
      {n}
    </span>
  );
}

export default ClassroomModeSpotlight;
