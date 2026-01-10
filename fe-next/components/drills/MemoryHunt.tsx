'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Heart, Eye, EyeOff, CheckCircle2, XCircle, Trophy, RotateCcw, X, RefreshCw, Clock, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import GridComponent, { HighlightedCell } from '@/components/GridComponent';
import { isWordOnBoard } from '@/utils/utils';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useDrillKeyboardSupport } from '@/hooks/useDrillKeyboardSupport';
import { KeyboardDesktopBadge, EnterKeyHint, KeyboardQuickTip } from '@/components/keyboard';
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
  const [excludedWords, setExcludedWords] = useState<Set<string>>(new Set());
  const [showStudyModal, setShowStudyModal] = useState(false);

  // Keyboard support for desktop users (only during recall phase)
  const keyboard = useDrillKeyboardSupport({
    grid,
    language,
    enabled: phase === 'recall',
    onWordSubmit: (word: string) => handleWordSubmit(word),
    minWordLength: 2,
  });

  // Select random words for this round (excluding marked invalid words)
  const selectTargetWords = useCallback((currentExcluded: Set<string> = excludedWords) => {
    const filtered = availableWords.filter(w => !currentExcluded.has(w.word.toUpperCase()));
    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, levelConfig.wordCount);

    return selected.map(w => ({
      word: w.word.toUpperCase(),
      path: w.path.map(p => ({ row: p.row, col: p.col })),
      found: false,
    }));
  }, [availableWords, levelConfig.wordCount, excludedWords]);

  // Replace a word marked as invalid during study phase
  const replaceInvalidWord = useCallback((wordToReplace: string) => {
    const upperWord = wordToReplace.toUpperCase();

    // Add to excluded set
    const newExcluded = new Set(excludedWords);
    newExcluded.add(upperWord);
    setExcludedWords(newExcluded);

    // Find a replacement word
    const currentWordSet = new Set(targetWords.map(tw => tw.word));
    const availableReplacements = availableWords.filter(w =>
      !newExcluded.has(w.word.toUpperCase()) &&
      !currentWordSet.has(w.word.toUpperCase())
    );

    if (availableReplacements.length > 0) {
      const replacement = availableReplacements[Math.floor(Math.random() * availableReplacements.length)];
      const newWord: MemoryWord = {
        word: replacement.word.toUpperCase(),
        path: replacement.path.map(p => ({ row: p.row, col: p.col })),
        found: false,
      };

      setTargetWords(prev => prev.map(tw =>
        tw.word === upperWord ? newWord : tw
      ));

      // Update highlights
      setCurrentHighlight(prev => {
        const oldWordPaths = targetWords.find(tw => tw.word === upperWord)?.path || [];
        const filtered = prev.filter(cell =>
          !oldWordPaths.some(p => p.row === cell.row && p.col === cell.col)
        );
        return [...filtered, ...newWord.path];
      });
    }
  }, [availableWords, targetWords, excludedWords]);

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
    setShowStudyModal(true);
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
          setShowStudyModal(false);
          setPhase('recall');
          setCurrentHighlight([]); // Hide highlights
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [selectTargetWords, levelConfig.studyTime]);

  // Skip study phase early (player is ready)
  const skipStudyPhase = useCallback(() => {
    if (studyIntervalRef.current) {
      clearInterval(studyIntervalRef.current);
      studyIntervalRef.current = null;
    }
    setShowStudyModal(false);
    setPhase('recall');
    setCurrentHighlight([]);
    setStudyCountdown(0);
  }, []);

  // Finish game early (saves progress)
  const finishGame = useCallback(() => {
    if (studyIntervalRef.current) {
      clearInterval(studyIntervalRef.current);
      studyIntervalRef.current = null;
    }
    setEndTime(Date.now());
    setPhase('complete');
  }, []);

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

      setTimeout(() => {
        setLastFeedback(null);

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
            {/* Grid with highlighted words (visible behind modal) */}
            <div className="relative">
              <GridComponent
                grid={grid}
                interactive={false}
                highlightedPath={currentHighlight}
                className="w-full opacity-50"
              />
            </div>

            {/* Study Modal Overlay */}
            <AnimatePresence>
              {showStudyModal && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
                >
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className={cn(
                      'w-full max-w-lg p-6 rounded-neo border-4 border-neo-black shadow-hard-lg',
                      isDarkMode ? 'bg-slate-800' : 'bg-white'
                    )}
                  >
                    {/* Header with countdown */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <Eye className={cn(
                          'w-8 h-8',
                          isDarkMode ? 'text-neo-cyan' : 'text-neo-purple'
                        )} />
                        <span className={cn(
                          'font-black text-xl uppercase',
                          isDarkMode ? 'text-neo-white' : 'text-neo-black'
                        )}>
                          {t('brain.drills.memory-hunt.studyPhase')}
                        </span>
                      </div>
                      <div className={cn(
                        'px-4 py-2 rounded-neo border-3 border-neo-black text-3xl font-black tabular-nums',
                        isDarkMode ? 'bg-neo-yellow text-neo-black' : 'bg-neo-orange text-neo-black'
                      )}>
                        {studyCountdown}
                      </div>
                    </div>

                    {/* Instructions */}
                    <p className={cn(
                      'text-center text-lg font-medium mb-4',
                      isDarkMode ? 'text-neo-white/80' : 'text-neo-black/80'
                    )}>
                      {t('brain.drills.memory-hunt.studyTheseWords') || 'Study these words:'}
                    </p>

                    {/* Words to memorize - LARGE display with mark invalid button */}
                    <div className="space-y-3 mb-6">
                      {targetWords.map((tw, i) => (
                        <motion.div
                          key={`${tw.word}-${i}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className={cn(
                            'flex items-center justify-between gap-3 px-4 py-3 rounded-neo border-3 border-neo-black',
                            isDarkMode ? 'bg-neo-purple' : 'bg-neo-yellow'
                          )}
                        >
                          <span className="text-2xl sm:text-3xl font-black text-neo-black tracking-wide">
                            {tw.word}
                          </span>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => replaceInvalidWord(tw.word)}
                            className={cn(
                              'flex items-center gap-1 px-2 py-1 rounded-neo border-2 border-neo-black',
                              'text-xs font-bold uppercase',
                              'bg-neo-red/20 hover:bg-neo-red/40 text-neo-black',
                              'transition-colors'
                            )}
                            title={t('brain.drills.memory-hunt.markInvalid') || 'Mark Invalid'}
                          >
                            <X className="w-4 h-4" />
                            <RefreshCw className="w-3 h-3" />
                          </motion.button>
                        </motion.div>
                      ))}
                    </div>

                    {/* Ready button to skip study phase */}
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={skipStudyPhase}
                      className={cn(
                        'w-full px-6 py-3 rounded-neo border-3 border-neo-black shadow-hard',
                        'font-bold text-lg uppercase',
                        'transition-all hover:translate-y-[-2px]',
                        'bg-neo-green text-neo-black'
                      )}
                    >
                      {t('brain.drills.memory-hunt.readyToStart') || "I'm Ready!"}
                    </motion.button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
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

            {/* Keyboard typed word display */}
            {keyboard.isTypingMode && keyboard.typedWord && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'text-center px-4 py-2 rounded-neo border-2 border-neo-black font-black text-lg uppercase mb-2',
                  keyboard.isValidOnGrid
                    ? 'bg-neo-cyan text-neo-black'
                    : 'bg-neo-red/50 text-neo-black'
                )}
              >
                {keyboard.typedWord}
              </motion.div>
            )}

            {/* Interactive grid */}
            <div className="relative">
              <GridComponent
                grid={grid}
                interactive={phase === 'recall'}
                onWordSubmit={handleWordSubmit}
                highlightedPath={keyboard.isTypingMode ? keyboard.highlightedCells : currentHighlight}
                language={language}
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
                      'px-3 py-1.5 rounded-neo border-2 border-neo-black text-base font-bold',
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

            {/* Keyboard UI - Desktop only */}
            {keyboard.isDesktop && (
              <>
                <KeyboardDesktopBadge t={t} position="bottom-right" />
                <EnterKeyHint
                  isVisible={keyboard.showEnterHint}
                  t={t}
                  position="bottom-center"
                />
                <KeyboardQuickTip
                  isVisible={keyboard.showQuickTip}
                  onDismiss={keyboard.dismissQuickTip}
                  t={t}
                />
              </>
            )}

            {/* Finish Game Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={finishGame}
              className={cn(
                'w-full mt-4 px-4 py-2 rounded-neo border-2 border-neo-black',
                'font-bold text-sm uppercase',
                'transition-all hover:translate-y-[-1px]',
                isDarkMode ? 'bg-slate-700 text-neo-white' : 'bg-gray-200 text-neo-black'
              )}
            >
              {t('brain.drills.finishGame') || 'Finish Game'}
            </motion.button>
          </div>
        )}

        {/* Complete Phase */}
        {phase === 'complete' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 12, delay: 0.2 }}
            >
              <Trophy className={cn(
                'w-20 h-20 mx-auto',
                results.wordsFound > 0 ? 'text-neo-yellow' : 'text-gray-400'
              )} />
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={cn(
                'text-2xl font-black',
                isDarkMode ? 'text-neo-white' : 'text-neo-black'
              )}
            >
              {lives > 0 ? t('brain.drills.complete') : t('brain.drills.gameOver')}
            </motion.h2>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className={cn(
                'p-4 rounded-neo border-3 border-neo-black space-y-3',
                isDarkMode ? 'bg-slate-800' : 'bg-white'
              )}
            >
              {/* Animated Score */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.7, type: 'spring' }}
                className="text-3xl font-black text-neo-purple"
              >
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  {results.score}
                </motion.span> {t('brain.drills.points')}
              </motion.div>
              
              {/* Animated Stats Grid */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.9 }}
                  className={cn(
                    'p-3 rounded-neo border-2 border-neo-black',
                    isDarkMode ? 'bg-slate-700' : 'bg-neo-cream'
                  )}
                >
                  <Target className="w-6 h-6 mx-auto text-neo-green mb-1" />
                  <p className={cn('text-2xl font-black', isDarkMode ? 'text-neo-white' : 'text-neo-black')}>
                    {results.wordsFound}/{results.totalWords}
                  </p>
                  <p className={cn('text-xs', isDarkMode ? 'text-neo-white/70' : 'text-neo-black/70')}>
                    {t('brain.drills.wordsFound')}
                  </p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1 }}
                  className={cn(
                    'p-3 rounded-neo border-2 border-neo-black',
                    isDarkMode ? 'bg-slate-700' : 'bg-neo-cream'
                  )}
                >
                  <Clock className="w-6 h-6 mx-auto text-neo-cyan mb-1" />
                  <p className={cn('text-2xl font-black', isDarkMode ? 'text-neo-cyan' : 'text-neo-purple')}>
                    {results.timeSpent}s
                  </p>
                  <p className={cn('text-xs', isDarkMode ? 'text-neo-white/70' : 'text-neo-black/70')}>
                    {t('brain.drills.timeSpent')}
                  </p>
                </motion.div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
              className="flex gap-3 justify-center"
            >
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
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
