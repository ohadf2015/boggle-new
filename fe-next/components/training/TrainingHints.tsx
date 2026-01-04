'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

// Auto-dismiss hint after this duration
const HINT_AUTO_DISMISS_MS = 8000;

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

  // Track if hint should be visible (for auto-dismiss)
  const [isVisible, setIsVisible] = useState(false);

  // Don't show if another tooltip is visible
  const shouldShow = isVisible && !otherTooltipVisible;

  // Show hint with haptic feedback
  useEffect(() => {
    if (currentHint && !otherTooltipVisible) {
      setIsVisible(true);
      triggerHaptic('light');

      // Auto-dismiss after timeout
      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismiss();
      }, HINT_AUTO_DISMISS_MS);

      return () => clearTimeout(timer);
    } else if (otherTooltipVisible) {
      // Hide if another tooltip becomes visible
      setIsVisible(false);
      return undefined;
    } else {
      setIsVisible(false);
      return undefined;
    }
  }, [currentHint, onDismiss, otherTooltipVisible]);

  // Show celebration when training complete
  useEffect(() => {
    if (trainingComplete) {
      triggerHaptic('success');
    }
  }, [trainingComplete]);

  const handleDismiss = () => {
    triggerHaptic('selection');
    setIsVisible(false);
    onDismiss();
  };

  const getHintText = (type: TrainingHintType): string => {
    const texts: Record<TrainingHintType, string> = {
      diagonal: t('training.hints.tryDiagonal') || 'Try dragging diagonally! ↗️',
      directionChange: t('training.hints.changeDirection') || 'Pro tip: Change direction mid-word!',
      corners: t('training.hints.checkCorners') || 'Check the corners for hidden words!',
      longWords: t('training.hints.longerWords') || 'Longer words = more points! Try 5+ letters',
    };
    return texts[type];
  };

  const config = currentHint ? HINT_CONFIGS[currentHint] : null;

  return (
    <>
      {/* Hint Tooltip */}
      <AnimatePresence>
        {shouldShow && currentHint && config && (
          <>
            {/* Backdrop overlay for visibility */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40"
              onClick={handleDismiss}
            />
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className={cn(
                'fixed inset-x-4 top-1/2 -translate-y-1/2 z-50',
                'max-w-sm mx-auto'
              )}
              onClick={handleDismiss}
            >
              <div
                className={cn(
                  'relative rounded-xl border-3 border-neo-black p-4 shadow-hard-lg',
                  isDarkMode ? 'bg-slate-800' : 'bg-white'
                )}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close button */}
                <button
                  onClick={handleDismiss}
                  className={cn(
                    'absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center',
                    'bg-neo-pink text-white border-2 border-neo-black shadow-hard-sm',
                    'hover:scale-110 transition-transform'
                  )}
                >
                  <X size={14} />
                </button>

                {/* Colored accent bar */}
                <div className={cn('absolute top-0 left-0 right-0 h-1 rounded-t-lg', config.color.replace('text-', 'bg-'))} />

                <div className="flex items-start gap-3 mt-1">
                {/* Icon with animation */}
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    rotate: currentHint === 'directionChange' ? [0, 90, 0] : [0, 10, -10, 0],
                  }}
                  transition={{
                    duration: currentHint === 'directionChange' ? 1.5 : 1,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className={cn('flex-shrink-0 p-2 rounded-lg', config.bgColor)}
                >
                  <config.icon className={config.color} size={24} />
                </motion.div>

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

              {/* Visual demo for direction change hint */}
              {currentHint === 'directionChange' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className={cn(
                    'mt-3 pt-3 border-t flex items-center justify-center gap-1',
                    isDarkMode ? 'border-pink-500/20' : 'border-pink-200'
                  )}
                >
                  {/* Animated path demo */}
                  {['W', 'O', 'R', 'D', 'S'].map((letter, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0.3, scale: 0.8 }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                        backgroundColor: i <= 2
                          ? (isDarkMode ? 'rgba(236, 72, 153, 0.3)' : 'rgba(236, 72, 153, 0.2)')
                          : (isDarkMode ? 'rgba(168, 85, 247, 0.3)' : 'rgba(168, 85, 247, 0.2)'),
                      }}
                      transition={{ delay: i * 0.2 }}
                      className={cn(
                        'w-7 h-7 rounded flex items-center justify-center text-xs font-bold border',
                        isDarkMode
                          ? 'border-pink-400/50 text-pink-300'
                          : 'border-pink-300 text-pink-700'
                      )}
                    >
                      {letter}
                    </motion.div>
                  ))}
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className={cn(
                      'ms-2 text-xs',
                      isDarkMode ? 'text-pink-400' : 'text-pink-600'
                    )}
                  >
                    →↓
                  </motion.span>
                </motion.div>
              )}

              {/* Visual demo for diagonal hint */}
              {currentHint === 'diagonal' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className={cn(
                    'mt-3 pt-3 border-t flex items-center justify-center',
                    isDarkMode ? 'border-purple-500/20' : 'border-purple-200'
                  )}
                >
                  {/* 3x3 mini grid with diagonal path */}
                  <div className="grid grid-cols-3 gap-1">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
                      const isDiagonal = i === 0 || i === 4 || i === 8;
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0.3 }}
                          animate={{
                            opacity: isDiagonal ? 1 : 0.4,
                            scale: isDiagonal ? [1, 1.1, 1] : 1,
                          }}
                          transition={{
                            delay: isDiagonal ? (i / 4) * 0.3 : 0,
                            duration: isDiagonal ? 0.5 : 0,
                            repeat: isDiagonal ? Infinity : 0,
                            repeatDelay: 1,
                          }}
                          className={cn(
                            'w-6 h-6 rounded flex items-center justify-center text-xs font-bold',
                            isDiagonal
                              ? (isDarkMode ? 'bg-purple-500/40 text-purple-300' : 'bg-purple-200 text-purple-700')
                              : (isDarkMode ? 'bg-slate-700 text-slate-500' : 'bg-gray-200 text-gray-400')
                          )}
                        >
                          {isDiagonal ? '↗' : '·'}
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Tap to dismiss hint */}
              <p className={cn(
                'text-center text-[10px] mt-3 uppercase tracking-wider',
                isDarkMode ? 'text-gray-500' : 'text-gray-400'
              )}>
                {t('common.tapToDismiss') || 'Tap anywhere to dismiss'}
              </p>

              {/* Progress bar */}
              <motion.div
                className={cn('absolute bottom-0 left-0 h-1 rounded-b-xl', config.color.replace('text-', 'bg-'))}
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: HINT_AUTO_DISMISS_MS / 1000, ease: 'linear' }}
              />
            </div>
          </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Training Complete Celebration */}
      <AnimatePresence>
        {trainingComplete && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', damping: 15, stiffness: 200 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 flex justify-center"
          >
            <div className={cn(
              'rounded-xl border-2 px-6 py-3 shadow-lg backdrop-blur-sm',
              'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300',
              'dark:from-green-900/30 dark:to-emerald-900/30 dark:border-green-500/30'
            )}>
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: [0, 15, -15, 0] }}
                  transition={{ duration: 0.5, repeat: 3 }}
                >
                  <Trophy className="text-green-500" size={24} />
                </motion.div>
                <span className={cn(
                  'font-bold',
                  isDarkMode ? 'text-green-300' : 'text-green-700'
                )}>
                  {t('training.hints.skillsUnlocked') || 'Skills unlocked! You\'re ready!'}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default TrainingHints;
