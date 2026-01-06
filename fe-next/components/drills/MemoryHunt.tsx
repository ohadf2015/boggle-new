'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Heart, Eye, EyeOff, CheckCircle2, XCircle, Trophy, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import GridComponent, { HighlightedCell } from '@/components/GridComponent';
import { isWordOnBoard } from '@/utils/utils';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import type { LetterGrid, Language } from '@/types';

// Level configurations
const LEVEL_CONFIGS = [
  { level: 1, wordCount: 2, studyTime: 5000, lives: 3, targetScore: 50 },
  { level: 2, wordCount: 3, studyTime: 4500, lives: 3, targetScore: 100 },
  { level: 3, wordCount: 4, studyTime: 4000, lives: 2, targetScore: 200 },
  { level: 4, wordCount: 5, studyTime: 3500, lives: 2, targetScore: 350 },
  { level: 5, wordCount: 7, studyTime: 3000, lives: 1, targetScore: 500 },
];

interface MemoryWord {
  word: string;
  path: HighlightedCell[];
  found: boolean;
}

interface MemoryHuntProps {
  grid: LetterGrid;
  availableWords: { word: string; path: { row: number; col: number }[] }[];
  level?: number;
  language?: Language;
  onComplete: (result: {
    score: number;
    wordsFound: number;
    totalWords: number;
    timeSpent: number;
    level: number;
  }) => void;
  onExit?: () => void;
}

type GamePhase = 'ready' | 'study' | 'recall' | 'feedback' | 'complete';

/**
 * Memory Hunt Drill
 *
 * Working Memory training drill where players:
 * 1. Study highlighted words on the grid
 * 2. Words disappear and players must find them from memory
 * 3. Wrong guesses lose lives
 */
export default function MemoryHunt({
  grid,
  availableWords,
  level = 1,
  language = 'en',
  onComplete,
  onExit,
}: MemoryHuntProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { playErrorSound } = useSoundEffects();
  const isDarkMode = theme === 'dark';

  // Get level config
  const levelConfig = LEVEL_CONFIGS[Math.min(level - 1, LEVEL_CONFIGS.length - 1)];

  // Game state
  const [phase, setPhase] = useState<GamePhase>('ready');
  const [targetWords, setTargetWords] = useState<MemoryWord[]>([]);
  const [lives, setLives] = useState(levelConfig.lives);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [studyCountdown, setStudyCountdown] = useState(0);
  const [lastFeedback, setLastFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [currentHighlight, setCurrentHighlight] = useState<HighlightedCell[]>([]);

  // Select random words for this round
  const selectTargetWords = useCallback(() => {
    const shuffled = [...availableWords].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, levelConfig.wordCount);

    return selected.map(w => ({
      word: w.word.toUpperCase(),
      path: w.path.map(p => ({ row: p.row, col: p.col })),
      found: false,
    }));
  }, [availableWords, levelConfig.wordCount]);

  // Ref to track study countdown interval for cleanup
  const studyIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize round
  const startRound = useCallback(() => {
    // Clear any existing interval first
    if (studyIntervalRef.current) {
      clearInterval(studyIntervalRef.current);
      studyIntervalRef.current = null;
    }

    const words = selectTargetWords();
    setTargetWords(words);
    setPhase('study');
    setStudyCountdown(levelConfig.studyTime / 1000);

    // Show all target words highlighted during study phase
    const allPaths = words.flatMap(w => w.path);
    setCurrentHighlight(allPaths);

    // Start study timer
    studyIntervalRef.current = setInterval(() => {
      setStudyCountdown(prev => {
        if (prev <= 1) {
          if (studyIntervalRef.current) {
            clearInterval(studyIntervalRef.current);
            studyIntervalRef.current = null;
          }
          setPhase('recall');
          setCurrentHighlight([]); // Hide highlights
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [selectTargetWords, levelConfig.studyTime]);

  // Cleanup study interval on unmount
  useEffect(() => {
    return () => {
      if (studyIntervalRef.current) {
        clearInterval(studyIntervalRef.current);
      }
    };
  }, []);

  // Start game
  const startGame = useCallback(() => {
    setLives(levelConfig.lives);
    setScore(0);
    setRound(1);
    setStartTime(Date.now());
    startRound();
  }, [levelConfig.lives, startRound]);

  // Handle word submission
  const handleWordSubmit = useCallback((word: string) => {
    if (phase !== 'recall') return;

    const upperWord = word.toUpperCase();

    // Check if word can be formed on the board
    if (!isWordOnBoard(upperWord, grid, language)) {
      setLastFeedback('wrong');
      setPhase('feedback');
      playErrorSound?.();
      setTimeout(() => {
        setLastFeedback(null);
        setPhase('recall');
      }, 800);
      return;
    }

    const targetIndex = targetWords.findIndex(
      tw => tw.word === upperWord && !tw.found
    );

    if (targetIndex >= 0) {
      // Correct word found!
      const updatedTargets = [...targetWords];
      updatedTargets[targetIndex].found = true;
      setTargetWords(updatedTargets);

      // Award points (longer words = more points)
      const wordPoints = word.length * 10 * round;
      setScore(prev => prev + wordPoints);

      setLastFeedback('correct');
      setPhase('feedback');

      // Show the found word's path briefly
      setCurrentHighlight(updatedTargets[targetIndex].path);

      setTimeout(() => {
        setLastFeedback(null);
        setCurrentHighlight([]);

        // Check if all words found
        const allFound = updatedTargets.every(tw => tw.found);
        if (allFound) {
          // Bonus for completing round
          setScore(prev => prev + 50 * round);

          // Start next round or complete
          if (round < 5) {
            setRound(prev => prev + 1);
            startRound();
          } else {
            setEndTime(Date.now());
            setPhase('complete');
          }
        } else {
          setPhase('recall');
        }
      }, 800);
    } else {
      // Wrong guess - use functional update to avoid stale closure
      setLives(prev => {
        const newLives = prev - 1;
        // Schedule feedback timeout after state update
        setTimeout(() => {
          setLastFeedback(null);
          if (newLives <= 0) {
            // Game over
            setEndTime(Date.now());
            setPhase('complete');
          } else {
            setPhase('recall');
          }
        }, 800);
        return newLives;
      });
      setLastFeedback('wrong');
      setPhase('feedback');
      playErrorSound?.();
    }
  }, [phase, targetWords, round, startRound, grid, language, playErrorSound]);

  // Calculate final results
  const results = useMemo(() => {
    const wordsFound = targetWords.filter(tw => tw.found).length;
    const totalWords = targetWords.length;
    // Use captured endTime to avoid calling impure Date.now() during render
    const timeSpent = startTime && endTime ? Math.floor((endTime - startTime) / 1000) : 0;

    return {
      score,
      wordsFound,
      totalWords,
      timeSpent,
      level,
    };
  }, [targetWords, score, startTime, endTime, level]);

  // Handle completion
  useEffect(() => {
    if (phase === 'complete') {
      onComplete(results);
    }
  }, [phase, results, onComplete]);

  // Remaining unfound words for UI
  const remainingWords = targetWords.filter(tw => !tw.found);

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
          {/* Lives */}
          <div className="flex items-center gap-1">
            {Array.from({ length: levelConfig.lives }).map((_, i) => (
              <Heart
                key={i}
                className={cn(
                  'w-5 h-5',
                  i < lives ? 'text-neo-red fill-neo-red' : 'text-gray-300'
                )}
              />
            ))}
          </div>

          {/* Round */}
          <div className={cn(
            'px-2 py-1 rounded border-2 border-neo-black text-xs font-bold',
            isDarkMode ? 'bg-slate-700 text-neo-white' : 'bg-neo-cream text-neo-black'
          )}>
            {t('brain.drills.round')} {round}/5
          </div>
        </div>

        {/* Score */}
        <div className={cn(
          'px-3 py-1 rounded-neo border-2 border-neo-black font-bold',
          isDarkMode ? 'bg-neo-purple text-neo-white' : 'bg-neo-yellow text-neo-black'
        )}>
          {score} {t('brain.drills.points')}
        </div>
      </div>

      {/* Game Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
        {/* Ready Phase */}
        {phase === 'ready' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6"
          >
            <Brain className={cn(
              'w-20 h-20 mx-auto',
              isDarkMode ? 'text-neo-purple' : 'text-neo-purple'
            )} />
            <h2 className={cn(
              'text-2xl font-black',
              isDarkMode ? 'text-neo-white' : 'text-neo-black'
            )}>
              {t('brain.drills.memory-hunt.name')}
            </h2>
            <p className={cn(
              'text-sm max-w-xs',
              isDarkMode ? 'text-neo-white/70' : 'text-neo-black/70'
            )}>
              {t('brain.drills.memory-hunt.description')}
            </p>
            <div className={cn(
              'text-xs space-y-1 p-3 rounded-neo border-2 border-neo-black',
              isDarkMode ? 'bg-slate-800' : 'bg-white'
            )}>
              <p>{t('brain.drills.level')}: {level}</p>
              <p>{t('brain.drills.memory-hunt.wordsToRemember')}: {levelConfig.wordCount}</p>
              <p>{t('brain.drills.memory-hunt.studyTime')}: {levelConfig.studyTime / 1000}s</p>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={startGame}
              className={cn(
                'px-8 py-3 rounded-neo border-3 border-neo-black shadow-hard',
                'font-bold text-lg uppercase',
                'transition-all hover:translate-y-[-2px] hover:shadow-hard-lg',
                'bg-neo-green text-neo-black'
              )}
            >
              {t('brain.drills.start')}
            </motion.button>
          </motion.div>
        )}

        {/* Study Phase */}
        {phase === 'study' && (
          <div className="w-full max-w-md space-y-4">
            {/* Study indicator */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-2"
            >
              <div className="flex items-center justify-center gap-2">
                <Eye className={cn(
                  'w-6 h-6',
                  isDarkMode ? 'text-neo-cyan' : 'text-neo-purple'
                )} />
                <span className={cn(
                  'font-bold text-lg uppercase',
                  isDarkMode ? 'text-neo-white' : 'text-neo-black'
                )}>
                  {t('brain.drills.memory-hunt.studyPhase')}
                </span>
              </div>
              <div className={cn(
                'text-4xl font-black',
                isDarkMode ? 'text-neo-yellow' : 'text-neo-orange'
              )}>
                {studyCountdown}
              </div>
            </motion.div>

            {/* Grid with highlighted words */}
            <div className="relative">
              <GridComponent
                grid={grid}
                interactive={false}
                highlightedPath={currentHighlight}
                className="w-full"
              />
            </div>

            {/* Word list hint */}
            <div className={cn(
              'p-3 rounded-neo border-2 border-neo-black text-center',
              isDarkMode ? 'bg-slate-800' : 'bg-white'
            )}>
              <p className={cn(
                'text-xs font-medium',
                isDarkMode ? 'text-neo-white/70' : 'text-neo-black/70'
              )}>
                {t('brain.drills.memory-hunt.memorizeHint')}
              </p>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {targetWords.map((tw, i) => (
                  <span
                    key={i}
                    className={cn(
                      'px-2 py-1 rounded border-2 border-neo-black text-sm font-bold',
                      isDarkMode ? 'bg-neo-purple text-neo-white' : 'bg-neo-yellow text-neo-black'
                    )}
                  >
                    {tw.word}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Recall Phase */}
        {(phase === 'recall' || phase === 'feedback') && (
          <div className="w-full max-w-md space-y-4">
            {/* Recall indicator */}
            <div className="flex items-center justify-center gap-2">
              <EyeOff className={cn(
                'w-5 h-5',
                isDarkMode ? 'text-neo-orange' : 'text-neo-purple'
              )} />
              <span className={cn(
                'font-bold uppercase',
                isDarkMode ? 'text-neo-white' : 'text-neo-black'
              )}>
                {t('brain.drills.memory-hunt.recallPhase')}
              </span>
            </div>

            {/* Interactive grid */}
            <div className="relative">
              <GridComponent
                grid={grid}
                interactive={phase === 'recall'}
                onWordSubmit={handleWordSubmit}
                highlightedPath={currentHighlight}
                className="w-full"
              />

              {/* Feedback overlay */}
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

            {/* Remaining words hint */}
            <div className={cn(
              'p-3 rounded-neo border-2 border-neo-black text-center',
              isDarkMode ? 'bg-slate-800' : 'bg-white'
            )}>
              <p className={cn(
                'text-xs font-medium mb-2',
                isDarkMode ? 'text-neo-white/70' : 'text-neo-black/70'
              )}>
                {t('brain.drills.memory-hunt.remaining')}: {remainingWords.length}
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {targetWords.map((tw, i) => (
                  <span
                    key={i}
                    className={cn(
                      'px-2 py-1 rounded border-2 border-neo-black text-sm font-bold',
                      tw.found
                        ? 'bg-neo-green/30 text-neo-green line-through'
                        : isDarkMode ? 'bg-slate-700 text-neo-white/50' : 'bg-gray-200 text-neo-black/50'
                    )}
                  >
                    {tw.found ? tw.word : '???'}
                  </span>
                ))}
              </div>
            </div>
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
              results.wordsFound > 0 ? 'text-neo-yellow' : 'text-gray-400'
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
              <p className={cn(
                'text-3xl font-black',
                isDarkMode ? 'text-neo-purple' : 'text-neo-purple'
              )}>
                {results.score} {t('brain.drills.points')}
              </p>
              <p className={cn(
                'text-sm',
                isDarkMode ? 'text-neo-white/70' : 'text-neo-black/70'
              )}>
                {results.wordsFound}/{results.totalWords} {t('brain.drills.wordsFound')}
              </p>
              <p className={cn(
                'text-sm',
                isDarkMode ? 'text-neo-white/70' : 'text-neo-black/70'
              )}>
                {t('brain.drills.timeSpent')}: {results.timeSpent}s
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setPhase('ready');
                  setTargetWords([]);
                  setEndTime(null);
                }}
                className={cn(
                  'flex items-center gap-2 px-6 py-3 rounded-neo border-3 border-neo-black shadow-hard',
                  'font-bold uppercase',
                  'transition-all hover:translate-y-[-2px]',
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
                  className={cn(
                    'px-6 py-3 rounded-neo border-3 border-neo-black shadow-hard',
                    'font-bold uppercase',
                    'transition-all hover:translate-y-[-2px]',
                    'bg-neo-purple text-neo-white'
                  )}
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
