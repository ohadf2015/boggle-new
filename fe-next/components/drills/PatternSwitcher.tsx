'use client';

import { useState, useCallback, useRef } from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import GridComponent from '@/components/GridComponent';
import WordFormingArea, { type WordFeedback } from '@/components/game/WordFormingArea';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useDrillKeyboardSupport } from '@/hooks/useDrillKeyboardSupport';
import { useDrillGameActive } from '@/hooks/useDrillGameActive';
import { useDrillMusic } from '@/hooks/useDrillMusic';
import { useDrillCompleteOnce } from './hooks/useDrillCompleteOnce';
import { KeyboardDesktopBadge, EnterKeyHint, KeyboardQuickTip } from '@/components/keyboard';
import PatternSwitcherCompletePhase from './PatternSwitcherCompletePhase';
import DrillBriefing from '@/components/brain/DrillBriefing';
import DrillRewardBurst from './DrillRewardBurst';
import type { LetterGrid, Language } from '@/types';
import { calculateWordScore } from '@/shared/utils/scoring';

// Level configurations
const LEVEL_CONFIGS = [
  { level: 1, patternLength: 3, lives: 3, targetScore: 50 },
  { level: 2, patternLength: 4, lives: 3, targetScore: 100 },
  { level: 3, patternLength: 5, lives: 2, targetScore: 200 },
  { level: 4, patternLength: 6, lives: 2, targetScore: 350 },
  { level: 5, patternLength: 7, lives: 1, targetScore: 500 },
];

interface PatternSwitcherProps {
  grid: LetterGrid;
  availableWords: { word: string; path: { row: number; col: number }[] }[];
  level?: number;
  language?: Language;
  onComplete: (result: {
    score: number;
    patternsCompleted: number;
    wordsFound: number;
    timeSpent: number;
    level: number;
  }) => void;
  onExit?: () => void;
  onPlayAgain?: () => void;
}

type GamePhase = 'ready' | 'playing' | 'feedback' | 'complete';

/**
 * Pattern Switcher Drill
 *
 * Cognitive Flexibility training - find words matching required lengths.
 * Pattern changes after each successful word.
 */
export default function PatternSwitcher({
  grid,
  availableWords,
  level = 1,
  language = 'en',
  onComplete,
  onExit,
  onPlayAgain,
}: PatternSwitcherProps) {
  const { t, dir } = useLanguage();
  const {
    playWordRejectedSound,
    playDrillStartSound,
    playDrillCompleteSound,
    playWordAcceptedSound,
    playPerfectWordSound,
  } = useSoundEffects();

  const levelConfig = LEVEL_CONFIGS[Math.min(level - 1, LEVEL_CONFIGS.length - 1)];

  const [phase, setPhase] = useState<GamePhase>('ready');
  const [requiredLength, setRequiredLength] = useState(() => {
    const lengths = [...new Set(availableWords.map(w => w.word.length))].sort();
    return lengths[0] ?? 3;
  });
  const [pattern, setPattern] = useState<number[]>([]);
  const [patternIndex, setPatternIndex] = useState(0);
  const [lives, setLives] = useState(levelConfig.lives);
  const [wordsFound, setWordsFound] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [patternsCompleted, setPatternsCompleted] = useState(0);
  const [currentFeedback, setCurrentFeedback] = useState<WordFeedback | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const wordsFoundSetRef = useRef<Set<string>>(new Set());

  // Keyboard support for desktop users
  const keyboard = useDrillKeyboardSupport({
    grid,
    language,
    enabled: phase === 'playing',
    onWordSubmit: (word: string) => handleWordSubmit(word),
    minWordLength: 2,
  });

  // Drill sounds no-op unless the game is flagged active (see useDrillGameActive)
  useDrillGameActive(phase === 'playing' || phase === 'feedback');
  // In-game music bed while playing; restored to the prior track on exit.
  useDrillMusic(phase === 'playing' || phase === 'feedback');

  // Generate available lengths from words that actually exist on the board
  const availableLengths = [...new Set(availableWords.map(w => w.word.length))].sort();

  // Generate random pattern — only request lengths that have unfound words on the board
  const generatePattern = useCallback(() => {
    const lengths: number[] = [];
    // Count only words NOT yet found across all patterns (fixes C3: impossible states)
    const wordCountByLength: Record<number, number> = {};
    for (const w of availableWords) {
      const len = w.word.length;
      if (!wordsFoundSetRef.current.has(w.word.toLowerCase())) {
        wordCountByLength[len] = (wordCountByLength[len] || 0) + 1;
      }
    }

    const remainingByLength = { ...wordCountByLength };

    for (let i = 0; i < levelConfig.patternLength; i++) {
      // Filter to lengths that still have available words
      const validLengths = availableLengths.filter(len => (remainingByLength[len] || 0) > 0);
      if (validLengths.length === 0) break; // No more valid lengths possible
      const randomLength = validLengths[Math.floor(Math.random() * validLengths.length)];
      lengths.push(randomLength);
      remainingByLength[randomLength] -= 1;
    }
    return lengths;
  }, [levelConfig.patternLength, availableLengths, availableWords]);

  // Start game — regenerate board if too few words for a valid pattern
  const startGame = useCallback(() => {
    wordsFoundSetRef.current.clear();
    const newPattern = generatePattern();
    if (newPattern.length === 0) {
      // Board has too few words — request regeneration
      onPlayAgain?.();
      return;
    }
    setPattern(newPattern);
    setPatternIndex(0);
    setRequiredLength(newPattern[0]);
    setLives(levelConfig.lives);
    setWordsFound([]);
    setScore(0);
    setPatternsCompleted(0);
    setCurrentFeedback(null);
    startTimeRef.current = Date.now();
    playDrillStartSound();
    setPhase('playing');
  }, [generatePattern, levelConfig.lives, onPlayAgain, playDrillStartSound]);

  // Handle word submission with integrated validation feedback
  const handleWordSubmit = useCallback((word: string) => {
    if (phase !== 'playing') return;

    const normalizedWord = word.toLowerCase().trim();
    const upperWord = normalizedWord.toUpperCase();
    const now = Date.now();

    // Check for duplicates first
    if (wordsFoundSetRef.current.has(normalizedWord)) {
      setCurrentFeedback({
        id: `duplicate-${now}`,
        type: 'duplicate',
        word: upperWord,
        message: t('playerView.wordAlreadyFound'),
        timestamp: now,
      });
      playWordRejectedSound?.();
      return;
    }

    // Check if word exists in available words
    const wordExists = availableWords.some(w => w.word.toLowerCase() === normalizedWord);
    if (!wordExists) {
      setCurrentFeedback({
        id: `reject-${now}`,
        type: 'rejected',
        word: upperWord,
        message: t('playerView.wordNotInList'),
        timestamp: now,
      });
      playWordRejectedSound?.();
      return;
    }

    // Check drill-specific requirement: word length must match pattern
    if (word.length === requiredLength) {
      // Correct length! Show positive feedback
      wordsFoundSetRef.current.add(normalizedWord);
      setWordsFound(prev => [...prev, upperWord]);
      const wordScore = calculateWordScore(word);
      setScore(prev => prev + wordScore);
      playWordAcceptedSound();

      // Show positive feedback using WordFormingArea component
      setCurrentFeedback({
        id: `accept-${now}`,
        type: 'accepted',
        word: upperWord,
        score: wordScore,
        timestamp: now,
      });

      setTimeout(() => {
        setCurrentFeedback(null);

        // Move to next in pattern
        const nextIndex = patternIndex + 1;
        if (nextIndex >= pattern.length) {
          // Pattern completed! Reward the discrete win moment with a flourish.
          setPatternsCompleted(prev => prev + 1);
          setScore(prev => prev + 100); // Bonus
          playPerfectWordSound();

          // Generate new pattern — if board exhausted, end with bonus
          const newPattern = generatePattern();
          if (newPattern.length === 0) {
            setScore(prev => prev + 200);
            setPhase('complete');
            return;
          }
          setPattern(newPattern);
          setPatternIndex(0);
          setRequiredLength(newPattern[0]);
        } else {
          setPatternIndex(nextIndex);
          setRequiredLength(pattern[nextIndex]);
        }
      }, 800);
    } else {
      // Wrong length - show specific feedback
      setLives(prev => prev - 1);
      setCurrentFeedback({
        id: `reject-${now}`,
        type: 'rejected',
        word: upperWord,
        message: t('brain.drills.wrongLength', { length: requiredLength }),
        timestamp: now,
      });
      playWordRejectedSound?.();

      setTimeout(() => {
        setCurrentFeedback(null);
        if (lives <= 1) {
          setPhase('complete');
        }
      }, 800);
    }
  }, [phase, availableWords, requiredLength, patternIndex, pattern, lives, generatePattern, playWordRejectedSound, playWordAcceptedSound, playPerfectWordSound, t]);

  // Finish game early (saves progress)
  const finishGame = useCallback(() => {
    setPhase('complete');
  }, []);

  // Results
  const getResults = useCallback(() => {
    const timeSpent = startTimeRef.current
      ? Math.floor((Date.now() - startTimeRef.current) / 1000)
      : 0;

    return {
      score,
      patternsCompleted,
      wordsFound: wordsFound.length,
      timeSpent,
      level,
    };
  }, [score, patternsCompleted, wordsFound.length, level]);

  // Handle completion (idempotent — see useDrillCompleteOnce)
  useDrillCompleteOnce(phase, getResults, onComplete, playDrillCompleteSound);

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
          {/* Required length */}
          <div role="status" className={cn(
            'px-4 py-2 rounded-neo border-3 border-neo-black font-black text-xl',
            'bg-neo-cyan text-neo-black'
          )}>
            {requiredLength} {t('brain.drills.letters')}
          </div>

          {/* Lives */}
          <div className="flex items-center gap-1">
            {Array.from({ length: levelConfig.lives }).map((_, i) => (
              <div
                key={`life-${i}`}
                className={cn(
                  'w-3 h-3 rounded-full border border-neo-black',
                  i < lives ? 'bg-neo-red' : 'bg-gray-300'
                )}
              />
            ))}
          </div>
        </div>

        <div aria-live="polite" className={cn(
          'px-3 py-1 rounded-neo border-2 border-neo-black font-bold',
          'bg-neo-cyan text-neo-black'
        )}>
          {score} {t('brain.drills.points')}
        </div>
      </div>

      {/* Pattern Progress */}
      {phase !== 'ready' && phase !== 'complete' && (
        <div className={cn(
          'flex items-center justify-center gap-2 py-2 border-b-2 border-neo-black',
          'bg-neo-navy-light'
        )}>
          {pattern.map((len, i) => (
            <div
              key={`step-${i}-${len}`}
              className={cn(
                'w-8 h-8 rounded-lg border-2 border-neo-black flex items-center justify-center font-bold text-sm',
                i < patternIndex ? 'bg-neo-green text-neo-black' :
                i === patternIndex ? 'bg-neo-cyan text-neo-black' :
                'bg-neo-navy-elevated text-neo-white'
              )}
            >
              {len}
            </div>
          ))}
        </div>
      )}

      {/* Game Area */}
      <div className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto flex flex-col items-center justify-start p-4">
        {phase === 'ready' && (
          <DrillBriefing
            drillId="pattern-switcher"
            level={level}
            goalText={`${t('brain.drills.patternLength')}: ${levelConfig.patternLength} · ${levelConfig.lives} ❤`}
            onStart={() => { playDrillStartSound(); startGame(); }}
          />
        )}

        {(phase === 'playing' || phase === 'feedback') && (
          <div className="w-full max-w-md lg:max-w-lg space-y-4 relative">
            {/* Word feedback area - shows validation results */}
            <div className="flex justify-center">
              <WordFormingArea
                word={keyboard.isTypingMode ? keyboard.typedWord : ""}
                letterCount={keyboard.isTypingMode ? keyboard.typedWord.length : 0}
                feedback={currentFeedback}
                compact={false}
              />
            </div>

            <div className="relative w-full">
              <GridComponent
                grid={grid}
                interactive={phase === 'playing'}
                onWordSubmit={handleWordSubmit}
                highlightedPath={keyboard.isTypingMode ? keyboard.highlightedCells : []}
                hideWordPreview={false}
                language={language}
                className="w-full"
              />
              {/* Collect-burst overlay — fires per matched word (absolute, no reflow). */}
              <DrillRewardBurst
                trigger={wordsFound.length}
                magnitude={Math.min(patternsCompleted / 8 + 0.4, 1)}
                seedKey={`ps-${wordsFound.length}`}
              />
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
          <PatternSwitcherCompletePhase
            score={score}
            patternsCompleted={patternsCompleted}
            wordsFoundCount={wordsFound.length}
            lives={lives}
            level={level}
            maxLives={levelConfig.lives}
            onPlayAgain={() => { setPhase('ready'); onPlayAgain?.(); }}
            onExit={onExit}
          />
        )}
      </div>
    </div>
  );
}
