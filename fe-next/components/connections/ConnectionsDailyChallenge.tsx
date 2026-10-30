'use client';

import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useHapticFeedback, GAME_HAPTICS } from '@/hooks/useHapticFeedback';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
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
import { dailyPuzzleSet, DAILY_ATTEMPTS_PER_PUZZLE } from '@/lib/connections/daily';
import {
  todayUTC,
  fetchDailyLeaderboard,
  advanceClientStreak,
  markConnectionsPlayedToday,
  type SubmitOutcome,
} from '@/lib/connections/dailyClient';
import type { BridgeOutcome } from '@/lib/connections/shareGrid';
import {
  trackDailyStarted,
  trackDailyBridgeResolved,
  trackDailyCompleted,
  trackDailyShared,
} from '@/lib/connections/dailyTelemetry';
import { patchDailyResult, saveDailyResult } from '@/lib/connections/dailyResultStore';
import { clearDailyRun, loadDailyRun, restoreGameState, saveDailyRun } from '@/lib/connections/dailyRunStore';
import { useStoredDailyResult } from './useStoredDailyResult';
import RestoredDailyResults, { buildShareText, PyramidLink, type DailyBoard, type StoredRegularResult } from './RestoredDailyResults';
import ScoreSaveNotice from './ScoreSaveNotice';
import { useDailyScoreSave } from './useDailyScoreSave';
import { useActiveTime } from './useActiveTime';
import DailyHeader from './DailyHeader';
import ProgressCard from './ProgressCard';
import { useBridgeProgress } from './useBridgeProgress';
import PuzzleCard from './PuzzleCard';
import { DailyLeftRail, DailyRightRail } from './DailyShellRails';
import { GameShell, SHELL_MEDIA } from '@/components/game/shell';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import RegularDailyResults, { regularTier } from './RegularDailyResults';
import BridgeFinishBeat, { useFinishBeat } from './BridgeFinishBeat';

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

interface DailyChallengeProps {
  /** Told once the run is terminal (live finish OR a restored revisit) so the host can drop in-game chrome. */
  onTerminal?: () => void;
  /** The host's frozen UTC day, so a run that crosses midnight stays on the day it started. */
  today?: string;
  /** The how-to sheet is open over the run: the clock stops. */
  paused?: boolean;
}

/**
 * Daily Challenge — everyone plays the same deterministic 5-puzzle set for the
 * UTC day, then submits to a shared leaderboard. Reuses the tested engine and
 * PuzzleCard (on-screen keyboard); the daily set never consults the live ban
 * list so all players' games are comparable.
 *
 * A run finished today is restored straight onto its results, and an
 * unfinished one resumes where it was left.
 */
export default function ConnectionsDailyChallenge({ onTerminal, today: hostToday, paused = false }: DailyChallengeProps = {}) {
  const { language } = useLanguage();
  const ownToday = useRef(todayUTC()).current;
  const today = hostToday ?? ownToday;
  const stored = useStoredDailyResult<StoredRegularResult>(today, language, 'regular');
  if (!stored.checked) return null;
  if (stored.value) return <RestoredDailyResults result={stored.value} today={today} onTerminal={onTerminal} />;
  return <DailyRun today={today} paused={paused} onTerminal={onTerminal} />;
}

function DailyRun({ today, paused, onTerminal }: { today: string; paused: boolean; onTerminal?: () => void }) {
  const { t, language } = useLanguage();
  const { profile, isAdmin } = useAuth();
  const { haptic, customHaptic } = useHapticFeedback();
  const sfx = useSoundEffects();

  // Mounted only after the host's storage read, so reading the saved run here never runs during SSR.
  const [resumed] = useState(() => {
    const run = loadDailyRun(today);
    const restored = run ? restoreGameState(run) : null;
    return run && restored ? { run, state: restored } : null;
  });
  const runLanguage = resumed?.run.language ?? language;
  const [state, dispatch] = useReducer(reducer, null, () =>
    resumed?.state ?? initGameState(dailyPuzzleSet(today, language), { attemptsPerPuzzle: DAILY_ATTEMPTS_PER_PUZZLE }),
  );
  const total = state.puzzles.length;
  const progressApi = useBridgeProgress();
  const inShell = useMediaQuery(SHELL_MEDIA);
  const { onBridgeSolved, onDayPlayed } = progressApi;

  const elapsedMs = useActiveTime(resumed?.run.elapsedMs ?? 0, paused);
  const solvedRef = useRef<Set<number>>(new Set(resumed?.run.solved ?? []));
  // Per-bridge share-grid data. wrongAttempts is zeroed by the engine on the
  // correct/give-up transition, so we tally 'wrong' transitions ourselves.
  const wrongByIndexRef = useRef<Record<number, number>>({ ...resumed?.run.wrongByIndex });
  const outcomesRef = useRef<Map<number, BridgeOutcome>>(new Map(resumed?.run.outcomes ?? []));
  const prevStatusRef = useRef(state.status);
  const prevWrongAttemptsRef = useRef(state.wrongAttempts);
  const submittedRef = useRef(false);
  const [results, setResults] = useState<DailyBoard & { streak: number } | null>(null);
  // Bumped when a puzzle is solved so the (ref-backed) progress track re-renders.
  const [, setSolvedVersion] = useState(0);

  // Attempts are budgeted per puzzle, so the daily never runs out of lives: it only finishes.
  const isTerminal = state.status === 'finished';
  const solvedCount = solvedRef.current.size;
  const beat = useFinishBeat(isTerminal);

  useEffect(() => {
    if (!resumed) trackDailyStarted({ locale: language, puzzleCount: total, dateISO: today });
    // Once per run — a resumed run was already counted, and a locale change must not double-count.
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
      state.status === 'gaveUp' &&
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

  const started = state.currentIndex > 0 || state.wrongAttempts > 0 || state.hintRevealed || state.status !== 'playing';
  useEffect(() => {
    // An untouched run reveals nothing, so it must not pin the day to this language.
    if (isTerminal || !started) return;
    saveDailyRun(today, runLanguage, {
      state,
      solved: [...solvedRef.current],
      wrongByIndex: wrongByIndexRef.current,
      outcomes: [...outcomesRef.current.entries()],
      elapsedMs: elapsedMs(),
    });
  }, [state, isTerminal, started, today, runLanguage, elapsedMs]);

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

  const afterSave = useCallback(
    async (outcome: SubmitOutcome) => {
      const saved = outcome.status === 'saved' ? outcome.result : null;
      const streak = saved?.streak ?? advanceClientStreak(today).streak;
      const lb = await fetchDailyLeaderboard(today, { limit: 50 });
      const rank = saved?.currentRank ?? lb?.ownRank ?? null;
      patchDailyResult(today, { streak, rank });
      setResults({
        loading: false,
        streak,
        rank,
        totalPlayers: saved?.totalPlayers ?? lb?.totalPlayers ?? 0,
        rows: lb?.leaderboard ?? [],
      });
    },
    [today],
  );
  const save = useDailyScoreSave(today, (outcome) => void afterSave(outcome));

  // On finish: submit the result (once) and load the leaderboard.
  const { send } = save;
  useEffect(() => {
    if (!isTerminal || submittedRef.current) return;
    submittedRef.current = true;

    // Reliable "played today" marker for cross-promo gating — written for both
    // authed and guest players (the streak alone is server-resolved for authed
    // players and never persisted locally). See hasPlayedConnectionsToday.
    markConnectionsPlayedToday(today);
    onDayPlayed(today);

    const timeTakenSeconds = Math.floor(elapsedMs() / 1000);
    const puzzlesSolved = solvedRef.current.size;
    const puzzleIds = state.puzzles.map((p) => p.id);
    const displayName = profile?.display_name || profile?.username || t('connections.daily.guestName');
    const payload = {
      puzzleDate: today,
      language: runLanguage,
      displayName,
      score: state.score,
      timeTakenSeconds,
      puzzlesSolved,
      puzzleIds,
      avatarEmoji: profile?.avatar_emoji,
      avatarColor: profile?.avatar_color,
      avatarImage: profile?.avatar_image,
    };
    // Persist the terminal run so a same-day revisit opens on these results —
    // with the payload, so a save that fails is retried on the next visit.
    saveDailyResult(today, runLanguage, {
      kind: 'regular',
      score: state.score,
      solvedCount: puzzlesSolved,
      outcomes: collectOutcomes(),
      streak: 0,
      rank: null,
      puzzleIds,
      pendingSubmit: payload,
    } satisfies StoredRegularResult);
    clearDailyRun(today);
    if (puzzlesSolved > 0) sfx.playVictorySound();
    trackDailyCompleted({
      locale: runLanguage,
      solved: puzzlesSolved,
      total,
      score: state.score,
      durationSeconds: timeTakenSeconds,
    });
    setResults({ loading: true, streak: 0, rank: null, totalPlayers: 0, rows: [] });
    void send(payload);
  }, [isTerminal, profile, today, runLanguage, state.score, state.puzzles, total, sfx, t, collectOutcomes, onDayPlayed, elapsedMs, send]);

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

  if (isTerminal && beat.showing) {
    return (
      <BridgeFinishBeat
        planks={state.puzzles.map((p, i) => ({ word: p.bridge, solved: solvedRef.current.has(i) }))}
        headline={t(regularTier(state.score, solvedCount, total).key)}
        onDone={beat.done}
      />
    );
  }

  if (isTerminal) {
    return (
      <>
        <RegularDailyResults
          score={state.score}
          solvedCount={solvedCount}
          outcomes={collectOutcomes()}
          puzzles={state.puzzles}
          dateISO={today}
          celebrate
          shareText={shareTextFor()}
          onShareClick={handleShareClick}
          progressSlot={<ProgressCard api={progressApi} todayISO={today} />}
          notice={<ScoreSaveNotice save={save} />}
          board={{
            rows: results?.rows ?? [],
            rank: results?.rank ?? null,
            totalPlayers: results?.totalPlayers ?? 0,
            loading: results?.loading ?? true,
          }}
        />

        <PyramidLink />
      </>
    );
  }

  const currentPuzzle = state.puzzles[state.currentIndex];
  if (!currentPuzzle) return null;
  const remaining = attemptsLeft(state);

  const headerProps = {
    score: state.score,
    currentIndex: state.currentIndex,
    total,
    attemptsLeft: remaining,
    solvedIndices: solvedRef.current,
    difficulties: state.puzzles.map((p) => p.difficulty),
    standing: progressApi.standing,
    rankUpId: progressApi.rankUpId,
    onRankUpShown: progressApi.dismissRankUp,
  };
  const solvedWords = state.puzzles.filter((_, i) => solvedRef.current.has(i)).map((p) => p.bridge);

  return (
    <GameShell
      mode="word-bridge"
      accent="purple"
      left={inShell ? <DailyLeftRail t={t} header={<DailyHeader {...headerProps} variant="rail" />} /> : null}
      right={inShell ? <DailyRightRail t={t} solvedWords={solvedWords} /> : null}
    >
      <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col gap-2 px-3 pb-3 pt-1 shell:max-w-none shell:p-0">
        {!inShell && <DailyHeader {...headerProps} />}
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
          skipAfterMisses={2}
        />
      </div>
    </GameShell>
  );
}
