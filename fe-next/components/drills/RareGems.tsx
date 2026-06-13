'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import GridComponent from '@/components/GridComponent';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useDrillWordSubmit } from './hooks/useDrillWordSubmit';
import { useDrillCompleteOnce } from './hooks/useDrillCompleteOnce';
import { useDrillKeyboardSupport } from '@/hooks/useDrillKeyboardSupport';
import { useDrillGameActive } from '@/hooks/useDrillGameActive';
import { useDrillMusic } from '@/hooks/useDrillMusic';
import { KeyboardDesktopBadge, EnterKeyHint, KeyboardQuickTip } from '@/components/keyboard';
import DrillBriefing from '@/components/brain/DrillBriefing';
import RareGemsCompletePhase from './RareGemsCompletePhase';
import GemPouchMeter from './GemPouchMeter';
import GemFindPopup from './GemFindPopup';
import PouchFullBeat from './PouchFullBeat';
import {
  classifyGem,
  gemValue,
  GEM_POINTS,
  celebrationFor,
  computeGemProgress,
  type CelebrationLevel,
} from '@/lib/drills/rareGems';
import type { LetterGrid, Language } from '@/types';

// Level configurations
const LEVEL_CONFIGS = [
  { level: 1, timeLimit: 90, targetRare: 3, targetScore: 50 },
  { level: 2, timeLimit: 75, targetRare: 5, targetScore: 100 },
  { level: 3, timeLimit: 60, targetRare: 7, targetScore: 200 },
  { level: 4, timeLimit: 50, targetRare: 10, targetScore: 350 },
  { level: 5, timeLimit: 45, targetRare: 15, targetScore: 500 },
];

// Gem-tier → swatch colour (UI only; tier + points live in lib/drills/rareGems).
const RARITY_COLORS = {
  common: 'bg-gray-400',
  uncommon: 'bg-neo-green',
  rare: 'bg-neo-purple',
  legendary: 'bg-neo-lime',
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
  const {
    playWordRejectedSound,
    playDrillStartSound,
    playDrillCompleteSound,
    playWordAcceptedSound,
    playRareWordSound,
    playLegendaryWordSound,
    playChestOpenSound,
  } = useSoundEffects();

  const levelConfig = LEVEL_CONFIGS[Math.min(level - 1, LEVEL_CONFIGS.length - 1)];

  const [phase, setPhase] = useState<GamePhase>('ready');
  const [timeRemaining, setTimeRemaining] = useState(levelConfig.timeLimit);
  const [wordsFound, setWordsFound] = useState<{ word: string; rarity: string }[]>([]);
  const [score, setScore] = useState(0);
  const [lastWord, setLastWord] = useState<{ word: string; rarity: string; points: number; celebration: CelebrationLevel } | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  // Brief "Pouch Full!" celebration beat before flipping to the results phase.
  const [pouchFull, setPouchFull] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const winBeatRef = useRef<NodeJS.Timeout | null>(null);

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

  // Drill sounds no-op unless the game is flagged active (see useDrillGameActive).
  // Without this, RareGems' rare/legendary word sounds were silently dropped —
  // only the pouch-full chime (requiresGameActive:false) was ever audible.
  useDrillGameActive(phase === 'playing');
  // In-game music bed while playing; restored to the prior track on exit.
  useDrillMusic(phase === 'playing');

  const progress = computeGemProgress(wordsFound, levelConfig.targetRare);
  const rareWordsFound = progress.rareCount;

  // Start game
  const startGame = useCallback(() => {
    playDrillStartSound();
    setPhase('playing');
    setPouchFull(false);
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

    // Valid word — mine a gem! Tier + points come from the pure lib.
    const rarity = classifyGem(word);
    const points = gemValue(rarity);
    const celebration = celebrationFor(rarity);

    // Escalating find ceremony: bigger gem → louder, richer feedback.
    switch (celebration) {
      case 'epic': playLegendaryWordSound(); break;
      case 'big': playRareWordSound(); break;
      default: playWordAcceptedSound(); break;
    }

    setWordsFound(prev => [...prev, { word: upperWord, rarity }]);
    setScore(prev => prev + points);
    setLastWord({ word: upperWord, rarity, points, celebration });
    setFeedback({ message: `+${points} ${t('brain.drills.points')} (${t(`brain.drills.rarity.${rarity}`)})`, type: 'success' });
    setTimeout(() => {
      setLastWord(null);
      setFeedback(null);
    }, 1500);

    const willComplete =
      rareWordsFound + (rarity === 'rare' || rarity === 'legendary' ? 1 : 0) >=
      levelConfig.targetRare;
    if (willComplete) {
      if (timerRef.current) clearInterval(timerRef.current);
      const bonusTime = timeRemaining * 2;
      setScore(prev => prev + bonusTime);
      // Cosy payoff: a short "Pouch Full!" beat before the results phase.
      setPouchFull(true);
      playChestOpenSound();
      winBeatRef.current = setTimeout(() => setPhase('complete'), 900);
    }
  }, [
    validateWord,
    rareWordsFound,
    levelConfig.targetRare,
    timeRemaining,
    t,
    playWordAcceptedSound,
    playRareWordSound,
    playLegendaryWordSound,
    playChestOpenSound,
  ]);

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
      if (winBeatRef.current) clearTimeout(winBeatRef.current);
    };
  }, []);

  return (
    <div dir={dir} className={cn(
      'relative flex flex-col h-full',
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
        </div>

        <div aria-live="polite" className="px-3 py-1 rounded-neo border-2 border-neo-black font-bold bg-neo-cozy text-neo-black">
          {score} {t('brain.drills.points')}
        </div>
      </div>

      {/* Gem Pouch — the felt-progress meter (replaces the old tiny count chip) */}
      {phase === 'playing' && (
        <div className="px-4 py-2 border-b-2 border-neo-black bg-neo-navy-light">
          <GemPouchMeter
            rareCount={rareWordsFound}
            target={levelConfig.targetRare}
            fraction={progress.fraction}
            totalGems={progress.totalGems}
            t={t}
          />
        </div>
      )}

      {/* Rarity Legend */}
      {phase === 'playing' && (
        <div className={cn(
          'flex items-center justify-center gap-3 py-2 text-xs',
          'border-b-2 border-neo-black',
          'bg-neo-navy-light'
        )}>
          {Object.entries(RARITY_COLORS).map(([rarity, color]) => (
            <div key={rarity} className="flex items-center gap-1">
              <div className={cn('w-3 h-3 rounded border border-neo-black', color)} />
              <span className={'text-neo-white'}>
                {t(`brain.drills.rarity.${rarity}`)} (+{GEM_POINTS[rarity as keyof typeof GEM_POINTS]})
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Game Area */}
      <div className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto flex flex-col items-center justify-start p-4">
        {phase === 'ready' && (
          <DrillBriefing
            drillId="rare-gems"
            level={level}
            goalText={`${t('brain.drills.timeLimit')}: ${levelConfig.timeLimit}s · ${t('brain.drills.targetRareWords')}: ${levelConfig.targetRare}`}
            onStart={() => { playDrillStartSound(); startGame(); }}
          />
        )}

        {phase === 'playing' && (
          <div className="w-full max-w-md lg:max-w-lg space-y-4 relative">
            {/* Keyboard typed word display */}
            {keyboard.isTypingMode && keyboard.typedWord && (
              <div className="flex justify-center">
                <div className={cn(
                  'px-4 py-2 rounded-neo border-2 border-neo-black font-bold text-lg',
                  'bg-neo-navy-elevated text-neo-white'
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

            {/* Escalating gem find ceremony — bigger gem pops bigger. */}
            <GemFindPopup find={lastWord} />

            {/* Found words — always-rendered, fixed height: scrolls instead of
                growing, so the centered grid never re-positions on submit (CLS fix). */}
            <div
              data-testid="drill-found-words"
              className={cn(
                'flex flex-wrap gap-2 justify-center content-start p-3 rounded-neo border-2 border-neo-black h-32 overflow-y-auto',
                'bg-neo-navy-light'
              )}
            >
              {wordsFound.length === 0 ? (
                <span className="self-center text-xs text-neo-white">
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
                'bg-neo-navy-elevated text-neo-white'
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
            level={level}
            onPlayAgain={() => { setPhase('ready'); onPlayAgain?.(); }}
            onExit={onExit}
          />
        )}
      </div>

      {/* "Pouch Full!" win beat — a short cosy payoff before the results phase. */}
      <PouchFullBeat visible={pouchFull && phase === 'playing'} t={t} />
    </div>
  );
}
