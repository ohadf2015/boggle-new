/**
 * CurrencyDisplay Component
 *
 * Displays gold currency amount with coin icon and optional gain animation.
 * Neo-brutalist styling with hard shadows and bold typography.
 */

'use client';

import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { safeToLocaleString } from '@/utils/bcp47Locale';
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion';
import { useLanguageSafe } from '@/contexts/LanguageContext';

/**
 * Component props
 */
export interface CurrencyDisplayProps {
  /** Current gold amount */
  amount: number;
  /** Recent gold gain to animate (optional) */
  recentGain?: number;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

/**
 * Displays player's gold currency with coin icon and animations.
 *
 * Features:
 * - Number formatting with commas (1,234)
 * - Recent gain animation (flies up and fades)
 * - Size variants (sm/md/lg)
 * - Neo-brutalist styling
 * - Reduced motion support
 *
 * @example
 * ```tsx
 * <CurrencyDisplay amount={1234} recentGain={50} size="lg" />
 * ```
 */
export function CurrencyDisplay({
  amount,
  recentGain,
  size = 'md',
  className = '',
}: CurrencyDisplayProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const { t, language } = useLanguageSafe();

  // Format number with locale-aware separators
  const formattedAmount = safeToLocaleString(amount, language);

  // Size classes
  const sizeClasses = {
    sm: 'text-sm px-2 py-1',
    md: 'text-base px-3 py-1.5',
    lg: 'text-lg px-4 py-2',
  };

  // Icon size classes
  const iconSizeClasses = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl',
  };

  return (
    <div
      data-testid="currency-display"
      className={`
        relative inline-flex items-center gap-2
        bg-neo-yellow text-black
        border-3 border-black rounded-neo
        shadow-hard
        font-neo-display font-bold
        ${sizeClasses[size]}
        ${className}
      `}
      aria-label={t('adventure.currency.goldAmount', { amount: String(amount) })}
    >
      {/* Coin icon */}
      <span
        data-testid="coin-icon"
        className={`${iconSizeClasses[size]}`}
        role="img"
        aria-label={t('adventure.currency.coinIcon')}
      >
        🪙
      </span>

      {/* Amount */}
      <AdaptiveMotion.span
        key={amount}
        initial={prefersReducedMotion ? false : { scale: 1.1 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        {formattedAmount}
      </AdaptiveMotion.span>

      {/* Recent gain animation */}
      <AdaptiveAnimatePresence>
        {recentGain && recentGain > 0 && (
          <AdaptiveMotion.div
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            animate={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, y: -20 }
            }
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute -top-6 left-1/2 -translate-x-1/2 text-neo-cyan font-bold text-sm pointer-events-none"
            aria-live="polite"
          >
            +{recentGain}
          </AdaptiveMotion.div>
        )}
      </AdaptiveAnimatePresence>
    </div>
  );
}
