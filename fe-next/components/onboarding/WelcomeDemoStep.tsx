'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FaHandPointUp } from 'react-icons/fa';
import { useLanguage } from '@/contexts/LanguageContext';
import MiniGrid from './MiniGrid';

interface WelcomeDemoStepProps {
  onDemoComplete: () => void;
  demoCompleted: boolean;
}

/**
 * WelcomeDemoStep - Welcome message with interactive word selection demo
 * Users learn by doing - swiping to form the demo word
 */
const WelcomeDemoStep: React.FC<WelcomeDemoStepProps> = ({
  onDemoComplete,
  demoCompleted,
}) => {
  const { t } = useLanguage();

  // Demo grid configuration - Letters arranged to form "CAT"
  const demoLetters = [
    ['C', 'A', 'P'],
    ['D', 'T', 'O'],
    ['E', 'R', 'S'],
  ];

  // Correct path to form "CAT"
  const demoPath = [
    { row: 0, col: 0 }, // C
    { row: 0, col: 1 }, // A
    { row: 1, col: 1 }, // T
  ];

  return (
    <div className="flex flex-col items-center space-y-3 sm:space-y-5">
      {/* Welcome header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-center space-y-1"
      >
        <h2 className="text-xl sm:text-2xl font-black text-neo-black uppercase">
          {t('onboarding.welcome.title')}
        </h2>
        <p className="text-xs sm:text-sm text-neo-black/70">
          {t('onboarding.welcome.subtitle')}
        </p>
      </motion.div>

      {/* Instruction */}
      {!demoCompleted && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-neo-yellow border-3 border-neo-black rounded-neo p-2.5 sm:p-4 shadow-hard-md max-w-sm text-center"
        >
          <div className="flex items-center justify-center gap-2 mb-1">
            <FaHandPointUp className="text-xl text-neo-black animate-bounce" />
            <span className="font-bold text-neo-black text-xs sm:text-sm">
              {t('onboarding.welcome.demoInstruction')}
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-neo-black">
            {t('onboarding.welcome.demoWord')}
          </div>
          <div className="text-[10px] sm:text-xs text-neo-black/60 mt-1">
            {t('onboarding.welcome.demoHint')}
          </div>
        </motion.div>
      )}

      {/* Interactive demo grid */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="w-full"
      >
        <MiniGrid
          size={3}
          letters={demoLetters}
          demoWord="CAT"
          demoPath={demoPath}
          onDemoComplete={onDemoComplete}
          showHints={true}
        />
      </motion.div>

      {/* Success message */}
      {demoCompleted && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-neo-lime border-3 border-neo-black rounded-neo p-2.5 sm:p-4 shadow-hard-md text-center max-w-sm"
        >
          <div className="text-lg sm:text-xl font-black text-neo-black">
            {t('onboarding.welcome.demoSuccess')}
          </div>
          <div className="text-xs sm:text-sm text-neo-black/70 mt-1">
            {t('onboarding.welcome.clickNext')}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default WelcomeDemoStep;
