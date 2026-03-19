'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { Target, Flame, Trophy, RotateCcw, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import GridComponent from '@/components/GridComponent';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useDrillWordSubmit } from './hooks/useDrillWordSubmit';
import { useDrillKeyboardSupport } from '@/hooks/useDrillKeyboardSupport';
import { KeyboardDesktopBadge, EnterKeyHint, KeyboardQuickTip } from '@/components/keyboard';
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
  onPlayAgain?: () => void;
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
  onPlayAgain,
}: ComboMasterProps) {
  const { t, dir } = useLanguage();
  const { playErrorSound } = useSoundEffects();

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
  // Refs to avoid stale closures in callbacks
  const comboRef = useRef(combo);
  comboRef.current = combo;
  const comboBreaksRef = useRef(comboBreaks);
  comboBreaksRef.current = comboBreaks;

  const { validateWord, availableWordSet } = useDrillWordSubmit({
    grid,
    language,
    availableWords,
    wordsFound,
    phase,
    playingPhase: 'playing',
    playErrorSound,
    t,
  });
  const MAX_COMBO_BREAKS = 3;

  // Keyboard support for desktop users
  const keyboard = useDrillKeyboardSupport({
    grid,
    language,
    enabled: phase === 'playing',
    onWordSubmit: (word: string) => handleWordSubmit(word),
    minWordLength: 2,
  });

  // Start combo timer
  const startComboTimer = useCallback(() => {
    if (comboTimerRef.current) clearInterval(comboTimerRef.current);
    setComboTimer(levelConfig.comboTimeout);

    comboTimerRef.current = setInterval(() => {
      setComboTimer(prev => {
        if (prev <= 1) {
          return 0; // Signal combo break
        }
        return prev - 1;
      });
    }, 1000);
  }, [levelConfig.comboTimeout]);

  // Handle combo break when timer reaches 0
  useEffect(() => {
    if (comboTimer === 0 && phase === 'playing') {
      setCombo(0);
      comboRef.current = 0;
      comboBreaksRef.current += 1;
      const newBreaks = comboBreaksRef.current;
      setComboBreaks(newBreaks);
      if (newBreaks >= MAX_COMBO_BREAKS) {
        if (comboTimerRef.current) clearInterval(comboTimerRef.current);
        setPhase('complete');
      } else {
        setComboTimer(levelConfig.comboTimeout);
      }
    }
  }, [comboTimer, phase, levelConfig.comboTimeout]);

  // Start game
  const startGame = useCallback(() => {
    setPhase('playing');
    setCombo(0);
    setMaxCombo(0);
    setWordsFound([]);
    setScore(0);
    setComboBreaks(0);
    comboBreaksRef.current = 0;

    startTimeRef.current = Date.now();
    startComboTimer();
  }, [startComboTimer]);

  // Finish game early (saves progress)
  const finishGame = useCallback(() => {
    if (comboTimerRef.current) clearInterval(comboTimerRef.current);
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

    // Valid word! Use comboRef to avoid stale closure
    setWordsFound(prev => [...prev, upperWord]);
    const newCombo = comboRef.current + 1;
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
  }, [validateWord, startComboTimer, levelConfig.targetCombo, t]);

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
          {/* Combo display */}
          <div className={cn(
            'flex items-center gap-1 px-3 py-1 rounded-neo border-2 border-neo-black',
            combo >= 5 ? 'bg-neo-orange' : 'bg-slate-700'
          )}>
            <Flame className={cn(
              'w-4 h-4',
              combo >= 5 ? 'text-neo-black' : 'text-neo-orange'
            )} />
            <span className={cn(
              'font-black text-lg',
              combo >= 5 ? 'text-neo-black' : 'text-neo-orange'
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

        <div aria-live="polite" className={cn(
          'px-3 py-1 rounded-neo border-2 border-neo-black font-bold',
          'bg-neo-orange text-neo-black'
        )}>
          {score} {t('brain.drills.points')}
        </div>
      </div>

      {/* Combo Timer Bar */}
      {phase === 'playing' && (
        <div className={cn(
          'h-2 border-b-2 border-neo-black',
          'bg-slate-700'
        )}>
          <AdaptiveMotion.div
            className={cn(
              'h-full',
              comboBarPercent > 50 ? 'bg-neo-green' :
                comboBarPercent > 25 ? 'bg-neo-lime' : 'bg-neo-red'
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
          <AdaptiveMotion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6"
          >
            <Target className="w-20 h-20 mx-auto text-neo-orange" />
            <h2 className={cn(
              'text-2xl font-black',
              'text-neo-white'
            )}>
              {t('brain.drills.combo-master.name')}
            </h2>
            <p className={cn(
              'text-sm max-w-xs',
              'text-neo-white/70'
            )}>
              {t('brain.drills.combo-master.description')}
            </p>
            <div className={cn(
              'text-xs space-y-1 p-3 rounded-neo border-2 border-neo-black',
              'bg-slate-800'
            )}>
              <p>{t('brain.drills.level')}: {level}</p>
              <p>{t('brain.drills.combo-master.targetCombo', { combo: levelConfig.targetCombo })}</p>
              <p>{t('brain.drills.combo-master.timerPerWord', { time: levelConfig.comboTimeout })}</p>
            </div>
            <AdaptiveMotion.button
              whileTap={{ scale: 0.95 }}
              onClick={startGame}
              className={cn(
                'px-8 py-3 rounded-neo border-3 border-neo-black shadow-hard',
                'font-bold text-lg uppercase',
                'bg-neo-orange text-neo-black'
              )}
            >
              {t('brain.drills.start')}
            </AdaptiveMotion.button>
          </AdaptiveMotion.div>
        )}

        {/* Playing Phase */}
        {phase === 'playing' && (
          <div className="w-full max-w-md space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Target className="w-5 h-5 text-neo-orange" />
              <span className={cn(
                'font-bold',
                'text-neo-white'
              )}>
                {t('brain.drills.target')}: x{levelConfig.targetCombo}
              </span>
              <Timer className="w-4 h-4 text-neo-cyan ms-2" />
              <span role="status" className={cn(
                'font-bold tabular-nums',
                comboTimer <= 3 ? 'text-neo-red' : 'text-neo-cyan'
              )}>
                {comboTimer}s
              </span>
            </div>

            <GridComponent
              grid={grid}
              interactive={true}
              onWordSubmit={handleWordSubmit}
              highlightedPath={keyboard.isTypingMode ? keyboard.highlightedCells : []}
              comboLevel={combo}
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
              <Trophy className={cn(
                'w-20 h-20 mx-auto',
                maxCombo >= levelConfig.targetCombo ? 'text-neo-lime' : 'text-gray-400'
              )} />
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
              {maxCombo >= levelConfig.targetCombo ? t('brain.drills.complete') : t('brain.drills.gameOver')}
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
                className="text-3xl font-black text-neo-orange"
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
              <div className="grid grid-cols-2 gap-3 mt-4">
                <AdaptiveMotion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.9 }}
                  className={cn(
                    'p-3 rounded-neo border-2 border-neo-black',
                    'bg-slate-700'
                  )}
                >
                  <Flame className="w-6 h-6 mx-auto text-neo-orange mb-1" />
                  <p className={cn('text-2xl font-black', 'text-neo-cyan')}>
                    x{maxCombo}
                  </p>
                  <p className={cn('text-xs', 'text-neo-white/70')}>
                    {t('brain.drills.maxCombo')}
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
                  <Target className="w-6 h-6 mx-auto text-neo-green mb-1" />
                  <p className={cn('text-2xl font-black', 'text-neo-white')}>
                    {wordsFound.length}
                  </p>
                  <p className={cn('text-xs', 'text-neo-white/70')}>
                    {t('brain.drills.wordsFound')}
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
                onClick={() => { setPhase('ready'); onPlayAgain?.(); }}
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
                  className="px-6 py-3 rounded-neo border-3 border-neo-black shadow-hard font-bold uppercase bg-neo-orange text-neo-black"
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
