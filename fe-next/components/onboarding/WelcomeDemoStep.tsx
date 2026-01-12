'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Pointer } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import MiniGrid, { GridPosition } from './MiniGrid';

interface DemoConfig {
  letters: string[][];
  path: GridPosition[];
  word: string;
}

// Language-specific demo configurations
// Each language has a localized word that makes sense in that language
const demoConfigs: Record<string, DemoConfig> = {
  // English: CAT
  en: {
    letters: [
      ['C', 'A', 'P'],
      ['D', 'T', 'O'],
      ['E', 'R', 'S'],
    ],
    path: [
      { row: 0, col: 0 }, // C
      { row: 0, col: 1 }, // A
      { row: 1, col: 1 }, // T
    ],
    word: 'CAT',
  },
  // Spanish: SOL (sun) - common 3-letter word
  es: {
    letters: [
      ['S', 'O', 'P'],
      ['D', 'L', 'I'],
      ['E', 'R', 'N'],
    ],
    path: [
      { row: 0, col: 0 }, // S
      { row: 0, col: 1 }, // O
      { row: 1, col: 1 }, // L
    ],
    word: 'SOL',
  },
  // Swedish: SOL (sun) - same word works in Swedish
  sv: {
    letters: [
      ['S', 'O', 'P'],
      ['D', 'L', 'I'],
      ['E', 'R', 'N'],
    ],
    path: [
      { row: 0, col: 0 }, // S
      { row: 0, col: 1 }, // O
      { row: 1, col: 1 }, // L
    ],
    word: 'SOL',
  },
  // Hebrew: שמש (sun) - using Hebrew letters for native experience
  // RTL: path goes right-to-left (col 2 -> 1 -> 1)
  he: {
    letters: [
      ['ל', 'מ', 'ש'],
      ['ו', 'ש', 'ד'],
      ['ס', 'ר', 'ת'],
    ],
    path: [
      { row: 0, col: 2 }, // ש
      { row: 0, col: 1 }, // מ
      { row: 1, col: 1 }, // ש
    ],
    word: 'שמש',
  },
  // Japanese: Uses CAT with English letters (game uses romaji/English)
  ja: {
    letters: [
      ['C', 'A', 'P'],
      ['D', 'T', 'O'],
      ['E', 'R', 'S'],
    ],
    path: [
      { row: 0, col: 0 }, // C
      { row: 0, col: 1 }, // A
      { row: 1, col: 1 }, // T
    ],
    word: 'CAT',
  },
};

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
  const { t, language } = useLanguage();

  // Get the demo configuration for the current language, fallback to English
  const demoConfig = useMemo(() => {
    return demoConfigs[language] || demoConfigs.en;
  }, [language]);

  return (
    <div className="flex flex-col items-center space-y-3 sm:space-y-5">
      {/* Welcome header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-center space-y-1"
      >
        <h2 className="text-xl sm:text-2xl font-black text-neo-white uppercase">
          {t('onboarding.welcome.title')}
        </h2>
        <p className="text-xs sm:text-sm text-neo-white/80">
          {t('onboarding.welcome.subtitle')}
        </p>
      </motion.div>

      {/* Instruction */}
      {!demoCompleted && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-neo-lime border-3 border-neo-black rounded-neo p-2.5 sm:p-4 shadow-hard-md max-w-sm text-center"
        >
          <div className="flex items-center justify-center gap-2 mb-1">
            <Pointer className="text-xl text-neo-black animate-bounce" />
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
          letters={demoConfig.letters}
          demoWord={demoConfig.word}
          demoPath={demoConfig.path}
          onDemoComplete={onDemoComplete}
          showHints={true}
        />
      </motion.div>
    </div>
  );
};

export default WelcomeDemoStep;
