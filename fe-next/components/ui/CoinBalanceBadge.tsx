'use client';

/**
 * CoinBalanceBadge - Compact coin balance display
 *
 * Reusable badge component showing current coin balance.
 * Used next to coin-spending buttons to show affordability.
 *
 * @example
 * ```tsx
 * <div className="relative">
 *   <Button>Buy Item (100🪙)</Button>
 *   <CoinBalanceBadge balance={coins} size="sm" className="absolute -top-2 -inset-e-2" />
 * </div>
 * ```
 */

import { memo } from 'react';
import { Coins } from 'lucide-react';
import { cn } from '@/lib/utils';
import { safeToLocaleString } from '@/utils/bcp47Locale';

interface CoinBalanceBadgeProps {
  /** Current coin balance */
  balance: number;
  /** Size variant */
  size?: 'xs' | 'sm' | 'md';
  /** Whether balance can afford a specific cost (shows warning state) */
  canAfford?: boolean;
  /** Additional className for positioning */
  className?: string;
  /** Locale code for number formatting. Default 'en'. Pass from useLanguage(). */
  language?: string;
}

const sizeConfig = {
  xs: {
    container: 'px-1 py-0.5 gap-0.5',
    icon: 'w-2.5 h-2.5',
    text: 'text-[10px]',
  },
  sm: {
    container: 'px-1.5 py-0.5 gap-0.5',
    icon: 'w-3 h-3',
    text: 'text-xs',
  },
  md: {
    container: 'px-2 py-1 gap-1',
    icon: 'w-3.5 h-3.5',
    text: 'text-sm',
  },
};

export const CoinBalanceBadge = memo<CoinBalanceBadgeProps>(function CoinBalanceBadge({
  balance,
  size = 'sm',
  canAfford = true,
  className,
  language = 'en',
}) {
  const config = sizeConfig[size];
  const formatted = safeToLocaleString(balance, language);

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border-2 border-neo-black shadow-hard-sm font-bold tabular-nums',
        canAfford
          ? 'bg-neo-lime text-neo-black'
          : 'bg-red-400 text-white',
        config.container,
        config.text,
        className
      )}
      role="status"
      aria-label={`Coin balance: ${formatted}`}
      data-coin-counter="true"
    >
      <Coins className={cn(config.icon, canAfford ? 'text-neo-black' : 'text-white')} />
      <span>{formatted}</span>
    </div>
  );
});

export default CoinBalanceBadge;
