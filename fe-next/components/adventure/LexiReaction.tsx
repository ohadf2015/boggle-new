/**
 * LexiReaction - Displays Lexi mascot reactions during adventure gameplay
 *
 * Features:
 * - RTL-aware positioning (bottom-right LTR, bottom-left RTL)
 * - Spring physics entrance animation (slide up + bounce)
 * - Tap-to-speed interaction (single tap = 2x, double tap = dismiss)
 * - Reduced motion fallback (static mascot + text bubble)
 * - World-themed dialogue from translation keys
 */

'use client';

import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { InteractiveMascot } from '@/components/ui/InteractiveMascot';
import type { LexiReaction as LexiReactionType } from '@/hooks/useLexiReactions';

// ==============================================
// COMPONENT TYPES
// ==============================================

interface LexiReactionProps {
  /** Reaction data to display */
  reaction: LexiReactionType | null;
  /** Callback when reaction is dismissed */
  onDismiss: () => void;
  /** Custom className for container */
  className?: string;
}

// ==============================================
// CONSTANTS
// ==============================================

const SPRING_CONFIG = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 20,
};

const DISPLAY_DURATION_MS = 2000;
const DOUBLE_TAP_THRESHOLD_MS = 300;

// ==============================================
// COMPONENT
// ==============================================

export const LexiReaction = memo<LexiReactionProps>(
  ({ reaction, onDismiss, className }) => {
    const { t } = useLanguage();
    const { prefersReducedMotion } = useDevicePerformance();

    // Tap handling state
    const [tapCount, setTapCount] = useState(0);
    const [animationSpeed, setAnimationSpeed] = useState(1);
    const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const displayTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // RTL detection
    const [isRTL, setIsRTL] = useState(false);

    useEffect(() => {
      // Check RTL on mount and when document changes
      const checkRTL = () => {
        setIsRTL(document.documentElement.dir === 'rtl');
      };
      checkRTL();

      // Listen for language changes
      const observer = new MutationObserver(checkRTL);
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['dir'],
      });

      return () => observer.disconnect();
    }, []);

    // Reset animation speed when reaction changes
    useEffect(() => {
      setAnimationSpeed(1);
      setTapCount(0);
    }, [reaction?.id]);

    // Auto-dismiss after display duration (adjusted by animation speed)
    useEffect(() => {
      if (!reaction) return;

      const duration = DISPLAY_DURATION_MS / animationSpeed;

      displayTimeoutRef.current = setTimeout(() => {
        onDismiss();
      }, duration);

      return () => {
        if (displayTimeoutRef.current) {
          clearTimeout(displayTimeoutRef.current);
        }
      };
    }, [reaction, animationSpeed, onDismiss]);

    // Handle tap interaction
    const handleTap = useCallback(() => {
      if (prefersReducedMotion) {
        // Reduced motion: single tap dismisses
        onDismiss();
        return;
      }

      // Clear previous timeout
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
      }

      const newTapCount = tapCount + 1;
      setTapCount(newTapCount);

      if (newTapCount === 1) {
        // First tap: speed up to 2x
        setAnimationSpeed(2);

        // Reset tap count after threshold
        tapTimeoutRef.current = setTimeout(() => {
          setTapCount(0);
        }, DOUBLE_TAP_THRESHOLD_MS);
      } else {
        // Double tap: dismiss immediately
        onDismiss();
      }
    }, [tapCount, prefersReducedMotion, onDismiss]);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        if (tapTimeoutRef.current) {
          clearTimeout(tapTimeoutRef.current);
        }
        if (displayTimeoutRef.current) {
          clearTimeout(displayTimeoutRef.current);
        }
      };
    }, []);

    // Get translated message (try world-specific first, then default)
    const getMessage = useCallback(
      (messageKey: string): string => {
        // Try the full key first
        const message = t(messageKey);
        if (message && message !== messageKey) {
          return message;
        }

        // Fallback to default variant
        const defaultKey = messageKey.replace(/\.world\d$/, '.default');
        const defaultMessage = t(defaultKey);
        if (defaultMessage && defaultMessage !== defaultKey) {
          return defaultMessage;
        }

        // Last resort: return key
        return messageKey;
      },
      [t]
    );

    // Reduced motion: static fallback
    if (prefersReducedMotion && reaction) {
      return (
        <button
          type="button"
          data-testid="lexi-reaction"
          className={cn(
            'fixed z-40 appearance-none bg-transparent',
            'bottom-20 lg:bottom-6',
            isRTL ? 'left-4' : 'right-4',
            className
          )}
          onClick={handleTap}
          aria-label={t('adventure.lexi.tapToDismiss')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleTap();
            }
          }}
        >
          <div className="flex items-end gap-2">
            {/* Dialogue bubble */}
            <div
              className={cn(
                'bg-neo-white border-3 border-neo-black rounded-neo p-3 shadow-hard',
                'max-w-48'
              )}
            >
              <p className="text-neo-black font-bold text-sm">
                {getMessage(reaction.messageKey)}
              </p>
            </div>

            {/* Static mascot */}
            <InteractiveMascot
              variant={reaction.variant}
              size="md"
              animated={false}
              enableHover={false}
              enableClick={false}
            />
          </div>
        </button>
      );
    }

    return (
      <AdaptiveAnimatePresence mode="wait">
        {reaction && (
          <AdaptiveMotion.div
            key={reaction.id}
            data-testid="lexi-reaction"
            className={cn(
              'fixed z-40',
              'bottom-20 lg:bottom-6',
              isRTL ? 'left-4' : 'right-4',
              'cursor-pointer',
              className
            )}
            initial={{
              y: 100,
              opacity: 0,
              scale: 0.8,
            }}
            animate={{
              y: 0,
              opacity: 1,
              scale: 1,
            }}
            exit={{
              y: 50,
              opacity: 0,
              scale: 0.9,
            }}
            transition={{
              ...SPRING_CONFIG,
              duration: 0.5 / animationSpeed,
            }}
            onClick={handleTap}
            role="button"
            tabIndex={0}
            aria-label={t('adventure.lexi.tapToSpeedUp')}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleTap();
              }
            }}
          >
            <div className="flex items-end gap-2">
              {/* Dialogue bubble */}
              <AdaptiveMotion.div
                className={cn(
                  'bg-neo-white border-3 border-neo-black rounded-neo p-3 shadow-hard',
                  'max-w-48'
                )}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  ...SPRING_CONFIG,
                  delay: 0.1 / animationSpeed,
                  duration: 0.3 / animationSpeed,
                }}
              >
                <p className="text-neo-black font-bold text-sm">
                  {getMessage(reaction.messageKey)}
                </p>

                {/* Speed indicator when sped up */}
                {animationSpeed > 1 && (
                  <AdaptiveMotion.span
                    className="text-xs text-neo-black/50 mt-1 block"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {animationSpeed}x
                  </AdaptiveMotion.span>
                )}
              </AdaptiveMotion.div>

              {/* Animated mascot */}
              <AdaptiveMotion.div
                animate={
                  reaction.type === 'celebration'
                    ? {
                        y: [0, -8, 0],
                        rotate: [0, -5, 5, 0],
                      }
                    : undefined
                }
                transition={{
                  duration: 0.6 / animationSpeed,
                  repeat: reaction.type === 'celebration' ? 2 : 0,
                  ease: 'easeInOut',
                }}
              >
                <InteractiveMascot
                  variant={reaction.variant}
                  size="md"
                  animated
                  enableHover={false}
                  enableClick={false}
                />
              </AdaptiveMotion.div>
            </div>
          </AdaptiveMotion.div>
        )}
      </AdaptiveAnimatePresence>
    );
  }
);

LexiReaction.displayName = 'LexiReaction';

export default LexiReaction;
