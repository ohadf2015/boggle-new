'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hand, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface TutorialCalloutProps {
  /** Whether the callout should be visible */
  isVisible: boolean;
  /** The word being highlighted for the tutorial */
  tutorialWord?: string;
  /** Optional callback when user taps the callout to dismiss */
  onDismiss?: () => void;
  /** Position variant */
  position?: 'above-grid' | 'below-grid' | 'floating';
  /** Compact mode for smaller screens */
  compact?: boolean;
}

/**
 * TutorialCallout - Prominent tutorial indicator for new players
 *
 * Shows an animated callout with a pointing hand and instructions
 * when the first-play tutorial is active. Much more noticeable than
 * just the grid cell glow.
 */
export function TutorialCallout({
  isVisible,
  tutorialWord,
  onDismiss,
  position = 'above-grid',
  compact = false,
}: TutorialCalloutProps): React.ReactElement | null {
  const { t, dir } = useLanguage();

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: position === 'above-grid' ? -20 : 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: position === 'above-grid' ? -10 : 10, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className={cn(
            'relative z-50',
            position === 'floating' && 'absolute left-1/2 -translate-x-1/2',
            position === 'above-grid' && 'mb-2',
            position === 'below-grid' && 'mt-2'
          )}
          dir={dir}
          onClick={onDismiss}
          role="status"
          aria-live="polite"
        >
          {/* Main callout container */}
          <motion.div
            animate={{
              scale: [1, 1.02, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className={cn(
              'relative flex items-center gap-2 sm:gap-3',
              'bg-gradient-to-r from-neo-purple via-neo-pink to-neo-purple',
              'border-3 border-neo-black rounded-neo shadow-hard-lg',
              compact ? 'px-3 py-2' : 'px-4 py-3',
              'cursor-pointer hover:shadow-hard-xl transition-shadow'
            )}
          >
            {/* Animated hand icon */}
            <motion.div
              animate={{
                rotate: [0, -15, 15, -10, 10, 0],
                scale: [1, 1.1, 1, 1.1, 1],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                repeatDelay: 0.5,
              }}
              className={cn(
                'flex-shrink-0 bg-neo-lime rounded-full border-2 border-neo-black',
                compact ? 'p-1.5' : 'p-2'
              )}
            >
              <Hand
                className={cn(
                  'text-neo-black',
                  compact ? 'w-5 h-5' : 'w-6 h-6 sm:w-7 sm:h-7'
                )}
              />
            </motion.div>

            {/* Text content */}
            <div className="flex flex-col">
              <span
                className={cn(
                  'font-black text-white uppercase tracking-wide',
                  compact ? 'text-sm' : 'text-base sm:text-lg'
                )}
              >
                {t('tutorial.callout.title') || 'Swipe the letters!'}
              </span>
              {tutorialWord && (
                <span
                  className={cn(
                    'font-bold text-neo-lime',
                    compact ? 'text-xs' : 'text-sm'
                  )}
                >
                  {t('tutorial.callout.tryWord') || 'Try:'}{' '}
                  <span className="uppercase tracking-widest">{tutorialWord}</span>
                </span>
              )}
            </div>

            {/* Sparkle decoration */}
            <motion.div
              animate={{
                rotate: [0, 180, 360],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'linear',
              }}
              className="flex-shrink-0"
            >
              <Sparkles
                className={cn(
                  'text-neo-lime',
                  compact ? 'w-4 h-4' : 'w-5 h-5'
                )}
              />
            </motion.div>

            {/* Pulsing ring effect */}
            <motion.div
              className="absolute inset-0 border-3 border-neo-lime rounded-neo pointer-events-none"
              animate={{
                opacity: [0.8, 0, 0.8],
                scale: [1, 1.08, 1],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeOut',
              }}
            />
          </motion.div>

          {/* Arrow pointer pointing down to the grid */}
          {position === 'above-grid' && (
            <motion.div
              animate={{ y: [0, 4, 0] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="absolute left-1/2 -translate-x-1/2 -bottom-2"
            >
              <div
                className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-neo-black"
              />
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default TutorialCallout;
