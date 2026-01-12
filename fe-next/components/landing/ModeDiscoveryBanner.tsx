'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Calendar, Bot, X, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  shouldShowModePrompt,
  dismissModePrompt,
  markModePromptSeen,
} from '@/utils/playerProgressStorage';

/**
 * ModeDiscoveryBanner - Non-intrusive banner suggesting new game modes
 * Shows after player completes 2 training games to introduce Daily Challenge and Bots
 */
const ModeDiscoveryBanner: React.FC = () => {
  const { t, language, dir } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if we should show the prompt
    if (shouldShowModePrompt()) {
      // Small delay for better UX
      const timer = setTimeout(() => {
        setIsVisible(true);
        markModePromptSeen();
      }, 500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    dismissModePrompt();
    // Animate out then hide
    setTimeout(() => setIsVisible(false), 300);
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {!isDismissed && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          dir={dir}
          className="relative w-full max-w-3xl lg:max-w-4xl xl:max-w-5xl mx-auto mb-4"
        >
          <div className="bg-gradient-to-r from-neo-cyan via-neo-lime to-neo-lime border-3 border-neo-black rounded-neo shadow-hard overflow-hidden">
            {/* Dismiss button */}
            <button
              onClick={handleDismiss}
              className="absolute top-2 right-2 rtl:right-auto rtl:left-2 sm:top-3 sm:right-3 sm:rtl:right-auto sm:rtl:left-3 w-7 h-7 sm:w-8 sm:h-8 bg-neo-white/80 hover:bg-neo-white border-2 border-neo-black rounded-full flex items-center justify-center transition-colors z-10"
              aria-label={t('common.dismiss') || 'Dismiss'}
            >
              <X className="w-4 h-4 text-neo-black" />
            </button>

            <div className="p-3 sm:p-4">
              {/* Header */}
              <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                >
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-neo-black" />
                </motion.div>
                <h3 className="font-black text-base sm:text-lg text-neo-black uppercase">
                  {t('modeDiscovery.title') || 'Ready for more?'}
                </h3>
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-neo-black/80 mb-3 sm:mb-4 max-w-xl">
                {t('modeDiscovery.description') ||
                  "Great job on your training! Now try these exciting game modes:"}
              </p>

              {/* Mode options */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {/* Daily Challenge */}
                <Link
                  href={`/${language}/daily`}
                  className="group flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-neo-white/90 hover:bg-neo-white border-2 border-neo-black rounded-neo shadow-hard-sm hover:shadow-hard transition-all hover:translate-x-[-2px] hover:translate-y-[-2px]"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-neo-orange to-neo-pink border-2 border-neo-black rounded-full flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-neo-black" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-xs sm:text-sm text-neo-black uppercase truncate">
                      {t('modeDiscovery.daily.title') || 'Daily Challenge'}
                    </div>
                    <div className="text-[10px] sm:text-xs text-neo-black/70 truncate">
                      {t('modeDiscovery.daily.description') || 'New puzzle every day!'}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-neo-black/50 group-hover:text-neo-black group-hover:translate-x-1 transition-all shrink-0 rtl:rotate-180" />
                </Link>

                {/* Play vs Bots */}
                <Link
                  href={`/${language}/singleplayer`}
                  className="group flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-neo-white/90 hover:bg-neo-white border-2 border-neo-black rounded-neo shadow-hard-sm hover:shadow-hard transition-all hover:translate-x-[-2px] hover:translate-y-[-2px]"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-neo-purple border-2 border-neo-black rounded-full flex items-center justify-center shrink-0">
                    <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-neo-black" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-xs sm:text-sm text-neo-black uppercase truncate">
                      {t('modeDiscovery.bots.title') || 'Play vs Bots'}
                    </div>
                    <div className="text-[10px] sm:text-xs text-neo-black/70 truncate">
                      {t('modeDiscovery.bots.description') || 'Test your skills!'}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-neo-black/50 group-hover:text-neo-black group-hover:translate-x-1 transition-all shrink-0 rtl:rotate-180" />
                </Link>
              </div>

              {/* Maybe later link */}
              <button
                onClick={handleDismiss}
                className="mt-2 sm:mt-3 text-xs text-neo-black/60 hover:text-neo-black underline-offset-2 hover:underline transition-colors"
              >
                {t('modeDiscovery.maybeLater') || 'Maybe later'}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ModeDiscoveryBanner;
