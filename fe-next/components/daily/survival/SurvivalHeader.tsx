'use client';

import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
      <Button
        variant="ghost"
        size="default"
        onClick={onQuitClick}
        className="text-gray-600 hover:text-red-500"
      >
        <X className="w-4 h-4 mr-1" />
        {t('common.quit') || 'Quit'}
      </Button>

      <AccumulatedScoreDisplay
        currentScore={liveScore}
        lastIncrement={lastScoreIncrement}
        isAnimating={isScoreAnimating}
        t={t}
      />
    </div>
  );
};
