'use client';

import React, { useEffect, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { X, MoveUpRight, RotateCw, Compass, Trophy } from 'lucide-react';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/utils/hapticFeedback';
import type { TrainingHintType } from '@/hooks/useTrainingAnalysis';

interface TrainingHintsProps {
  /** Current hint to display (null if none) */
  currentHint: TrainingHintType | null;
  /** Called when hint is dismissed */
  onDismiss: () => void;
  /** Whether training is complete (show celebration) */
  trainingComplete?: boolean;
  /** Whether another tooltip is currently visible (to prevent overlap) */
  otherTooltipVisible?: boolean;
}

interface HintConfig {
  icon: React.ComponentType<{ className?: string; size?: number }>;
  color: string;
  bgColor: string;
  borderColor: string;
}

const HINT_CONFIGS: Record<TrainingHintType, HintConfig> = {
  diagonal: {
    icon: MoveUpRight,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-900/30',
    borderColor: 'border-purple-200 dark:border-purple-500/30',
  },
  directionChange: {
    icon: RotateCw,
    color: 'text-pink-500',
    bgColor: 'bg-pink-50 dark:bg-pink-900/30',
    borderColor: 'border-pink-200 dark:border-pink-500/30',
  },
  corners: {
    icon: Compass,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-50 dark:bg-cyan-900/30',
    borderColor: 'border-cyan-200 dark:border-cyan-500/30',
  },
  longWords: {
    icon: Trophy,
    color: 'text-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-900/30',
    borderColor: 'border-amber-200 dark:border-amber-500/30',
  },
};

// Delay before showing hint (give player time to explore)
const HINT_DELAY_MS = 3000;

// Auto-dismiss hint after this duration
const HINT_AUTO_DISMISS_MS = 15000;

/**
 * TrainingHints - Real-time hint overlays during training mode
 *
 * Shows contextual tips when skill gaps are detected:
 * - Diagonal: "Try dragging diagonally!"
 * - Direction change: "You can change direction mid-word!"
 * - Corners: "Check the corners for hidden words!"
 * - Long words: "Longer words = more points!"
 */
const TrainingHints: React.FC<TrainingHintsProps> = ({
  currentHint,
  onDismiss,
  trainingComplete = false,
  otherTooltipVisible = false,
}) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isDarkMode = theme === 'dark';

  // Track if hint should be visible (for delayed appearance and auto-dismiss)
  const [isVisible, setIsVisible] = useState(false);
  const [showCloseButton, setShowCloseButton] = useState(false);

  // Don't show if another tooltip is visible
  const shouldShow = isVisible && !otherTooltipVisible;

  // Show hint with gentle delay and haptic feedback
  useEffect(() => {
    if (currentHint && !otherTooltipVisible) {
      // Delay showing the hint to give player time to explore
      const delayTimer = setTimeout(() => {
        setIsVisible(true);
        triggerHaptic('light');
        
        // Show close button after a short delay (less aggressive)
        setTimeout(() => setShowCloseButton(true), 2000);
      }, HINT_DELAY_MS);

      // Auto-dismiss after timeout
      const dismissTimer = setTimeout(() => {
        setIsVisible(false);
        setShowCloseButton(false);
        onDismiss();
      }, HINT_DELAY_MS + HINT_AUTO_DISMISS_MS);

      return () => {
        clearTimeout(delayTimer);
        clearTimeout(dismissTimer);
      };
    } else if (otherTooltipVisible) {
      // Hide if another tooltip becomes visible
      setIsVisible(false);
      setShowCloseButton(false);
      return undefined;
    } else {
      setIsVisible(false);
      setShowCloseButton(false);
      return undefined;
    }
  }, [currentHint, onDismiss, otherTooltipVisible]);

  // Track if celebration should be visible (auto-dismiss after 4 seconds)
  const [showCelebration, setShowCelebration] = useState(false);

  // Show celebration when training complete (with auto-dismiss)
  useEffect(() => {
    if (trainingComplete) {
      triggerHaptic('success');
      setShowCelebration(true);

      // Auto-dismiss after 4 seconds
      const timer = setTimeout(() => {
        setShowCelebration(false);
      }, 4000);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [trainingComplete]);

  const handleDismiss = () => {
    triggerHaptic('selection');
    setIsVisible(false);
    onDismiss();
  };

  const getHintText = (type: TrainingHintType): string => {
    const texts: Record<TrainingHintType, string> = {
      diagonal: t('training.hints.tryDiagonal'),
      directionChange: t('training.hints.changeDirection'),
      corners: t('training.hints.checkCorners'),
      longWords: t('training.hints.longerWords'),
    };
    return texts[type];
  };

  const config = currentHint ? HINT_CONFIGS[currentHint] : null;

  return (
    <>
      {/* Hint Tooltip - Non-blocking toast at bottom */}
      <AnimatePresence>
        {shouldShow && currentHint && config && (
          <>
            <m.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200, delay: HINT_DELAY_MS / 1000 }}
              className={cn(
                'fixed inset-x-4 bottom-[calc(5rem+var(--admob-banner-height,0px))] z-50',
                'max-w-sm mx-auto'
              )}
            >
              <div
                className={cn(
                  'relative rounded-xl border-3 border-neo-black p-3 shadow-hard-lg',
                  isDarkMode ? 'bg-neo-navy-light' : 'bg-white'
                )}
              >
                {/* Close button - appears after delay, less prominent */}
                {showCloseButton && (
                  <m.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={handleDismiss}
                    className={cn(
                      'absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center',
                      'bg-white/80 dark:bg-neo-navy-elevated/80 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600',
                      'hover:bg-white dark:hover:bg-neo-navy-elevated hover:scale-110 transition-all'
                    )}
                  >
                    <X size={12} />
                  </m.button>
                )}

                {/* Colored accent bar */}
                <div className={cn('absolute top-0 left-0 right-0 h-1 rounded-t-lg', config.color.replace('text-', 'bg-'))} />

                <div className="flex items-start gap-3 mt-1">
                {/* Icon with gentle animation */}
                <m.div
                  animate={{
                    scale: [1, 1.05, 1],
                    rotate: currentHint === 'directionChange' ? [0, 45, 0] : [0, 5, -5, 0],
                  }}
                  transition={{
                    duration: currentHint === 'directionChange' ? 2 : 1.5,
                    repeat: Infinity,
                    repeatDelay: 1,
                    ease: 'easeInOut',
                  }}
                  className={cn('shrink-0 p-2 rounded-lg', config.bgColor)}
                >
                  <config.icon className={config.color} size={24} />
                </m.div>

                {/* Hint text */}
                <div className="flex-1 pt-0.5">
                  <p className={cn(
                    'text-sm font-medium leading-relaxed',
                    isDarkMode ? 'text-gray-200' : 'text-gray-800'
                  )}>
                    {getHintText(currentHint)}
                  </p>
                </div>
              </div>

              {/* Removed visual demos - hints are now compact non-blocking toasts */}

              {/* Progress bar - starts when hint becomes visible */}
              {isVisible && (
                <m.div
                  className={cn('absolute bottom-0 left-0 h-1 rounded-b-xl', config.color.replace('text-', 'bg-'))}
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: HINT_AUTO_DISMISS_MS / 1000, ease: 'linear' }}
                />
              )}
            </div>
          </m.div>
          </>
        )}
      </AnimatePresence>

      {/* Training Complete Celebration - Non-blocking toast style */}
      <AnimatePresence>
        {showCelebration && (
          <m.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed top-4 inset-x-4 z-50 flex justify-center pointer-events-none"
          >
            <button
              onClick={() => setShowCelebration(false)}
              className={cn(
                'rounded-xl border-2 px-4 py-2.5 shadow-lg pointer-events-auto cursor-pointer',
                'bg-linear-to-r from-green-50 to-emerald-50 border-green-300',
                'dark:from-green-900/50 dark:to-emerald-900/50 dark:border-green-500/50',
                'hover:scale-105 transition-transform'
              )}
            >
              <div className="flex items-center gap-2">
                <m.div
                  animate={{ rotate: [0, 15, -15, 0] }}
                  transition={{ duration: 0.5, repeat: 2 }}
                >
                  <Trophy className="text-green-500" size={20} />
                </m.div>
                <span className={cn(
                  'font-bold text-sm',
                  isDarkMode ? 'text-green-300' : 'text-green-700'
                )}>
                  {t('training.hints.skillsUnlocked')}
                </span>
              </div>
              {/* Progress bar showing auto-dismiss timer */}
              <m.div
                className="absolute bottom-0 left-0 h-0.5 bg-green-500 rounded-b-xl"
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 4, ease: 'linear' }}
              />
            </button>
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default TrainingHints;
