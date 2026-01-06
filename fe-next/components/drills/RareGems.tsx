'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Gem, Star, Trophy, RotateCcw, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import GridComponent from '@/components/GridComponent';
import type { LetterGrid } from '@/types';

// Level configurations
const LEVEL_CONFIGS = [
  { level: 1, timeLimit: 90, targetRare: 3, targetScore: 50 },
  { level: 2, timeLimit: 75, targetRare: 5, targetScore: 100 },
  { level: 3, timeLimit: 60, targetRare: 7, targetScore: 200 },
  { level: 4, timeLimit: 50, targetRare: 10, targetScore: 350 },
  { level: 5, timeLimit: 45, targetRare: 15, targetScore: 500 },
];

// Simulate word rarity (in real app, this would come from word data)
const getWordRarity = (word: string): 'common' | 'uncommon' | 'rare' | 'legendary' => {
  const len = word.length;
  if (len >= 8) return 'legendary';
  if (len >= 6) return 'rare';
  if (len >= 5) return 'uncommon';
  return 'common';
};

const RARITY_COLORS = {
  common: 'bg-gray-400',
  uncommon: 'bg-neo-green',
  rare: 'bg-neo-purple',
  legendary: 'bg-neo-yellow',
};

const RARITY_POINTS = {
  common: 10,
  uncommon: 25,
  rare: 50,
  legendary: 100,
};

interface RareGemsProps {
  grid: LetterGrid;
  availableWords: { word: string; path: { row: number; col: number }[] }[];
  level?: number;
  onComplete: (result: {
    score: number;
    rareWordsFound: number;
    totalWordsFound: number;
    timeSpent: number;
    level: number;
  }) => void;
  onExit?: () => void;
}

type GamePhase = 'ready' | 'playing' | 'complete';

/**
 * Rare Gems Drill
 *
 * Vocabulary training - discover uncommon and rare words.
 * Longer/rarer words score more points.
 */
export default function RareGems({
  grid,
  availableWords,
  level = 1,
  onComplete,
  onExit,
}: RareGemsProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isDarkMode = theme === 'dark';

  const levelConfig = LEVEL_CONFIGS[Math.min(level - 1, LEVEL_CONFIGS.length - 1)];

  const [phase, setPhase] = useState<GamePhase>('ready');
  const [timeRemaining, setTimeRemaining] = useState(levelConfig.timeLimit);
  const [wordsFound, setWordsFound] = useState<{ word: string; rarity: string }[]>([]);
  const [score, setScore] = useState(0);
  const [lastWord, setLastWord] = useState<{ word: string; rarity: string; points: number } | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const availableWordSet = useMemo(
    () => new Set(availableWords.map(w => w.word.toUpperCase())),
    [availableWords]
  );

  const rareWordsFound = wordsFound.filter(w =>
    w.rarity === 'rare' || w.rarity === 'legendary'
  ).length;

  // Start game
  const startGame = useCallback(() => {
    setPhase('playing');
    setTimeRemaining(levelConfig.timeLimit);
    setWordsFound([]);
    setScore(0);
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setPhase('complete');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [levelConfig.timeLimit]);

  // Handle word submission
  const handleWordSubmit = useCallback((word: string) => {
    if (phase !== 'playing') return;

    const upperWord = word.toUpperCase();
    const alreadyFound = wordsFound.some(w => w.word === upperWord);

    if (availableWordSet.has(upperWord) && !alreadyFound) {
      const rarity = getWordRarity(word);
      const points = RARITY_POINTS[rarity];

      setWordsFound(prev => [...prev, { word: upperWord, rarity }]);
      setScore(prev => prev + points);
      setLastWord({ word: upperWord, rarity, points });

      setTimeout(() => setLastWord(null), 1000);

      // Check win condition
      if (rareWordsFound + (rarity === 'rare' || rarity === 'legendary' ? 1 : 0) >= levelConfig.targetRare) {
        if (timerRef.current) clearInterval(timerRef.current);
        // Bonus for early completion
        const bonusTime = timeRemaining * 2;
        setScore(prev => prev + bonusTime);
        setPhase('complete');
      }
    }
  }, [phase, availableWordSet, wordsFound, rareWordsFound, levelConfig.targetRare, timeRemaining]);

  // Results
  const getResults = useCallback(() => {
    const timeSpent = startTimeRef.current
      ? Math.floor((Date.now() - startTimeRef.current) / 1000)
      : levelConfig.timeLimit;

    return {
      score,
      rareWordsFound,
      totalWordsFound: wordsFound.length,
      timeSpent,
      level,
    };
  }, [score, rareWordsFound, wordsFound.length, level, levelConfig.timeLimit]);

  useEffect(() => {
    if (phase === 'complete') {
      onComplete(getResults());
    }
  }, [phase, getResults, onComplete]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

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
          {/* Timer */}
          <div className={cn(
            'flex items-center gap-1 px-3 py-1 rounded-neo border-2 border-neo-black',
            isDarkMode ? 'bg-slate-700' : 'bg-neo-cream'
          )}>
            <Clock className={cn(
              'w-4 h-4',
              timeRemaining <= 10 ? 'text-neo-red' : 'text-neo-green'
            )} />
            <span className={cn(
              'font-black text-lg tabular-nums',
              timeRemaining <= 10 ? 'text-neo-red' : isDarkMode ? 'text-neo-green' : 'text-neo-green'
            )}>
              {timeRemaining}s
            </span>
          </div>

          {/* Rare count */}
          <div className={cn(
            'flex items-center gap-1 px-2 py-1 rounded border-2 border-neo-black',
            isDarkMode ? 'bg-slate-700' : 'bg-neo-cream'
          )}>
            <Gem className="w-4 h-4 text-neo-purple" />
            <span className={cn(
              'font-bold text-sm',
              isDarkMode ? 'text-neo-white' : 'text-neo-black'
            )}>
              {rareWordsFound}/{levelConfig.targetRare}
            </span>
          </div>
        </div>

        <div className={cn(
          'px-3 py-1 rounded-neo border-2 border-neo-black font-bold',
          'bg-neo-green text-neo-black'
        )}>
          {score} pts
        </div>
      </div>

      {/* Rarity Legend */}
      {phase === 'playing' && (
        <div className={cn(
          'flex items-center justify-center gap-3 py-2 text-xs',
          'border-b-2 border-neo-black',
          isDarkMode ? 'bg-slate-800/50' : 'bg-white/50'
        )}>
          {Object.entries(RARITY_COLORS).map(([rarity, color]) => (
            <div key={rarity} className="flex items-center gap-1">
              <div className={cn('w-3 h-3 rounded border border-neo-black', color)} />
              <span className={isDarkMode ? 'text-neo-white/70' : 'text-neo-black/70'}>
                {rarity} (+{RARITY_POINTS[rarity as keyof typeof RARITY_POINTS]})
              </span>
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
            <BookOpen className="w-20 h-20 mx-auto text-neo-green" />
            <h2 className={cn(
              'text-2xl font-black',
              isDarkMode ? 'text-neo-white' : 'text-neo-black'
            )}>
              {t('brain.drills.rare-gems.name')}
            </h2>
            <p className={cn(
              'text-sm max-w-xs',
              isDarkMode ? 'text-neo-white/70' : 'text-neo-black/70'
            )}>
              {t('brain.drills.rare-gems.description')}
            </p>
            <div className={cn(
              'text-xs space-y-1 p-3 rounded-neo border-2 border-neo-black',
              isDarkMode ? 'bg-slate-800' : 'bg-white'
            )}>
              <p>{t('brain.drills.level')}: {level}</p>
              <p>{t('brain.drills.timeSpent')}: {levelConfig.timeLimit}s</p>
              <p>Target rare words: {levelConfig.targetRare}</p>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={startGame}
              className="px-8 py-3 rounded-neo border-3 border-neo-black shadow-hard font-bold text-lg uppercase bg-neo-green text-neo-black"
            >
              {t('brain.drills.start')}
            </motion.button>
          </motion.div>
        )}

        {phase === 'playing' && (
          <div className="w-full max-w-md space-y-4 relative">
            <GridComponent
              grid={grid}
              interactive={true}
              onWordSubmit={handleWordSubmit}
              className="w-full"
            />

            {/* Word popup */}
            <AnimatePresence>
              {lastWord && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={cn(
                    'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
                    'px-4 py-2 rounded-neo border-3 border-neo-black shadow-hard',
                    RARITY_COLORS[lastWord.rarity as keyof typeof RARITY_COLORS]
                  )}
                >
                  <div className="flex items-center gap-2">
                    {lastWord.rarity === 'legendary' && <Star className="w-5 h-5 text-neo-black" />}
                    {lastWord.rarity === 'rare' && <Gem className="w-5 h-5 text-neo-black" />}
                    <span className="font-black text-neo-black">{lastWord.word}</span>
                    <span className="font-bold text-neo-black">+{lastWord.points}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Found words */}
            {wordsFound.length > 0 && (
              <div className={cn(
                'flex flex-wrap gap-1 justify-center p-2 rounded-neo border-2 border-neo-black max-h-24 overflow-y-auto',
                isDarkMode ? 'bg-slate-800' : 'bg-white'
              )}>
                {wordsFound.slice(-15).map((w, i) => (
                  <span
                    key={i}
                    className={cn(
                      'px-2 py-0.5 rounded text-xs font-bold text-neo-black',
                      RARITY_COLORS[w.rarity as keyof typeof RARITY_COLORS]
                    )}
                  >
                    {w.word}
                  </span>
                ))}
              </div>
            )}
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
              rareWordsFound >= levelConfig.targetRare ? 'text-neo-yellow' : 'text-gray-400'
            )} />
            <h2 className={cn(
              'text-2xl font-black',
              isDarkMode ? 'text-neo-white' : 'text-neo-black'
            )}>
              {rareWordsFound >= levelConfig.targetRare ? t('brain.drills.complete') : t('brain.drills.gameOver')}
            </h2>
            <div className={cn(
              'p-4 rounded-neo border-3 border-neo-black space-y-2',
              isDarkMode ? 'bg-slate-800' : 'bg-white'
            )}>
              <p className="text-3xl font-black text-neo-green">{score} pts</p>
              <div className="flex items-center justify-center gap-1">
                <Gem className="w-4 h-4 text-neo-purple" />
                <span className={isDarkMode ? 'text-neo-white' : 'text-neo-black'}>
                  {rareWordsFound} rare words
                </span>
              </div>
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
                  className="px-6 py-3 rounded-neo border-3 border-neo-black shadow-hard font-bold uppercase bg-neo-green text-neo-black"
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
