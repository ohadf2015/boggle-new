'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FaUser, FaUsers, FaCalendarDay } from 'react-icons/fa';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface ModeSelectionStepProps {
  selectedMode: 'single' | 'multi' | 'daily' | null;
  onModeSelect: (mode: 'single' | 'multi' | 'daily') => void;
}

/**
 * ModeSelectionStep - Game mode selection cards
 * Users choose between single-player, multiplayer, or daily challenge
 */
const ModeSelectionStep: React.FC<ModeSelectionStepProps> = ({
  selectedMode,
  onModeSelect,
}) => {
  const { t } = useLanguage();

  const modes = [
    {
      id: 'single' as const,
      icon: FaUser,
      color: 'bg-neo-yellow',
      hoverColor: 'hover:bg-neo-yellow/90',
      delay: 0.2,
    },
    {
      id: 'multi' as const,
      icon: FaUsers,
      color: 'bg-neo-orange',
      hoverColor: 'hover:bg-neo-orange/90',
      delay: 0.4,
    },
    {
      id: 'daily' as const,
      icon: FaCalendarDay,
      color: 'bg-neo-pink',
      hoverColor: 'hover:bg-neo-pink/90',
      delay: 0.6,
    },
  ];

  return (
    <div className="flex flex-col items-center space-y-3 sm:space-y-5">
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center space-y-1"
      >
        <h2 className="text-xl sm:text-2xl font-black text-neo-black uppercase">
          {t('onboarding.mode.title')}
        </h2>
        <p className="text-xs sm:text-sm text-neo-black/70">
          {t('onboarding.mode.subtitle')}
        </p>
      </motion.div>

      {/* Mode cards - 3 columns on all screens */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 w-full max-w-3xl">
        {modes.map((mode) => {
          const isSelected = selectedMode === mode.id;
          const Icon = mode.icon;

          return (
            <motion.button
              key={mode.id}
              onClick={() => onModeSelect(mode.id)}
              className={cn(
                'relative p-2 sm:p-4 rounded-neo border-2 sm:border-3 border-neo-black',
                'transition-all cursor-pointer',
                'min-h-[100px] sm:min-h-[140px] flex flex-col items-center justify-between',
                mode.color,
                mode.hoverColor,
                isSelected
                  ? 'shadow-hard-md sm:shadow-hard-xl scale-105 ring-2 sm:ring-3 ring-neo-cyan'
                  : 'shadow-hard-sm sm:shadow-hard-md hover:shadow-hard-xl hover:scale-105 active:scale-95'
              )}
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: mode.delay }}
              whileHover={{ scale: isSelected ? 1.05 : 1.08 }}
              whileTap={{ scale: 0.95 }}
            >
              {/* Icon */}
              <div className="w-10 h-10 sm:w-14 sm:h-14 bg-white border-2 sm:border-3 border-neo-black rounded-full flex items-center justify-center shadow-hard-sm mb-1.5 sm:mb-3">
                <Icon className="text-xl sm:text-2xl text-neo-black" />
              </div>

              {/* Title */}
              <h3 className="font-black text-[10px] sm:text-base text-neo-black mb-0.5 sm:mb-2 uppercase leading-tight">
                {t(`onboarding.mode.${mode.id}Player.title`)}
              </h3>

              {/* Description - hidden on mobile */}
              <p className="hidden sm:block text-xs text-neo-black/80 text-center leading-relaxed">
                {t(`onboarding.mode.${mode.id}Player.description`)}
              </p>

              {/* Selected indicator */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-6 h-6 sm:w-8 sm:h-8 bg-neo-cyan border-2 border-neo-black rounded-full flex items-center justify-center shadow-hard-sm sm:shadow-hard-md"
                >
                  <span className="text-sm sm:text-lg font-black text-neo-black">✓</span>
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Encouragement message */}
      {selectedMode && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-neo-lime border-3 border-neo-black rounded-neo p-2.5 sm:p-3 shadow-hard-md max-w-md"
        >
          <p className="text-center font-bold text-xs sm:text-sm text-neo-black">
            🚀 {t('onboarding.mode.encouragement')}
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default ModeSelectionStep;
