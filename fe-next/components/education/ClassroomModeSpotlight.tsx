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
  busy?: boolean;
  blockedKey: string | null;
  onGoLive: () => void;
  t: T;
}

function Spec({ testId, icon: Icon, label, value }: { testId: string; icon: typeof Clock; label: string; value: string }) {
  return (
    <div
      data-testid={testId}
      className="flex min-w-0 flex-1 items-center gap-1.5 rounded-neo border-[2px] border-neo-cream/80 bg-neo-navy px-1.5 py-1 lg:gap-2 lg:px-3 lg:py-1.5"
    >
      <Icon className="hidden size-5 shrink-0 text-neo-cream sm:block" strokeWidth={2.5} aria-hidden="true" />
      <span className="min-w-0 leading-tight">
        <span className="block truncate font-neo-display text-[0.55rem] font-black uppercase tracking-wide text-neo-cream/70 lg:text-[0.7rem]">
          {label}
        </span>
        <span className="line-clamp-2 block font-neo-display text-[0.7rem] font-black leading-tight text-neo-cream lg:truncate lg:text-base">{value}</span>
      </span>
    </div>
  );
}

export function ClassroomModeSpotlight({ mode, keys, minutes, language, busy, blockedKey, onGoLive, t }: ClassroomModeSpotlightProps) {
  const [stepsOpen, setStepsOpen] = useState(false);
  const name = t(keys.name);
  return (
    <section
      data-testid="mode-spotlight"
      aria-live="polite"
      className="rounded-neo-lg border-4 border-neo-cream bg-neo-navy-light/95 p-2.5 shadow-hard-lg lg:p-4"
    >
      <div className="grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)] gap-2.5 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:gap-5">
        <div className="relative self-start">
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
            className="pointer-events-none absolute -bottom-3 -end-3 w-[42%] select-none object-contain drop-shadow-[3px_3px_0_#000] motion-safe:animate-avatar-float"
          />
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-1 lg:gap-2">
          <span
            className={cn(
              'self-start rounded-full border-[2px] border-neo-black px-2 py-0.5 font-neo-display text-[0.6rem] font-black uppercase leading-none text-neo-black lg:text-xs',
              ACCENT_FILL[mode.accent]
            )}
          >
            {t(keys.category)}
          </span>
          <h2 className="font-neo-display text-2xl font-black uppercase leading-[0.95] tracking-tight text-neo-cream lg:text-5xl">
            {name}
          </h2>
          <p className="line-clamp-3 font-neo-body text-xs font-bold leading-snug text-neo-cream/90 lg:text-lg">{t(keys.how)}</p>
          <ol data-testid="how-it-plays-inline" aria-label={t('eg2Modes.howItPlays')} className="mt-1 hidden grid-cols-3 gap-2 lg:grid">
            {keys.steps.map((k, i) => (
              <li key={k} className="flex items-start gap-1.5 font-neo-body text-sm font-bold leading-snug text-neo-cream/90">
                <StepNumber n={i + 1} accent={mode.accent} />
                {t(k)}
              </li>
            ))}
          </ol>
          <div className="mt-auto hidden flex-wrap items-center gap-1.5 lg:flex">
            <span className="font-neo-display text-xs font-black uppercase text-neo-cream/70">{t('eg2Modes.bestForLabel')}</span>
            {keys.bestFor.map((k) => (
              <span
                key={k}
                data-testid="best-for-chip"
                className="rounded-full border-[2px] border-neo-black bg-neo-cream px-2 py-0.5 font-neo-display text-xs font-black text-neo-black"
              >
                {t(k)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex gap-1.5 lg:mt-4 lg:gap-2">
        <Spec testId="spec-duration" icon={Clock} label={t('eg2Modes.spec.duration')} value={t('education.modePicker.minutes', { count: minutes })} />
        <Spec testId="spec-complexity" icon={Puzzle} label={t('eg2Modes.spec.complexity')} value={t(keys.complexity)} />
        <Spec testId="spec-style" icon={Gamepad2} label={t('eg2Modes.spec.style')} value={t(keys.style)} />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 lg:hidden">
        {keys.bestFor.map((k) => (
          <span
            key={k}
            className="rounded-full border-[2px] border-neo-black bg-neo-cream px-2 py-0.5 font-neo-display text-[0.65rem] font-black text-neo-black"
          >
            {t(k)}
          </span>
        ))}
        <button
          type="button"
          data-testid="how-it-plays-toggle"
          aria-expanded={stepsOpen}
          onClick={() => setStepsOpen((v) => !v)}
          className="ms-auto inline-flex items-center gap-0.5 rounded-neo px-1 font-neo-display text-[0.65rem] font-black uppercase text-neo-cream underline decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cream lg:hidden"
        >
          {t(stepsOpen ? 'eg2Modes.hideHowItPlays' : 'eg2Modes.howItPlays')}
          {stepsOpen ? <ChevronUp className="size-3.5" strokeWidth={3} aria-hidden="true" /> : <ChevronDown className="size-3.5" strokeWidth={3} aria-hidden="true" />}
        </button>
      </div>

      {stepsOpen && (
        <ol data-testid="how-it-plays" className="mt-2 grid gap-1.5 lg:hidden">
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

      <button
        type="button"
        data-testid="lobby-go-live"
        onClick={onGoLive}
        disabled={!!blockedKey || busy}
        className={cn(
          'mt-3 flex min-h-14 w-full items-center justify-center gap-2 rounded-neo-lg border-[3px] border-black px-4 py-2 lg:mt-4 lg:min-h-[4.5rem]',
          'bg-neo-lime font-neo-display text-xl font-black uppercase tracking-tight text-black shadow-hard-lg lg:text-4xl',
          'transition-transform motion-safe:hover:-translate-y-0.5 active:translate-y-0.5',
          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cream focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy',
          'disabled:cursor-not-allowed disabled:bg-neo-lime/60 disabled:hover:translate-y-0'
        )}
      >
        <Radio className="size-6 shrink-0 lg:size-8" strokeWidth={3} aria-hidden="true" />
        <span className="truncate">{t('education.modePicker.launch', { mode: name })}</span>
      </button>
      {blockedKey && (
        <p data-testid="go-live-blocked" role="status" className="mt-1.5 text-center font-neo-body text-xs font-bold text-neo-yellow lg:text-sm">
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
        'grid size-5 shrink-0 place-items-center rounded-full border-[2px] border-neo-black font-neo-display text-[0.7rem] font-black text-neo-black lg:size-6 lg:text-xs',
        ACCENT_FILL[accent]
      )}
    >
      {n}
    </span>
  );
}

export default ClassroomModeSpotlight;
