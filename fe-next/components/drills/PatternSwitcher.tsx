'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shuffle, CheckCircle2, XCircle, Trophy, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import GridComponent from '@/components/GridComponent';
import { isWordOnBoard } from '@/utils/utils';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import type { LetterGrid, Language } from '@/types';

// Level configurations
const LEVEL_CONFIGS = [
  { level: 1, patternLength: 3, lives: 3, targetScore: 50 },
  { level: 2, patternLength: 4, lives: 3, targetScore: 100 },
  { level: 3, patternLength: 5, lives: 2, targetScore: 200 },
  { level: 4, patternLength: 6, lives: 2, targetScore: 350 },
  { level: 5, patternLength: 7, lives: 1, targetScore: 500 },
];

interface PatternSwitcherProps {
  grid: LetterGrid;
  availableWords: { word: string; path: { row: number; col: number }[] }[];
  level?: number;
  language?: Language;
  onComplete: (result: {
    score: number;
    patternsCompleted: number;
    wordsFound: number;
    timeSpent: number;
    level: number;
  }) => void;
  onExit?: () => void;
}

type GamePhase = 'ready' | 'playing' | 'feedback' | 'complete';

/**
 * Pattern Switcher Drill
 *
 * Cognitive Flexibility training - find words matching required lengths.
 * Pattern changes after each successful word.
 */
export default function PatternSwitcher({
  grid,
  availableWords,
  level = 1,
  language = 'en',
  onComplete,
  onExit,
}: PatternSwitcherProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { playErrorSound } = useSoundEffects();
  const isDarkMode = theme === 'dark';

  const levelConfig = LEVEL_CONFIGS[Math.min(level - 1, LEVEL_CONFIGS.length - 1)];

  const [phase, setPhase] = useState<GamePhase>('ready');
  const [requiredLength, setRequiredLength] = useState(3);
  const [pattern, setPattern] = useState<number[]>([]);
  const [patternIndex, setPatternIndex] = useState(0);
  const [lives, setLives] = useState(levelConfig.lives);
  const [wordsFound, setWordsFound] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [patternsCompleted, setPatternsCompleted] = useState(0);
  const [lastFeedback, setLastFeedback] = useState<'correct' | 'wrong' | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Generate available lengths from words
  const availableLengths = [...new Set(availableWords.map(w => w.word.length))].sort();

  // Generate random pattern
  const generatePattern = useCallback(() => {
    const lengths: number[] = [];
    for (let i = 0; i < levelConfig.patternLength; i++) {
      const randomLength = availableLengths[Math.floor(Math.random() * availableLengths.length)];
      lengths.push(randomLength);
    }
    return lengths;
  }, [levelConfig.patternLength, availableLengths]);

  // Start game
  const startGame = useCallback(() => {
    const newPattern = generatePattern();
    setPattern(newPattern);
    setPatternIndex(0);
    setRequiredLength(newPattern[0]);
    setLives(levelConfig.lives);
    setWordsFound([]);
    setScore(0);
    setPatternsCompleted(0);
    startTimeRef.current = Date.now();
    setPhase('playing');
  }, [generatePattern, levelConfig.lives]);

  // Handle word submission
  const handleWordSubmit = useCallback((word: string) => {
    if (phase !== 'playing') return;

    const upperWord = word.toUpperCase();

    // Check if word can be formed on the board
    if (!isWordOnBoard(upperWord, grid, language)) {
      setLastFeedback('wrong');
      setPhase('feedback');
      playErrorSound?.();
      setTimeout(() => {
        setLastFeedback(null);
        setPhase('playing');
      }, 500);
      return;
    }

    const wordExists = availableWords.some(w => w.word.toUpperCase() === upperWord);
    if (!wordExists || wordsFound.includes(upperWord)) {
      setLastFeedback('wrong');
      setPhase('feedback');
      playErrorSound?.();
      setTimeout(() => {
        setLastFeedback(null);
        setPhase('playing');
      }, 500);
      return;
    }

    if (word.length === requiredLength) {
      // Correct length!
      setWordsFound(prev => [...prev, upperWord]);
      const wordScore = word.length * 15;
      setScore(prev => prev + wordScore);
      setLastFeedback('correct');
      setPhase('feedback');

      setTimeout(() => {
        setLastFeedback(null);

        // Move to next in pattern
        const nextIndex = patternIndex + 1;
        if (nextIndex >= pattern.length) {
          // Pattern completed!
          setPatternsCompleted(prev => prev + 1);
          setScore(prev => prev + 100); // Bonus

          // Generate new pattern
          const newPattern = generatePattern();
          setPattern(newPattern);
          setPatternIndex(0);
          setRequiredLength(newPattern[0]);
        } else {
          setPatternIndex(nextIndex);
          setRequiredLength(pattern[nextIndex]);
        }
        setPhase('playing');
      }, 500);
    } else {
      // Wrong length
      setLives(prev => prev - 1);
      setLastFeedback('wrong');
      setPhase('feedback');
      playErrorSound?.();

      setTimeout(() => {
        setLastFeedback(null);
        if (lives <= 1) {
          setPhase('complete');
        } else {
          setPhase('playing');
        }
      }, 500);
    }
  }, [phase, availableWords, wordsFound, requiredLength, patternIndex, pattern, lives, generatePattern, grid, language, playErrorSound]);

  // Results
  const getResults = useCallback(() => {
    const timeSpent = startTimeRef.current
      ? Math.floor((Date.now() - startTimeRef.current) / 1000)
      : 0;

    return {
      score,
      patternsCompleted,
      wordsFound: wordsFound.length,
      timeSpent,
      level,
    };
  }, [score, patternsCompleted, wordsFound.length, level]);

  useEffect(() => {
    if (phase === 'complete') {
      onComplete(getResults());
    }
  }, [phase, getResults, onComplete]);

  return (
    <div className={cn(
      'flex flex-col h-full',
      isDarkMode ? 'bg-neo-navy' : 'bg-neo-cream'
    )}>
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between px-4 py-3',
        'border-b-4 border-neo-black',
        isDarkMode ? 'bg-slate-800' : 'bg-white'
      )}>
        <div className="flex items-center gap-3">
          {/* Required length */}
          <div className={cn(
            'px-4 py-2 rounded-neo border-3 border-neo-black font-black text-xl',
            'bg-neo-cyan text-neo-black'
          )}>
            {requiredLength} {t('brain.drills.letters')}
          </div>

          {/* Lives */}
          <div className="flex items-center gap-1">
            {Array.from({ length: levelConfig.lives }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'w-3 h-3 rounded-full border border-neo-black',
                  i < lives ? 'bg-neo-red' : 'bg-gray-300'
                )}
              />
            ))}
          </div>
        </div>

        <div className={cn(
          'px-3 py-1 rounded-neo border-2 border-neo-black font-bold',
          'bg-neo-cyan text-neo-black'
        )}>
          {score} {t('brain.drills.points')}
        </div>
      </div>

      {/* Pattern Progress */}
      {phase !== 'ready' && phase !== 'complete' && (
        <div className={cn(
          'flex items-center justify-center gap-2 py-2 border-b-2 border-neo-black',
          isDarkMode ? 'bg-slate-800/50' : 'bg-white/50'
        )}>
          {pattern.map((len, i) => (
            <div
              key={i}
              className={cn(
                'w-8 h-8 rounded-lg border-2 border-neo-black flex items-center justify-center font-bold text-sm',
                i < patternIndex ? 'bg-neo-green text-neo-black' :
                i === patternIndex ? 'bg-neo-cyan text-neo-black' :
                isDarkMode ? 'bg-slate-700 text-neo-white/50' : 'bg-gray-200 text-neo-black/50'
              )}
            >
              {len}
            </div>
          ))}
        </div>
      )}

      {/* Game Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {phase === 'ready' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6"
          >
            <Shuffle className="w-20 h-20 mx-auto text-neo-cyan" />
            <h2 className={cn(
              'text-2xl font-black',
              isDarkMode ? 'text-neo-white' : 'text-neo-black'
            )}>
              {t('brain.drills.pattern-switcher.name')}
            </h2>
            <p className={cn(
              'text-sm max-w-xs',
              isDarkMode ? 'text-neo-white/70' : 'text-neo-black/70'
            )}>
              {t('brain.drills.pattern-switcher.description')}
            </p>
            <div className={cn(
              'text-xs space-y-1 p-3 rounded-neo border-2 border-neo-black',
              isDarkMode ? 'bg-slate-800' : 'bg-white'
            )}>
              <p>{t('brain.drills.level')}: {level}</p>
              <p>{t('brain.drills.patternLength')}: {levelConfig.patternLength}</p>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={startGame}
              className="px-8 py-3 rounded-neo border-3 border-neo-black shadow-hard font-bold text-lg uppercase bg-neo-cyan text-neo-black"
            >
              {t('brain.drills.start')}
            </motion.button>
          </motion.div>
        )}

        {(phase === 'playing' || phase === 'feedback') && (
          <div className="w-full max-w-md space-y-4 relative">
            <GridComponent
              grid={grid}
              interactive={phase === 'playing'}
              onWordSubmit={handleWordSubmit}
              className="w-full"
            />

            <AnimatePresence>
              {lastFeedback && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-neo"
                >
                  {lastFeedback === 'correct' ? (
                    <CheckCircle2 className="w-20 h-20 text-neo-green" />
                  ) : (
                    <XCircle className="w-20 h-20 text-neo-red" />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {phase === 'complete' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6"
          >
            <Trophy className={cn(
              'w-20 h-20 mx-auto',
              patternsCompleted > 0 ? 'text-neo-yellow' : 'text-gray-400'
            )} />
            <h2 className={cn(
              'text-2xl font-black',
              isDarkMode ? 'text-neo-white' : 'text-neo-black'
            )}>
              {lives > 0 ? t('brain.drills.complete') : t('brain.drills.gameOver')}
            </h2>
            <div className={cn(
              'p-4 rounded-neo border-3 border-neo-black space-y-2',
              isDarkMode ? 'bg-slate-800' : 'bg-white'
            )}>
              <p className="text-3xl font-black text-neo-cyan">{score} {t('brain.drills.points')}</p>
              <p className={cn('text-sm', isDarkMode ? 'text-neo-white/70' : 'text-neo-black/70')}>
                {t('brain.drills.patterns')}: {patternsCompleted}
              </p>
              <p className={cn('text-sm', isDarkMode ? 'text-neo-white/70' : 'text-neo-black/70')}>
                {wordsFound.length} {t('brain.drills.wordsFound')}
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setPhase('ready')}
                className={cn(
                  'flex items-center gap-2 px-6 py-3 rounded-neo border-3 border-neo-black shadow-hard font-bold uppercase',
                  isDarkMode ? 'bg-slate-700 text-neo-white' : 'bg-white text-neo-black'
                )}
              >
                <RotateCcw className="w-5 h-5" />
                {t('brain.drills.playAgain')}
              </motion.button>
              {onExit && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={onExit}
                  className="px-6 py-3 rounded-neo border-3 border-neo-black shadow-hard font-bold uppercase bg-neo-cyan text-neo-black"
                >
                  {t('brain.drills.exit')}
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
