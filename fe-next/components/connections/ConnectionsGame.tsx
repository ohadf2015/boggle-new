'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { m } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useGameExitGuard } from '@/hooks/useGameExitGuard';
import { getPuzzleForLevel, getTotalLevels } from '@/lib/connections/puzzles';
import { getPlayerSeed } from '@/lib/connections/playerSeed';
import {
  initGameState,
  applyGuess,
  advancePuzzle,
  giveUp as giveUpLogic,
  revive as reviveLogic,
  revealHint as revealHintLogic,
  markRated,
  xpForPuzzle,
  isCompletedTerminalStatus,
} from '@/lib/connections/gameLogic';
import { getCurrentLevel, setCurrentLevel } from '@/lib/connections/levelStore';
import { getSolvedIds, markSolved, clearSolved, findFirstUnsolvedLevel } from '@/lib/connections/solvedStore';
import { getCurrentLives, setCurrentLives, MAX_LIVES } from '@/lib/connections/livesStore';
import type { ConnectionPuzzle, GameState, PuzzleRating } from '@/lib/connections/types';
import { submitConnectionsFeedback } from '@/lib/connections/feedback';
import { fetchBannedPuzzleIds, getCachedBannedIds } from '@/lib/connections/bannedPuzzles';
import { trackGameStart, trackGameEnd, trackGrowthEvent } from '@/utils/growthTracking';
import { useHapticFeedback, GAME_HAPTICS } from '@/hooks/useHapticFeedback';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { fireStreakConfetti, fireLevelUpConfetti } from '@/utils/confettiUtils';
import { momentumState, isStreakMilestone } from '@/lib/connections/momentum';
import PuzzleCard from './PuzzleCard';
import { PlayHud, PlayModeRow } from './ConnectionsPlayChrome';
import OutOfLivesModal from './OutOfLivesModal';
import ResultsBannerSlot from '@/components/ads/ResultsBannerSlot';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import { recordConnectionsXp } from './recordConnectionsXp';

const ConnectionsEffectsCanvas = dynamic(() => import('./ConnectionsEffectsCanvas'), { ssr: false });


type Action =
  | { type: 'SET_INPUT'; input: string }
  | { type: 'SUBMIT' }
  | { type: 'ADVANCE' }
  | { type: 'GIVE_UP' }
  | { type: 'REVIVE' }
  | { type: 'REVEAL_HINT' }
  | { type: 'MARK_RATED'; puzzleId: string }
  | { type: 'RESET'; puzzles: ConnectionPuzzle[]; initialLives?: number };

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'SET_INPUT':
      return { ...state, input: action.input };
    case 'SUBMIT':
      if (!state.input.trim() || state.status === 'correct' || state.status === 'gaveUp' || state.status === 'finished' || state.status === 'outOfLives') {
        return state;
      }
      return applyGuess(state, state.input);
    case 'GIVE_UP':
      return giveUpLogic(state);
    case 'REVIVE':
      return reviveLogic(state);
    case 'REVEAL_HINT':
      return revealHintLogic(state);
    case 'MARK_RATED':
      return markRated(state, action.puzzleId);
    case 'ADVANCE':
      return advancePuzzle(state);
    case 'RESET':
      return initGameState(action.puzzles, { initialLives: action.initialLives });
    default:
      return state;
  }
}

export default function ConnectionsGame() {
  const { t, language } = useLanguage();
  const { isAdmin } = useAuth();
  const router = useRouter();
  const isRTL = language === 'he';
  const prefersReducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Auto-banned puzzles (≥3 distinct authed users flagged dislike+gave_up).
  // Hydrate from localStorage cache so first paint already filters; refresh
  // from `v_connections_banned_puzzles` in the background.
  const [bannedIds, setBannedIds] = useState<ReadonlySet<string>>(() => getCachedBannedIds());

  // Per-device shuffle seed — same puzzles, personal order (0 on SSR = legacy order).
  const [seed] = useState<number>(() => getPlayerSeed());

  // Solved-id history: a solved (or revealed) puzzle never reappears, even
  // after content drops reshuffle the seeded level order.
  const [solvedInit] = useState<ReadonlySet<string>>(() => getSolvedIds('regular', language));
  const solvedRef = useRef<ReadonlySet<string>>(solvedInit);

  // Each level renders one puzzle. Level number + lives persist in localStorage per locale.
  const [level, setLevel] = useState<number>(
    () => findFirstUnsolvedLevel(language, getCurrentLevel(language), bannedIds, solvedRef.current, seed).level,
  );
  const totalLevels = getTotalLevels(language, bannedIds, seed);
  const initialPuzzle = getPuzzleForLevel(language, level, bannedIds, seed);
  const initialPuzzles: ConnectionPuzzle[] = initialPuzzle ? [initialPuzzle] : [];

  const [state, dispatch] = useReducer(
    reducer,
    initialPuzzles,
    (puzzles): GameState => initGameState(puzzles, { initialLives: getCurrentLives(language) })
  );
  const heartsRef = useRef<HTMLDivElement>(null);
  const levelBadgeRef = useRef<HTMLDivElement>(null);
  const prevLivesRef = useRef<number>(state.lives);
  const [sessionScore, setSessionScore] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [solvedThisSession, setSolvedThisSession] = useState(0);
  const xpAwardedIdsRef = useRef<Set<string>>(new Set());
  const { haptic, customHaptic } = useHapticFeedback();
  const sfx = useSoundEffects();

  // Funnel parity: emit growth:game_started once on mount. Was missing →
  // PostHog showed 18 connections mode_selected with 0 game_starts
  // (2026-04-27 sweep). One emit per session is enough; subsequent puzzles
  // within the same session are tracked via puzzle-level events.
  const gameStartTimeRef = useRef<number>(Date.now());
  const endFiredRef = useRef<boolean>(false);
  useEffect(() => {
    gameStartTimeRef.current = Date.now();
    trackGameStart('connections', { language });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Funnel parity: emit growth:game_completed when the player reaches a
  // terminal puzzle state (correct / outOfLives / gaveUp). Without this,
  // PostHog 30d showed 10 connections starts → 0 completes (2026-05-05).
  // Fire-once per mount; subsequent puzzles within the same mount don't
  // re-emit.
  useEffect(() => {
    if (endFiredRef.current) return;
    const status = state.status;
    if (status !== 'correct' && status !== 'outOfLives' && status !== 'gaveUp') return;
    endFiredRef.current = true;
    const totalScore = sessionScore + (state.score ?? 0);
    const durationSec = Math.floor((Date.now() - gameStartTimeRef.current) / 1000);
    trackGameEnd('connections', totalScore, level, isCompletedTerminalStatus(status), durationSec, {
      isWinner: status === 'correct',
      terminalStatus: status,
      level,
    });
  }, [state.status, state.score, sessionScore, level]);

  // Refresh ban list in background. If a puzzle just crossed the 3-distinct-
  // disliker threshold while the player was on it, the next level resolution
  // (RESET below) will already skip it.
  useEffect(() => {
    let cancelled = false;
    void fetchBannedPuzzleIds().then((ids) => {
      if (!cancelled) setBannedIds(ids);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Locale change — full reset to that locale's saved level + lives.
  // Intentionally only depends on `language`: the background ban-list fetch
  // resolves with a new Set ref every time, so coupling it here would wipe a
  // mid-typed input on every game start. Ban-list refresh handled separately.
  useEffect(() => {
    solvedRef.current = getSolvedIds('regular', language);
    const resolved = findFirstUnsolvedLevel(language, getCurrentLevel(language), bannedIds, solvedRef.current, seed);
    setLevel(resolved.level);
    dispatch({
      type: 'RESET',
      puzzles: resolved.puzzle ? [resolved.puzzle] : [],
      initialLives: getCurrentLives(language),
    });
    xpAwardedIdsRef.current = new Set();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  // Ban-list refresh — only swap puzzle if the *current* one just got banned.
  // Preserves the player's typed input + accumulated state in the (overwhelmingly
  // common) case where the fetched ban list matches what's already in cache.
  useEffect(() => {
    const cur = state.puzzles[state.currentIndex];
    if (!cur || !bannedIds.has(cur.id)) return;
    const replacement = getPuzzleForLevel(language, level, bannedIds, seed);
    if (replacement && replacement.id !== cur.id) {
      dispatch({ type: 'RESET', puzzles: [replacement], initialLives: state.lives });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bannedIds]);

  // Persist lives + emit lifeLost / gameOver events on changes.
  // Reduced-motion users still get state persistence but skip the
  // particle/flash/shake bursts (WCAG 2.3.3).
  useEffect(() => {
    const prev = prevLivesRef.current;
    if (state.lives !== prev) {
      setCurrentLives(language, state.lives);
      if (state.lives < prev) {
        haptic('warning');
        if (!prefersReducedMotion) {
          const rect = heartsRef.current?.getBoundingClientRect();
          const containerRect = containerRef.current?.getBoundingClientRect();
          const x = rect && containerRect ? rect.left + rect.width / 2 - containerRect.left : 0;
          const y = rect && containerRect ? rect.top + rect.height / 2 - containerRect.top : 0;
          window.dispatchEvent(new CustomEvent('connections:lifeLost', { detail: { x, y } }));
        }
      }
      if (state.lives === 0 && prev > 0) {
        sfx.playDefeatSound();
        customHaptic([50, 100, 50]);
        if (!prefersReducedMotion) {
          window.dispatchEvent(new CustomEvent('connections:gameOver'));
        }
      }
      prevLivesRef.current = state.lives;
    }
  }, [state.lives, language, prefersReducedMotion, sfx, haptic, customHaptic]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setCanvasSize({ width: Math.floor(width), height: Math.floor(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // After correct → award XP + accumulate score. Advance is user-driven via
  // the Next button in PuzzleCard so the like/dislike CTA stays on screen
  // long enough to actually tap (auto-advance at 1.2s was burying it).
  useEffect(() => {
    if (state.status !== 'correct') return;
    if (!prefersReducedMotion) {
      window.dispatchEvent(new CustomEvent('connections:correct'));
    }
    const puzzle = state.puzzles[state.currentIndex];
    if (puzzle && !xpAwardedIdsRef.current.has(puzzle.id)) {
      xpAwardedIdsRef.current.add(puzzle.id);
      // Never serve this puzzle again (persists across sessions + reshuffles).
      markSolved('regular', language, puzzle.id);
      solvedRef.current = new Set([...solvedRef.current, puzzle.id]);
      // Satisfying feedback: chime + tap on every solve; a bigger burst on
      // streak milestones makes the next puzzle feel worth chasing.
      sfx.playMatchFoundSound();
      if (isStreakMilestone(state.streak)) {
        sfx.playComboMilestoneSound(state.streak);
        customHaptic(GAME_HAPTICS.comboLevelUp);
        if (!prefersReducedMotion) fireStreakConfetti();
      } else {
        customHaptic(GAME_HAPTICS.validWord);
      }
      setSolvedThisSession((prev) => prev + 1);
      const xp = xpForPuzzle(puzzle.difficulty, state.streak);
      setXpEarned((prev) => prev + xp);
      setSessionScore((prev) => prev + state.score);
      void recordConnectionsXp(xp);
    }
  }, [state.status, state.currentIndex, state.puzzles, state.streak, state.score, prefersReducedMotion, sfx, customHaptic, language]);

  useEffect(() => {
    if (state.status !== 'wrong') return;
    if (!prefersReducedMotion) {
      window.dispatchEvent(new CustomEvent('connections:wrong'));
    }
    // Audible + tactile miss (independent of motion settings).
    sfx.playErrorSound();
    haptic('error');
  }, [state.status, state.wrongAttempts, prefersReducedMotion, sfx, haptic]);

  const advanceToNextLevel = useCallback(() => {
    const next = findFirstUnsolvedLevel(language, level + 1, bannedIds, solvedRef.current, seed);
    setCurrentLevel(language, next.level);
    setLevel(next.level);
    if (next.puzzle) {
      // Carry surviving lives across levels so they actually gate progress.
      dispatch({ type: 'RESET', puzzles: [next.puzzle], initialLives: state.lives });
    }
    // Level-up fanfare: a clear payoff for clearing a puzzle.
    sfx.playLevelUpSound();
    customHaptic(GAME_HAPTICS.achievement);
    if (!prefersReducedMotion) {
      fireLevelUpConfetti();
      const rect = levelBadgeRef.current?.getBoundingClientRect();
      const containerRect = containerRef.current?.getBoundingClientRect();
      const x = rect && containerRect ? rect.left + rect.width / 2 - containerRect.left : 0;
      const y = rect && containerRect ? rect.top + rect.height / 2 - containerRect.top : 0;
      window.dispatchEvent(new CustomEvent('connections:levelUp', { detail: { x, y, level: next.level } }));
    }
  }, [language, level, state.lives, prefersReducedMotion, bannedIds, seed, sfx, customHaptic]);

  const handleInput = useCallback((value: string) => {
    dispatch({ type: 'SET_INPUT', input: value });
  }, []);

  const handleSubmit = useCallback(() => {
    dispatch({ type: 'SUBMIT' });
  }, []);

  const handleGiveUp = useCallback(() => {
    trackGrowthEvent('game_abandoned', { gameMode: 'connections', reason: 'give_up' });
    // Answer gets revealed — treat as consumed so it never reappears either.
    const puzzle = state.puzzles[state.currentIndex];
    if (puzzle) {
      markSolved('regular', language, puzzle.id);
      solvedRef.current = new Set([...solvedRef.current, puzzle.id]);
    }
    dispatch({ type: 'GIVE_UP' });
  }, [state.puzzles, state.currentIndex, language]);

  const handleRevealHint = useCallback(() => {
    trackGrowthEvent('hint_used', { gameMode: 'connections', hintType: 'text' });
    dispatch({ type: 'REVEAL_HINT' });
  }, []);

  const handleRevive = useCallback(() => {
    dispatch({ type: 'REVIVE' });
  }, []);

  const handleQuit = useCallback(() => {
    router.push(`/${language}`);
  }, [router, language]);

  // Guard the in-game back / browser-back / Android hardware-back so an active
  // puzzle with real progress isn't dropped silently (parity with singleplayer).
  const exitGuard = useGameExitGuard({
    active:
      state.status !== 'finished' &&
      state.status !== 'outOfLives' &&
      (solvedThisSession > 0 || sessionScore > 0),
    onQuit: handleQuit,
    message: t('singlePlayer.quitConfirmMessage'),
  });

  const handleAdvance = useCallback(() => {
    advanceToNextLevel();
  }, [advanceToNextLevel]);

  const handleRate = useCallback(
    (rating: PuzzleRating) => {
      const puzzle = state.puzzles[state.currentIndex];
      if (!puzzle || state.ratedIds.has(puzzle.id)) return;
      dispatch({ type: 'MARK_RATED', puzzleId: puzzle.id });
      void submitConnectionsFeedback({
        puzzleId: puzzle.id,
        locale: language,
        rating,
        gaveUp: state.status === 'gaveUp',
      });
    },
    [state.puzzles, state.currentIndex, state.ratedIds, state.status, language]
  );

  const currentPuzzle = state.puzzles[state.currentIndex];

  // Distinguish "cleared whole pack" from "no puzzles for this locale".
  // getPuzzleForLevel returns null past the end → if the player has cleared
  // ≥1 level we treat this as terminal-success, otherwise as no-content.
  const handlePlayAgain = useCallback(() => {
    // Explicit replay of a cleared pack — wipe the solved history for a fresh run.
    clearSolved('regular', language);
    solvedRef.current = new Set();
    setCurrentLevel(language, 1);
    setLevel(1);
    const puzzle = getPuzzleForLevel(language, 1, bannedIds, seed);
    dispatch({ type: 'RESET', puzzles: puzzle ? [puzzle] : [], initialLives: MAX_LIVES });
    setSessionScore(0);
    setXpEarned(0);
    xpAwardedIdsRef.current = new Set();
  }, [language, bannedIds, seed]);

  if (!currentPuzzle) {
    const cleared = level > 1 && totalLevels > 0;
    if (cleared) {
      return (
        <div className="flex-1 flex items-center justify-center px-4 py-6">
          <m.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
            className="w-full max-w-sm rounded-neo border-neo-thick border-neo-lime bg-neo-navy-light shadow-hard-lg p-6 text-center"
          >
            <Trophy className="mx-auto mb-3 h-12 w-12 text-neo-yellow" strokeWidth={2} aria-hidden="true" />
            <h2 className="font-neo-display text-2xl text-neo-white font-bold mb-2">
              {t('connections.finished')}
            </h2>
            <p className="text-neo-white text-sm mb-4">
              {t('connections.subtitle')}
            </p>
            <div className="flex justify-around gap-3 mb-5 text-sm font-neo-body">
              <div className="flex flex-col">
                <span className="text-neo-cyan text-[10px] uppercase tracking-widest font-bold">{t('connections.finalScore')}</span>
                <span className="text-neo-cyan font-bold tabular-nums">{(sessionScore + state.score).toLocaleString()}</span>
              </div>
              {xpEarned > 0 && (
                <div className="flex flex-col">
                  <span className="text-neo-lime text-[10px] uppercase tracking-widest font-bold">{t('connections.xpEarned')}</span>
                  <span className="text-neo-lime font-bold tabular-nums">+{xpEarned}</span>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <m.button
                type="button"
                onClick={handlePlayAgain}
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97 }}
                className="w-full rounded-neo border-neo-thick border-neo-lime bg-neo-lime text-neo-navy font-neo-display font-bold px-5 py-3 shadow-hard"
              >
                {t('connections.playAgain')}
              </m.button>
              <button
                type="button"
                onClick={handleQuit}
                className="w-full rounded-neo border-neo border-neo-white/30 bg-transparent text-neo-white font-neo-body text-sm px-5 py-2.5 hover:bg-neo-white/5 transition-colors"
              >
                {t('connections.quitToMenu')}
              </button>
            </div>
            {/* /connections/play is a GAME_ROUTES path so the anchored banner
                never shows — this terminal card is the mode's only ad surface. */}
            <ResultsBannerSlot placement="singleplayer-complete" className="mt-4" />
          </m.div>
        </div>
      );
    }
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-neo-white font-neo-body text-center px-4">{t('connections.noAccess')}</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} dir={isRTL ? 'rtl' : 'ltr'} className="relative mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col gap-2 px-3 py-2 sm:px-4 sm:py-3 [@media(max-height:700px)]:py-1.5 shell:max-w-3xl" translate="no">
      <ConnectionsEffectsCanvas width={canvasSize.width} height={canvasSize.height} />

      <PlayHud
        isRTL={isRTL}
        lives={state.lives}
        level={level}
        totalLevels={totalLevels}
        streak={state.streak}
        score={sessionScore + state.score}
        onBack={exitGuard.requestExit}
        heartsRef={heartsRef}
        levelBadgeRef={levelBadgeRef}
      />

      <PlayModeRow language={language} momentum={momentumState({ solvedThisSession, streak: state.streak })} xpEarned={xpEarned} />

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

      <OutOfLivesModal
        open={state.status === 'outOfLives'}
        isAdmin={isAdmin}
        level={level}
        onRevive={handleRevive}
        onQuit={handleQuit}
      />

      <ConfirmationDialog
        open={exitGuard.showConfirm}
        onOpenChange={exitGuard.setShowConfirm}
        title={t('singlePlayer.quitConfirmTitle')}
        description={t('singlePlayer.quitConfirmMessage')}
        confirmText={t('common.quit')}
        cancelText={t('common.cancel')}
        onConfirm={exitGuard.confirmQuit}
        variant="warning"
      />
    </div>
  );
}
