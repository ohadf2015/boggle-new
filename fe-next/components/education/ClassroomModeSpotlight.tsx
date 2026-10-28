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
      className="inline-flex min-w-0 items-center gap-1.5 rounded-full border-[2px] border-neo-cream/80 bg-neo-navy px-2 py-1 lg:gap-2 lg:px-3 lg:py-1.5 lg:[@media(max-height:1099px)]:py-1"
    >
      <Icon className="size-4 shrink-0 text-neo-cream lg:size-6" strokeWidth={2.5} aria-hidden="true" />
      <span data-spec="label" className="sr-only">{label}</span>
      <span data-spec="value" className="truncate font-neo-display text-xs font-black leading-tight text-neo-cream lg:text-xl lg:[@media(max-height:1099px)]:text-lg">{value}</span>
    </div>
  );
}

export function ClassroomModeSpotlight({ mode, keys, minutes, language, dir, busy, blockedKey, onGoLive, t }: ClassroomModeSpotlightProps) {
  const [stepsOpen, setStepsOpen] = useState(false);
  const name = t(keys.name);
  return (
    <section
      data-testid="mode-spotlight"
      dir={dir}
      aria-live="polite"
      className="rounded-neo-lg border-4 border-neo-cream bg-neo-navy-light/95 p-2.5 shadow-hard-lg lg:p-4 lg:[@media(max-height:1099px)]:p-3"
    >
      <div className="grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)] gap-2.5 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-6 lg:[@media(max-height:1099px)]:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] lg:[@media(max-height:1099px)]:gap-5">
        <div data-testid="spotlight-art" className="relative self-start max-lg:row-span-3 lg:self-center">
          <ClassroomModePreview
            key={mode.id}
            kind={mode.preview}
            language={language}
            label={t('eg2Modes.previewLabel', { mode: name })}
          />
          {mode.preview !== 'boss' && (
          // eslint-disable-next-line @next/next/no-img-element -- transparent mascot poster
          <img
            src={mode.poster}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-3 -end-3 w-[42%] select-none object-contain drop-shadow-[3px_3px_0_rgb(var(--neo-black))] motion-safe:animate-avatar-float"
          />
          )}
        </div>

        {/* Below lg this box dissolves into the grid: chips, title and blurb sit beside the art, the specs and GO LIVE span the card. */}
        <div data-testid="spotlight-text" className="flex min-w-0 flex-col gap-1 text-start max-lg:contents lg:gap-2.5 lg:[@media(max-height:1099px)]:gap-1.5">
          <div className="flex flex-wrap items-center gap-1.5 max-lg:col-start-2 lg:gap-2">
            <span
              className={cn(
                'rounded-full border-[2px] border-neo-black px-2 py-0.5 font-neo-display text-[0.6rem] font-black uppercase leading-none text-neo-black lg:px-3 lg:py-1 lg:text-sm',
                ACCENT_FILL[mode.accent]
              )}
            >
              {t(keys.category)}
            </span>
            <span className="hidden items-center gap-1.5 lg:ms-2 lg:flex">
              <span className="font-neo-display text-xs font-black uppercase text-neo-cream/75 lg:text-sm">{t('eg2Modes.bestForLabel')}</span>
              {keys.bestFor.map((k) => (
                <span
                  key={k}
                  data-testid="best-for-chip"
                  className="rounded-full border-[2px] border-neo-black bg-neo-cream px-2 py-0.5 font-neo-display text-xs font-black text-neo-black lg:px-3 lg:py-1 lg:text-base"
                >
                  {t(k)}
                </span>
              ))}
            </span>
          </div>
          <h2 className="font-neo-display max-lg:col-start-2 text-2xl font-black uppercase leading-[0.95] tracking-tight text-neo-cream lg:text-5xl lg:[@media(max-height:1099px)]:text-4xl">
            {name}
          </h2>
          <p className="line-clamp-3 max-lg:col-start-2 font-neo-body text-xs font-bold leading-snug text-neo-cream/90 lg:text-lg lg:[@media(max-height:1099px)]:line-clamp-2 lg:[@media(max-height:1099px)]:text-base">{t(keys.how)}</p>
          <div className="flex min-w-0 flex-wrap gap-1.5 max-lg:col-span-2 max-lg:col-start-1 max-lg:mt-1 lg:gap-2">
            <Spec testId="spec-duration" icon={Clock} label={t('eg2Modes.spec.duration')} value={t('education.modePicker.minutes', { count: minutes })} />
            <Spec testId="spec-complexity" icon={Puzzle} label={t('eg2Modes.spec.complexity')} value={t(keys.complexity)} />
            <Spec testId="spec-style" icon={Gamepad2} label={t('eg2Modes.spec.style')} value={t(keys.style)} />
          </div>
          <button
            type="button"
            data-testid="lobby-go-live"
            onClick={onGoLive}
            disabled={!!blockedKey || busy}
            className={cn(
              'flex min-h-14 w-full items-center justify-center gap-2 rounded-neo-lg border-[3px] border-black px-4 py-2 max-lg:col-span-2 max-lg:col-start-1 max-lg:mt-1 lg:mt-1 lg:min-h-16 lg:[@media(max-height:1099px)]:min-h-12 lg:[@media(max-height:1099px)]:py-1.5',
              'bg-neo-lime font-neo-display text-xl font-black uppercase tracking-tight text-black shadow-hard-lg lg:text-3xl lg:[@media(max-height:1099px)]:text-2xl',
              'transition-transform motion-safe:hover:-translate-y-0.5 active:translate-y-0.5',
              'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cream focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy',
              'disabled:cursor-not-allowed disabled:bg-neo-navy-light disabled:text-neo-cream/70 disabled:shadow-none disabled:hover:translate-y-0'
            )}
          >
            <Radio className="size-6 shrink-0 lg:size-8" strokeWidth={3} aria-hidden="true" />
            <span className="truncate">{t('education.modePicker.launch', { mode: name })}</span>
          </button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 lg:[@media(min-height:801px)]:hidden">
        {keys.bestFor.map((k) => (
          <span
            key={k}
            className="rounded-full border-[2px] border-neo-black bg-neo-cream px-2 py-0.5 font-neo-display text-[0.65rem] font-black text-neo-black lg:hidden"
          >
            {t(k)}
          </span>
        ))}
        <button
          type="button"
          data-testid="how-it-plays-toggle"
          aria-expanded={stepsOpen}
          onClick={() => setStepsOpen((v) => !v)}
          className="ms-auto inline-flex items-center gap-0.5 rounded-neo px-1 font-neo-display text-[0.65rem] font-black uppercase text-neo-cream underline decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cream lg:text-sm lg:[@media(min-height:801px)]:hidden"
        >
          {t(stepsOpen ? 'eg2Modes.hideHowItPlays' : 'eg2Modes.howItPlays')}
          {stepsOpen ? <ChevronUp className="size-3.5" strokeWidth={3} aria-hidden="true" /> : <ChevronDown className="size-3.5" strokeWidth={3} aria-hidden="true" />}
        </button>
      </div>

      {stepsOpen && (
        <ol data-testid="how-it-plays" className="mt-2 grid gap-1.5 lg:grid-cols-3 lg:[@media(min-height:801px)]:hidden">
          {keys.steps.map((k, i) => (
            <li
              key={k}
              className="flex items-start gap-2 rounded-neo border-[2px] border-neo-cream/70 bg-neo-navy px-2 py-1.5 font-neo-body text-xs font-bold leading-snug text-neo-cream "
            >
              <StepNumber n={i + 1} accent={mode.accent} />
              {t(k)}
            </li>
          ))}
        </ol>
      )}

      <ol data-testid="how-it-plays-inline" aria-label={t('eg2Modes.howItPlays')} className="mt-3 hidden grid-cols-3 gap-4 text-start lg:[@media(min-height:801px)]:grid lg:[@media(max-height:1099px)]:mt-2 lg:[@media(max-height:1099px)]:gap-3">
        {keys.steps.map((k, i) => (
          <li key={k} className="flex items-start gap-2 font-neo-body text-sm font-bold leading-snug text-neo-cream lg:text-lg lg:[@media(max-height:1099px)]:text-sm lg:[@media(max-height:1099px)]:line-clamp-2">
            <StepNumber n={i + 1} accent={mode.accent} />
            {t(k)}
          </li>
        ))}
      </ol>
      {blockedKey && (
        <p data-testid="go-live-blocked" role="status" className="mt-1.5 text-center font-neo-body text-xs font-bold text-neo-yellow lg:text-base">
          {t(blockedKey)}
        </p>
      )}
    </section>
  );
}

function StepNumber({ n, accent }: { n: number; accent: CatalogueMode['accent'] }) {
  return (
    <span
      className={cn(
        'grid size-5 shrink-0 place-items-center rounded-full border-[2px] border-neo-black font-neo-display text-[0.7rem] font-black text-neo-black lg:size-7 lg:text-base',
        ACCENT_FILL[accent]
      )}
    >
      {n}
    </span>
  );
}

export default ClassroomModeSpotlight;
