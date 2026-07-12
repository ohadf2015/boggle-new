'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { m } from 'framer-motion';
import { Share2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useHapticFeedback, GAME_HAPTICS } from '@/hooks/useHapticFeedback';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { fireVictoryConfetti } from '@/utils/confettiUtils';
import {
  initPyramidState,
  pyramidGuess,
  pyramidAdvance,
  pyramidGiveUp,
  pyramidRevive,
  type PyramidState,
} from '@/lib/connections/pyramid/gameLogic';
import { dailyPyramid } from '@/lib/connections/pyramid/daily';
import { buildPyramidShareGrid } from '@/lib/connections/pyramid/shareGrid';
import { todayUTC } from '@/lib/connections/dailyClient';
import { gridCallout, type BridgeOutcome } from '@/lib/connections/shareGrid';
import type { GameState } from '@/lib/connections/types';
import PyramidProgress from './PyramidProgress';
import FinaleCard from './FinaleCard';
import PuzzleCard from '../PuzzleCard';

type Action =
  | { type: 'GUESS'; input: string }
  | { type: 'ADVANCE' }
  | { type: 'GIVE_UP' }
  | { type: 'REVEAL_HINT' }
  | { type: 'REVIVE' };

function reducer(state: PyramidState, action: Action): PyramidState {
  switch (action.type) {
    case 'GUESS':
      return pyramidGuess(state, action.input);
    case 'ADVANCE':
      return pyramidAdvance(state);
    case 'GIVE_UP':
      return pyramidGiveUp(state);
    case 'REVEAL_HINT':
      return { ...state, hintRevealed: true };
    case 'REVIVE':
      return pyramidRevive(state);
    default:
      return state;
  }
}

/**
 * Bridge Pyramid — a three-stage tower where solving all 3 base riddles
 * unlocks the finale. The bridges from the 3 stages become clues for the
 * final meta-answer puzzle.
 */
export default function PyramidChallenge() {
  // Null-guard wrapper: the early return must happen BEFORE any of the run's
  // hooks mount (rules-of-hooks), so the actual game lives in PyramidRun.
  const { language } = useLanguage();
  const today = useRef(todayUTC()).current;
  const pyramid = dailyPyramid(today, language);
  if (!pyramid) return null;
  return <PyramidRun pyramid={pyramid} today={today} />;
}

function PyramidRun({ pyramid, today }: { pyramid: NonNullable<ReturnType<typeof dailyPyramid>>; today: string }) {
  const { t, language } = useLanguage();
  const { isAdmin } = useAuth();
  const prefersReducedMotion = useReducedMotion();
  const { haptic, customHaptic } = useHapticFeedback();
  const sfx = useSoundEffects();

  const [pyramidState, dispatch] = useReducer(reducer, pyramid, initPyramidState);
  const [input, setInput] = useState('');

  const startRef = useRef<number>(0);
  const wrongByStageRef = useRef<Record<number, number>>({});
  const outcomesRef = useRef<Map<number, BridgeOutcome>>(new Map());
  const prevStatusRef = useRef(pyramidState.status);
  const [results, setResults] = useState<{ copied: boolean }>({ copied: false });

  const isTerminal = pyramidState.status === 'won' || pyramidState.status === 'lost';
  const isResolved = pyramidState.status === 'correct' || pyramidState.status === 'gaveUp';
  const baseStage = pyramidState.stage < 3;
  const currentPuzzle =
    baseStage && pyramidState.stage >= 0 && pyramidState.stage < 3
      ? pyramid.base[pyramidState.stage as 0 | 1 | 2]
      : null;

  // Synthetic GameState for PuzzleCard (base stages only)
  const synthGameState: GameState = baseStage
    ? {
        puzzles: [currentPuzzle!],
        currentIndex: 0,
        score: pyramidState.score,
        streak: 0,
        lives: pyramidState.lives,
        wrongAttempts: pyramidState.wrongAttempts,
        status: (pyramidState.status as any) as GameState['status'],
        input,
        completedIds: new Set(),
        ratedIds: new Set(),
        hintRevealed: pyramidState.hintRevealed,
      }
    : ({} as GameState);

  // Stamp start time once mounted
  useEffect(() => {
    startRef.current = Date.now();
  }, []);

  // Per-answer feedback (sound + haptic) and outcome tracking
  useEffect(() => {
    const stage = pyramidState.stage;
    if (pyramidState.status === 'correct' && prevStatusRef.current !== 'correct') {
      sfx.playMatchFoundSound();
      customHaptic(GAME_HAPTICS.validWord);
      outcomesRef.current.set(stage, {
        reached: true,
        solved: true,
        wrongAttempts: wrongByStageRef.current[stage] ?? 0,
        hintUsed: pyramidState.hintRevealed,
      });
    } else if (pyramidState.status === 'wrong' && prevStatusRef.current !== 'wrong') {
      wrongByStageRef.current[stage] = (wrongByStageRef.current[stage] ?? 0) + 1;
      sfx.playErrorSound();
      haptic('error');
    } else if (pyramidState.status === 'gaveUp' && prevStatusRef.current !== 'gaveUp') {
      outcomesRef.current.set(stage, {
        reached: true,
        solved: false,
        wrongAttempts: wrongByStageRef.current[stage] ?? 0,
        hintUsed: pyramidState.hintRevealed,
      });
    } else if (pyramidState.status === 'won' && prevStatusRef.current !== 'won') {
      sfx.playVictorySound();
      if (!prefersReducedMotion) fireVictoryConfetti();
      outcomesRef.current.set(3, {
        reached: true,
        solved: true,
        wrongAttempts: pyramidState.wrongAttempts,
        hintUsed: pyramidState.hintRevealed,
      });
    } else if (pyramidState.status === 'lost' && prevStatusRef.current !== 'lost') {
      outcomesRef.current.set(3, {
        reached: pyramidState.stage === 3,
        solved: false,
        wrongAttempts: pyramidState.wrongAttempts,
        hintUsed: pyramidState.hintRevealed,
      });
    }
    prevStatusRef.current = pyramidState.status;
  }, [pyramidState.status, pyramidState.stage, pyramidState.hintRevealed, pyramidState.wrongAttempts, sfx, haptic, customHaptic, prefersReducedMotion]);

  const handleInput = useCallback((value: string) => setInput(value), []);
  const handleSubmit = useCallback(() => {
    if (input.trim().length > 0) {
      dispatch({ type: 'GUESS', input });
      setInput('');
    }
  }, [input]);

  const handleGiveUp = useCallback(() => {
    dispatch({ type: 'GIVE_UP' });
  }, []);

  const handleRevealHint = useCallback(() => {
    dispatch({ type: 'REVEAL_HINT' });
  }, []);

  const handleAdvance = useCallback(() => {
    dispatch({ type: 'ADVANCE' });
    setInput('');
  }, []);

  const handleRevive = useCallback(() => {
    dispatch({ type: 'REVIVE' });
    setInput('');
  }, []);

  const handleShare = useCallback(async () => {
    const baseOutcomes: readonly [BridgeOutcome, BridgeOutcome, BridgeOutcome] = [
      outcomesRef.current.get(0) ?? { reached: false, solved: false, wrongAttempts: 0, hintUsed: false },
      outcomesRef.current.get(1) ?? { reached: false, solved: false, wrongAttempts: 0, hintUsed: false },
      outcomesRef.current.get(2) ?? { reached: false, solved: false, wrongAttempts: 0, hintUsed: false },
    ];
    const finaleOutcome = outcomesRef.current.get(3) ?? {
      reached: false,
      solved: false,
      wrongAttempts: 0,
      hintUsed: false,
    };
    const url = typeof window !== 'undefined' ? `${window.location.origin}/${language}/connections/pyramid` : undefined;
    const text = buildPyramidShareGrid({
      title: t('connections.pyramid.title'),
      dateISO: today,
      base: baseOutcomes,
      finale: finaleOutcome,
      score: pyramidState.score,
      callout: t(`connections.daily.shareCallout.${gridCallout(Array.from([...baseOutcomes, finaleOutcome]))}`),
      url,
    });
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ text });
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setResults({ copied: true });
      }
    } catch {
      /* user cancelled / unsupported */
    }
  }, [t, language, today, pyramidState.score]);

  // Terminal state: won/lost
  if (isTerminal) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-6">
        <m.div
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 22 }}
          className={[
            'rounded-neo border-neo-thick bg-neo-navy-light p-5 text-center shadow-hard',
            pyramidState.status === 'won' ? 'border-neo-lime' : 'border-neo-red',
          ].join(' ')}
        >
          <PyramidProgress
            stage={3}
            solvedBridges={pyramidState.solvedBridges}
            gaveUpBase={pyramidState.gaveUpBase}
            metaAnswer={pyramid.metaAnswer}
            won={pyramidState.status === 'won'}
          />
          <h1 className="mt-4 font-neo-display text-2xl font-black text-neo-white">
            {pyramidState.status === 'won' ? t('connections.pyramid.won') : t('connections.pyramid.lost')}
          </h1>
          <div className="mt-2 flex items-center justify-center gap-2">
            <span className="font-neo-display text-lg font-black text-neo-white/70">
              {t('connections.score')}
            </span>
            <span className="font-neo-display text-xl font-black text-neo-yellow tabular-nums">
              {pyramidState.score}
            </span>
          </div>
          {pyramidState.status === 'lost' && (
            <p className="mt-3 font-neo-body text-sm text-neo-white/70">
              {t('connections.pyramid.reveal')}: <span className="font-bold text-neo-white">{pyramid.metaAnswer}</span>
            </p>
          )}
          <m.button
            type="button"
            onClick={handleShare}
            whileTap={{ scale: 0.96 }}
            className="mt-4 inline-flex items-center gap-2 rounded-neo border-neo-thick border-neo-pink bg-neo-pink px-5 py-2.5 font-neo-display font-black text-neo-navy shadow-hard"
          >
            <Share2 className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
            {results.copied ? t('connections.daily.copied') : t('connections.daily.share')}
          </m.button>
        </m.div>
      </div>
    );
  }

  // outOfLives state
  if (pyramidState.status === 'outOfLives' && !isResolved) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-6">
        <m.div
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 22 }}
          className="rounded-neo border-neo-thick border-neo-red bg-neo-navy-light p-5 text-center shadow-hard"
        >
          <h1 className="font-neo-display text-2xl font-black text-neo-red">{t('connections.outOfLives')}</h1>
          <div className="mt-4 flex flex-col gap-3">
            <m.button
              type="button"
              onClick={handleRevive}
              whileTap={{ scale: 0.96 }}
              className="rounded-neo border-neo-thick border-neo-cyan bg-neo-cyan px-5 py-2.5 font-neo-display font-black text-neo-navy shadow-hard"
            >
              {t('connections.reviveAd')}
            </m.button>
            <m.button
              type="button"
              onClick={() => {
                dispatch({ type: 'ADVANCE' });
              }}
              whileTap={{ scale: 0.96 }}
              className="rounded-neo border-neo border-neo-white/20 bg-transparent px-5 py-2.5 font-neo-display font-black text-neo-white shadow-hard hover:bg-neo-white/10 transition-colors"
            >
              {t('connections.pyramid.acceptLoss')}
            </m.button>
          </div>
        </m.div>
      </div>
    );
  }

  // Playing state
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-3 px-4 py-4" data-testid="pyramid-root">
      <header className="flex flex-col gap-2">
        <h1 className="text-center font-neo-display text-lg font-black text-neo-white">
          {t('connections.pyramid.title')}
        </h1>
        <p className="text-center font-neo-body text-xs text-neo-white/60">
          {baseStage ? t('connections.pyramid.explainer') : t('connections.pyramid.finalePrompt')}
        </p>
        <PyramidProgress
          stage={pyramidState.stage}
          solvedBridges={pyramidState.solvedBridges}
          gaveUpBase={pyramidState.gaveUpBase}
          metaAnswer={pyramid.metaAnswer}
          won={pyramidState.status === 'won'}
        />
      </header>

      {pyramidState.stage < 3 ? (
        <>
          <PuzzleCard
            puzzle={currentPuzzle!}
            state={synthGameState}
            isAdmin={isAdmin}
            onInputChange={handleInput}
            onSubmit={handleSubmit}
            onGiveUp={handleGiveUp}
            onRevealHint={handleRevealHint}
            onRate={() => {}}
            onNext={handleAdvance}
            showRating={false}
          />
        </>
      ) : (
        <FinaleCard
          bridges={pyramidState.solvedBridges}
          pyramid={pyramid}
          input={input}
          wrongAttempts={pyramidState.wrongAttempts}
          hintRevealed={pyramidState.hintRevealed}
          status={pyramidState.status}
          onInputChange={handleInput}
          onSubmit={handleSubmit}
          onGiveUp={handleGiveUp}
          onRevealHint={handleRevealHint}
          onNext={handleAdvance}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}
