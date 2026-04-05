'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Mascot } from '@/components/ui/Mascot';
import MiniGrid from './MiniGrid';
import { getTutorialBoard, isValidTutorialWord } from './tutorialBoardConfig';

interface TutorialGameProps {
  onComplete: (score: number, wordsFound: string[]) => void;
}

const WORDS_GOAL = 3;
const LONG_WORD_LENGTH = 5;

/**
 * TutorialGame - Full-screen tutorial with a pre-seeded 4x4 grid.
 * Step 1 of the FTUE: Instant Play (0-30s).
 * After 3 words: combo celebration.
 * After 5+ letter word: confetti + "AMAZING!" celebration.
 */
const TutorialGame: React.FC<TutorialGameProps> = ({ onComplete }) => {
  const { t, language } = useLanguage();

  const board = useMemo(() => getTutorialBoard(language), [language]);
  const [wordsFound, setWordsFound] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [showAmazing, setShowAmazing] = useState(false);
  const [showCombo, setShowCombo] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Current demo word to guide the player (first target not yet found)
  const currentTarget = useMemo(() => {
    return board.targetWords.find((tw) => !wordsFound.includes(tw.word));
  }, [board.targetWords, wordsFound]);

  const handleWordFound = useCallback(
    (word: string) => {
      const upperWord = word.toUpperCase();
      if (wordsFound.includes(upperWord)) return;
      if (!isValidTutorialWord(upperWord, language)) return;

      const newWords = [...wordsFound, upperWord];
      const wordScore = upperWord.length * 10;
      const newScore = score + wordScore;

      setWordsFound(newWords);
      setScore(newScore);

      // Check for 5+ letter word celebration
      if (upperWord.length >= LONG_WORD_LENGTH && !showAmazing) {
        setShowAmazing(true);
        setTimeout(() => setShowAmazing(false), 2000);
      }

      // Check for 3 words goal
      if (newWords.length >= WORDS_GOAL && !completed) {
        setShowCombo(true);
        setCompleted(true);
        setTimeout(() => {
          onComplete(newScore, newWords);
        }, 2000);
      }
    },
    [wordsFound, score, language, showAmazing, completed, onComplete]
  );

  const handleDemoComplete = useCallback(() => {
    if (currentTarget) {
      handleWordFound(currentTarget.word);
    }
  }, [currentTarget, handleWordFound]);

  return (
    <div
      data-testid="tutorial-game"
      className="flex flex-col items-center justify-center min-h-screen bg-neo-navy p-4 relative overflow-hidden"
    >
      {/* Mascot speech bubble */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 26 }}
        className="flex items-center gap-3 mb-4"
      >
        <Mascot variant="encouraging" size="sm" clipBorder="none" />
        <div className="bg-neo-cream border-3 border-neo-black rounded-neo p-3 shadow-hard-sm relative max-w-xs">
          <span className="font-bold text-neo-black text-sm">
            {t('onboarding.ftue.findMultipleWords')}
          </span>
          {/* Speech bubble arrow — RTL-aware */}
          <div className="absolute ltr:-left-2 rtl:-right-2 top-1/2 -translate-y-1/2 w-3 h-3 bg-neo-cream ltr:border-l-3 ltr:border-b-3 rtl:border-r-3 rtl:border-b-3 border-neo-black ltr:rotate-45 rtl:-rotate-45" />
        </div>
      </motion.div>

      {/* Word counter */}
      <motion.div
        data-testid="word-counter"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mb-4 bg-neo-lime border-3 border-neo-black rounded-neo px-4 py-2 shadow-hard-sm"
      >
        <span className="font-black text-neo-black text-lg">
          {t('onboarding.ftue.wordsFound', { count: wordsFound.length })}
        </span>
      </motion.div>

      {/* Tutorial grid */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4, type: 'spring', stiffness: 280, damping: 26 }}
        className="w-full max-w-sm"
      >
        <MiniGrid
          size={4}
          letters={board.letters}
          demoWord={currentTarget?.word || board.targetWords[0].word}
          demoPath={currentTarget?.path || board.targetWords[0].path}
          onDemoComplete={handleDemoComplete}
          showHints={true}
        />
      </motion.div>

      {/* Found words list */}
      {wordsFound.length > 0 && (
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mt-4 flex gap-3 flex-wrap justify-center"
          dir={language === 'he' ? 'rtl' : 'ltr'}
        >
          {wordsFound.map((word) => (
            <motion.span
              key={word}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="bg-neo-lime border-3 border-neo-black rounded-neo px-4 py-1.5 font-black text-neo-black text-base shadow-hard-sm"
            >
              {word}
            </motion.span>
          ))}
        </motion.div>
      )}

      {/* AMAZING! celebration for 5+ letter words */}
      <AnimatePresence>
        {showAmazing && (
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
          >
            <div className="bg-neo-pink border-4 border-neo-black rounded-neo px-8 py-4 shadow-hard-lg transform rotate-[-2deg]">
              <div className="flex items-center gap-2">
                <Sparkles className="text-neo-lime w-8 h-8" />
                <span className="text-4xl font-black text-neo-white uppercase tracking-wider">
                  {t('onboarding.ftue.amazing')}
                </span>
                <Sparkles className="text-neo-lime w-8 h-8" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Combo celebration for reaching 3 words */}
      <AnimatePresence>
        {showCombo && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-40"
          >
            <div className="bg-neo-cyan border-4 border-neo-black rounded-neo px-6 py-3 shadow-hard-lg">
              <span className="text-2xl font-black text-neo-white">
                {t('onboarding.ftue.keepGoing', 'COMBO!')}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TutorialGame;
