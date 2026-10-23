'use client';

import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';
import Link from 'next/link';
import { Pyramid as PyramidIcon, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useHapticFeedback, GAME_HAPTICS } from '@/hooks/useHapticFeedback';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { fireVictoryConfetti } from '@/utils/confettiUtils';
import {
  initGameState,
  applyGuess,
  advancePuzzle,
  giveUp as giveUpLogic,
  revealHint as revealHintLogic,
  markRated,
  attemptsLeft,
} from '@/lib/connections/gameLogic';
import type { GameState, PuzzleRating } from '@/lib/connections/types';
import { dailyPuzzleSet, puzzlesByIds, DAILY_ATTEMPTS_PER_PUZZLE } from '@/lib/connections/daily';
import {
  todayUTC,
  getGuestFingerprint,
  submitDailyScore,
  fetchDailyLeaderboard,
  advanceClientStreak,
  markConnectionsPlayedToday,
  type LeaderboardRow,
} from '@/lib/connections/dailyClient';
import { buildDailyBridgeGrid, gridCallout, type BridgeOutcome } from '@/lib/connections/shareGrid';
import {
  trackDailyStarted,
  trackDailyBridgeResolved,
  trackDailyCompleted,
  trackDailyShared,
} from '@/lib/connections/dailyTelemetry';
import { getPyramidsForLocale } from '@/lib/connections/pyramid/puzzles';
import { saveDailyResult } from '@/lib/connections/dailyResultStore';
import { useStoredDailyResult } from './useStoredDailyResult';
import DailyHeader from './DailyHeader';
import ProgressCard from './ProgressCard';
import { useBridgeProgress } from './useBridgeProgress';
import PuzzleCard from './PuzzleCard';
import ConnectionsDailyResults from './ConnectionsDailyResults';

type Action =
  | { type: 'SET_INPUT'; input: string }
  | { type: 'SUBMIT' }
  | { type: 'ADVANCE' }
  | { type: 'GIVE_UP' }
  | { type: 'REVEAL_HINT' }
  | { type: 'MARK_RATED'; puzzleId: string };

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'SET_INPUT':
      return { ...state, input: action.input };
    case 'SUBMIT':
      return applyGuess(state, state.input);
    case 'ADVANCE':
      return advancePuzzle(state);
    case 'GIVE_UP':
      return giveUpLogic(state);
    case 'REVEAL_HINT':
      return revealHintLogic(state);
    case 'MARK_RATED':
      return markRated(state, action.puzzleId);
    default:
      return state;
  }
}

interface Results {
  loading: boolean;
  streak: number;
  rank: number | null;
  totalPlayers: number;
  rows: LeaderboardRow[];
}

/** Today's finished 5-riddle run, as persisted for a same-day revisit. */
interface StoredRegularResult {
  kind: 'regular';
  score: number;
  solvedCount: number;
  outcomes: BridgeOutcome[];
  streak: number;
  rank: number | null;
  /** The exact puzzles played — pool growth reseeds the daily, so revisits must not recompute. */
  puzzleIds?: string[];
}

interface DailyChallengeProps {
  /** Told once the run is terminal (live finish OR a restored revisit) so the host can drop in-game chrome. */
  onTerminal?: () => void;
}

/**
 * Daily Challenge — everyone plays the same deterministic 5-puzzle set for the
 * UTC day, then submits to a shared leaderboard. Reuses the tested engine and
 * PuzzleCard (on-screen keyboard); the daily set never consults the live ban
 * list so all players' games are comparable.
 *
 * A run finished today is restored straight onto its results — revisiting used
 * to restart the chain from scratch (and re-submit a second score).
 */
export default function ConnectionsDailyChallenge({ onTerminal }: DailyChallengeProps = {}) {
  const { language } = useLanguage();
  const today = useRef(todayUTC()).current;
  const stored = useStoredDailyResult<StoredRegularResult>(today, language, 'regular');
  if (!stored.checked) return null;
  if (stored.value) return <RestoredDailyResults result={stored.value} today={today} onTerminal={onTerminal} />;
  return <DailyRun today={today} onTerminal={onTerminal} />;
}

function buildShareText(
  t: (key: string) => string,
  today: string,
  outcomes: BridgeOutcome[],
  streak: number,
  rank: number | null,
): string {
  const url = typeof window !== 'undefined' ? `${window.location.origin}/connections/daily` : undefined;
  return buildDailyBridgeGrid({
    title: t('connections.title'),
    dateISO: today,
    outcomes,
    streak,
    rank,
    callout: t(`connections.daily.shareCallout.${gridCallout(outcomes)}`),
    url,
  });
}

/**
 * Pyramid is the deeper mode — offered as a quiet secondary link under the
 * results. As a full card it competed with NextQuestCta, the one primary
 * "what now" on this screen.
 */
function PyramidLink() {
  const { t, language } = useLanguage();
  if (getPyramidsForLocale(language).length === 0) return null;
  return (
    <div className="mx-auto w-full max-w-md px-4 pb-6 text-center">
      <Link
        href={`/${language}/connections/pyramid`}
        data-testid="pyramid-cta"
        className="inline-flex items-center gap-1 font-neo-body text-xs font-bold text-neo-purple underline-offset-2 hover:underline"
      >
        <PyramidIcon className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
        {t('connections.pyramid.cta')}
        <DirectionalIcon icon={ChevronRight} className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function RestoredDailyResults({
  result,
  today,
  onTerminal,
}: {
  result: StoredRegularResult;
  today: string;
  onTerminal?: () => void;
}) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [puzzles] = useState(
    () => (result.puzzleIds && puzzlesByIds(result.puzzleIds, language)) || dailyPuzzleSet(today, language),
  );
  const progressApi = useBridgeProgress();
  const [board, setBoard] = useState<{ loading: boolean; rank: number | null; totalPlayers: number; rows: LeaderboardRow[] }>({
    loading: true,
    rank: result.rank,
    totalPlayers: 0,
    rows: [],
  });

  useLayoutEffect(() => {
    onTerminal?.();
    // Once per mount — the host only needs the edge.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const guestFingerprint = user ? undefined : getGuestFingerprint();
      const lb = await fetchDailyLeaderboard(today, { guestFingerprint, limit: 50 });
      if (cancelled) return;
      setBoard({
        loading: false,
        rank: lb?.ownRank ?? result.rank,
        totalPlayers: lb?.totalPlayers ?? 0,
        rows: lb?.leaderboard ?? [],
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [today, user, result.rank]);

  return (
    <>
      <ConnectionsDailyResults
        score={result.score}
        solvedCount={result.solvedCount}
        total={puzzles.length}
        streak={result.streak}
        rank={board.rank}
        totalPlayers={board.totalPlayers}
        outcomes={result.outcomes}
        puzzles={puzzles}
        leaderboardRows={board.rows}
        isLoading={board.loading}
        shareText={buildShareText(t, today, result.outcomes, result.streak, board.rank)}
        dateISO={today}
        progressSlot={<ProgressCard api={progressApi} todayISO={today} />}
      />
      <PyramidLink />
    </>
  );
}

function DailyRun({ today, onTerminal }: { today: string; onTerminal?: () => void }) {
  const { t, language } = useLanguage();
  const { user, profile, isAdmin } = useAuth();
  const prefersReducedMotion = useReducedMotion();
  const { haptic, customHaptic } = useHapticFeedback();
  const sfx = useSoundEffects();

  const [state, dispatch] = useReducer(reducer, language, (lang) =>
    initGameState(dailyPuzzleSet(today, lang), { attemptsPerPuzzle: DAILY_ATTEMPTS_PER_PUZZLE }),
  );
  const total = state.puzzles.length;
  const progressApi = useBridgeProgress();
  const { onBridgeSolved, onDayPlayed } = progressApi;

  const startRef = useRef<number>(0);
  const solvedRef = useRef<Set<number>>(new Set());
  // Per-bridge share-grid data. wrongAttempts is zeroed by the engine on the
  // correct/give-up transition, so we tally 'wrong' transitions ourselves.
  const wrongByIndexRef = useRef<Record<number, number>>({});
  const outcomesRef = useRef<Map<number, BridgeOutcome>>(new Map());
  const prevStatusRef = useRef(state.status);
  const prevWrongAttemptsRef = useRef(state.wrongAttempts);
  const submittedRef = useRef(false);
  const [results, setResults] = useState<Results | null>(null);
  // Bumped when a puzzle is solved so the (ref-backed) progress track re-renders.
  const [, setSolvedVersion] = useState(0);

  const isTerminal = state.status === 'finished' || state.status === 'outOfLives';
  const solvedCount = solvedRef.current.size;

  // Stamp the start time once mounted (kept out of render for purity).
  useEffect(() => {
    startRef.current = Date.now();
    trackDailyStarted({ locale: language, puzzleCount: total, dateISO: today });
    // Start is stamped once per mount — re-firing on a locale change would
    // double-count the same run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Per-answer feedback (sound + haptic).
  useEffect(() => {
    const idx = state.currentIndex;
    if (state.status === 'correct' && prevStatusRef.current !== 'correct') {
      solvedRef.current.add(idx);
      setSolvedVersion((v) => v + 1);
      outcomesRef.current.set(idx, {
        reached: true,
        solved: true,
        wrongAttempts: wrongByIndexRef.current[idx] ?? 0,
        hintUsed: state.hintRevealed,
      });
      trackDailyBridgeResolved({
        locale: language,
        puzzleId: state.puzzles[idx]?.id ?? '',
        index: idx,
        solved: true,
        wrongAttempts: wrongByIndexRef.current[idx] ?? 0,
        hintUsed: state.hintRevealed,
      });
      onBridgeSolved();
      sfx.playMatchFoundSound();
      customHaptic(GAME_HAPTICS.validWord);
    } else if (
      state.status === 'wrong' &&
      // A second wrong guess on the SAME bridge leaves the status at 'wrong', so a
      // status-transition guard silently swallows every strike after the first —
      // no error sound, no buzz (player report 2026-08-12: "second strike on word
      // bridge doest not vibrate like the first"), and the per-puzzle tally that
      // feeds telemetry stopped counting too. The attempt counter is the signal.
      state.wrongAttempts !== prevWrongAttemptsRef.current
    ) {
      wrongByIndexRef.current[idx] = (wrongByIndexRef.current[idx] ?? 0) + 1;
      sfx.playErrorSound();
      haptic('error');
    } else if (
      (state.status === 'gaveUp' || state.status === 'outOfLives') &&
      prevStatusRef.current !== state.status &&
      !outcomesRef.current.has(idx)
    ) {
      // Reached but not solved (skipped, or burnt the last attempt here). The
      // attempt that triggers the reveal lands on 'gaveUp', never 'wrong', so
      // the tally above misses it — take whichever count is higher.
      const wrongAttempts = Math.max(wrongByIndexRef.current[idx] ?? 0, state.wrongAttempts);
      outcomesRef.current.set(idx, {
        reached: true,
        solved: false,
        wrongAttempts,
        hintUsed: state.hintRevealed,
      });
      trackDailyBridgeResolved({
        locale: language,
        puzzleId: state.puzzles[idx]?.id ?? '',
        index: idx,
        solved: false,
        wrongAttempts,
        hintUsed: state.hintRevealed,
      });
    }
    prevStatusRef.current = state.status;
    prevWrongAttemptsRef.current = state.wrongAttempts;
  }, [state.status, state.currentIndex, state.hintRevealed, state.wrongAttempts, state.puzzles, language, sfx, haptic, customHaptic, onBridgeSolved]);

  // Spoiler-free "story of the chain" — shared by the on-card recap + share text.
  const collectOutcomes = useCallback((): BridgeOutcome[] =>
    Array.from({ length: total }, (_, i) =>
      outcomesRef.current.get(i) ?? { reached: false, solved: false, wrongAttempts: 0, hintUsed: false },
    ), [total]);

  // Tell the host before paint so its in-game chrome (skip/back) never
  // lingers beside the results' own controls.
  const onTerminalRef = useRef(onTerminal);
  onTerminalRef.current = onTerminal;
  useLayoutEffect(() => {
    if (isTerminal) onTerminalRef.current?.();
  }, [isTerminal]);

  // On finish: submit the result (once) and load the leaderboard.
  useEffect(() => {
    if (!isTerminal || submittedRef.current) return;
    submittedRef.current = true;

    // Reliable "played today" marker for cross-promo gating — written for both
    // authed and guest players (the streak alone is server-resolved for authed
    // players and never persisted locally). See hasPlayedConnectionsToday.
    markConnectionsPlayedToday(today);
    onDayPlayed(today);

    const timeTakenSeconds = startRef.current ? Math.max(0, Math.floor((Date.now() - startRef.current) / 1000)) : 0;
    const puzzlesSolved = solvedRef.current.size;
    // Persist the terminal run so a same-day revisit opens on these results.
    const finalOutcomes = collectOutcomes();
    const persist = (streak: number, rank: number | null) =>
      saveDailyResult(today, language, {
        kind: 'regular',
        score: state.score,
        solvedCount: puzzlesSolved,
        outcomes: finalOutcomes,
        streak,
        rank,
        puzzleIds: state.puzzles.map((p) => p.id),
      } satisfies StoredRegularResult);
    persist(0, null);
    if (puzzlesSolved > 0) {
      sfx.playVictorySound();
      if (!prefersReducedMotion) fireVictoryConfetti();
    }
    trackDailyCompleted({
      locale: language,
      solved: puzzlesSolved,
      total,
      score: state.score,
      durationSeconds: timeTakenSeconds,
    });
    setResults({ loading: true, streak: 0, rank: null, totalPlayers: 0, rows: [] });

    const displayName = profile?.display_name || profile?.username || t('connections.daily.guestName');
    void (async () => {
      const guestFingerprint = user ? undefined : getGuestFingerprint();
      const submitRes = await submitDailyScore({
        puzzleDate: today,
        language,
        displayName,
        score: state.score,
        timeTakenSeconds,
        puzzlesSolved,
        guestFingerprint,
        avatarEmoji: profile?.avatar_emoji,
        avatarColor: profile?.avatar_color,
        avatarImage: profile?.avatar_image,
      });
      const streak = submitRes?.streak ?? advanceClientStreak(today).streak;
      const lb = await fetchDailyLeaderboard(today, { guestFingerprint, limit: 50 });
      persist(streak, submitRes?.currentRank ?? lb?.ownRank ?? null);
      setResults({
        loading: false,
        streak,
        rank: submitRes?.currentRank ?? lb?.ownRank ?? null,
        totalPlayers: submitRes?.totalPlayers ?? lb?.totalPlayers ?? 0,
        rows: lb?.leaderboard ?? [],
      });
    })();
  }, [isTerminal, prefersReducedMotion, profile, user, today, language, state.score, state.puzzles, total, sfx, t, collectOutcomes, onDayPlayed]);

  const handleInput = useCallback((value: string) => dispatch({ type: 'SET_INPUT', input: value }), []);
  const handleSubmit = useCallback(() => dispatch({ type: 'SUBMIT' }), []);
  const handleGiveUp = useCallback(() => dispatch({ type: 'GIVE_UP' }), []);
  const handleRevealHint = useCallback(() => dispatch({ type: 'REVEAL_HINT' }), []);
  const handleAdvance = useCallback(() => dispatch({ type: 'ADVANCE' }), []);
  const handleRate = useCallback((_r: PuzzleRating) => {
    const puzzle = state.puzzles[state.currentIndex];
    if (puzzle) dispatch({ type: 'MARK_RATED', puzzleId: puzzle.id });
  }, [state.puzzles, state.currentIndex]);

  // Paste-text share path — plain text only, never emoji (stripped in
  // buildDailyBridgeGrid; the unfurl is the page's og:image). Built once the run is terminal; the results card's
  // copy/native-share buttons put exactly this on the clipboard.
  const shareTextFor = useCallback(
    (): string => buildShareText(t, today, collectOutcomes(), results?.streak ?? 0, results?.rank ?? null),
    [t, today, results, collectOutcomes],
  );

  const handleShareClick = useCallback((_method: 'native' | 'copy') => {
    const outcomes = collectOutcomes();
    trackDailyShared({ locale: language, solved: outcomes.filter((o) => o.solved).length, total });
  }, [collectOutcomes, language, total]);

  if (isTerminal) {
    return (
      <>
        <ConnectionsDailyResults
          score={state.score}
          solvedCount={solvedCount}
          total={total}
          streak={results?.streak ?? 0}
          rank={results?.rank ?? null}
          totalPlayers={results?.totalPlayers ?? 0}
          outcomes={collectOutcomes()}
          puzzles={state.puzzles}
          leaderboardRows={results?.rows ?? []}
          isLoading={results?.loading ?? true}
          shareText={shareTextFor()}
          dateISO={today}
          onShareClick={handleShareClick}
          progressSlot={<ProgressCard api={progressApi} todayISO={today} />}
        />

        <PyramidLink />
      </>
    );
  }

  const currentPuzzle = state.puzzles[state.currentIndex];
  if (!currentPuzzle) return null;
  const remaining = attemptsLeft(state);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-3 px-4 py-4">
      <DailyHeader
        score={state.score}
        currentIndex={state.currentIndex}
        total={total}
        attemptsLeft={remaining}
        solvedIndices={solvedRef.current}
        difficulties={state.puzzles.map((p) => p.difficulty)}
        standing={progressApi.standing}
        rankUpId={progressApi.rankUpId}
        onRankUpShown={progressApi.dismissRankUp}
      />
      <PuzzleCard
        puzzle={currentPuzzle}
        state={state}
        isAdmin={isAdmin}
        onInputChange={handleInput}
        onSubmit={handleSubmit}
        onGiveUp={handleGiveUp}
        onRevealHint={handleRevealHint}
        onRate={handleRate}
        onNext={handleAdvance}
      />
    </div>
  );
}
