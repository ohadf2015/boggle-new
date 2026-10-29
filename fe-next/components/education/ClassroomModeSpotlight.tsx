'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Clock, Gamepad2, Puzzle, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ClassroomModePreview } from './ClassroomModePreview';
import { ACCENT_FILL } from './ClassroomModeCatalogueCard';
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

function Spec({ testId, icon: Icon, label, value }: { testId: string; icon: typeof Clock; label: string; value: string }) {
  return (
    <div
      data-testid={testId}
      title={label}
      className="inline-flex min-w-0 items-center gap-1 rounded-full border-[2px] border-neo-cream/70 bg-neo-navy px-2 py-0.5 @4xl/lobby:gap-1.5 @4xl/lobby:px-3 @4xl/lobby:py-1"
    >
      <Icon className="size-3.5 shrink-0 text-neo-cream @4xl/lobby:size-5" strokeWidth={2.5} aria-hidden="true" />
      <span data-spec="label" className="sr-only">{label}</span>
      <span data-spec="value" className="truncate font-neo-display text-xs font-black leading-tight text-neo-cream @4xl/lobby:text-xl [@container(max-height:599px)]:text-base">{value}</span>
    </div>
  );
}

/**
 * The ready panel: what is about to go live, and the one GO LIVE.
 * Phones get a dock (cover, name, specs, button) under the picker; from lg it is
 * a full column with the moving preview and the three steps.
 */
export function ClassroomModeSpotlight({ mode, keys, minutes, language, dir, busy, blockedKey, onGoLive, t }: ClassroomModeSpotlightProps) {
  const [stepsOpen, setStepsOpen] = useState(false);
  const name = t(keys.name);
  return (
    <section
      data-testid="mode-spotlight"
      dir={dir}
      aria-live="polite"
      className="flex flex-col gap-2.5 rounded-neo-lg border-[3px] border-neo-cream bg-neo-navy-light p-2.5 shadow-hard-lg @4xl/lobby:h-full @4xl/lobby:gap-3 @4xl/lobby:p-4"
    >
      {/* In the two-column lobby the middle is a size container: art and steps step aside by the panel height, which stays true under the TV zoom. */}
      <div className="flex min-w-0 flex-col gap-2.5 @4xl/lobby:min-h-0 @4xl/lobby:flex-1 @4xl/lobby:gap-3 @4xl/lobby:overflow-hidden @4xl/lobby:[container-type:size]">
      <div
        data-testid="spotlight-art"
        className="relative hidden @4xl/lobby:block [@container(max-height:599px)]:hidden"
      >
        <ClassroomModePreview key={mode.id} kind={mode.preview} language={language} label={t('eg2Modes.previewLabel', { mode: name })} />
        {mode.preview !== 'boss' && (
          // eslint-disable-next-line @next/next/no-img-element -- transparent mascot poster
          <img
            src={mode.poster}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-3 -end-3 w-[34%] select-none object-contain drop-shadow-[3px_3px_0_rgb(var(--neo-black))] motion-safe:animate-avatar-float"
          />
        )}
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
          className="size-14 shrink-0 rounded-neo border-[2px] border-neo-cream/60 object-cover object-[50%_28%] @4xl/lobby:hidden"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1 @4xl/lobby:gap-2">
          <span
            className={cn(
              'hidden self-start rounded-full border-[2px] border-neo-black px-3 py-1 font-neo-display text-sm font-black uppercase leading-none text-neo-black @4xl/lobby:inline-block',
              ACCENT_FILL[mode.accent],
            )}
          >
            {t(keys.category)}
          </span>
          <h2 className="truncate font-neo-display text-lg font-black uppercase leading-none tracking-tight text-neo-cream @4xl/lobby:whitespace-normal @4xl/lobby:text-4xl @4xl/lobby:leading-[0.95]">
            {name}
          </h2>
          <p className="hidden font-neo-body text-base font-bold leading-snug text-neo-cream/90 @4xl/lobby:line-clamp-3 @4xl/lobby:block">{t(keys.how)}</p>
          <div className="flex min-w-0 flex-wrap gap-1 @4xl/lobby:gap-2">
            <Spec testId="spec-duration" icon={Clock} label={t('eg2Modes.spec.duration')} value={t('education.modePicker.minutes', { count: minutes })} />
            <Spec testId="spec-complexity" icon={Puzzle} label={t('eg2Modes.spec.complexity')} value={t(keys.complexity)} />
            <Spec testId="spec-style" icon={Gamepad2} label={t('eg2Modes.spec.style')} value={t(keys.style)} />
          </div>
        </div>
        <button
          type="button"
          data-testid="how-it-plays-toggle"
          aria-expanded={stepsOpen}
          aria-label={t(stepsOpen ? 'eg2Modes.hideHowItPlays' : 'eg2Modes.howItPlays')}
          onClick={() => setStepsOpen((v) => !v)}
          className="grid size-11 shrink-0 place-items-center self-start rounded-neo border-[2px] border-neo-cream/50 text-neo-cream transition-colors duration-150 hover:border-neo-cream focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cream @4xl/lobby:hidden"
        >
          {stepsOpen ? <ChevronUp className="size-5" strokeWidth={3} aria-hidden="true" /> : <ChevronDown className="size-5" strokeWidth={3} aria-hidden="true" />}
        </button>
      </div>

      <div className="hidden flex-wrap items-center gap-1.5 @4xl/lobby:flex [@container(max-height:459px)]:hidden">
        <span className="font-neo-display text-sm font-black uppercase text-neo-cream/70">{t('eg2Modes.bestForLabel')}</span>
        {keys.bestFor.map((k) => (
          <span key={k} data-testid="best-for-chip" className="rounded-full border-[2px] border-neo-cream/45 px-2.5 py-0.5 font-neo-display text-sm font-bold text-neo-cream @4xl/lobby:text-base">
            {t(k)}
          </span>
        ))}
      </div>

      {stepsOpen && (
        <ol data-testid="how-it-plays" className="grid gap-1.5 @4xl/lobby:hidden">
          {keys.steps.map((k, i) => (
            <li key={k} className="flex items-start gap-2 rounded-neo border-[2px] border-neo-cream/40 bg-neo-navy px-2 py-1.5 font-neo-body text-xs font-bold leading-snug text-neo-cream">
              <StepNumber n={i + 1} accent={mode.accent} />
              {t(k)}
            </li>
          ))}
        </ol>
      )}

      <ol
        data-testid="how-it-plays-inline"
        aria-label={t('eg2Modes.howItPlays')}
        className="hidden flex-col gap-2 text-start @4xl/lobby:flex [@container(min-height:600px)_and_(max-height:759px)]:hidden [@container(max-height:459px)]:hidden"
      >
        {keys.steps.map((k, i) => (
          <li key={k} className="flex items-start gap-2.5 font-neo-body text-sm font-bold leading-snug text-neo-cream @4xl/lobby:text-lg">
            <StepNumber n={i + 1} accent={mode.accent} />
            {t(k)}
          </li>
        ))}
      </ol>

      </div>

      <div className="flex shrink-0 flex-col gap-1.5">
        {blockedKey && (
          <p data-testid="go-live-blocked" role="status" className="text-center font-neo-body text-xs font-bold text-neo-yellow @4xl/lobby:text-sm">
            {t(blockedKey)}
          </p>
        )}
        <button
          type="button"
          data-testid="lobby-go-live"
          onClick={onGoLive}
          disabled={!!blockedKey || busy}
          className={cn(
            'flex min-h-14 w-full items-center justify-center gap-2 rounded-neo-lg border-[3px] border-neo-black px-4 py-2 @4xl/lobby:min-h-16',
            'bg-neo-lime font-neo-display text-xl font-black uppercase tracking-tight text-neo-black shadow-hard-lg @4xl/lobby:text-2xl',
            'transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] [@media(hover:hover)]:hover:-translate-y-0.5 active:scale-[0.97] motion-reduce:transition-none',
            'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cream focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy',
            'disabled:cursor-not-allowed disabled:bg-neo-navy-light disabled:text-neo-cream/70 disabled:shadow-none disabled:hover:translate-y-0',
          )}
        >
          <Radio className="size-6 shrink-0 @4xl/lobby:size-7" strokeWidth={3} aria-hidden="true" />
          <span className="truncate">{t('education.modePicker.launch', { mode: name })}</span>
        </button>
      </div>
    </section>
  );
}

function StepNumber({ n, accent }: { n: number; accent: CatalogueMode['accent'] }) {
  return (
    <span
      className={cn(
        'grid size-5 shrink-0 place-items-center rounded-full border-[2px] border-neo-black font-neo-display text-[0.7rem] font-black text-neo-black @4xl/lobby:size-7 @4xl/lobby:text-base',
        ACCENT_FILL[accent],
      )}
    >
      {n}
    </span>
  );
}

export default ClassroomModeSpotlight;
