'use client';

import React, { useEffect } from 'react';
import { m } from 'framer-motion';
import { Pointer, Star, Zap, Mouse } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsDesktop } from '@/hooks/useMediaQuery';

interface QuickTipsStepProps {
  selectedMode: 'single' | 'multi' | 'daily' | null;
  onModeSelect: (mode: 'single' | 'multi' | 'daily') => void;
}

/**
 * QuickTipsStep - Final step with quick tips and mode teasers
 */
const QuickTipsStep: React.FC<QuickTipsStepProps> = ({
  selectedMode,
  onModeSelect,
}) => {
  const { t } = useLanguage();
  const isDesktop = useIsDesktop();

  // Auto-select training mode when component mounts
  useEffect(() => {
    if (!selectedMode) {
      onModeSelect('single');
    }
  }, [selectedMode, onModeSelect]);

  const tips = [
    {
      icon: isDesktop ? Mouse : Pointer,
      titleKey: isDesktop ? 'onboarding.quickTips.tip1TitleDesktop' : 'onboarding.quickTips.tip1Title',
      textKey: isDesktop ? 'onboarding.quickTips.tip1TextDesktop' : 'onboarding.quickTips.tip1Text',
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
      <m.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        className="text-center space-y-1"
      >
        <h2 className="text-xl sm:text-2xl font-black text-neo-white uppercase">
          {t('onboarding.quickTips.title')}
        </h2>
        <p className="text-xs sm:text-sm text-neo-white">
          {t('onboarding.quickTips.subtitle')}
        </p>
      </m.div>

      {/* Quick Tips - unified neutral styling */}
      <m.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 26 }}
        className="w-full"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
          {tips.map((tip, index) => {
            const Icon = tip.icon;
            return (
              <m.div
                key={tip.titleKey}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.15 + index * 0.1, type: 'spring', stiffness: 380, damping: 26 }}
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
              </m.div>
            );
          })}
        </div>
      </m.div>

      {/* Practice Mode destination card */}
      <m.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, type: 'spring', stiffness: 300, damping: 26 }}
        className="w-full"
      >
        <div className="flex items-center gap-3 p-3 sm:p-4 rounded-neo border-3 border-neo-black shadow-hard bg-neo-lime">
          <div className="w-10 h-10 bg-neo-black rounded-full flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-neo-lime" />
          </div>
          <div>
            <div className="font-black text-sm sm:text-base text-neo-black uppercase">
              {t('onboarding.training.title')}
            </div>
            <div className="text-xs text-neo-black/70 leading-snug">
              {t('onboarding.training.description')}
            </div>
          </div>
        </div>
      </m.div>
    </div>
  );
};

export default QuickTipsStep;
