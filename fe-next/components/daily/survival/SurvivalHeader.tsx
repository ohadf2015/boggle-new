'use client';

import React, { memo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { AccumulatedScoreDisplay } from './AccumulatedScoreDisplay';
import { SurvivalAudioEffectsControls } from './SurvivalAudioEffectsControls';
import { MobileRankIndicator } from '@/components/game/in-game/components/MobileRankIndicator';

export interface SurvivalHeaderProps {
  liveScore: number;
  lastScoreIncrement: number | null;
  isScoreAnimating: boolean;
  onQuitClick: () => void;
  /** Quick Play mode: suppress daily-specific score tier badge */
  practice?: boolean;
  /**
   * Quick Play only: other players' scores on this mode (ghost rivals). Turns
   * the practice header's otherwise-empty score slot into a live standing,
   * reusing the same MobileRankIndicator the MP boards show. Undefined for the
   * daily challenge, which keeps its score badge.
   */
  rivals?: Array<{ username: string; score: number }>;
  /** Label for my own row in the standing. */
  selfUsername?: string;
  dir?: 'ltr' | 'rtl';
  center?: React.ReactNode;
  /** First games: the score waits for the first word, so the opening screen has one thing moving. */
  hideScore?: boolean;
  t: (key: string) => string;
}

/**
 * Header bar for survival mode - quit button and score display
 * Clues now auto-unlock in background, score is the primary metric
 */
export const SurvivalHeader = memo<SurvivalHeaderProps>(({
  liveScore,
  lastScoreIncrement,
  isScoreAnimating,
  onQuitClick,
  practice = false,
  rivals,
  selfUsername = 'You',
  dir = 'ltr',
  center,
  hideScore = false,
  t,
}) => {
  // The rank pill reads place from array order (best first), so the board has
  // to be sorted: unsorted, "You" always came first and read "#1 leading".
  const standing =
    practice && rivals && rivals.length > 0
      ? [{ username: selfUsername, score: liveScore }, ...rivals].sort((a, b) => b.score - a.score)
      : null;
  return (
    <div data-testid="survival-header" className="sticky top-0 z-20 flex items-center justify-between gap-1.5 mb-1 ps-2 pe-14 py-1 max-w-3xl mx-auto w-full bg-neo-navy/90 backdrop-blur-sm rounded-b-neo overflow-visible">
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={onQuitClick}
          className="flex items-center gap-1.5 bg-neo-black/50 text-neo-white px-2.5 py-1.5 text-xs font-bold uppercase tracking-wide border-2 border-neo-cream/10 rounded-full hover:bg-neo-black/70 hover:text-neo-white active:scale-95 transition-[transform,translate,scale,rotate,box-shadow,background-color,border-color,color,opacity] duration-150"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          {t('common.quit')}
        </button>

        <SurvivalAudioEffectsControls t={t} />
      </div>

      {center && (
        <div data-testid="survival-header-center" className="min-w-0 flex-1 px-4">
          {center}
        </div>
      )}

      {/* min-w-0 + flex-1: on a 390px phone the place pill and rival chip were
          wider than what's left after Quit + effects, so they spilled into the
          global mute button's corner (and off-screen). They shrink here instead;
          pe-14 keeps that corner clear of the 40px button and its inset. */}
      {standing && (
        <div data-testid="survival-rank-indicator" className="flex min-w-0 flex-1 justify-end">
          <MobileRankIndicator
            leaderboard={standing}
            currentUsername={selfUsername}
            t={t}
            dir={dir}
          />
        </div>
      )}

      {!practice && !hideScore && (
        <div className={center ? 'flex w-44 shrink-0 justify-end' : 'contents'}>
          <AccumulatedScoreDisplay
            currentScore={liveScore}
            lastIncrement={lastScoreIncrement}
            isAnimating={isScoreAnimating}
            t={t}
          />
        </div>
      )}
    </div>
  );
});
SurvivalHeader.displayName = 'SurvivalHeader';
