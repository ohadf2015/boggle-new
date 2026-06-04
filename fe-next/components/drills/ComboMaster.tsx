'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { Target, Flame, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import GridComponent from '@/components/GridComponent';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useDrillWordSubmit } from './hooks/useDrillWordSubmit';
import { useDrillCompleteOnce } from './hooks/useDrillCompleteOnce';
import { useDrillKeyboardSupport } from '@/hooks/useDrillKeyboardSupport';
import { KeyboardDesktopBadge, EnterKeyHint, KeyboardQuickTip } from '@/components/keyboard';
import ComboMasterCompletePhase from './ComboMasterCompletePhase';
import DrillBriefing from '@/components/brain/DrillBriefing';
import type { LetterGrid, Language } from '@/types';
import { calculateWordScore } from '@/shared/utils/scoring';

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
  const { playErrorSound, playDrillStartSound, playDrillCompleteSound } = useSoundEffects();

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
    playDrillStartSound();
    setPhase('playing');
    setCombo(0);
    setMaxCombo(0);
    setWordsFound([]);
    setScore(0);
    setComboBreaks(0);
    comboBreaksRef.current = 0;

    startTimeRef.current = Date.now();
    startComboTimer();
  }, [startComboTimer, playDrillStartSound]);

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
    const baseScore = calculateWordScore(word, 0);
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

  // Handle completion (idempotent — see useDrillCompleteOnce)
  useDrillCompleteOnce(phase, getResults, onComplete, playDrillCompleteSound);

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
        'bg-neo-navy-light'
      )}>
        <div className="flex items-center gap-3">
          {/* Combo display */}
          <div className={cn(
            'flex items-center gap-1 px-3 py-1 rounded-neo border-2 border-neo-black',
            combo >= 5 ? 'bg-neo-orange' : 'bg-neo-navy-elevated'
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
                key={`life-${i}`}
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
          'bg-neo-navy-elevated'
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
          <DrillBriefing
            drillId="combo-master"
            level={level}
            goalText={`${t('brain.drills.target')}: x${levelConfig.targetCombo} · ${t('brain.drills.timer')}: ${levelConfig.comboTimeout}s ${t('brain.drills.perWord')}`}
            onStart={() => { playDrillStartSound(); startGame(); }}
          />
        )}

        {/* Playing Phase */}
        {phase === 'playing' && (
          <div className="w-full max-w-md lg:max-w-lg space-y-4">
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
                  role="status"
                  aria-live={feedback.type === 'error' ? 'assertive' : 'polite'}
                  aria-atomic="true"
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
                'transition-all hover:-translate-y-px',
                'bg-neo-navy-elevated text-neo-white'
              )}
            >
              {t('brain.drills.finishGame')}
            </AdaptiveMotion.button>
          </div>
        )}

        {/* Complete Phase */}
        {phase === 'complete' && (
          <ComboMasterCompletePhase
            score={score}
            maxCombo={maxCombo}
            wordsFoundCount={wordsFound.length}
            targetCombo={levelConfig.targetCombo}
            comboBreaks={comboBreaks}
            level={level}
            onPlayAgain={() => { setPhase('ready'); onPlayAgain?.(); }}
            onExit={onExit}
          />
        )}
      </div>
    </div>
  );
}
