'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { User, Users, CalendarDays, Pointer, Star, Zap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface QuickTipsStepProps {
  selectedMode: 'single' | 'multi' | 'daily' | null;
  onModeSelect: (mode: 'single' | 'multi' | 'daily') => void;
}

/**
 * QuickTipsStep - Condensed tips + mode selection
 * Final onboarding step with 3 quick tips and game mode choice
 */
const QuickTipsStep: React.FC<QuickTipsStepProps> = ({
  selectedMode,
  onModeSelect,
}) => {
  const { t } = useLanguage();

  const tips = [
    {
      icon: Pointer,
      color: 'bg-neo-cyan',
      titleKey: 'onboarding.quickTips.tip1Title',
      textKey: 'onboarding.quickTips.tip1Text',
    },
    {
      icon: Star,
      color: 'bg-neo-yellow',
      titleKey: 'onboarding.quickTips.tip2Title',
      textKey: 'onboarding.quickTips.tip2Text',
    },
    {
      icon: Zap,
      color: 'bg-neo-pink',
      titleKey: 'onboarding.quickTips.tip3Title',
      textKey: 'onboarding.quickTips.tip3Text',
    },
  ];

  const modes = [
    {
      id: 'single' as const,
      icon: User,
      color: 'bg-neo-yellow',
    },
    {
      id: 'multi' as const,
      icon: Users,
      color: 'bg-neo-orange',
    },
    {
      id: 'daily' as const,
      icon: CalendarDays,
      color: 'bg-neo-pink',
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
          {t('onboarding.quickTips.title')}
        </h2>
        <p className="text-xs sm:text-sm text-neo-black/70">
          {t('onboarding.quickTips.subtitle')}
        </p>
      </motion.div>

      {/* Quick Tips - horizontal row on desktop, stacked on mobile */}
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
                className={cn(
                  'flex sm:flex-col items-center gap-2 sm:gap-2 p-2.5 sm:p-3 rounded-neo border-2 border-neo-black shadow-hard-sm',
                  tip.color
                )}
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white text-neo-black border-2 border-neo-black rounded-full flex items-center justify-center shadow-hard-sm shrink-0">
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

      {/* Mode selection - compact horizontal */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="w-full"
      >
        <div className="text-center mb-2">
          <span className="font-black text-sm text-neo-black uppercase">
            {t('onboarding.mode.title')}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {modes.map((mode, index) => {
            const isSelected = selectedMode === mode.id;
            const Icon = mode.icon;

            return (
              <motion.button
                key={mode.id}
                onClick={() => onModeSelect(mode.id)}
                className={cn(
                  'relative p-2 sm:p-3 rounded-neo border-2 border-neo-black',
                  'transition-all cursor-pointer',
                  'flex flex-col items-center justify-center gap-1',
                  'min-h-[70px] sm:min-h-[80px]',
                  mode.color,
                  isSelected
                    ? 'shadow-hard-md scale-105 ring-2 ring-neo-cyan'
                    : 'shadow-hard-sm hover:shadow-hard-md hover:scale-105 active:scale-95'
                )}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                whileHover={{ scale: isSelected ? 1.05 : 1.08 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white text-neo-black border-2 border-neo-black rounded-full flex items-center justify-center shadow-hard-sm">
                  <Icon className="text-base sm:text-lg text-neo-black" />
                </div>
                <span className="font-black text-[10px] sm:text-xs text-neo-black uppercase">
                  {t(`onboarding.mode.${mode.id}Player.title`)}
                </span>

                {/* Selected indicator */}
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-neo-cyan border-2 border-neo-black rounded-full flex items-center justify-center shadow-hard-sm"
                  >
                    <span className="text-xs sm:text-sm font-black text-neo-black">✓</span>
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Encouragement */}
      {selectedMode && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-neo-lime border-2 border-neo-black rounded-neo px-3 py-2 shadow-hard-sm"
        >
          <p className="text-center font-bold text-xs text-neo-black">
            🚀 {t('onboarding.mode.encouragement')}
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default QuickTipsStep;
