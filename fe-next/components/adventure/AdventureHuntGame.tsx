'use client';

import React, { useCallback, useMemo, useReducer } from 'react';
import { X } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { useProgressionActions } from '@/contexts/ProgressionContext';
import { useAdventureWordValidation } from '@/hooks/useAdventureWordValidation';
import { WordHuntGameLayout } from '@/components/wordhunt/WordHuntGameLayout';
import { pickHuntTarget, HUNT_WRONG_GUESS_DAMAGE, HUNT_MAX_ATTEMPTS, getHuntLifePoints } from '@/lib/adventure/huntMode';
import { getLetterFeedback } from '@/utils/wordHuntFeedback';
import { cn } from '@/lib/utils';
import type { LevelConfig } from '@/types/adventure';
import type { TargetAttempt } from '@/components/daily/survival/types';

interface Props {
  levelConfig: LevelConfig;
  initialGrid: string[][];
  onLevelComplete: (stars: number, score: number, wordsFound: number, goldEarned: number) => void;
  onExit: () => void;
}

// ─── Local state ─────────────────────────────────────────────────

interface HuntState {
  targetWord: string | null;
  hp: number;
  attempts: TargetAttempt[];
  foundWords: string[];
  targetFound: boolean;
  isGameOver: boolean;
}

type HuntAction =
  | { type: 'SET_TARGET'; word: string }
  | { type: 'SUBMIT_WORD'; word: string }

function huntReducer(state: HuntState, action: HuntAction): HuntState {
  if (action.type === 'SET_TARGET') {
    return { ...state, targetWord: action.word.toUpperCase(), attempts: [], targetFound: false, isGameOver: false };
  }

  if (action.type === 'SUBMIT_WORD') {
    const word = action.word.toUpperCase();
    const target = state.targetWord;

    // Word-find submission (no target yet or word added to found list)
    const alreadyFound = state.foundWords.includes(word);
    const newFoundWords = alreadyFound ? state.foundWords : [...state.foundWords, word];

    if (!target) return { ...state, foundWords: newFoundWords };

    // Check length — different-length words are "discovery" guesses (no HP damage)
    if (word.length !== target.length) {
      const feedback = getLetterFeedback(word, target);
      const attempt: TargetAttempt = { word, feedback, timestamp: Date.now(), isDiscovery: true };
      return { ...state, foundWords: newFoundWords, attempts: [...state.attempts, attempt] };
    }

    // Same-length guess
    const feedback = getLetterFeedback(word, target);
    const attempt: TargetAttempt = { word, feedback, timestamp: Date.now() };
    const newAttempts = [...state.attempts, attempt];

    if (word === target) {
      return { ...state, foundWords: newFoundWords, attempts: newAttempts, targetFound: true, isGameOver: true };
    }

    // Wrong guess — deduct HP; enforce max-attempt limit
    const newHp = Math.max(0, state.hp - HUNT_WRONG_GUESS_DAMAGE);
    const nonDiscoveryCount = newAttempts.filter(a => !a.isDiscovery).length;
    const maxedOut = HUNT_MAX_ATTEMPTS > 0 && nonDiscoveryCount >= HUNT_MAX_ATTEMPTS;
    const dead = newHp <= 0 || maxedOut;
    return { ...state, foundWords: newFoundWords, attempts: newAttempts, hp: newHp, isGameOver: dead };
  }

  return state;
}

// ─── Component ───────────────────────────────────────────────────

const AdventureHuntGame: React.FC<Props> = ({ levelConfig, initialGrid, onLevelComplete, onExit }) => {
  const { t, language, dir } = useLanguageSafe();
  const { completeLevel } = useProgressionActions();
  const grid = initialGrid;

  const initialHp = levelConfig.lifePoints ?? getHuntLifePoints(levelConfig.world);
  const [state, dispatch] = useReducer(huntReducer, {
    targetWord: levelConfig.hiddenWord?.toUpperCase() ?? null,
    hp: initialHp,
    attempts: [],
    foundWords: [],
    targetFound: false,
    isGameOver: false,
  });

  // Pre-solve grid to get candidate words for target picking
  const { solvedWords } = useAdventureWordValidation({
    grid,
    language,
    minWordLength: levelConfig.minWordLength ?? 3,
    foundWords: state.foundWords,
  });

  // Pick target from solved set when available (skip if hiddenWord already set)
  const targetPickedRef = React.useRef(false);
  React.useEffect(() => {
    if (state.targetWord || targetPickedRef.current || !solvedWords) return;
    const target = pickHuntTarget(solvedWords);
    if (target) {
      targetPickedRef.current = true;
      dispatch({ type: 'SET_TARGET', word: target });
    }
  }, [solvedWords, state.targetWord]);

  const targetWord = state.targetWord;
  const targetLength = targetWord?.length ?? 0;

  // Handle target found → complete level
  const completedRef = React.useRef(false);
  React.useEffect(() => {
    if (!state.targetFound || completedRef.current) return;
    completedRef.current = true;
    const score = (targetLength * 100) + state.foundWords.length * 10;
    const stars = 3;
    const gold = Math.floor(score / 10);
    void completeLevel(levelConfig.world, levelConfig.level, stars, score, state.foundWords.length, gold, 0, state.foundWords);
    onLevelComplete(stars, score, state.foundWords.length, gold);
  }, [state.targetFound, targetLength, state.foundWords, completeLevel, levelConfig.world, levelConfig.level, onLevelComplete]);

  const handleWordSubmit = useCallback((word: string) => {
    dispatch({ type: 'SUBMIT_WORD', word });
  }, []);

  // Convert reducer attempts (LetterFeedback from wordHuntFeedback) to TargetAttempt[]
  // Already in correct format since we use getLetterFeedback which returns object form
  const attemptsForLayout = state.attempts;

  // SP stub for MP-only leaderboard props
  const username = 'player';
  const leaderboard = useMemo(() => [{ username, score: state.foundWords.length * 10 }], [state.foundWords.length]);
  const playerLives = useMemo(() => ({ [username]: state.hp }), [state.hp]);
  // Stable empty refs — avoid recreating on every render (defeats WordHuntGameLayout memo)
  const emptyMap = useMemo(() => new Map<number, never>(), []);
  const emptySet = useMemo(() => new Set<string>(), []);

  return (
    <div className="relative h-full w-full bg-neo-navy flex flex-col">
      {/* Exit button */}
      <button
        onClick={onExit}
        aria-label={t('common.exit')}
        className={cn(
          'absolute top-2 start-2 z-20 p-2 rounded-neo',
          'bg-neo-white/8 text-neo-white/70 hover:bg-neo-red/20 hover:text-neo-red',
          'transition-colors duration-200'
        )}
      >
        <X className="w-5 h-5" />
      </button>

      {/* Level badge */}
      <div className="absolute top-2 end-2 z-20 px-3 py-1 rounded-neo bg-neo-cyan/20 border-2 border-neo-cyan/40">
        <span className="text-[11px] font-mono font-bold text-neo-white tabular-nums">
          W{levelConfig.world}·L{levelConfig.level}
        </span>
      </div>

      <div className="flex-1 min-h-0 relative overflow-hidden">
        <WordHuntGameLayout
          // Header
          score={state.foundWords.length * 10}
          onQuit={onExit}

          // Clue boxes
          targetLength={targetLength}
          currentHint={null}
          attempts={attemptsForLayout}
          accumulatedClues={emptyMap}
          knownLetters={emptySet}
          latestAttemptFeedback={attemptsForLayout.length > 0 ? attemptsForLayout[attemptsForLayout.length - 1].feedback : null}
          showFeedbackOverlay={false}

          // Life bar
          lifePoints={state.hp}
          isGameOver={state.isGameOver}
          targetFound={state.targetFound}
          isLifeGaining={false}
          lifeGainAmount={null}
          isClueGaining={false}

          // Grid
          grid={grid}
          onWordSubmit={handleWordSubmit}
          onWordChange={() => {}}

          // Leaderboard (SP stubs)
          playerLives={playerLives}
          eliminatedPlayers={[]}
          leaderboard={leaderboard}
          currentUsername={username}

          // Common
          t={t}
          gameDir={dir}
        />
      </div>
    </div>
  );
};

export default AdventureHuntGame;
