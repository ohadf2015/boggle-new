/**
 * RevealButton Component
 * Allows players to reveal 5+ letter words on the grid.
 * - First 2 reveals per game are FREE
 * - Additional reveals cost 15 coins
 */

import React, { memo, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Star, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCoins, spendCoins, canAfford, COIN_COSTS, FREE_REVEALS_PER_GAME } from '@/utils/coinManager';
import type { PathCell } from '@/utils/wordPathFinder';

interface RevealButtonProps {
  revealsUsed: number;
  revealableWordsCount: number;
  isLoading: boolean;
  gameActive: boolean;
  onReveal: () => Promise<{ word: string; path: PathCell[] } | null>;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const RevealButton = memo<RevealButtonProps>(({
  revealsUsed,
  revealableWordsCount,
  isLoading,
  gameActive,
  onReveal,
  t,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [coins, setCoins] = useState(() => getCoins());

  const freeRevealsRemaining = Math.max(0, FREE_REVEALS_PER_GAME - revealsUsed);
  const isFreeReveal = freeRevealsRemaining > 0;
  const revealCost = isFreeReveal ? 0 : COIN_COSTS.REVEAL_5_PLUS;
  const canAffordReveal = isFreeReveal || canAfford(revealCost);
  const hasWordsToReveal = revealableWordsCount > 0;

  const isDisabled = !gameActive || isLoading || !hasWordsToReveal || (!isFreeReveal && !canAffordReveal);

  const handleClick = async () => {
    if (isDisabled) return;

    // If not free, spend coins first
    if (!isFreeReveal) {
      const spent = spendCoins(revealCost, 'Word Reveal', { wordLength: '5+' });
      if (!spent) {
        return; // Failed to spend coins
      }
      setCoins(getCoins());
    }

    await onReveal();
  };

  // Update coins when component mounts or after reveal
  React.useEffect(() => {
    setCoins(getCoins());
  }, [revealsUsed]);

  // Escape key handler to dismiss tooltip
  // IMPORTANT: This hook must be called unconditionally (before any early returns)
  // to satisfy React's Rules of Hooks
  useEffect(() => {
    // Only attach listener if component should be active and tooltip is showing
    if (!gameActive || !showTooltip) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowTooltip(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showTooltip, gameActive]);

  // Build accessible label
  // IMPORTANT: This hook must be called unconditionally (before any early returns)
  // to satisfy React's Rules of Hooks
  const getAriaLabel = useCallback(() => {
    if (isLoading) {
      return t('reveal.finding') || 'Finding word...';
    }
    if (!hasWordsToReveal) {
      return t('reveal.noWordsLeft') || 'No 5+ letter words left to reveal';
    }
    if (!canAffordReveal) {
      return t('reveal.notEnoughCoins') || `Need ${revealCost} coins to reveal`;
    }
    if (isFreeReveal) {
      return t('reveal.revealFree', { remaining: freeRevealsRemaining }) || `Reveal a word, ${freeRevealsRemaining} free reveals left`;
    }
    return t('reveal.revealCost', { cost: revealCost }) || `Reveal a word for ${revealCost} coins`;
  }, [isLoading, hasWordsToReveal, canAffordReveal, isFreeReveal, freeRevealsRemaining, revealCost, t]);

  if (!gameActive) {
    return null;
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Reveal Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={isDisabled}
        aria-label={getAriaLabel()}
        aria-describedby={showTooltip && isDisabled ? 'reveal-tooltip' : undefined}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        className={`
          flex items-center gap-2 px-3 py-2
          ${isLoading ? 'animate-pulse' : ''}
          ${hasWordsToReveal && canAffordReveal
            ? 'bg-neo-purple border-neo-black text-white hover:bg-neo-pink hover:shadow-hard-sm'
            : 'bg-gray-300 border-gray-400 text-gray-600 cursor-not-allowed'}
          border-3 rounded-neo font-bold text-sm transition-all shadow-hard-sm
        `}
      >
        <Eye className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
        <div className="flex flex-col items-start" aria-hidden="true">
          <span className="text-xs opacity-80">
            {isLoading
              ? (t('reveal.finding') || 'Finding...')
              : (t('reveal.revealWord') || 'Reveal')
            }
          </span>
          <div className="flex items-center gap-1">
            {isFreeReveal ? (
              // Show free reveal tokens (stars)
              [...Array(FREE_REVEALS_PER_GAME)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3 h-3 ${
                    i < freeRevealsRemaining
                      ? 'text-neo-yellow fill-neo-yellow'
                      : 'text-gray-400 opacity-40'
                  }`}
                />
              ))
            ) : (
              // Show coin cost
              <div className="flex items-center gap-0.5">
                <Coins className="w-3 h-3 text-neo-yellow" />
                <span className="text-xs">{revealCost}</span>
              </div>
            )}
          </div>
        </div>
      </Button>

      {/* Tooltip for disabled state */}
      <AnimatePresence>
        {showTooltip && isDisabled && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute top-full right-0 mt-2 z-50 max-w-[calc(100vw-1rem)] w-48"
          >
            <div
              id="reveal-tooltip"
              role="tooltip"
              className="bg-neo-navy text-white px-3 py-2 rounded-neo border-2 border-neo-black text-xs font-medium shadow-hard-sm"
            >
              {!hasWordsToReveal
                ? (t('reveal.noWordsLeft') || 'No 5+ letter words left')
                : !canAffordReveal
                ? (t('reveal.notEnoughCoins') || `Need ${revealCost} coins (have ${coins})`)
                : (t('reveal.gameNotActive') || 'Game not active')
              }
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Coin balance indicator (when paid reveals) */}
      {!isFreeReveal && (
        <div className="absolute -top-2 -right-2 bg-neo-yellow text-neo-black text-xs font-bold px-1.5 py-0.5 rounded-full border-2 border-neo-black shadow-hard-sm">
          <div className="flex items-center gap-0.5">
            <Coins className="w-2.5 h-2.5" />
            <span>{coins}</span>
          </div>
        </div>
      )}
    </div>
  );
});

RevealButton.displayName = 'RevealButton';

export default RevealButton;
