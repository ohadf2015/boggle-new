/**
 * CoinUnlockCard Component
 * Card for coin-gated actions (retry/reveal features)
 */

'use client';

import React, { useRef, useCallback } from 'react';
import { m } from 'framer-motion';
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
    <m.div
      ref={cardRef}
      whileHover={canAffordAction ? { scale: 1.02, y: -2 } : {}}
      whileTap={canAffordAction ? { scale: 0.98 } : {}}
      className={cn(
        "rounded-neo-lg border-3 border-neo-black shadow-hard transition-all",
        canAffordAction
          ? `bg-linear-to-br ${gradientFrom} ${gradientTo} cursor-pointer hover:shadow-hard-lg`
          : "bg-neo-navy-elevated"
      )}
      onClick={handleClick}
    >
      <div className="px-4 py-3 flex items-center gap-3">
        <div className={cn(
          "shrink-0 w-10 h-10 rounded-neo flex items-center justify-center border-2 border-neo-black",
          canAffordAction ? "bg-white/20" : "bg-white/10"
        )}>
          {icon}
        </div>
        <div className="flex-1 min-w-0 text-start">
          <div className={cn("font-black text-sm uppercase tracking-wide", canAffordAction ? "text-neo-black" : "text-white")}>
            {title}
          </div>
          <div className={cn("text-xs mt-0.5 truncate", canAffordAction ? "text-neo-black/70" : "text-white")}>
            {subtitle}
          </div>
        </div>
        {/* Cost badge — inline instead of absolute */}
        <div className="shrink-0 flex items-center gap-1 px-2.5 py-1 bg-neo-lime rounded-full border-2 border-neo-black shadow-hard-sm text-neo-black">
          <Coins className="w-4 h-4 text-neo-black" />
          <span className="font-black text-sm text-neo-black">{cost}</span>
        </div>
      </div>
      {!canAffordAction && (
        <div className="px-4 pb-2 text-[10px] text-white text-center">
          {t('wordHunt.results.earnMoreHint')}
        </div>
      )}
    </m.div>
  );
};

export default CoinUnlockCard;
