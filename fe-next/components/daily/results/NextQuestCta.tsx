'use client';

import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDailyPlayedStatus } from '@/hooks/useDailyPlayedStatus';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { cn } from '@/lib/utils';
import {
  DAILY_MODES,
  dailyModeHref,
  pickNextUnplayedMode,
  type DailyModeId,
  type DailyModePlayState,
} from '@/lib/dailyModes';
import type { Language } from '@/types';

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

/* Deliberately un-animated. An entrance opacity/transform tween on a
   full-width block is a known mobile-Chromium flash source in this codebase
   (rules/60 Class 5), and using framer-motion here also broke every results
   suite whose `m` mock defines only div/span. A plain Link is the lazier and
   steadier choice; the CTA appears with the rest of the screen. */

/* Full class strings only — Tailwind emits nothing for `bg-neo-${accent}`. */
const ACCENTS = {
  orange: { bar: 'bg-neo-orange', ring: 'focus-visible:ring-neo-orange', tint: 'bg-neo-orange/10' },
  yellow: { bar: 'bg-neo-yellow', ring: 'focus-visible:ring-neo-yellow', tint: 'bg-neo-yellow/10' },
  cyan: { bar: 'bg-neo-cyan', ring: 'focus-visible:ring-neo-cyan', tint: 'bg-neo-cyan/10' },
  purple: { bar: 'bg-neo-purple', ring: 'focus-visible:ring-neo-purple', tint: 'bg-neo-purple/10' },
} as const;

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
        className={cn('w-full h-[68px] rounded-xl skeleton', className)}
        aria-hidden="true"
        data-testid="next-quest-loading"
      />
    );
  }

  const state: DailyModePlayState = {
    wordHunt: played.today.wordHunt ? 'won' : 'new',
    wordWheel: played.today.wordWheel ? 'played' : 'new',
    wordTower: played.today.wordTower,
    connections: played.today.connections,
  };

  const nextId = pickNextUnplayedMode(state, justFinished);

  if (!nextId) {
    // Every mode cleared. Still a link, not a dead end: the hub is where the
    // streak, the weekly chest and the board live, and it is what the old
    // `backToDailyCtaNode` offered at exactly this moment.
    return (
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
    );
  }

  const mode = DAILY_MODES.find((candidate) => candidate.id === nextId);
  if (!mode) return null;

  const accent = ACCENTS[mode.accent];
  const href = dailyModeHref(mode, currentLanguage);

  return (
    <Link
      href={href}
      onClick={() =>
        trackGrowthEvent('cross_promo_click', {
          target: mode.id,
          source,
          placement: 'next_quest_cta',
          language: currentLanguage,
        })
      }
      data-testid="next-quest-cta"
      data-next-mode={mode.id}
      className={cn(
        'relative w-full overflow-hidden ps-5 pe-4 py-3 rounded-xl',
        'border-3 border-black shadow-hard bg-neo-navy/95',
        'flex items-center gap-3 text-start cursor-pointer',
        'focus-visible:outline-hidden focus-visible:ring-4',
        accent.ring,
        'active:translate-y-0.5 active:shadow-none transition-all',
        className,
      )}
    >
      {/* Accent edge — start-anchored so it flips in Hebrew. */}
      <span aria-hidden="true" className={cn('absolute start-0 top-0 bottom-0 w-1.5', accent.bar)} />
      <span aria-hidden="true" className={cn('absolute inset-0 pointer-events-none', accent.tint)} />

      {/* Decorative mascot, as a CSS background for the same reasons as the
          hub's compact rows — the label beside it names the mode. */}
      <span
        aria-hidden="true"
        role="presentation"
        data-art-url={mode.art}
        style={{ backgroundImage: `url(${mode.art})` }}
        className="relative shrink-0 w-10 h-10 rounded-md bg-cover bg-center border-2 border-black/60"
      />

      <span className="relative flex-1 min-w-0">
        <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
          {t('daily.nextUp')}
        </span>
        <span className="block text-sm font-neo-display font-black text-white truncate">
          {t(mode.titleKey)}
        </span>
      </span>

      <ArrowRight className="relative shrink-0 w-5 h-5 text-neo-lime rtl:rotate-180" />
    </Link>
  );
}

export default NextQuestCta;
