'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Pointer, Star, Zap, Play, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface QuickTipsStepProps {
  selectedMode: 'single' | 'multi' | 'daily' | null;
  onModeSelect: (mode: 'single' | 'multi' | 'daily') => void;
  onComplete?: () => void;
}

/**
 * QuickTipsStep - Simplified final step with quick tips and single Training CTA
 * No overwhelming mode selection - just start training!
 */
const QuickTipsStep: React.FC<QuickTipsStepProps> = ({
  selectedMode,
  onModeSelect,
  onComplete,
}) => {
  const { t } = useLanguage();

  // Auto-select training mode when component mounts
  useEffect(() => {
    if (!selectedMode) {
      onModeSelect('single');
    }
  }, [selectedMode, onModeSelect]);

  const tips = [
    {
      icon: Pointer,
      titleKey: 'onboarding.quickTips.tip1Title',
      textKey: 'onboarding.quickTips.tip1Text',
    },
    {
      icon: Star,
      titleKey: 'onboarding.quickTips.tip2Title',
      textKey: 'onboarding.quickTips.tip2Text',
    },
    {
      icon: Zap,
      titleKey: 'onboarding.quickTips.tip3Title',
      textKey: 'onboarding.quickTips.tip3Text',
    },
  ];

  return (
    <div className="flex flex-col items-center space-y-4 sm:space-y-5 w-full max-w-lg mx-auto">
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center space-y-1"
      >
        <h2 className="text-xl sm:text-2xl font-black text-neo-black uppercase">
          {t('onboarding.quickTips.title') || 'Quick Tips'}
        </h2>
        <p className="text-xs sm:text-sm text-neo-black/70">
          {t('onboarding.quickTips.subtitle') || 'A few things to know before you start'}
        </p>
      </motion.div>

      {/* Quick Tips - unified neutral styling */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="w-full"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
          {tips.map((tip, index) => {
            const Icon = tip.icon;
            return (
              <motion.div
                key={tip.titleKey}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.15 + index * 0.1 }}
                className="flex sm:flex-col items-center gap-2 sm:gap-2 p-2.5 sm:p-3 rounded-neo border-2 border-neo-black shadow-hard-sm bg-neo-cream"
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-neo-lime text-neo-black border-2 border-neo-black rounded-full flex items-center justify-center shadow-hard-sm shrink-0">
                  <Icon className="text-base sm:text-lg text-neo-black" />
                </div>
                <div className="flex-1 sm:text-center">
                  <div className="font-black text-xs sm:text-sm text-neo-black leading-tight">
                    {t(tip.titleKey)}
                  </div>
                  <div className="text-[10px] sm:text-xs text-neo-black/70 mt-0.5 leading-snug">
                    {t(tip.textKey)}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Single prominent Training Mode CTA */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="w-full"
      >
        <div
          className="bg-gradient-to-br from-neo-lime to-lime-300 border-3 border-neo-black rounded-neo p-4 sm:p-5 shadow-hard text-center cursor-pointer hover:shadow-hard-lg active:shadow-none active:translate-y-1 transition-all"
          onClick={onComplete}
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-neo-black" />
            <h3 className="font-black text-lg sm:text-xl text-neo-black uppercase">
              {t('onboarding.training.title') || 'Training Mode'}
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-neo-black/80 mb-3">
            {t('onboarding.training.description') || 'Practice at your own pace with no pressure. Perfect for beginners!'}
          </p>
          <motion.div
            className="inline-flex items-center gap-2 bg-neo-black text-neo-lime px-4 py-2 rounded-neo font-black text-sm sm:text-base"
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Play className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" />
            {t('onboarding.training.ready') || "You're ready to play!"}
          </motion.div>
        </div>
      </motion.div>

      {/* Encouragement */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-neo-yellow/30 border-2 border-neo-black/20 rounded-neo px-4 py-2"
      >
        <p className="text-center font-bold text-xs text-neo-black/70">
          {t('onboarding.training.hint') || 'More game modes will unlock as you play!'}
        </p>
      </motion.div>
    </div>
  );
};

export default QuickTipsStep;
