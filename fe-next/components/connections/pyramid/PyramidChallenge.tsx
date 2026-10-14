'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { m } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { PageLoader } from '@/components/ui/PageLoader';
import { useRewardedFeatureUnlock } from '@/hooks/useRewardedFeatureUnlock';
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
import { getSolvedIds, markSolved } from '@/lib/connections/solvedStore';
import { getPyramidsForLocale } from '@/lib/connections/pyramid/puzzles';
import type { PyramidPuzzle } from '@/lib/connections/pyramid/types';
import { todayUTC, markConnectionsPlayedToday, advanceClientStreak } from '@/lib/connections/dailyClient';
import { loadDailySnapshot, saveDailySnapshot, type DailyPyramidSnapshot } from '@/lib/connections/dailySnapshot';
import type { BridgeOutcome } from '@/lib/connections/shareGrid';
import type { GameState } from '@/lib/connections/types';
import PyramidHeader from './PyramidHeader';
import PyramidResultCard from './PyramidResultCard';
import { PyramidLeftRail, PyramidRightRail } from './PyramidShellRails';
import { GameShell, SHELL_MEDIA } from '@/components/game/shell';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import FinaleCard from './FinaleCard';
import PuzzleCard from '../PuzzleCard';
import ConnectionsMascot from '../ConnectionsMascot';

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
 *
 * `sharePath` — when the run is hosted as the day's daily variant
 * (/connections/daily), share links point back at the daily host so
 * recipients land on the same quest; standalone play keeps the pyramid route.
 *
 * `daily` — hosted as the day's Word Bridge quest: a finished run is kept for
 * the rest of the UTC day and comes back on re-open (a won pyramid is marked
 * solved, so without it a reload served a DIFFERENT pyramid), and the result
 * hands off to the next daily quest.
 */
export default function PyramidChallenge({ sharePath, daily = false }: { sharePath?: string; daily?: boolean } = {}) {
  // Null-guard wrapper: the early return must happen BEFORE any of the run's
  // hooks mount (rules-of-hooks), so the actual game lives in PyramidRun.
  const { t, language } = useLanguage();
  const today = useRef(todayUTC()).current;
  const [solvedPyramids] = useState<ReadonlySet<string>>(() => getSolvedIds('pyramid', language));
  // undefined = not read yet. Read after mount (storage is client-only); until
  // then the daily host shows a loader, never a board that flips to results.
  const [finished, setFinished] = useState<{ snap: DailyPyramidSnapshot; pyramid: PyramidPuzzle } | null | undefined>(
    daily ? undefined : null,
  );
  useEffect(() => {
    if (!daily) return;
    const snap = loadDailySnapshot(today);
    const found =
      snap?.kind === 'pyramid' ? getPyramidsForLocale(snap.language).find((p) => p.id === snap.pyramidId) : undefined;
    setFinished(snap?.kind === 'pyramid' && found ? { snap, pyramid: found } : null);
  }, [daily, today]);

  if (finished === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <PageLoader size="lg" text={t('connections.loading')} />
      </div>
    );
  }
  if (finished) {
    const { snap, pyramid: done } = finished;
    return (
      <PyramidResultCard
        revisit
        daily
        pyramid={done}
        won={snap.won}
        score={snap.score}
        gaveUpBase={[!!snap.gaveUpBase[0], !!snap.gaveUpBase[1], !!snap.gaveUpBase[2]]}
        solvedBridges={done.base.map((b, i) => (snap.outcomes[i]?.reached ? b.bridge : ''))}
        streak={snap.streak}
        outcomes={snap.outcomes}
        dateISO={snap.dateISO}
        sharePath={sharePath}
      />
    );
  }

  const pyramid = dailyPyramid(today, language, solvedPyramids);
  if (!pyramid) return null;
  return <PyramidRun pyramid={pyramid} today={today} sharePath={sharePath} daily={daily} />;
}

function PyramidRun({
  pyramid,
  today,
  sharePath,
  daily,
}: {
  pyramid: NonNullable<ReturnType<typeof dailyPyramid>>;
  today: string;
  sharePath?: string;
  daily: boolean;
}) {
  const { t, language } = useLanguage();
  const { isAdmin } = useAuth();
  const prefersReducedMotion = useReducedMotion();
  const { haptic, customHaptic } = useHapticFeedback();
  const sfx = useSoundEffects();
  const inShell = useMediaQuery(SHELL_MEDIA);

  const [pyramidState, dispatch] = useReducer(reducer, pyramid, initPyramidState);
  const [input, setInput] = useState('');

  const startRef = useRef<number>(0);
  const wrongByStageRef = useRef<Record<number, number>>({});
  const outcomesRef = useRef<Map<number, BridgeOutcome>>(new Map());
  const prevStatusRef = useRef(pyramidState.status);

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

  // Daily-parity: finishing a pyramid (won OR lost) counts as playing the Word
  // Bridge daily quest. The 5-riddle daily writes the same markers on its own
  // terminal, so without this a pyramid day would show an unplayed quest card
  // and silently break the day streak. Stamped once — the terminal effect can
  // re-fire on unrelated re-renders.
  const dailyStampedRef = useRef(false);
  const [clientStreak, setClientStreak] = useState(0);
  useEffect(() => {
    if (!isTerminal || dailyStampedRef.current) return;
    dailyStampedRef.current = true;
    markConnectionsPlayedToday(today);
    setClientStreak(advanceClientStreak(today).streak);
  }, [isTerminal, today]);

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
      // Beaten pyramids never come back — future days pick from unsolved ones.
      if (pyramid) markSolved('pyramid', language, pyramid.id);
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
  }, [pyramidState.status, pyramidState.stage, pyramidState.hintRevealed, pyramidState.wrongAttempts, sfx, haptic, customHaptic, prefersReducedMotion, pyramid, language]);

  const collectOutcomes = useCallback(
    (): BridgeOutcome[] =>
      [0, 1, 2, 3].map(
        (i) => outcomesRef.current.get(i) ?? { reached: false, solved: false, wrongAttempts: 0, hintUsed: false },
      ),
    [],
  );

  // As the daily quest, keep the finished run for today. Runs after the outcome
  // tracker above so the finale's outcome is already recorded; re-saves once
  // when the day streak (set by the stamp effect in the same commit) lands.
  const savedStreakRef = useRef<number | null>(null);
  useEffect(() => {
    if (!daily || !isTerminal || savedStreakRef.current === clientStreak) return;
    savedStreakRef.current = clientStreak;
    saveDailySnapshot({
      kind: 'pyramid',
      dateISO: today,
      language,
      pyramidId: pyramid.id,
      won: pyramidState.status === 'won',
      score: pyramidState.score,
      gaveUpBase: [...pyramidState.gaveUpBase],
      outcomes: collectOutcomes(),
      streak: clientStreak,
    });
  }, [daily, isTerminal, today, language, pyramid.id, pyramidState.status, pyramidState.score, pyramidState.gaveUpBase, clientStreak, collectOutcomes]);

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

  // The revive button used to call handleRevive directly — it was LABELLED
  // "watch an ad" but granted the revive for free. Gate it on a real rewarded
  // ad (admins keep the free refill).
  const reviveAd = useRewardedFeatureUnlock({
    placement: 'connections_pyramid_revive',
    surface: 'retry',
    onUnlock: handleRevive,
    disabled: isAdmin || pyramidState.status !== 'outOfLives',
    context: { pyramidId: pyramid.id, stage: pyramidState.stage },
  });

  // Terminal state: won/lost
  if (isTerminal) {
    return (
      <PyramidResultCard
        pyramid={pyramid}
        won={pyramidState.status === 'won'}
        score={pyramidState.score}
        gaveUpBase={pyramidState.gaveUpBase}
        solvedBridges={pyramidState.solvedBridges}
        streak={clientStreak}
        outcomes={collectOutcomes()}
        dateISO={today}
        sharePath={sharePath}
        daily={daily}
      />
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
          <ConnectionsMascot status="outOfLives" className="mb-2 h-20 w-20" />
          <h1 className="font-neo-display text-2xl font-black text-neo-red">{t('connections.outOfLives')}</h1>
          <p className="mt-2 font-neo-body text-sm text-neo-white/70">{t('connections.reviveDescription')}</p>
          <div className="mt-4 flex flex-col gap-3">
            {isAdmin ? (
              <m.button
                type="button"
                onClick={handleRevive}
                whileTap={{ scale: 0.96 }}
                className="rounded-neo border-neo-thick border-neo-cyan bg-neo-cyan px-5 py-2.5 font-neo-display font-black text-neo-navy shadow-hard"
              >
                {t('connections.adminRefill')}
              </m.button>
            ) : reviveAd.canShowAd ? (
              <m.button
                type="button"
                data-testid="pyramid-revive-ad"
                onClick={reviveAd.offer}
                whileTap={{ scale: 0.96 }}
                disabled={reviveAd.status === 'loading' || reviveAd.status === 'showing'}
                className="rounded-neo border-neo-thick border-neo-cyan bg-neo-cyan px-5 py-2.5 font-neo-display font-black text-neo-navy shadow-hard disabled:opacity-60"
              >
                {t('connections.reviveAd')}
              </m.button>
            ) : (
              <p className="font-neo-body text-xs text-neo-white/50">{t('connections.noAdAvailable')}</p>
            )}
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
    <GameShell
      mode="word-chain"
      accent="purple"
      left={inShell ? <PyramidLeftRail t={t} state={pyramidState} metaAnswer={pyramid.metaAnswer} /> : null}
      right={<PyramidRightRail t={t} state={pyramidState} />}
    >
    <div className="mx-auto flex w-full max-w-md flex-col gap-3 px-4 py-4 shell:my-auto shell:max-w-[40rem] shell:px-0" data-testid="pyramid-root">
      {!inShell && <PyramidHeader state={pyramidState} metaAnswer={pyramid.metaAnswer} />}

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
    </GameShell>
  );
}
