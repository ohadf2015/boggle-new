'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { Gem, Star, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import GridComponent from '@/components/GridComponent';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useDrillWordSubmit } from './hooks/useDrillWordSubmit';
import { useDrillCompleteOnce } from './hooks/useDrillCompleteOnce';
import { useDrillKeyboardSupport } from '@/hooks/useDrillKeyboardSupport';
import { KeyboardDesktopBadge, EnterKeyHint, KeyboardQuickTip } from '@/components/keyboard';
import RareGemsCompletePhase from './RareGemsCompletePhase';
import type { LetterGrid, Language } from '@/types';

// Level configurations
const LEVEL_CONFIGS = [
  { level: 1, timeLimit: 90, targetRare: 3, targetScore: 50 },
  { level: 2, timeLimit: 75, targetRare: 5, targetScore: 100 },
  { level: 3, timeLimit: 60, targetRare: 7, targetScore: 200 },
  { level: 4, timeLimit: 50, targetRare: 10, targetScore: 350 },
  { level: 5, timeLimit: 45, targetRare: 15, targetScore: 500 },
];

// Word rarity based on length (adjusted for fair gameplay - max 5 letters for rare)
const getWordRarity = (word: string): 'common' | 'uncommon' | 'rare' | 'legendary' => {
  const len = word.length;
  if (len >= 6) return 'legendary';  // 6+ letters = legendary
  if (len >= 5) return 'rare';       // 5 letters = rare
  if (len >= 4) return 'uncommon';   // 4 letters = uncommon
  return 'common';                   // 3 letters = common
};

const RARITY_COLORS = {
  common: 'bg-gray-400',
  uncommon: 'bg-neo-green',
  rare: 'bg-neo-purple',
  legendary: 'bg-neo-lime',
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
  language?: Language;
  onComplete: (result: {
    score: number;
    rareWordsFound: number;
    totalWordsFound: number;
    timeSpent: number;
    level: number;
  }) => void;
  onExit?: () => void;
  onPlayAgain?: () => void;
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
  language = 'en',
  onComplete,
  onExit,
  onPlayAgain,
}: RareGemsProps) {
  const { t, dir } = useLanguage();
  const { playErrorSound, playDrillStartSound, playDrillCompleteSound } = useSoundEffects();

  const levelConfig = LEVEL_CONFIGS[Math.min(level - 1, LEVEL_CONFIGS.length - 1)];

  const [phase, setPhase] = useState<GamePhase>('ready');
  const [timeRemaining, setTimeRemaining] = useState(levelConfig.timeLimit);
  const [wordsFound, setWordsFound] = useState<{ word: string; rarity: string }[]>([]);
  const [score, setScore] = useState(0);
  const [lastWord, setLastWord] = useState<{ word: string; rarity: string; points: number } | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const foundWordStrings = useMemo(
    () => wordsFound.map(w => w.word),
    [wordsFound]
  );

  const { validateWord } = useDrillWordSubmit({
    grid,
    language,
    availableWords,
    wordsFound: foundWordStrings,
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

  const rareWordsFound = wordsFound.filter(w =>
    w.rarity === 'rare' || w.rarity === 'legendary'
  ).length;

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
    const rarity = getWordRarity(word);
    const points = RARITY_POINTS[rarity];
    setWordsFound(prev => [...prev, { word: upperWord, rarity }]);
    setScore(prev => prev + points);
    setLastWord({ word: upperWord, rarity, points });
    setFeedback({ message: `+${points} ${t('brain.drills.points')} (${t(`brain.drills.rarity.${rarity}`)})`, type: 'success' });
    setTimeout(() => {
      setLastWord(null);
      setFeedback(null);
    }, 1500);

    if (rareWordsFound + (rarity === 'rare' || rarity === 'legendary' ? 1 : 0) >= levelConfig.targetRare) {
      if (timerRef.current) clearInterval(timerRef.current);
      const bonusTime = timeRemaining * 2;
      setScore(prev => prev + bonusTime);
      setPhase('complete');
    }
  }, [validateWord, rareWordsFound, levelConfig.targetRare, timeRemaining, t]);

  // Finish game early (saves progress)
  const finishGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase('complete');
  }, []);

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

  // Handle completion (idempotent — see useDrillCompleteOnce)
  useDrillCompleteOnce(phase, getResults, onComplete, playDrillCompleteSound);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

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
            <Clock className={cn(
              'w-4 h-4',
              timeRemaining <= 10 ? 'text-neo-red' : 'text-neo-green'
            )} />
            <span role="status" className={cn(
              'font-black text-lg tabular-nums',
              timeRemaining <= 10 ? 'text-neo-red' : 'text-neo-green'
            )}>
              {timeRemaining}s
            </span>
          </div>

          {/* Rare count */}
          <div className={cn(
            'flex items-center gap-1 px-2 py-1 rounded border-2 border-neo-black',
            'bg-slate-700'
          )}>
            <Gem className="w-4 h-4 text-neo-purple" />
            <span className={cn(
              'font-bold text-sm',
              'text-neo-white'
            )}>
              {rareWordsFound}/{levelConfig.targetRare}
            </span>
          </div>
        </div>

        <div aria-live="polite" className="px-3 py-1 rounded-neo border-2 border-neo-black font-bold bg-neo-lime text-neo-black">
          {score} {t('brain.drills.points')}
        </div>
      </div>

      {/* Rarity Legend */}
      {phase === 'playing' && (
        <div className={cn(
          'flex items-center justify-center gap-3 py-2 text-xs',
          'border-b-2 border-neo-black',
          'bg-slate-800'
        )}>
          {Object.entries(RARITY_COLORS).map(([rarity, color]) => (
            <div key={rarity} className="flex items-center gap-1">
              <div className={cn('w-3 h-3 rounded border border-neo-black', color)} />
              <span className={'text-neo-white/70'}>
                {t(`brain.drills.rarity.${rarity}`)} (+{RARITY_POINTS[rarity as keyof typeof RARITY_POINTS]})
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Game Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {phase === 'ready' && (
          <AdaptiveMotion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6"
          >
            <Gem className="w-14 h-14 sm:w-20 sm:h-20 mx-auto text-neo-purple" />
            <h2 className={cn(
              'text-2xl font-black',
              'text-neo-white'
            )}>
              {t('brain.drills.rare-gems.name')}
            </h2>
            <p className={cn(
              'text-sm max-w-xs',
              'text-neo-white/70'
            )}>
              {t('brain.drills.rare-gems.description')}
            </p>
            <div className={cn(
              'text-xs space-y-1 p-3 rounded-neo border-2 border-neo-black',
              'bg-slate-800'
            )}>
              <p>{t('brain.drills.level')}: {level}</p>
              <p>{t('brain.drills.timeSpent')}: {levelConfig.timeLimit}s</p>
              <p>{t('brain.drills.targetRareWords')}: {levelConfig.targetRare}</p>
            </div>
            <AdaptiveMotion.button
              whileTap={{ scale: 0.95 }}
              onClick={startGame}
              className="px-8 py-3 rounded-neo border-3 border-neo-black shadow-hard font-bold text-lg uppercase bg-neo-purple text-white"
            >
              {t('brain.drills.start')}
            </AdaptiveMotion.button>
          </AdaptiveMotion.div>
        )}

        {phase === 'playing' && (
          <div className="w-full max-w-md lg:max-w-lg space-y-4 relative">
            {/* Keyboard typed word display */}
            {keyboard.isTypingMode && keyboard.typedWord && (
              <div className="flex justify-center">
                <div className={cn(
                  'px-4 py-2 rounded-neo border-2 border-neo-black font-bold text-lg',
                  'bg-slate-700 text-neo-white'
                )}>
                  {keyboard.typedWord.toUpperCase()}
                </div>
              </div>
            )}

            <GridComponent
              grid={grid}
              interactive={true}
              onWordSubmit={handleWordSubmit}
              highlightedPath={keyboard.isTypingMode ? keyboard.highlightedCells : []}
              language={language}
              className="w-full"
            />

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

            {/* Word popup */}
            <AdaptiveAnimatePresence>
              {lastWord && (
                <AdaptiveMotion.div
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
                </AdaptiveMotion.div>
              )}
            </AdaptiveAnimatePresence>

            {/* Found words — always-rendered, fixed height: scrolls instead of
                growing, so the centered grid never re-positions on submit (CLS fix). */}
            <div
              data-testid="drill-found-words"
              className={cn(
                'flex flex-wrap gap-2 justify-center content-start p-3 rounded-neo border-2 border-neo-black h-32 overflow-y-auto',
                'bg-slate-800'
              )}
            >
              {wordsFound.length === 0 ? (
                <span className="self-center text-xs text-neo-white/40">
                  {t('brain.drills.foundWordsHint')}
                </span>
              ) : (
                wordsFound.slice(-15).map((w, i) => (
                  <span
                    key={`${w.word}-${i}`}
                    className={cn(
                      'px-3 py-1 rounded-neo border border-neo-black/30 text-sm font-bold text-neo-black h-fit',
                      RARITY_COLORS[w.rarity as keyof typeof RARITY_COLORS]
                    )}
                  >
                    {w.word}
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
                'bg-slate-700 text-neo-white'
              )}
            >
              {t('brain.drills.finishGame')}
            </AdaptiveMotion.button>
          </div>
        )}

        {phase === 'complete' && (
          <RareGemsCompletePhase
            score={score}
            rareWordsFound={rareWordsFound}
            wordsFoundCount={wordsFound.length}
            targetRare={levelConfig.targetRare}
            onPlayAgain={() => { setPhase('ready'); onPlayAgain?.(); }}
            onExit={onExit}
          />
        )}
      </div>
    </div>
  );
}
