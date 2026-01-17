/**
 * CoinUnlockCard Component
 * Card for coin-gated actions (retry/reveal features)
 */

'use client';

import React, { useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Coins } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CoinUnlockCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  cost: number;
  currentCoins: number;
  gradientFrom: string;
  gradientTo: string;
  onClick: () => void;
  /** Optional callback when spend starts - receives position for animation */
  onSpendStart?: (position: { x: number; y: number }) => void;
  t: (key: string) => string;
}

export const CoinUnlockCard: React.FC<CoinUnlockCardProps> = ({
  icon,
  title,
  subtitle,
  cost,
  currentCoins,
  gradientFrom,
  gradientTo,
  onClick,
  onSpendStart,
  t,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const canAffordAction = currentCoins >= cost;

  const handleClick = useCallback(() => {
    if (!canAffordAction) return;

    // Trigger spend animation if callback provided
    if (onSpendStart && cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      onSpendStart({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
    }

    onClick();
  }, [canAffordAction, onClick, onSpendStart]);

  return (
    <motion.div
      ref={cardRef}
      whileHover={canAffordAction ? { scale: 1.02, y: -2 } : {}}
      whileTap={canAffordAction ? { scale: 0.98 } : {}}
      className={cn(
        "relative overflow-hidden rounded-neo-lg border-3 border-neo-black shadow-hard transition-all",
        canAffordAction
          ? `bg-gradient-to-br ${gradientFrom} ${gradientTo} cursor-pointer hover:shadow-hard-lg`
          : "bg-gray-700"
      )}
      onClick={handleClick}
    >
      {/* Cost badge */}
      <div className="absolute top-2 end-2 flex items-center gap-1 px-2.5 py-1 bg-neo-lime rounded-full border-2 border-neo-black shadow-hard-sm text-neo-black">
        <Coins className="w-4 h-4 text-neo-black" />
        <span className="font-black text-sm text-neo-black">{cost}</span>
      </div>

      <div className="px-4 py-4 pt-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex-shrink-0 w-12 h-12 rounded-neo flex items-center justify-center border-2 border-neo-black",
            canAffordAction ? "bg-white/20" : "bg-white/10"
          )}>
            {icon}
          </div>
          <div className="flex-1 text-start">
            <div className={cn("font-black text-sm uppercase tracking-wide", canAffordAction ? "text-neo-black" : "text-white")}>
              {title}
            </div>
            <div className={cn("text-xs mt-0.5", canAffordAction ? "text-neo-black/70" : "text-white/70")}>
              {subtitle}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className={cn("mt-3 pt-3 border-t", canAffordAction ? "border-neo-black/20" : "border-white/20")}>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className={cn("font-medium", canAffordAction ? "text-neo-black/80" : "text-white/80")}>
              {t('wordHunt.results.yourCoins')}
            </span>
            <span className={cn("font-black", canAffordAction ? "text-neo-black" : "text-white")}>
              {currentCoins} / {cost}
            </span>
          </div>
          <div className="h-2.5 bg-black/30 rounded-full overflow-hidden border border-white/20">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((currentCoins / cost) * 100, 100)}%` }}
              transition={{ duration: 0.5 }}
              className={cn("h-full rounded-full", canAffordAction ? "bg-neo-lime" : "bg-neo-lime/70")}
            />
          </div>
          {!canAffordAction && (
            <div className="mt-2 text-[10px] text-white/60 text-center">
              {t('wordHunt.results.earnMoreHint') || 'Win challenges to earn more coins!'}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default CoinUnlockCard;
