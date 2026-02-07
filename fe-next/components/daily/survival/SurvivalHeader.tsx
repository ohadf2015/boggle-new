'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { AccumulatedScoreDisplay } from './AccumulatedScoreDisplay';

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
export const SurvivalHeader: React.FC<SurvivalHeaderProps> = ({
  liveScore,
  lastScoreIncrement,
  isScoreAnimating,
  onQuitClick,
  t,
}) => {
  return (
    <div className="flex items-center justify-between mb-1 px-2 max-w-3xl mx-auto w-full">
      <button
        onClick={onQuitClick}
        className="flex items-center gap-2 bg-red-500 text-white px-3 py-1.5 text-sm font-bold uppercase tracking-wide border-3 border-neo-black shadow-hard-sm hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed transition-all duration-100"
      >
        <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
        {t('common.quit') || 'Quit'}
      </button>

      <AccumulatedScoreDisplay
        currentScore={liveScore}
        lastIncrement={lastScoreIncrement}
        isAnimating={isScoreAnimating}
        t={t}
      />
    </div>
  );
};
