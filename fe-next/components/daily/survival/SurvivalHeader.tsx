'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface SurvivalHeaderProps {
  clueTokens: number;
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

      {/* Token display - clues auto-unlock as you earn tokens */}
      <motion.div
        className="flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 border-2 border-neo-black rounded-neo"
        animate={clueTokens > 0 ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 0.3 }}
      >
        <Sparkles className="w-4 h-4 text-amber-500" />
        <span className="font-bold text-sm">{clueTokens}</span>
        <span className="text-xs text-gray-500 hidden sm:inline">
          {t('wordHunt.survival.tokens') || 'tokens'}
        </span>
      </motion.div>
    </div>
  );
};
