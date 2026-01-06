'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Flame, Trophy, RotateCcw, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import GridComponent from '@/components/GridComponent';
import { isWordOnBoard } from '@/utils/utils';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { AnimatePresence, motion } from 'framer-motion';
import type { LetterGrid, Language } from '@/types';

// Level configurations
const LEVEL_CONFIGS = [
  { level: 1, comboTimeout: 8, targetCombo: 5, targetScore: 50 },
  { level: 2, comboTimeout: 6, targetCombo: 8, targetScore: 100 },
  { level: 3, comboTimeout: 5, targetCombo: 10, targetScore: 200 },
  { level: 4, comboTimeout: 4, targetCombo: 15, targetScore: 350 },
  { level: 5, comboTimeout: 3, targetCombo: 20, targetScore: 500 },
];

interface ComboMasterProps {
  grid: LetterGrid;
  availableWords: { word: string; path: { row: number; col: number }[] }[];
  level?: number;
  language?: Language;
  onComplete: (result: {
    score: number;
    maxCombo: number;
    wordsFound: number;
    timeSpent: number;
    level: number;
  }) => void;
  onExit?: () => void;
}

type GamePhase = 'ready' | 'playing' | 'complete';

/**
 * Combo Master Drill
 *
 * Attention training - maintain combo streaks without breaks.
 * Find words quickly to keep the combo alive.
 */
export default function ComboMaster({
  grid,
  availableWords,
  level = 1,
  language = 'en',
  onComplete,
  onExit,
}: ComboMasterProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { playErrorSound } = useSoundEffects();
  const isDarkMode = theme === 'dark';

  const levelConfig = LEVEL_CONFIGS[Math.min(level - 1, LEVEL_CONFIGS.length - 1)];

  const [phase, setPhase] = useState<GamePhase>('ready');
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [comboTimer, setComboTimer] = useState(levelConfig.comboTimeout);
  const [wordsFound, setWordsFound] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [comboBreaks, setComboBreaks] = useState(0);
  const [feedback, setFeedback] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const comboTimerRef = useRef<NodeJS.Timeout | null>(null);

  const availableWordSet = useMemo(
    () => new Set(availableWords.map(w => w.word.toUpperCase())),
    [availableWords]
  );
  const MAX_COMBO_BREAKS = 3;

  // Start combo timer
  const startComboTimer = useCallback(() => {
    if (comboTimerRef.current) clearInterval(comboTimerRef.current);
    setComboTimer(levelConfig.comboTimeout);

    comboTimerRef.current = setInterval(() => {
      setComboTimer(prev => {
        if (prev <= 1) {
          // Combo broken!
          setCombo(0);
          setComboBreaks(breaks => {
            const newBreaks = breaks + 1;
            if (newBreaks >= MAX_COMBO_BREAKS) {
              if (comboTimerRef.current) clearInterval(comboTimerRef.current);
              setPhase('complete');
            }
            return newBreaks;
          });
          return levelConfig.comboTimeout;
        }
        return prev - 1;
      });
    }, 1000);
  }, [levelConfig.comboTimeout]);

  // Start game
  const startGame = useCallback(() => {
    setPhase('playing');
    setCombo(0);
    setMaxCombo(0);
    setWordsFound([]);
    setScore(0);
    setComboBreaks(0);
    startTimeRef.current = Date.now();
    startComboTimer();
  }, [startComboTimer]);

  // Handle word submission
  const handleWordSubmit = useCallback((word: string) => {
    if (phase !== 'playing') return;

    const upperWord = word.toUpperCase();

    // Check if word can be formed on the board
    if (!isWordOnBoard(upperWord, grid, language)) {
      setFeedback({ message: t('brain.drills.errors.notOnBoard') || 'Word not on board', type: 'error' });
      playErrorSound?.();
      setTimeout(() => setFeedback(null), 2000);
      return;
    }

    // Check if already found
    if (wordsFound.includes(upperWord)) {
      setFeedback({ message: t('brain.drills.errors.alreadyFound') || 'Already found', type: 'error' });
      playErrorSound?.();
      setTimeout(() => setFeedback(null), 2000);
      return;
    }

    // Check if word is in available words list
    if (!availableWordSet.has(upperWord)) {
      setFeedback({ message: t('brain.drills.errors.invalidWord') || 'Invalid word', type: 'error' });
      playErrorSound?.();
      setTimeout(() => setFeedback(null), 2000);
      return;
    }

    // Valid word!
    setWordsFound(prev => [...prev, upperWord]);
    const newCombo = combo + 1;
    setCombo(newCombo);
    setMaxCombo(prev => Math.max(prev, newCombo));
    const baseScore = word.length * 10;
    const comboMultiplier = 1 + (newCombo * 0.1);
    const wordScore = Math.round(baseScore * comboMultiplier);
    setScore(prev => prev + wordScore);
    setFeedback({ message: `+${wordScore} ${t('brain.drills.points')} x${newCombo}`, type: 'success' });
    setTimeout(() => setFeedback(null), 1000);
    startComboTimer();

    if (newCombo >= levelConfig.targetCombo) {
      if (comboTimerRef.current) clearInterval(comboTimerRef.current);
      setPhase('complete');
    }
  }, [phase, availableWordSet, wordsFound, combo, startComboTimer, levelConfig.targetCombo, grid, language, t, playErrorSound]);

  // Calculate results
  const getResults = useCallback(() => {
    const timeSpent = startTimeRef.current
      ? Math.floor((Date.now() - startTimeRef.current) / 1000)
      : 0;

    return {
      score,
      maxCombo,
      wordsFound: wordsFound.length,
      timeSpent,
      level,
    };
  }, [score, maxCombo, wordsFound.length, level]);

  // Handle completion
  useEffect(() => {
    if (phase === 'complete') {
      onComplete(getResults());
    }
  }, [phase, getResults, onComplete]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (comboTimerRef.current) clearInterval(comboTimerRef.current);
    };
  }, []);

  // Combo bar percentage
  const comboBarPercent = (comboTimer / levelConfig.comboTimeout) * 100;

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
          {/* Combo display */}
          <div className={cn(
            'flex items-center gap-1 px-3 py-1 rounded-neo border-2 border-neo-black',
            combo >= 5 ? 'bg-neo-orange' : isDarkMode ? 'bg-slate-700' : 'bg-neo-cream'
          )}>
            <Flame className={cn(
              'w-4 h-4',
              combo >= 5 ? 'text-neo-black' : 'text-neo-orange'
            )} />
            <span className={cn(
              'font-black text-lg',
              combo >= 5 ? 'text-neo-black' : isDarkMode ? 'text-neo-orange' : 'text-neo-orange'
            )}>
              x{combo}
            </span>
          </div>

          {/* Lives (combo breaks remaining) */}
          <div className="flex items-center gap-1">
            {Array.from({ length: MAX_COMBO_BREAKS }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'w-3 h-3 rounded-full border border-neo-black',
                  i < (MAX_COMBO_BREAKS - comboBreaks)
                    ? 'bg-neo-red'
                    : 'bg-gray-300'
                )}
              />
            ))}
          </div>
        </div>

        <div className={cn(
          'px-3 py-1 rounded-neo border-2 border-neo-black font-bold',
          isDarkMode ? 'bg-neo-orange text-neo-black' : 'bg-neo-orange text-neo-black'
        )}>
          {score} {t('brain.drills.points')}
        </div>
      </div>

      {/* Combo Timer Bar */}
      {phase === 'playing' && (
        <div className={cn(
          'h-2 border-b-2 border-neo-black',
          isDarkMode ? 'bg-slate-700' : 'bg-gray-200'
        )}>
          <motion.div
            className={cn(
              'h-full',
              comboBarPercent > 50 ? 'bg-neo-green' :
              comboBarPercent > 25 ? 'bg-neo-yellow' : 'bg-neo-red'
            )}
            animate={{ width: `${comboBarPercent}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}

      {/* Game Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {/* Ready Phase */}
        {phase === 'ready' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6"
          >
            <Target className="w-20 h-20 mx-auto text-neo-orange" />
            <h2 className={cn(
              'text-2xl font-black',
              isDarkMode ? 'text-neo-white' : 'text-neo-black'
            )}>
              {t('brain.drills.combo-master.name')}
            </h2>
            <p className={cn(
              'text-sm max-w-xs',
              isDarkMode ? 'text-neo-white/70' : 'text-neo-black/70'
            )}>
              {t('brain.drills.combo-master.description')}
            </p>
            <div className={cn(
              'text-xs space-y-1 p-3 rounded-neo border-2 border-neo-black',
              isDarkMode ? 'bg-slate-800' : 'bg-white'
            )}>
              <p>{t('brain.drills.level')}: {level}</p>
              <p>{t('brain.drills.combo-master.targetCombo', { combo: levelConfig.targetCombo })}</p>
              <p>{t('brain.drills.combo-master.timerPerWord', { time: levelConfig.comboTimeout })}</p>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={startGame}
              className={cn(
                'px-8 py-3 rounded-neo border-3 border-neo-black shadow-hard',
                'font-bold text-lg uppercase',
                'bg-neo-orange text-neo-black'
              )}
            >
              {t('brain.drills.start')}
            </motion.button>
          </motion.div>
        )}

        {/* Playing Phase */}
        {phase === 'playing' && (
          <div className="w-full max-w-md space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Target className="w-5 h-5 text-neo-orange" />
              <span className={cn(
                'font-bold',
                isDarkMode ? 'text-neo-white' : 'text-neo-black'
              )}>
                {t('brain.drills.target')}: x{levelConfig.targetCombo}
              </span>
              <Timer className="w-4 h-4 text-neo-cyan ml-2" />
              <span className={cn(
                'font-bold tabular-nums',
                comboTimer <= 3 ? 'text-neo-red' : isDarkMode ? 'text-neo-cyan' : 'text-neo-purple'
              )}>
                {comboTimer}s
              </span>
            </div>

            <GridComponent
              grid={grid}
              interactive={true}
              onWordSubmit={handleWordSubmit}
              comboLevel={combo}
              className="w-full"
            />

            {/* Feedback message */}
            <AnimatePresence>
              {feedback && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={cn(
                    'text-center px-4 py-2 rounded-neo border-2 border-neo-black font-bold text-sm',
                    feedback.type === 'error'
                      ? 'bg-neo-red text-neo-white'
                      : 'bg-neo-green text-neo-black'
                  )}
                >
                  {feedback.message}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Complete Phase */}
        {phase === 'complete' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6"
          >
            <Trophy className={cn(
              'w-20 h-20 mx-auto',
              maxCombo >= levelConfig.targetCombo ? 'text-neo-yellow' : 'text-gray-400'
            )} />
            <h2 className={cn(
              'text-2xl font-black',
              isDarkMode ? 'text-neo-white' : 'text-neo-black'
            )}>
              {maxCombo >= levelConfig.targetCombo ? t('brain.drills.complete') : t('brain.drills.gameOver')}
            </h2>
            <div className={cn(
              'p-4 rounded-neo border-3 border-neo-black space-y-2',
              isDarkMode ? 'bg-slate-800' : 'bg-white'
            )}>
              <p className="text-3xl font-black text-neo-orange">
                {score} {t('brain.drills.points')}
              </p>
              <p className={cn(
                'text-lg font-bold',
                isDarkMode ? 'text-neo-cyan' : 'text-neo-purple'
              )}>
                {t('brain.drills.maxCombo')}: x{maxCombo}
              </p>
              <p className={cn(
                'text-sm',
                isDarkMode ? 'text-neo-white/70' : 'text-neo-black/70'
              )}>
                {wordsFound.length} {t('brain.drills.wordsFound')}
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setPhase('ready')}
                className={cn(
                  'flex items-center gap-2 px-6 py-3 rounded-neo border-3 border-neo-black shadow-hard',
                  'font-bold uppercase',
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
                  className="px-6 py-3 rounded-neo border-3 border-neo-black shadow-hard font-bold uppercase bg-neo-orange text-neo-black"
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
