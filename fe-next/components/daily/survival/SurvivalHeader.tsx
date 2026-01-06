'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Store, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface SurvivalHeaderProps {
  clueTokens: number;
  showShop: boolean;
  showShopHint: boolean;
  onQuitClick: () => void;
  onShopClick: () => void;
  t: (key: string) => string;
}

/**
 * Header bar for survival mode - quit button, tokens, and shop access
 */
export const SurvivalHeader: React.FC<SurvivalHeaderProps> = ({
  clueTokens,
  showShop,
  showShopHint,
  onQuitClick,
  onShopClick,
  t,
}) => {
  return (
    <div className="flex items-center justify-between mb-1 px-2 max-w-3xl mx-auto w-full">
      <Button
        variant="ghost"
        size="sm"
        onClick={onQuitClick}
        className="text-gray-600 hover:text-red-500"
      >
        <X className="w-4 h-4 mr-1" />
        {t('common.quit') || 'Quit'}
      </Button>

      {/* Coins + Shop in corner */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 border-2 border-neo-black rounded-neo">
          <Coins className="w-4 h-4 text-yellow-600" />
          <span className="font-bold text-sm">{clueTokens}</span>
        </div>
        <div className="relative">
          <Button
            size="sm"
            onClick={onShopClick}
            className={cn(
              "bg-neo-pink text-white relative hover:bg-neo-pink/80",
              showShopHint && "animate-pulse ring-2 ring-neo-yellow ring-offset-1"
            )}
          >
            <Store className="w-4 h-4" />
            {clueTokens > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-neo-yellow text-neo-black text-xs font-bold rounded-full flex items-center justify-center border border-neo-black">
                !
              </span>
            )}
          </Button>

          {/* Non-intrusive hint tooltip */}
          <AnimatePresence>
            {showShopHint && (
              <motion.div
                initial={{ opacity: 0, y: 5, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 5, scale: 0.95 }}
                className="absolute top-full right-0 mt-2 z-50"
              >
                <div className="bg-neo-yellow text-neo-black text-xs font-bold px-3 py-1.5 rounded-neo border-2 border-neo-black whitespace-nowrap shadow-hard-sm">
                  <Coins className="w-3 h-3 inline mr-1" />
                  {t('wordHunt.survival.spendCoinsHint') || 'Spend coins on clues!'}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
