'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Dumbbell, ArrowRight, Gamepad2, Move3D, Target, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/utils/hapticFeedback';
import { markGatewaySkipped } from '@/utils/trainingProgressStorage';

interface TrainingGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called when user skips training and wants to proceed anyway */
  onSkip: () => void;
  /** The mode user is trying to enter (for return navigation) */
  returnTo: 'multiplayer' | 'daily';
}

interface Benefit {
  icon: React.ComponentType<{ className?: string; size?: number }>;
  key: string;
}

/**
 * TrainingGatewayModal - Prompts new players to try training mode
 *
 * Shown before entering demanding modes (multiplayer, daily) if the player
 * hasn't demonstrated basic skills yet. Teaches:
 * - How to drag in different directions
 * - How to change direction mid-word
 * - How to explore the grid
 */
const TrainingGatewayModal: React.FC<TrainingGatewayModalProps> = ({
  isOpen,
  onClose,
  onSkip,
  returnTo,
}) => {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const router = useRouter();
  const isDarkMode = theme === 'dark';

  // Trigger haptic when modal opens
  useEffect(() => {
    if (isOpen) {
      triggerHaptic('light');
    }
  }, [isOpen]);

  const handleStartTraining = () => {
    triggerHaptic('selection');
    // Navigate to practice mode with return parameter
    router.push(`/${language}/singleplayer?autoStart=practice&returnTo=${returnTo}`);
    onClose();
  };

  const handleSkip = () => {
    triggerHaptic('selection');
    // Mark as skipped so we don't show again
    markGatewaySkipped();
    onSkip();
    onClose();
  };

  const benefits: Benefit[] = [
    { icon: Move3D, key: 'learnControls' },
    { icon: Gamepad2, key: 'masterDirections' },
    { icon: Target, key: 'noPressure' },
  ];

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className={cn(
            'w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl p-6 shadow-2xl relative',
            isDarkMode
              ? 'bg-gradient-to-b from-slate-800 via-slate-800 to-slate-900 border border-purple-500/30'
              : 'bg-gradient-to-b from-white via-white to-gray-50 border border-purple-400/50'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Decorative background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-gradient-to-b from-purple-500/20 to-transparent rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className={cn(
              'absolute top-4 right-4 rounded-full p-2 z-10 transition-colors',
              isDarkMode
                ? 'hover:bg-slate-700 text-gray-400 hover:text-gray-200'
                : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
            )}
          >
            <X size={18} />
          </button>

          {/* Icon animation */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', damping: 10, stiffness: 100, delay: 0.2 }}
            className="flex justify-center mb-4"
          >
            <div className="relative">
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                  rotate: [-5, 5, -5]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className={cn(
                  'p-4 rounded-2xl',
                  isDarkMode ? 'bg-purple-900/50' : 'bg-purple-100'
                )}
              >
                <Dumbbell
                  className={cn(
                    'drop-shadow-[0_0_20px_rgba(168,85,247,0.5)]',
                    isDarkMode ? 'text-purple-400' : 'text-purple-600'
                  )}
                  size={48}
                />
              </motion.div>
              {/* Sparkle effects */}
              <motion.div
                className="absolute -top-2 -right-2 w-4 h-4 bg-purple-300 rounded-full"
                animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
              />
              <motion.div
                className="absolute -top-1 -left-3 w-3 h-3 bg-purple-400 rounded-full"
                animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
              />
            </div>
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center mb-6"
          >
            <h2 className={cn(
              'text-2xl font-bold mb-2',
              isDarkMode
                ? 'text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-pink-300 to-purple-400'
                : 'text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600'
            )}>
              {t('training.gateway.title') || 'New to LexiClash?'}
            </h2>
            <p className={cn(
              'text-sm',
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            )}>
              {t('training.gateway.subtitle') || 'A quick training will help you master the controls!'}
            </p>
          </motion.div>

          {/* Interactive demo hint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className={cn(
              'mb-4 p-3 rounded-xl text-center',
              isDarkMode ? 'bg-purple-900/30 border border-purple-500/20' : 'bg-purple-50 border border-purple-200'
            )}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <motion.div
                animate={{ x: [0, 10, 10, 0, 0], y: [0, 0, 10, 10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className={cn(
                  'w-8 h-8 rounded-lg border-2 flex items-center justify-center font-bold text-sm',
                  isDarkMode
                    ? 'bg-purple-500/30 border-purple-400 text-purple-300'
                    : 'bg-purple-100 border-purple-400 text-purple-700'
                )}
              >
                W
              </motion.div>
              <ArrowRight className={cn('w-4 h-4', isDarkMode ? 'text-purple-400' : 'text-purple-600')} />
              <div className={cn(
                'w-8 h-8 rounded-lg border-2 flex items-center justify-center font-bold text-sm',
                isDarkMode
                  ? 'bg-slate-700 border-slate-600 text-slate-400'
                  : 'bg-gray-100 border-gray-300 text-gray-600'
              )}>
                O
              </div>
              <div className={cn(
                'w-8 h-8 rounded-lg border-2 flex items-center justify-center font-bold text-sm',
                isDarkMode
                  ? 'bg-slate-700 border-slate-600 text-slate-400'
                  : 'bg-gray-100 border-gray-300 text-gray-600'
              )}>
                R
              </div>
              <div className={cn(
                'w-8 h-8 rounded-lg border-2 flex items-center justify-center font-bold text-sm',
                isDarkMode
                  ? 'bg-slate-700 border-slate-600 text-slate-400'
                  : 'bg-gray-100 border-gray-300 text-gray-600'
              )}>
                D
              </div>
            </div>
            <p className={cn(
              'text-xs',
              isDarkMode ? 'text-purple-300/80' : 'text-purple-600/80'
            )}>
              {t('training.gateway.demoHint') || 'Swipe in any direction - even diagonally!'}
            </p>
          </motion.div>

          {/* Benefits list */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className={cn(
              'mb-6 p-4 rounded-xl',
              isDarkMode ? 'bg-slate-700/50' : 'bg-gray-50'
            )}
          >
            <p className={cn(
              'text-sm font-medium mb-3',
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            )}>
              {t('training.gateway.benefitsTitle') || 'Training helps you:'}
            </p>
            <ul className="space-y-2">
              {benefits.map((benefit, index) => (
                <motion.li
                  key={benefit.key}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className={cn(
                    'flex items-center gap-3 text-sm',
                    isDarkMode ? 'text-gray-200' : 'text-gray-700'
                  )}
                >
                  <benefit.icon
                    className={cn(
                      'flex-shrink-0',
                      isDarkMode ? 'text-purple-400' : 'text-purple-600'
                    )}
                    size={16}
                  />
                  <span>{t(`training.gateway.benefits.${benefit.key}`) || benefit.key}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Return note */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className={cn(
              'mb-6 p-3 rounded-lg text-center text-sm',
              isDarkMode ? 'bg-neo-lime/20 border border-neo-lime/30' : 'bg-lime-50 border border-lime-200'
            )}
          >
            <Sparkles className={cn('inline-block w-4 h-4 me-1', isDarkMode ? 'text-lime-300' : 'text-lime-600')} />
            <span className={isDarkMode ? 'text-lime-300' : 'text-lime-700'}>
              {t('training.gateway.returnNote') || `After training, you'll be ready for ${returnTo === 'multiplayer' ? 'multiplayer' : 'the daily challenge'}!`}
            </span>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="space-y-3"
          >
            {/* Primary: Start Training */}
            <Button
              onClick={handleStartTraining}
              className={cn(
                'w-full h-12 text-base font-semibold rounded-xl transition-all flex items-center justify-center gap-2',
                'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600',
                'text-white shadow-lg hover:shadow-xl'
              )}
            >
              <Dumbbell size={20} />
              {t('training.gateway.startTraining') || 'Start Training'}
              <ArrowRight size={18} />
            </Button>

            {/* Secondary: Skip */}
            <Button
              onClick={handleSkip}
              variant="ghost"
              className={cn(
                'w-full h-10 text-sm font-medium rounded-xl transition-all',
                isDarkMode
                  ? 'text-gray-400 hover:text-gray-200 hover:bg-slate-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              )}
            >
              {t('training.gateway.skipAnyway') || "Skip, I know how to play"}
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default TrainingGatewayModal;
