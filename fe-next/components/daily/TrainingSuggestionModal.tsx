'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Dumbbell, ArrowRight, Zap, Target, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/utils/hapticFeedback';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from '@/components/ui/dialog';

interface TrainingSuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSkipToDaily: () => void;
}

interface Benefit {
  icon: React.ComponentType<{ className?: string; size?: number }>;
  key: string;
}

const TrainingSuggestionModal: React.FC<TrainingSuggestionModalProps> = ({
  isOpen,
  onClose,
  onSkipToDaily,
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
    // Navigate to singleplayer with returnTo param
    router.push(`/${language}/singleplayer?returnTo=daily`);
  };

  const handleSkipToDaily = () => {
    triggerHaptic('selection');
    onSkipToDaily();
  };

  const benefits: Benefit[] = [
    { icon: Target, key: 'learnMechanics' },
    { icon: Zap, key: 'practiceSwipes' },
    { icon: Sparkles, key: 'noPressure' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        noDescription
        className={cn(
          'max-w-md max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl relative',
          isDarkMode
            ? 'bg-neo-navy border border-cyan-500/30'
            : 'bg-white border border-cyan-400/50'
        )}
      >
        <DialogHeader
          variant="gradient"
          customBg="bg-transparent"
          className="border-b-0 p-0"
        >
          <DialogTitle className="sr-only">
            {t('daily.trainingSuggestion.title') || 'New to LexiClash?'}
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="relative">
          {/* Decorative background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-gradient-to-b from-cyan-500/20 to-transparent rounded-full blur-3xl pointer-events-none" />

          {/* Icon animation */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.2 }}
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
                  isDarkMode ? 'bg-cyan-900/50' : 'bg-cyan-100'
                )}
              >
                <Dumbbell
                  className={cn(
                    'drop-shadow-[0_0_20px_rgba(6,182,212,0.5)]',
                    isDarkMode ? 'text-cyan-400' : 'text-cyan-600'
                  )}
                  size={48}
                />
              </motion.div>
              {/* Sparkle effects */}
              <motion.div
                className="absolute -top-2 -right-2 w-4 h-4 bg-cyan-300 rounded-full"
                animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
              />
              <motion.div
                className="absolute -top-1 -left-3 w-3 h-3 bg-cyan-400 rounded-full"
                animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
              />
            </div>
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.3 }}
            className="text-center mb-6"
          >
            <h2 className={cn(
              'text-2xl font-bold mb-2',
              isDarkMode
                ? 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-300 to-cyan-400'
                : 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-600'
            )}>
              {t('daily.trainingSuggestion.title') || 'New to LexiClash?'}
            </h2>
            <p className={cn(
              'text-sm',
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            )}>
              {t('daily.trainingSuggestion.subtitle') || 'Try a quick training game first to learn the mechanics!'}
            </p>
          </motion.div>

          {/* Benefits list */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.4 }}
            className={cn(
              'mb-6 p-4 rounded-xl',
              isDarkMode ? 'bg-slate-700/50' : 'bg-gray-50'
            )}
          >
            <p className={cn(
              'text-sm font-medium mb-3',
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            )}>
              {t('daily.trainingSuggestion.benefitsTitle') || 'Training helps you:'}
            </p>
            <ul className="space-y-2">
              {benefits.map((benefit, index) => (
                <motion.li
                  key={benefit.key}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 26, delay: 0.5 + index * 0.1 }}
                  className={cn(
                    'flex items-center gap-3 text-sm',
                    isDarkMode ? 'text-gray-200' : 'text-gray-700'
                  )}
                >
                  <benefit.icon
                    className={cn(
                      'flex-shrink-0',
                      isDarkMode ? 'text-cyan-400' : 'text-cyan-600'
                    )}
                    size={16}
                  />
                  <span>{t(`daily.trainingSuggestion.benefits.${benefit.key}`) || benefit.key}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Daily challenge note */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26, delay: 0.6 }}
            className={cn(
              'mb-6 p-3 rounded-lg text-center text-sm',
              isDarkMode ? 'bg-neo-orange/20 border border-neo-orange/30' : 'bg-orange-50 border border-orange-200'
            )}
          >
            <span className={isDarkMode ? 'text-orange-300' : 'text-orange-700'}>
              {t('daily.trainingSuggestion.returnNote') || "After training, you'll return to the Daily Challenge automatically!"}
            </span>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26, delay: 0.7 }}
            className="space-y-3"
          >
            {/* Primary: Start Training */}
            <Button
              onClick={handleStartTraining}
              className={cn(
                'w-full h-12 text-base font-semibold rounded-xl transition-all flex items-center justify-center gap-2',
                'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600',
                'text-white shadow-lg hover:shadow-xl'
              )}
            >
              <Dumbbell size={20} />
              {t('daily.trainingSuggestion.startTraining') || 'Start Training'}
              <ArrowRight size={18} />
            </Button>

            {/* Secondary: Skip to Daily */}
            <Button
              onClick={handleSkipToDaily}
              variant="ghost"
              className={cn(
                'w-full h-10 text-sm font-medium rounded-xl transition-all',
                isDarkMode
                  ? 'text-gray-400 hover:text-gray-200 hover:bg-slate-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              )}
            >
              {t('daily.trainingSuggestion.skipToDaily') || "Skip, I'll figure it out"}
            </Button>
          </motion.div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
};

export default TrainingSuggestionModal;
