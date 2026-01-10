'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { X, Sparkles, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ClueShopItem } from '@/utils/aiHintGenerator';

export interface SurvivalHeaderProps {
  clueTokens: number;
  nextHintItem: ClueShopItem | null;
  onBuyNextHint: () => void;
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
 * Header bar for survival mode - quit button and token display
 * Shop has been removed - clues now auto-unlock as tokens are earned
 */
export const SurvivalHeader: React.FC<SurvivalHeaderProps> = ({
  clueTokens,
  nextHintItem,
  onBuyNextHint,
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

      <div className="flex items-center gap-2">
        {/* Next Hint Progress (Auto-unlocks) */}
        {nextHintItem && (
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-neo border border-gray-300 dark:border-gray-700">
             <span>Next Hint: {nextHintItem.name}</span>
             <span className="flex items-center text-amber-600 dark:text-amber-400">
               {clueTokens}/{nextHintItem.cost} <Coins className="w-3 h-3 ml-0.5" />
             </span>
          </div>
        )}

        {/* Token display - clues auto-unlock as you earn tokens */}
        <motion.div
          className="flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 border-2 border-neo-black rounded-neo h-8"
          animate={clueTokens > 0 ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 0.3 }}
        >
          <Coins className="w-4 h-4 text-amber-500" />
          <span className="font-bold text-sm">{clueTokens}</span>
          <span className="text-xs text-gray-500 hidden sm:inline">
            {t('wordHunt.survival.tokens') || 'coins'}
          </span>
        </motion.div>
      </div>
    </div>
  );
};
