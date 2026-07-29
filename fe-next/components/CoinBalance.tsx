'use client';

import React, { useEffect } from 'react';
import { m } from 'framer-motion';
import { Coins, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { safeToLocaleString } from '@/utils/bcp47Locale';

interface CoinBalanceProps {
  coins?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showAnimation?: boolean;
  showSparkle?: boolean;
  className?: string;
  /** Locale code for number formatting (e.g. 'es', 'he'). Default 'en'. Pass from useLanguage(). */
  language?: string;
}

export function CoinBalance({
  coins = 0,
  size = 'md',
  showAnimation = false,
  showSparkle = false,
  className,
  language = 'en',
}: CoinBalanceProps) {

  // Inject shimmer keyframes once on mount (SSR-safe)
  useEffect(() => {
    const styleId = 'coin-balance-shimmer';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-xs gap-1',
    sm: 'px-2.5 py-1 text-sm gap-1.5',
    md: 'px-3.5 py-2 text-base gap-2',
    lg: 'px-5 py-3 text-lg gap-2.5'
  };

  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const sparkleIconSizes = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4'
  };

  const content = (
    <div
      role="status"
      aria-label={`Coin balance: ${safeToLocaleString(coins, language)}`}
      data-coin-counter="true"
      className={cn(
        // Base layout
        'relative inline-flex items-center font-bold rounded-neo-lg overflow-hidden',
        // Neo-brutalist styling
        'border-3 border-neo-black shadow-hard',
        // Premium gold gradient
        'bg-linear-to-br from-amber-300 via-yellow-400 to-amber-500',
        // Size-specific classes
        sizeClasses[size],
        className
      )}
    >
      {/* Animated shine overlay — only when showAnimation explicitly enabled */}
      {showAnimation && (
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            background: 'linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.5) 50%, transparent 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 3s ease-in-out infinite',
          }}
        />
      )}

      {/* Inner glow effect */}
      <div className="absolute inset-0 rounded-neo-lg opacity-30 pointer-events-none bg-linear-to-t from-transparent via-white/20 to-white/40" />

      {/* Coin icon — rotate only when showAnimation explicitly enabled */}
      <m.div
        animate={showAnimation ? { rotate: [0, -5, 5, 0] } : undefined}
        transition={showAnimation ? {
          duration: 2,
          repeat: Infinity,
          repeatDelay: 3,
          ease: "easeInOut"
        } : undefined}
        className="relative z-10"
      >
        <Coins
          className={cn(
            iconSizes[size],
            'text-amber-700 drop-shadow-xs'
          )}
          aria-hidden="true"
          strokeWidth={2.5}
        />
      </m.div>

      {/* Coin count with enhanced styling */}
      <span className={cn(
        "relative z-10 font-black tracking-tight",
        "text-amber-900 drop-shadow-[0_1px_0_rgba(255,255,255,0.5)]"
      )}>
        {safeToLocaleString(coins, language)}
      </span>

      {/* Optional sparkle indicator */}
      {showSparkle && (
        <m.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.7, 1, 0.7]
          }}
          transition={{
            type: 'tween',
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="relative z-10"
        >
          <Sparkles
            className={cn(
              sparkleIconSizes[size],
              'text-amber-600'
            )}
          />
        </m.div>
      )}

      {/* Bottom edge highlight for depth */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-linear-to-r from-amber-600/50 via-amber-500/30 to-amber-600/50" />
    </div>
  );

  if (showAnimation) {
    return (
      <m.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="cursor-pointer"
      >
        {content}
      </m.div>
    );
  }

  return content;
}

export default CoinBalance;
