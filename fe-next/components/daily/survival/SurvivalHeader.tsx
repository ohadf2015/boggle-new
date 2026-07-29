'use client';

import React, { memo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { AccumulatedScoreDisplay } from './AccumulatedScoreDisplay';
import { SurvivalAudioEffectsControls } from './SurvivalAudioEffectsControls';

export interface SurvivalHeaderProps {
  liveScore: number;
  lastScoreIncrement: number | null;
  isScoreAnimating: boolean;
  /** @deprecated Shop has been removed - clues auto-unlock now */
  showShop?: boolean;
  /** @deprecated Shop has been removed - clues auto-unlock now */
  showShopHint?: boolean;
  onQuitClick: () => void;
  /** @deprecated Shop has been removed - clues auto-unlock now */
  onShopClick?: () => void;
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
  t,
}) => {
  return (
    <div className="sticky top-0 z-20 flex items-center justify-between mb-1 px-2 py-1 max-w-3xl mx-auto w-full bg-neo-navy/90 backdrop-blur-sm rounded-b-neo overflow-visible">
      <div className="flex items-center gap-1.5">
        <button
          onClick={onQuitClick}
          className="flex items-center gap-1.5 bg-neo-black/50 text-neo-white px-2.5 py-1.5 text-xs font-bold uppercase tracking-wide border-2 border-neo-cream/10 rounded-full hover:bg-neo-black/70 hover:text-neo-white active:scale-95 transition-all duration-150"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          {t('common.quit')}
        </button>

        <SurvivalAudioEffectsControls t={t} />
      </div>

      <AccumulatedScoreDisplay
        currentScore={liveScore}
        lastIncrement={lastScoreIncrement}
        isAnimating={isScoreAnimating}
        t={t}
      />
    </div>
  );
});
SurvivalHeader.displayName = 'SurvivalHeader';
