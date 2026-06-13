'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { Clock, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import GridComponent from '@/components/GridComponent';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useDrillWordSubmit } from './hooks/useDrillWordSubmit';
import { useDrillCompleteOnce } from './hooks/useDrillCompleteOnce';
import { useDrillKeyboardSupport } from '@/hooks/useDrillKeyboardSupport';
import { useDrillGameActive } from '@/hooks/useDrillGameActive';
import { useDrillMusic } from '@/hooks/useDrillMusic';
import { useSuppressTimerUrgency } from '@/contexts/AccessibilityContext';
import { KeyboardDesktopBadge, EnterKeyHint, KeyboardQuickTip } from '@/components/keyboard';
import LightningRoundCompletePhase from './LightningRoundCompletePhase';
import DrillBriefing from '@/components/brain/DrillBriefing';
import DrillRewardBurst from './DrillRewardBurst';
import type { LetterGrid, Language } from '@/types';
import { calculateWordScore } from '@/shared/utils/scoring';
import { calculateForgivingDrillScore } from '@/shared/utils/drillScoring';

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
  const {
    playWordRejectedSound,
    playDrillStartSound,
    playDrillCompleteSound,
    playWordAcceptedSound,
    playTimerUrgentSound,
  } = useSoundEffects();

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
    playWordRejectedSound,
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

  // Drill sounds no-op unless the game is flagged active (see useDrillGameActive)
  useDrillGameActive(phase === 'playing');
  // In-game music bed while playing; restored to the prior track on exit.
  useDrillMusic(phase === 'playing');

  // Players who find time pressure stressful can mute the urgency cue entirely.
  const suppressTimerUrgency = useSuppressTimerUrgency();

  // Final-seconds urgency cue — a soft tick (not an alarm), fires once when the
  // clock crosses 5s, and only when the player hasn't suppressed timer urgency.
  useEffect(() => {
    if (phase === 'playing' && timeRemaining === 5 && !suppressTimerUrgency) {
      playTimerUrgentSound();
    }
  }, [phase, timeRemaining, suppressTimerUrgency, playTimerUrgentSound]);

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
    playWordAcceptedSound();

    setFeedback({ message: `+${wordScore} ${t('brain.drills.points')}`, type: 'success' });
    setTimeout(() => {
      setLastWordScore(null);
      setFeedback(null);
    }, 1000);
  }, [validateWord, t, playWordAcceptedSound]);

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

  // Handle completion (idempotent — see useDrillCompleteOnce)
  useDrillCompleteOnce(phase, getResults, onComplete, playDrillCompleteSound);

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
        'bg-neo-navy-light'
      )}>
        <div className="flex items-center gap-3">
          {/* Timer */}
          <div className={cn(
            'flex items-center gap-1 px-3 py-1 rounded-neo border-2 border-neo-black',
            'bg-neo-navy-elevated'
          )}>
            <Clock className={cn('w-4 h-4', getTimeColor())} />
            <span role="status" className={cn('font-black text-lg tabular-nums', getTimeColor())}>
              {timeRemaining}s
            </span>
          </div>

          {/* Words found */}
          <div className={cn(
            'px-2 py-1 rounded border-2 border-neo-black text-xs font-bold',
            'bg-neo-navy-elevated text-neo-white'
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
      <div className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto flex flex-col items-center justify-start p-4">
        {/* Ready Phase */}
        {phase === 'ready' && (
          <DrillBriefing
            drillId="lightning-round"
            level={level}
            goalText={`${t('brain.drills.timeLimit')}: ${levelConfig.timeLimit}s · ${t('brain.drills.target')}: ${levelConfig.targetWords} ${t('brain.drills.wordsFound')}`}
            onStart={() => { playDrillStartSound(); startGame(); }}
          />
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

            {/* Grid + collect-burst overlay (absolute/pointer-events-none → no reflow). */}
            <div className="relative w-full">
              <GridComponent
                grid={grid}
                interactive={true}
                onWordSubmit={handleWordSubmit}
                highlightedPath={keyboard.isTypingMode ? keyboard.highlightedCells : []}
                language={language}
                className="w-full"
              />
              <DrillRewardBurst
                trigger={wordsFound.length}
                magnitude={Math.min((lastWordScore ?? 5) / 18, 1)}
                seedKey={`lr-${wordsFound.length}`}
                label={lastWordScore ? `+${lastWordScore}` : undefined}
              />
            </div>

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

            {/* Feedback message — fixed-height slot so toggling doesn't shift the grid */}
            <div className="min-h-[2.75rem] flex items-center justify-center">
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
            </div>

            {/* Recent words — always-rendered, fixed height: it scrolls instead of
                growing, so the centered grid never re-positions on submit (CLS fix). */}
            <div
              data-testid="drill-found-words"
              className={cn(
                'flex flex-wrap gap-2 justify-center content-start p-3 rounded-neo border-2 border-neo-black h-28 overflow-y-auto',
                'bg-neo-navy-light'
              )}
            >
              {wordsFound.length === 0 ? (
                <span className="self-center text-xs text-neo-white">
                  {t('brain.drills.foundWordsHint')}
                </span>
              ) : (
                wordsFound.slice(-10).map((word, i) => (
                  <span
                    key={`${word}-${i}`}
                    className={cn(
                      'px-3 py-1 rounded-neo text-sm font-bold h-fit',
                      'bg-neo-green/20 text-neo-green border border-neo-green/30'
                    )}
                  >
                    {word}
                  </span>
                ))
              )}
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
        {phase === 'complete' && (() => {
          const forgiving = calculateForgivingDrillScore({
            level,
            rawScore: score,
            wordsFound: wordsFound.length,
            target: levelConfig.targetWords,
            setbacks: 0,
            maxSetbacks: 1,
          });
          return (
            <LightningRoundCompletePhase
              level={level}
              forgivingScore={forgiving}
              wordsFoundCount={wordsFound.length}
              wordsPerMinute={getResults().wordsPerMinute}
              onPlayAgain={() => {
                setPhase('ready');
                setWordsFound([]);
                setScore(0);
                onPlayAgain?.();
              }}
              onExit={onExit}
            />
          );
        })()}
      </div>
    </div>
  );
}
