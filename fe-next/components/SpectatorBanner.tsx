'use client';

import React from 'react';
import { m } from 'framer-motion';
import { Eye, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Mascot } from '@/components/ui/Mascot';

interface SpectatorBannerProps {
  /** Whether the user is currently spectating */
  isSpectating: boolean;
  /** Callback to request upgrade to player */
  onRequestUpgrade?: () => void;
  /** Translation function */
  t: (key: string) => string;
  /** Optional custom message */
  customMessage?: string;
  /** Number of spectators (optional, for context) */
  spectatorCount?: number;
}

/**
 * SpectatorBanner - Persistent banner showing spectator status
 *
 * Clearly communicates when a user is spectating (not playing)
 * Provides action button to request player upgrade
 */
export function SpectatorBanner({
  isSpectating,
  onRequestUpgrade,
  t,
  customMessage,
  spectatorCount,
}: SpectatorBannerProps) {
  if (!isSpectating) {
    return null;
  }

  return (
    <m.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={cn(
        'sticky top-0 inset-x-0 z-[60]',
        'bg-linear-to-r from-orange-500 via-orange-600 to-orange-500',
        'text-white',
        'border-b-4 border-neo-black',
        'shadow-hard-xl'
      )}
      style={{
        top: 'var(--combined-safe-area-top, env(safe-area-inset-top, 0px))',
      }}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="max-w-7xl mx-auto px-3 py-3 sm:px-4 sm:py-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Left: Status info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Icon */}
            <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-white/20 border-2 border-white/40 rounded-neo flex items-center justify-center">
              <Eye className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <div className="font-black text-sm sm:text-base uppercase tracking-wide flex items-center gap-2">
                {t('spectator.status')}
                {spectatorCount !== undefined && spectatorCount > 1 && (
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {spectatorCount}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm mt-0.5 text-white line-clamp-1">
                {customMessage || t('spectator.explanation')}
              </p>
            </div>
          </div>

          {/* Mascot: spectating */}
          <Mascot variant="spectating" size="sm" className="shrink-0" clipBorder="none" />

          {/* Right: Action button */}
          {onRequestUpgrade && (
            <button
              onClick={onRequestUpgrade}
              className={cn(
                'shrink-0',
                'px-4 py-2 sm:px-5 sm:py-2.5',
                'bg-white text-orange-600',
                'border-3 border-neo-black',
                'rounded-neo shadow-hard',
                'font-black text-sm sm:text-base uppercase',
                'hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard-lg',
                'active:translate-x-px active:translate-y-px active:shadow-none',
                'transition-all duration-100',
                'min-h-[44px] min-w-[44px]'
              )}
              aria-label={t('spectator.requestToPlay')}
            >
              <span className="hidden sm:inline">
                {t('spectator.requestToPlay')}
              </span>
              <span className="sm:hidden">
                {t('spectator.join')}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Animated dots */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 overflow-hidden">
        <m.div
          className="h-full bg-white/30"
          animate={{
            x: ['-100%', '100%'],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'linear',
          }}
          style={{ width: '30%' }}
        />
      </div>
    </m.div>
  );
}

export default SpectatorBanner;
