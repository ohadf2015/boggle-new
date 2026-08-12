'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import Link from 'next/link';
import { m } from 'framer-motion';
import { Share2, Flame, Target, Pyramid as PyramidIcon, Heart, ChevronRight } from 'lucide-react';
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
import { dailyPuzzleSet, DAILY_ATTEMPTS_PER_PUZZLE } from '@/lib/connections/daily';
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
import { earnedMedal } from '@/lib/connections/progressTrack';
import ConnectionsProgressTrack from './ConnectionsProgressTrack';
import { MedalArt } from './ConnectionsRewardArt';
import PuzzleCard from './PuzzleCard';
import ConnectionsLeaderboard from './ConnectionsLeaderboard';
import DailyResultRecap from './DailyResultRecap';
import DailyAnswerKey from './DailyAnswerKey';
import ResultsBannerSlot from '@/components/ads/ResultsBannerSlot';

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

/**
 * Daily Challenge — everyone plays the same deterministic 5-puzzle set for the
 * UTC day, then submits to a shared leaderboard. Reuses the tested engine and
 * PuzzleCard (on-screen keyboard); the daily set never consults the live ban
 * list so all players' games are comparable.
 */
export default function ConnectionsDailyChallenge() {
  const { t, language } = useLanguage();
  const { user, profile, isAdmin } = useAuth();
  const prefersReducedMotion = useReducedMotion();
  const { haptic, customHaptic } = useHapticFeedback();
  const sfx = useSoundEffects();

  const today = useRef(todayUTC()).current;
  const [state, dispatch] = useReducer(reducer, language, (lang) =>
    initGameState(dailyPuzzleSet(today, lang), { attemptsPerPuzzle: DAILY_ATTEMPTS_PER_PUZZLE }),
  );
  const total = state.puzzles.length;

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
  const [copied, setCopied] = useState(false);
  // Bumped when a puzzle is solved so the (ref-backed) progress track re-renders.
  const [solvedVersion, setSolvedVersion] = useState(0);

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
  }, [state.status, state.currentIndex, state.hintRevealed, state.wrongAttempts, state.puzzles, language, sfx, haptic, customHaptic]);

  // On finish: submit the result (once) and load the leaderboard.
  useEffect(() => {
    if (!isTerminal || submittedRef.current) return;
    submittedRef.current = true;

    // Reliable "played today" marker for cross-promo gating — written for both
    // authed and guest players (the streak alone is server-resolved for authed
    // players and never persisted locally). See hasPlayedConnectionsToday.
    markConnectionsPlayedToday(today);

    const timeTakenSeconds = startRef.current ? Math.max(0, Math.floor((Date.now() - startRef.current) / 1000)) : 0;
    const puzzlesSolved = solvedRef.current.size;
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
      setResults({
        loading: false,
        streak,
        rank: submitRes?.currentRank ?? lb?.ownRank ?? null,
        totalPlayers: submitRes?.totalPlayers ?? lb?.totalPlayers ?? 0,
        rows: lb?.leaderboard ?? [],
      });
    })();
  }, [isTerminal, prefersReducedMotion, profile, user, today, language, state.score, total, sfx, t]);

  const handleInput = useCallback((value: string) => dispatch({ type: 'SET_INPUT', input: value }), []);
  const handleSubmit = useCallback(() => dispatch({ type: 'SUBMIT' }), []);
  const handleGiveUp = useCallback(() => dispatch({ type: 'GIVE_UP' }), []);
  const handleRevealHint = useCallback(() => dispatch({ type: 'REVEAL_HINT' }), []);
  const handleAdvance = useCallback(() => dispatch({ type: 'ADVANCE' }), []);
  const handleRate = useCallback((_r: PuzzleRating) => {
    const puzzle = state.puzzles[state.currentIndex];
    if (puzzle) dispatch({ type: 'MARK_RATED', puzzleId: puzzle.id });
  }, [state.puzzles, state.currentIndex]);

  // Spoiler-free "story of the chain" — shared by the on-card recap + share text.
  const collectOutcomes = useCallback((): BridgeOutcome[] =>
    Array.from({ length: total }, (_, i) =>
      outcomesRef.current.get(i) ?? { reached: false, solved: false, wrongAttempts: 0, hintUsed: false },
    ), [total]);

  const handleShare = useCallback(async () => {
    const outcomes = collectOutcomes();
    trackDailyShared({ locale: language, solved: outcomes.filter((o) => o.solved).length, total });
    const url = typeof window !== 'undefined' ? `${window.location.origin}/connections/daily` : undefined;
    const text = buildDailyBridgeGrid({
      title: t('connections.title'),
      dateISO: today,
      outcomes,
      streak: results?.streak ?? 0,
      rank: results?.rank ?? null,
      callout: t(`connections.daily.shareCallout.${gridCallout(outcomes)}`),
      url,
    });
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ text });
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setCopied(true);
      }
    } catch {
      /* user cancelled / unsupported */
    }
  }, [t, today, results, collectOutcomes, language, total]);

  if (isTerminal) {
    const blanked = solvedCount === 0;
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-6">
        <m.div
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 22 }}
          className={`rounded-neo border-neo-thick bg-neo-navy-light p-5 text-center shadow-hard ${
            blanked ? 'border-neo-cyan' : 'border-neo-lime'
          }`}
        >
          {(() => {
            const medal = earnedMedal(solvedCount, total);
            if (medal === 'none') return null;
            return (
              <div className="mb-2 flex flex-col items-center">
                <MedalArt medal={medal} size={104} />
                <span className="-mt-1 font-neo-display text-sm font-black uppercase tracking-[0.15em] text-neo-yellow">
                  {t(`connections.daily.medal.${medal}`)}
                </span>
              </div>
            );
          })()}
          <h1 className="font-neo-display text-2xl font-black text-neo-white">
            {t(blanked ? 'connections.daily.completeTough' : 'connections.daily.complete')}
          </h1>
          {/* A blanked run gets encouragement + the answer key instead of a bare
              "0 solved / Score: 0", which read as a punishment and taught nothing. */}
          {blanked ? (
            <p className="mx-auto mt-2 max-w-[19rem] font-neo-body text-sm text-neo-white/75">
              {t('connections.daily.zeroSolved', { total })}
            </p>
          ) : (
            <>
              <div className="mt-3 flex items-center justify-center gap-4">
                <span className="inline-flex items-center gap-1.5 font-neo-display text-lg font-black text-neo-cyan">
                  <Target className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
                  {t('connections.daily.solved', { count: solvedCount, total })}
                </span>
                <span className="inline-flex items-center gap-1.5 font-neo-display text-lg font-black text-neo-orange">
                  <Flame className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
                  {results?.streak ?? 0}
                </span>
              </div>
              <p className="mt-1 font-neo-body text-sm text-neo-white/70">
                {t('connections.score')}: <span className="font-bold text-neo-white">{state.score.toLocaleString()}</span>
              </p>
            </>
          )}
          <div className="mt-3">
            <DailyResultRecap outcomes={collectOutcomes()} nextLabel={t('connections.daily.nextIn')} />
          </div>
          <div className="mt-4">
            <DailyAnswerKey
              puzzles={state.puzzles}
              solvedIndices={solvedRef.current}
              title={t('connections.daily.answerKey')}
              isRTL={language === 'he'}
            />
          </div>
          <m.button
            type="button"
            onClick={handleShare}
            whileTap={{ scale: 0.96 }}
            className="mt-4 inline-flex items-center gap-2 rounded-neo border-neo-thick border-neo-pink bg-neo-pink px-5 py-2.5 font-neo-display font-black text-neo-navy shadow-hard"
          >
            <Share2 className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
            {copied ? t('connections.daily.copied') : t('connections.daily.share')}
          </m.button>
        </m.div>

        {/* Pyramid is the deeper mode and the natural next step once the day's
            5 bridges are spent — promoted from a thin text link to a real card. */}
        {getPyramidsForLocale(language).length > 0 && (
          <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <Link
              href={`/${language}/connections/pyramid`}
              data-testid="pyramid-cta"
              className="flex items-center gap-3 rounded-neo border-neo-thick border-neo-purple bg-neo-purple/15 p-4 shadow-hard transition-transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-neo border-neo border-neo-purple bg-neo-purple/25">
                <PyramidIcon className="h-6 w-6 text-neo-purple" strokeWidth={2.5} aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col text-start">
                <span className="font-neo-display text-base font-black text-neo-purple">
                  {t('connections.pyramid.cta')}
                </span>
                <span className="font-neo-body text-xs text-neo-white/70">{t('connections.pyramid.tagline')}</span>
              </span>
              <DirectionalIcon icon={ChevronRight} className="h-5 w-5 shrink-0 text-neo-purple" />
            </Link>
          </m.div>
        )}

        <ResultsBannerSlot placement="daily-complete" />

        <ConnectionsLeaderboard
          rows={results?.rows ?? []}
          ownRank={results?.rank ?? null}
          totalPlayers={results?.totalPlayers ?? 0}
          streak={results?.streak ?? 0}
          loading={results?.loading ?? true}
        />
      </div>
    );
  }

  const currentPuzzle = state.puzzles[state.currentIndex];
  if (!currentPuzzle) return null;
  const remaining = attemptsLeft(state);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-3 px-4 py-4">
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h1 className="font-neo-display text-lg font-black text-neo-white">{t('connections.daily.title')}</h1>
          <span data-testid="daily-progress" className="font-mono text-sm font-bold text-neo-cyan tabular-nums">
            {state.currentIndex + 1} / {total}
          </span>
        </div>
        {/* Attempts were spent invisibly before — the player only found out the
            budget existed when the run ended. Show it, per bridge. */}
        <div
          data-testid="daily-attempts"
          data-remaining={remaining}
          className="flex items-center justify-end gap-1.5"
          aria-label={t('connections.daily.triesLeft', { count: remaining })}
        >
          {remaining === 1 && (
            <span className="font-neo-body text-[0.7rem] font-bold uppercase tracking-wider text-neo-red">
              {t('connections.daily.lastTry')}
            </span>
          )}
          {Array.from({ length: DAILY_ATTEMPTS_PER_PUZZLE }, (_, i) => (
            <Heart
              key={i}
              aria-hidden="true"
              className={`h-4 w-4 transition-colors duration-200 ${
                i < remaining ? 'fill-neo-red text-neo-red' : 'text-neo-white/25'
              }`}
              strokeWidth={2.5}
            />
          ))}
        </div>
        <ConnectionsProgressTrack
          key={solvedVersion}
          total={total}
          currentIndex={state.currentIndex}
          solvedIndices={solvedRef.current}
        />
      </header>
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
