'use client';

import React, { useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes } from 'react-icons/fa';
import { cn } from '@/lib/utils';

export type GuidanceType = 'combo' | 'earthquake' | 'fireRound';

interface ContextualTooltipProps {
  type: GuidanceType;
  isVisible: boolean;
  onDismiss: () => void;
  t: (key: string) => string;
}

const TOOLTIP_CONFIG: Record<
  GuidanceType,
  {
    icon: string;
    gradient: string;
    borderColor: string;
    shadowColor: string;
  }
> = {
  combo: {
    icon: '🔥',
    gradient: 'from-orange-500 via-red-500 to-pink-500',
    borderColor: 'border-orange-400/60',
    shadowColor: 'rgba(251, 146, 60, 0.4)',
  },
  earthquake: {
    icon: '🌋',
    gradient: 'from-amber-500 via-orange-500 to-red-500',
    borderColor: 'border-amber-400/60',
    shadowColor: 'rgba(245, 158, 11, 0.4)',
  },
  fireRound: {
    icon: '⚡',
    gradient: 'from-pink-500 via-rose-500 to-red-500',
    borderColor: 'border-pink-400/60',
    shadowColor: 'rgba(236, 72, 153, 0.4)',
  },
};

const AUTO_DISMISS_MS = 5000;

/**
 * ContextualTooltip - In-game guidance tooltip for first-time experiences
 * Shows explanations for combo, earthquake, and fire round mechanics
 * Auto-dismisses after 5 seconds or on user interaction
 */
const ContextualTooltip = memo<ContextualTooltipProps>(
  ({ type, isVisible, onDismiss, t }) => {
    const config = TOOLTIP_CONFIG[type];

    // Auto-dismiss after 5 seconds
    useEffect(() => {
      if (!isVisible) return;

      const timer = setTimeout(() => {
        onDismiss();
      }, AUTO_DISMISS_MS);

      return () => clearTimeout(timer);
    }, [isVisible, onDismiss]);

    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="fixed inset-x-0 top-16 z-50 flex justify-center px-4 pointer-events-none"
          >
            <motion.div
              className={cn(
                'relative max-w-sm w-full pointer-events-auto',
                'rounded-xl border-2 backdrop-blur-md',
                'bg-gradient-to-r',
                config.gradient,
                config.borderColor
              )}
              style={{
                boxShadow: `0 8px 32px ${config.shadowColor}, 0 4px 12px rgba(0,0,0,0.2)`,
              }}
              onClick={onDismiss}
              role="alert"
              aria-live="polite"
            >
              {/* Shimmer effect */}
              <motion.div
                className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none"
                style={{ zIndex: 0 }}
              >
                <motion.div
                  className="absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                    width: '200%',
                    marginLeft: '-100%',
                  }}
                  animate={{ marginLeft: ['-100%', '100%'] }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    repeatDelay: 0.5,
                  }}
                />
              </motion.div>

              {/* Content */}
              <div className="relative z-10 p-4">
                {/* Header with icon and title */}
                <div className="flex items-start gap-3">
                  <motion.span
                    className="text-3xl"
                    animate={{
                      scale: [1, 1.15, 1],
                      rotate: [0, 5, 0, -5, 0],
                    }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  >
                    {config.icon}
                  </motion.span>

                  <div className="flex-1">
                    <h3 className="text-lg font-black text-white drop-shadow-md">
                      {t(`guidance.${type}.title`)}
                    </h3>
                    <p className="text-sm text-white/90 mt-1 leading-snug">
                      {t(`guidance.${type}.text`)}
                    </p>
                  </div>

                  {/* Close button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDismiss();
                    }}
                    className={cn(
                      'p-1.5 rounded-full transition-colors',
                      'bg-white/20 hover:bg-white/30',
                      'text-white/80 hover:text-white'
                    )}
                    aria-label={t('guidance.dismiss')}
                  >
                    <FaTimes className="w-3 h-3" />
                  </button>
                </div>

                {/* Tap to dismiss hint */}
                <div className="mt-3 text-center">
                  <span className="text-xs text-white/60 font-medium">
                    {t('guidance.dismiss')}
                  </span>
                </div>

                {/* Progress bar for auto-dismiss */}
                <motion.div
                  className="absolute bottom-0 left-0 h-1 bg-white/40 rounded-b-xl"
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{
                    duration: AUTO_DISMISS_MS / 1000,
                    ease: 'linear',
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
);

ContextualTooltip.displayName = 'ContextualTooltip';

export default ContextualTooltip;
