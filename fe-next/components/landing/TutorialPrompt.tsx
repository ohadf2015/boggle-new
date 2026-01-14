'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Play } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface TutorialPromptProps {
  isVisible: boolean;
  onStartTutorial: () => void;
  onDismiss: () => void;
}

/**
 * TutorialPrompt - Non-intrusive banner for first-time visitors
 * Invites users to take the tutorial without blocking the main content
 */
const TutorialPrompt: React.FC<TutorialPromptProps> = ({
  isVisible,
  onStartTutorial,
  onDismiss,
}) => {
  const { t, dir } = useLanguage();

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="w-full mb-2 sm:mb-3"
          dir={dir}
        >
          <div className="relative bg-gradient-to-r from-neo-purple to-neo-pink border-3 border-neo-black rounded-neo shadow-hard overflow-hidden">
            {/* Dismiss button */}
            <button
              onClick={onDismiss}
              className="absolute top-2 right-2 rtl:right-auto rtl:left-2 sm:top-3 sm:right-3 sm:rtl:right-auto sm:rtl:left-3 w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 rounded-neo transition-colors z-10"
              aria-label={t('common.dismiss') || 'Dismiss'}
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 p-3 sm:p-4 pe-10 sm:pe-12">
              {/* Icon */}
              <div className="flex-shrink-0 p-2 sm:p-3 bg-white/20 rounded-neo">
                <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-neo-lime" />
              </div>

              {/* Text content */}
              <div className="flex-1 text-center sm:text-start">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {t('tutorialPrompt.title') || 'First time here?'}
                </h3>
                <p className="text-xs sm:text-sm text-white/90">
                  {t('tutorialPrompt.subtitle') || 'Learn the basics in 30 seconds'}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 sm:gap-3 flex-shrink-0">
                <button
                  onClick={onDismiss}
                  className="px-3 sm:px-4 py-2 min-h-[44px] text-xs sm:text-sm font-bold text-white/90 hover:text-white hover:bg-white/10 rounded-neo transition-colors"
                >
                  {t('tutorialPrompt.later') || 'Later'}
                </button>
                <button
                  onClick={onStartTutorial}
                  className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 min-h-[44px] bg-neo-lime text-neo-black font-bold text-xs sm:text-sm uppercase border-2 border-neo-black rounded-neo shadow-hard-sm hover:shadow-hard hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
                >
                  <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {t('tutorialPrompt.start') || 'Start'}
                </button>
              </div>
            </div>

            {/* Decorative accent line */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-neo-lime" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TutorialPrompt;
