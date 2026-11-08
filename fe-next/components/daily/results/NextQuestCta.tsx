'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Gift } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useDailyPlayedStatus } from '@/hooks/useDailyPlayedStatus';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { cn } from '@/lib/utils';
import {
  DAILY_MODES,
  dailyModeHref,
  pickNextUnplayedMode,
  playStateFromToday,
  type DailyModeId,
} from '@/lib/dailyModes';
import type { Language } from '@/types';
import { chainPips, markDailyHandoff, type ChainPip } from '@/components/daily/flow/dailyHandoff';
import { useDailyReveal, useMountedAfterReveal } from './reveal/DailyRevealContext';
import { DayPrizeReveal } from '@/components/daily/prize/DayPrizeReveal';
import { claimPopupSlot, releasePopupSlot } from '@/components/daily/prize/dayPrizeStore';
import { prizeToPop, finishingClearsDay } from '@/components/daily/prize/prizeEligibility';
import type { DayPrizeKind } from '@/lib/daily/dayPrize';

/** Let the results land before the prize box steps in. */
export const PRIZE_POP_DELAY_MS = 700;

export interface NextQuestCtaProps {
  /** The mode whose results screen this is — never offered as the next step. */
  justFinished: DailyModeId;
  currentLanguage: Language;
  /** Analytics source, e.g. `word_hunt_results`. */
  source?: string;
  /**
   * Positioning for the CTA box — e.g. `STICKY_CTA_WORD_HUNT`.
   *
   * The component owns its own wrapper rather than being nested inside one by
   * the caller: this branch can render three different things, and a
   * caller-owned `sticky z-30` box would outlive every one of them. It also
   * keeps the reserved space and the thing occupying it as a single element,
   * so there is nothing to keep in sync.
   */
  className?: string;
}

/* Motion only via WAAPI on the arrow chip: a full-width entrance flashes on mobile (rules/60 Class 5) and suites mock `m` as div-only. */

/* Full class strings only — Tailwind emits nothing for `bg-neo-${accent}`. */
const PIP_CLASS: Record<ChainPip, string> = {
  done: 'w-1.5 bg-neo-black',
  active: 'w-5 bg-neo-black',
  next: 'w-1.5 bg-neo-black/30',
};

const SEND_OFF: Keyframe[] = [
  { transform: 'translateX(0) scale(1)' },
  { transform: 'translateX(-3px) scale(0.92)', offset: 0.3 },
  { transform: 'translateX(14px) scale(1.08)' },
];
const PULSE: Keyframe[] = [
  { transform: 'scale(1)' },
  { transform: 'scale(1.18) rotate(-6deg)', offset: 0.4 },
  { transform: 'scale(1)' },
];

function playOn(el: HTMLElement | null, frames: Keyframe[], options: KeyframeAnimationOptions) {
  if (!el || typeof el.animate !== 'function') return;
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  el.animate(frames, options);
}

const ACCENTS = {
  orange: { fill: 'bg-neo-orange', chip: 'text-neo-orange' },
  yellow: { fill: 'bg-neo-yellow', chip: 'text-neo-yellow' },
  cyan: { fill: 'bg-neo-cyan', chip: 'text-neo-cyan' },
  purple: { fill: 'bg-neo-purple', chip: 'text-neo-purple' },
} as const;

const SLAB_HEIGHT = 'min-h-[120px] md:min-h-[148px]';

/**
 * "What now?" for the end of a daily game.
 *
 * Finishing a daily used to dead-end on a countdown to TOMORROW, sitting exactly
 * where multiplayer puts its rematch button — the same board retains 57% in
 * multiplayer and 34% in the daily. A player who finished one mode had to find
 * the other three by navigating back to the hub themselves.
 *
 * Play state comes from `useDailyPlayedStatus`, the SAME server-backed hook the
 * hub reads, so the hub and this CTA can never disagree about what is left
 * today. Deriving it locally is what made played-state drift between phone and
 * laptop before it was unified.
 *
 * When every mode is done it says so rather than linking back into a finished
 * game — `pickNextUnplayedMode` returns null for exactly that case.
 */
export function NextQuestCta({
  justFinished,
  currentLanguage,
  source = 'daily_results',
  className,
}: NextQuestCtaProps) {
  const { t } = useLanguage();
  const played = useDailyPlayedStatus();
  const reveal = useDailyReveal();
  const arrowRef = useRef<HTMLSpanElement>(null);
  const late = useMountedAfterReveal();
  const pulse = reveal.active && reveal.done && !late;

  useEffect(() => {
    if (pulse) playOn(arrowRef.current, PULSE, { duration: 650, iterations: 3, delay: 150, easing: 'ease-in-out' });
  }, [pulse]);

  // The prize box pops once, on the results screen of the quest that cleared the day.
  const { user } = useAuth();
  const signedIn = Boolean(user);
  const [prizeKind, setPrizeKind] = useState<DayPrizeKind | null>(null);
  const settled = !reveal.active || reveal.done;
  const pending = signedIn && !played.loading && settled ? prizeToPop(playStateFromToday(played.today), justFinished) : null;
  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => {
      if (claimPopupSlot(pending)) setPrizeKind(pending);
    }, PRIZE_POP_DELAY_MS);
    return () => clearTimeout(timer);
  }, [pending]);
  const closePrize = () => {
    if (prizeKind) releasePopupSlot(prizeKind);
    setPrizeKind(null);
  };
  const prizeBox = prizeKind ? <DayPrizeReveal kind={prizeKind} source={source} onClose={closePrize} /> : null;

  // Don't guess while the server answer is still in flight: rendering an
  // optimistic "play Word Wheel" that flips to "all clear" a moment later is
  // the flash this codebase keeps re-learning to avoid.
  //
  // A skeleton of the SAME height rather than null: for an authed player this
  // hook is a network round-trip, so returning nothing would let the primary
  // CTA pop in after paint and shove the screen down — on the one surface the
  // previous run spent seven rounds polishing.
  if (played.loading) {
    return (
      <div
        className={cn('w-full h-[120px] md:h-[148px] rounded-xl skeleton', className)}
        aria-hidden="true"
        data-testid="next-quest-loading"
      />
    );
  }

  const state = playStateFromToday(played.today);

  const nextId = pickNextUnplayedMode(state, justFinished);

  if (!nextId) {
    // Every mode cleared. Still a link, not a dead end: the hub is where the
    // streak, the weekly chest and the board live, and it is what the old
    // `backToDailyCtaNode` offered at exactly this moment.
    return (
      <>
      {prizeBox}
      <Link
        href={`/${currentLanguage}/daily`}
        data-testid="next-quest-all-clear"
        className={cn(
          'w-full rounded-xl border-3 border-black bg-neo-navy/95 shadow-hard px-4 py-3',
          'flex items-center gap-2 focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-lime',
          className,
        )}
      >
        <Check className="w-4 h-4 text-neo-lime shrink-0" />
        <span className="text-sm font-bold text-white">{t('daily.allClearToday')}</span>
        <ArrowRight className="ms-auto shrink-0 w-4 h-4 text-neo-lime rtl:rotate-180" />
      </Link>
      </>
    );
  }

  const mode = DAILY_MODES.find((candidate) => candidate.id === nextId);
  if (!mode) return null;

  const accent = ACCENTS[mode.accent];
  const href = dailyModeHref(mode, currentLanguage);
  const pips = chainPips(mode.id, (id) => {
    if (id === justFinished) return true;
    if (id === 'word-hunt') return state.wordHunt !== 'new';
    if (id === 'word-wheel') return state.wordWheel === 'played';
    return id === 'word-tower' ? state.wordTower : state.connections;
  });

  const oneToGo = signedIn && finishingClearsDay(state, mode.id);

  return (
    <>
    {prizeBox}
    <Link
      href={href}
      onPointerDown={() => playOn(arrowRef.current, SEND_OFF, { duration: 260, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' })}
      onClick={() => {
        markDailyHandoff(mode.id);
        trackGrowthEvent('cross_promo_click', {
          target: mode.id,
          source,
          placement: 'next_quest_cta',
          language: currentLanguage,
        });
      }}
      data-testid="next-quest-cta"
      data-next-mode={mode.id}
      className={cn(
        // Sized by its own width: on desktop it sits in a narrow side column, where viewport `md:` sizes clipped the title.
        '@container group relative w-full overflow-hidden px-4 py-4 @md:px-6 @md:py-5 rounded-xl',
        SLAB_HEIGHT,
        'border-3 border-neo-black shadow-hard-lg',
        accent.fill,
        'flex items-center gap-4 @md:gap-6 text-start cursor-pointer',
        'focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cream',
        'hover:brightness-110 active:translate-y-0.5 active:shadow-none transition-[transform,translate,scale,rotate,box-shadow,filter]',
        className,
      )}
    >
      {/* Decorative mascot, as a CSS background for the same reasons as the
          hub's compact rows — the label beside it names the mode. */}
      <span
        aria-hidden="true"
        role="presentation"
        data-art-url={mode.art}
        style={{ backgroundImage: `url(${mode.art})` }}
        className="relative shrink-0 w-20 h-20 @md:w-28 @md:h-28 rounded-xl bg-cover bg-center border-3 border-neo-black"
      />

      <span className="relative flex-1 min-w-0">
        <span className="flex items-center gap-2 text-xs @md:text-sm font-black uppercase tracking-wide text-neo-black/80">
          {t('daily.nextUp')}
          <span aria-hidden="true" data-testid="next-quest-pips" className="flex items-center gap-1">
            {pips.map((pip, i) => (
              <span key={DAILY_MODES[i].id} data-pip={pip} className={cn('block h-1.5 rounded-full', PIP_CLASS[pip])} />
            ))}
          </span>
        </span>
        <span className="block mt-1 text-2xl @md:text-4xl leading-none font-neo-display font-black uppercase text-neo-black line-clamp-2">
          {t(mode.titleKey)}
        </span>
        {oneToGo && (
          <span data-testid="next-quest-one-to-go" className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-neo-black px-2 py-0.5 text-[11px] @md:text-xs font-black text-neo-yellow">
            <Gift className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            {t('daily.dayPrize.oneToGo')}
          </span>
        )}
      </span>

      <span
        ref={arrowRef}
        aria-hidden="true"
        className={cn(
          'relative shrink-0 w-14 h-14 @md:w-20 @md:h-20 rounded-full border-3 border-neo-black bg-neo-black flex items-center justify-center',
          'shadow-hard-sm transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5',
          accent.chip,
        )}
      >
        <ArrowRight className="w-7 h-7 @md:w-10 @md:h-10 rtl:rotate-180" strokeWidth={3.5} />
      </span>
    </Link>
    </>
  );
}

export default NextQuestCta;
