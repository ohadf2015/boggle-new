'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { Zap, Clock, Trophy, RotateCcw, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import GridComponent from '@/components/GridComponent';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useDrillWordSubmit } from './hooks/useDrillWordSubmit';
import { useDrillKeyboardSupport } from '@/hooks/useDrillKeyboardSupport';
import { KeyboardDesktopBadge, EnterKeyHint, KeyboardQuickTip } from '@/components/keyboard';
import type { LetterGrid, Language } from '@/types';
import { calculateWordScore } from '@/shared/utils/scoring';

// Level configurations
const LEVEL_CONFIGS = [
  { level: 1, timeLimit: 60, targetWords: 8, targetScore: 50 },
  { level: 2, timeLimit: 45, targetWords: 10, targetScore: 100 },
  { level: 3, timeLimit: 30, targetWords: 12, targetScore: 200 },
  { level: 4, timeLimit: 25, targetWords: 15, targetScore: 350 },
  { level: 5, timeLimit: 20, targetWords: 20, targetScore: 500 },
];

interface LightningRoundProps {
  grid: LetterGrid;
  availableWords: { word: string; path: { row: number; col: number }[] }[];
  level?: number;
  language?: Language;
  onComplete: (result: {
    score: number;
    wordsFound: number;
    timeSpent: number;
    level: number;
    wordsPerMinute: number;
  }) => void;
  onExit?: () => void;
  onPlayAgain?: () => void;
}

type GamePhase = 'ready' | 'playing' | 'complete';

/**
 * Lightning Round Drill
 *
 * Processing Speed training - find as many words as fast as possible.
 * Time pressure increases with higher levels.
 */
export default function LightningRound({
  grid,
  availableWords,
  level = 1,
  language = 'en',
  onComplete,
  onExit,
  onPlayAgain,
}: LightningRoundProps) {
  const { t, dir } = useLanguage();
  const { playErrorSound, playDrillStartSound, playDrillCompleteSound } = useSoundEffects();

  const levelConfig = LEVEL_CONFIGS[Math.min(level - 1, LEVEL_CONFIGS.length - 1)];

  const [phase, setPhase] = useState<GamePhase>('ready');
  const [timeRemaining, setTimeRemaining] = useState(levelConfig.timeLimit);
  const [wordsFound, setWordsFound] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [lastWordScore, setLastWordScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { validateWord } = useDrillWordSubmit({
    grid,
    language,
    availableWords,
    wordsFound,
    phase,
    playingPhase: 'playing',
    playErrorSound,
    t,
  });

  // Keyboard support for desktop users
  const keyboard = useDrillKeyboardSupport({
    grid,
    language,
    enabled: phase === 'playing',
    onWordSubmit: (word: string) => handleWordSubmit(word),
    minWordLength: 2,
  });

  // Start game
  const startGame = useCallback(() => {
    playDrillStartSound();
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
  }, [levelConfig.timeLimit, playDrillStartSound]);

  // Finish game early (saves progress)
  const finishGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase('complete');
  }, []);

  // Handle word submission
  const handleWordSubmit = useCallback((word: string) => {
    const { valid, upperWord, error } = validateWord(word);
    if (!valid) {
      if (error && error !== 'notPlaying') {
        setFeedback({ message: error, type: 'error' });
        setTimeout(() => setFeedback(null), 2000);
      }
      return;
    }

    // Valid word!
    setWordsFound(prev => [...prev, upperWord]);
    const wordScore = calculateWordScore(word);
    setScore(prev => prev + wordScore);
    setLastWordScore(wordScore);

    setFeedback({ message: `+${wordScore} ${t('brain.drills.points')}`, type: 'success' });
    setTimeout(() => {
      setLastWordScore(null);
      setFeedback(null);
    }, 1000);
  }, [validateWord, t]);

  // Calculate results
  const getResults = useCallback(() => {
    const timeSpent = startTimeRef.current
      ? Math.floor((Date.now() - startTimeRef.current) / 1000)
      : levelConfig.timeLimit;
    const wordsPerMinute = timeSpent > 0
      ? Math.round((wordsFound.length / timeSpent) * 60 * 100) / 100
      : 0;

    return {
      score,
      wordsFound: wordsFound.length,
      timeSpent,
      level,
      wordsPerMinute,
    };
  }, [score, wordsFound.length, level, levelConfig.timeLimit]);

  // Handle completion
  useEffect(() => {
    if (phase === 'complete') {
      playDrillCompleteSound();
      onComplete(getResults());
    }
  }, [phase, getResults, onComplete, playDrillCompleteSound]);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Time warning colors
  const getTimeColor = () => {
    if (timeRemaining <= 5) return 'text-neo-red';
    if (timeRemaining <= 10) return 'text-neo-orange';
    return 'text-neo-lime';
  };

  return (
    <div dir={dir} className={cn(
      'flex flex-col h-full',
      'bg-neo-navy'
    )}>
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between px-4 py-3',
        'border-b-4 border-neo-black',
        'bg-slate-800'
      )}>
        <div className="flex items-center gap-3">
          {/* Timer */}
          <div className={cn(
            'flex items-center gap-1 px-3 py-1 rounded-neo border-2 border-neo-black',
            'bg-slate-700'
          )}>
            <Clock className={cn('w-4 h-4', getTimeColor())} />
            <span role="status" className={cn('font-black text-lg tabular-nums', getTimeColor())}>
              {timeRemaining}s
            </span>
          </div>

          {/* Words found */}
          <div className={cn(
            'px-2 py-1 rounded border-2 border-neo-black text-xs font-bold',
            'bg-slate-700 text-neo-white'
          )}>
            {wordsFound.length} {t('brain.drills.wordsFound')}
          </div>
        </div>

        {/* Score */}
        <div className="relative">
          <div aria-live="polite" className={cn(
            'px-3 py-1 rounded-neo border-2 border-neo-black font-bold',
            'bg-neo-lime text-neo-black'
          )}>
            {score} {t('brain.drills.points')}
          </div>

          {/* Score popup */}
          <AdaptiveAnimatePresence>
            {lastWordScore && (
              <AdaptiveMotion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: -20 }}
                exit={{ opacity: 0 }}
                className="absolute -top-2 right-0 text-neo-green font-bold text-sm"
              >
                +{lastWordScore}
              </AdaptiveMotion.div>
            )}
          </AdaptiveAnimatePresence>
        </div>
      </div>

      {/* Game Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {/* Ready Phase */}
        {phase === 'ready' && (
          <AdaptiveMotion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6"
          >
            <Zap className={cn(
              'w-14 h-14 sm:w-20 sm:h-20 mx-auto',
              'text-neo-lime'
            )} />
            <h2 className={cn(
              'text-2xl font-black',
              'text-neo-white'
            )}>
              {t('brain.drills.lightning-round.name')}
            </h2>
            <p className={cn(
              'text-sm max-w-xs',
              'text-neo-white/70'
            )}>
              {t('brain.drills.lightning-round.description')}
            </p>
            <div className={cn(
              'text-xs space-y-1 p-3 rounded-neo border-2 border-neo-black',
              'bg-slate-800'
            )}>
              <p>{t('brain.drills.level')}: {level}</p>
              <p>{t('brain.drills.timeLimit')}: {levelConfig.timeLimit}s</p>
            </div>
            <AdaptiveMotion.button
              whileTap={{ scale: 0.95 }}
              onClick={startGame}
              className={cn(
                'px-8 py-3 rounded-neo border-3 border-neo-black shadow-hard',
                'font-bold text-lg uppercase',
                'transition-all hover:translate-y-[-2px] hover:shadow-hard-lg',
                'bg-neo-lime text-neo-black'
              )}
            >
              {t('brain.drills.start')}
            </AdaptiveMotion.button>
          </AdaptiveMotion.div>
        )}

        {/* Playing Phase */}
        {phase === 'playing' && (
          <div className="w-full max-w-md lg:max-w-lg space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Zap className="w-5 h-5 text-neo-lime animate-pulse" />
              <span className={cn(
                'font-bold uppercase',
                'text-neo-white'
              )}>
                {t('brain.drills.lightning-round.name')}
              </span>
            </div>

            <GridComponent
              grid={grid}
              interactive={true}
              onWordSubmit={handleWordSubmit}
              highlightedPath={keyboard.isTypingMode ? keyboard.highlightedCells : []}
              language={language}
              className="w-full"
            />

            {/* Keyboard typed word display */}
            {keyboard.isTypingMode && keyboard.typedWord && (
              <AdaptiveMotion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'text-center px-4 py-2 rounded-neo border-2 border-neo-black font-black text-lg uppercase',
                  keyboard.isValidOnGrid
                    ? 'bg-neo-cyan text-neo-black'
                    : 'bg-neo-red/50 text-neo-black'
                )}
              >
                {keyboard.typedWord}
              </AdaptiveMotion.div>
            )}

            {/* Feedback message */}
            <AdaptiveAnimatePresence>
              {feedback && (
                <AdaptiveMotion.div
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
                </AdaptiveMotion.div>
              )}
            </AdaptiveAnimatePresence>

            {/* Recent words */}
            {wordsFound.length > 0 && (
              <div className={cn(
                'flex flex-wrap gap-2 justify-center p-3 rounded-neo border-2 border-neo-black max-h-28 overflow-y-auto',
                'bg-slate-800'
              )}>
                {wordsFound.slice(-10).map((word, i) => (
                  <span
                    key={i}
                    className={cn(
                      'px-3 py-1 rounded-neo text-sm font-bold',
                      'bg-neo-green/20 text-neo-green border border-neo-green/30'
                    )}
                  >
                    {word}
                  </span>
                ))}
              </div>
            )}

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
            <AdaptiveMotion.button
              whileTap={{ scale: 0.95 }}
              onClick={finishGame}
              aria-label={t('brain.drills.finishGame')}
              className={cn(
                'w-full mt-4 px-4 py-2 rounded-neo border-2 border-neo-black',
                'font-bold text-sm uppercase',
                'transition-all hover:translate-y-[-1px]',
                'bg-slate-700 text-neo-white'
              )}
            >
              {t('brain.drills.finishGame')}
            </AdaptiveMotion.button>
          </div>
        )}

        {/* Complete Phase */}
        {phase === 'complete' && (
          <AdaptiveMotion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6"
          >
            <AdaptiveMotion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 12, delay: 0.2 }}
            >
              <Trophy className="w-14 h-14 sm:w-20 sm:h-20 mx-auto text-neo-lime" />
            </AdaptiveMotion.div>
            <AdaptiveMotion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={cn(
                'text-2xl font-black',
                'text-neo-white'
              )}
            >
              {t('brain.drills.complete')}
            </AdaptiveMotion.h2>
            <AdaptiveMotion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className={cn(
                'p-4 rounded-neo border-3 border-neo-black space-y-3',
                'bg-slate-800'
              )}
            >
              {/* Animated Score */}
              <AdaptiveMotion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.7, type: 'spring' }}
                className="text-3xl font-black text-neo-lime"
              >
                <AdaptiveMotion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  {score}
                </AdaptiveMotion.span> {t('brain.drills.points')}
              </AdaptiveMotion.div>
              
              {/* Animated Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                <AdaptiveMotion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.9 }}
                  className={cn(
                    'p-3 rounded-neo border-2 border-neo-black',
                    'bg-slate-700'
                  )}
                >
                  <Target className="w-6 h-6 mx-auto text-neo-green mb-1" />
                  <p className={cn('text-2xl font-black', 'text-neo-white')}>
                    {wordsFound.length}
                  </p>
                  <p className={cn('text-xs', 'text-neo-white/70')}>
                    {t('brain.drills.wordsFound')}
                  </p>
                </AdaptiveMotion.div>
                <AdaptiveMotion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1 }}
                  className={cn(
                    'p-3 rounded-neo border-2 border-neo-black',
                    'bg-slate-700'
                  )}
                >
                  <Zap className="w-6 h-6 mx-auto text-neo-lime mb-1" />
                  <p className={cn('text-2xl font-black', 'text-neo-cyan')}>
                    {getResults().wordsPerMinute}
                  </p>
                  <p className={cn('text-xs', 'text-neo-white/70')}>
                    {t('brain.drills.wpm')}
                  </p>
                </AdaptiveMotion.div>
              </div>
            </AdaptiveMotion.div>
            <AdaptiveMotion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
              className="flex gap-3 justify-center"
            >
              <AdaptiveMotion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setPhase('ready');
                  setWordsFound([]);
                  setScore(0);
                  onPlayAgain?.();
                }}
                className={cn(
                  'flex items-center gap-2 px-6 py-3 rounded-neo border-3 border-neo-black shadow-hard',
                  'font-bold uppercase',
                  'bg-slate-700 text-neo-white'
                )}
              >
                <RotateCcw className="w-5 h-5" />
                {t('brain.drills.playAgain')}
              </AdaptiveMotion.button>
              {onExit && (
                <AdaptiveMotion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={onExit}
                  className="px-6 py-3 rounded-neo border-3 border-neo-black shadow-hard font-bold uppercase bg-neo-lime text-neo-black"
                >
                  {t('brain.drills.exit')}
                </AdaptiveMotion.button>
              )}
            </AdaptiveMotion.div>
          </AdaptiveMotion.div>
        )}
      </div>
    </div>
  );
}
