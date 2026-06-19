'use client';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useHideNavigation } from '@/contexts/NavigationContext';
import type { BlastLevel, CellId } from '@/lib/blast/v2/types';
import { markUnlockSeen, markConceptSeen, completeFtue, setSkipAll, type UnlocksSeen } from '@/lib/blast/v2/tutorial/unlocks-seen';
import { useBlastV2 } from '@/lib/blast/v2/useBlastV2';
import { detectAlmostWords, detectAllCascades } from '@/lib/blast/v2/engine';
import { selectCascadeTelegraph } from '@/lib/blast/v2/engine/cascade-telegraph';
import { scanFormableThemeWords } from '@/lib/blast/v2/engine/word-scan';
import { LOCALE_CONFIGS } from '@/lib/blast/v2/locale-config';
import { useChainHaptics } from '@/lib/blast/v2/fx/useChainHaptics';
import { useBlastHaptics } from '@/lib/blast/v2/fx/useBlastHaptics';
import { useChainEventBus } from '@/lib/blast/v2/fx/useChainEventBus';
import { BlastChainSoundListener } from '@/lib/blast/v2/fx/BlastChainSoundListener';
import { useCompleteCardDelay } from '@/lib/blast/v2/fx/useCompleteCardDelay';
import type { BlastProgressApi } from '@/lib/blast/v2/useBlastProgress';
import { useBlastTutorial } from '@/hooks/useBlastTutorial';
import { starRating } from '@/lib/blast/v2/anti-cheat';
import { recordBestStars } from '@/lib/blast/v2/bestStars';
import { recordBestRun, formatFastest } from '@/lib/blast/v2/bestRecords';
import { mechanicsForLevel } from '@/lib/blast/v2/mechanic-flags';
import { trackBlastLevelStarted, trackBlastLevelCompleted, trackBlastLevelAbandoned } from '@/lib/blast/v2/telemetry';
import { BlastBoard } from './BlastBoard';
import { BlastHud } from './BlastHud';
import { BlastSurpriseBanner } from './BlastSurpriseBanner';
import { BlastLevelIntroCard } from './BlastLevelIntroCard';
import { BlastResultFlow } from './BlastResultFlow';
import { BlastLevelFailedCard } from './BlastLevelFailedCard';
import { BlastFxOverlay } from './BlastFxOverlay';
import { BlastAtmosphereOverlay } from './BlastAtmosphereOverlay';
import { BlastFtueOverlay, type FtueStep } from './BlastFtueOverlay';
import { BlastUnlockCard } from './BlastUnlockCard';
import { BlastConceptIntroCard } from './BlastConceptIntroCard';
import { BlastWordCelebration } from './BlastWordCelebration';
import { BlastWordFeedback } from './BlastWordFeedback';
import { BlastUndoAdModal } from './BlastUndoAdModal';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBlastDictionary } from '@/lib/blast/v2/useBlastDictionary';
import { parseCell } from '@/lib/blast/v2/engine/cell-id';
import { useRewardedAd } from '@/hooks/useRewardedAd';

type Props = {
  level: BlastLevel;
  progress: BlastProgressApi;
  unlocksSeen?: UnlocksSeen;
  isVeteranPlayer?: boolean;
  onAdvance: () => void;
  // Re-mount the SAME level fresh after a loss (strike budget exhausted). No
  // campaign advance, no clear-level submit — progress stays exactly where it was.
  onRetry?: () => void;
  // Escape to the home screen from the result/failed cards. Omitted = no Home
  // button (the cards are the only exit while the bottom nav is hidden in-game).
  onHome?: () => void;
  onUpdateUnlocks?: (unlocks: UnlocksSeen) => void;
  onLevelCleared?: (nextLevel: number) => void;
};

// Mode color map
const MODE_COLORS: Record<string, string> = {
  fruits: '#BFFF00', // lime
  animals: '#00FFFF', // cyan
  food: '#FF1493', // pink
  ocean: '#00FFFF', // cyan
  space: '#8B5CF6', // purple
  nature: '#BFFF00', // lime
  sports: '#FF1493', // pink
  colors: '#BFFF00', // lime
  transport: '#00FFFF', // cyan
  body: '#FF1493', // pink
  home: '#BFFF00', // lime
  school: '#00FFFF', // cyan
  tools: '#FF1493', // pink
  weather: '#00FFFF', // cyan
  music: '#BFFF00', // lime
  jobs: '#FF1493', // pink
  family: '#BFFF00', // lime
  numbers: '#00FFFF', // cyan
  feelings: '#FF1493', // pink
  mythology: '#8B5CF6', // purple
  science: '#BFFF00', // lime
  travel: '#00FFFF', // cyan
  art: '#FF1493', // pink
  time: '#BFFF00', // lime
  onboarding: '#BFFF00', // lime
  // Mood themes — picked so the vibe reads at a glance.
  joy: '#FFD93D', // sunny yellow
  cozy: '#F4A261', // warm peach
  spooky: '#9D4EDD', // ghostly purple
  magic: '#A855F7', // arcane violet
  adventure: '#F77F00', // adventurer orange
};

export function BlastGame({
  level,
  progress,
  unlocksSeen = {},
  isVeteranPlayer = false,
  onAdvance,
  onRetry,
  onHome,
  onUpdateUnlocks,
  onLevelCleared,
}: Props) {
  const [introDismissed, setIntroDismissed] = useState(false);
  const [levelStartTime] = useState(() => Date.now());
  const { verify: verifyDictionary, checkSync: checkDictionarySync } = useBlastDictionary(level.locale);
  // Feed the warmed offline dict into the engine so valid bonus words validate
  // instantly inline (no async round-trip / reject-flicker). The async verify
  // below stays as the fallback for community words + a cold cache.
  const { state, handlers } = useBlastV2(level, { dictionaryCheck: checkDictionarySync });
  // Hide the global bottom nav while the board is mounted — without this the
  // HUD + board + bottom nav exceed 100dvh on phones and force a page scroll.
  const setIsInGame = useHideNavigation();
  useEffect(() => {
    setIsInGame(true);
    return () => setIsInGame(false);
  }, [setIsInGame]);
  // Initial board height — anchors the visual row count so the playfield
  // doesn't shrink after the first clear. Captured ONCE per level mount.
  const initialBoardRows = useMemo(
    () => Math.max(1, ...level.columns.map((c) => c.tiles.length)),
    [level],
  );
  // Track the deepest cascade chain across the run for the results card.
  const [bestChainDepth, setBestChainDepth] = useState(0);
  useEffect(() => {
    if (state.lastChainDepth > bestChainDepth) {
      setBestChainDepth(state.lastChainDepth);
    }
  }, [state.lastChainDepth, bestChainDepth]);
  // Finalized run stats — snapshot when the level transitions to complete so
  // re-renders of the results card don't re-read Date.now() (impure during
  // render).
  const [finalStats, setFinalStats] = useState<{
    timeSeconds: number;
    gemsCollected: number;
    stars: number;
    bestStars: number;
    isNewBest: boolean;
    bestBonus: number;
    fastestLabel: string;
    isNewFast: boolean;
    isNewBonus: boolean;
  } | null>(null);
  useChainHaptics({ chainEventKey: state.chainEventKey, chainDepth: state.lastChainDepth });
  // Win-only status for the celebration FX hooks: a loss must NOT fire the
  // victory haptic or the complete-card settle. The dedicated fail card owns
  // all loss feedback, so a failed level reads as "still playing" to these hooks.
  const winStatus: 'playing' | 'levelComplete' =
    state.status === 'levelComplete' ? 'levelComplete' : 'playing';
  // Selection-count derived from active drag — only counts cells that are
  // currently part of the live trace, so backtracking doesn't double-tick.
  const selectionCount = state.selection.kind === 'active' ? state.selection.cells.length : 0;
  useBlastHaptics({
    selectionCount,
    invalidKey: state.invalidShakeKey,
    foundCount: state.foundWords.size,
    status: winStatus,
  });
  useChainEventBus({ chainEventKey: state.chainEventKey, chainDepth: state.lastChainDepth });
  // Cascade pacing — Royal Match style. The card is gated behind a short settle
  // (max ~800ms even on a deep cascade) so the final chain flash plays out, but
  // an impatient player can tap anywhere to `skip` straight to the result.
  const { show: showCompleteCard, skip: skipCompleteSettle } = useCompleteCardDelay({
    status: winStatus,
    chainDepth: state.lastChainDepth,
  });
  // Almost-word ghost letters — translucent glowing letters in empty cells
  // that hint at completing a target word. Restricted to tutorial levels
  // (L1–L2) because the ghosts floating above tall columns or near scattered
  // tiles read as weird mid-air glow rather than a helpful nudge. Past the
  // tutorial the board stays clean and the player relies on observation.
  const almosts = useMemo(
    () => (level.levelNumber > 2
      ? []
      : detectAlmostWords(state.level, state.foundWords, LOCALE_CONFIGS[state.level.locale])),
    [state.level, state.foundWords, level.levelNumber],
  );
  const [revealGlowCells, setRevealGlowCells] = useState<CellId[]>([]);
  // Tutorial-only: auto-glow the next formable word on L1–L2. Past L2 the board
  // is pure puzzle — marking answers makes every level feel like a guided demo.
  useEffect(() => {
    if (state.status === 'levelComplete' || level.levelNumber > 2) {
      setRevealGlowCells([]);
      return;
    }
    const cascades = detectAllCascades(state.level, state.foundWords, LOCALE_CONFIGS[state.level.locale]);
    if (cascades.length > 0) {
      setRevealGlowCells(cascades[0].cells);
    } else {
      setRevealGlowCells([]);
    }
  }, [state.foundWords, state.level, state.status, level.levelNumber]);
  // Cascade telegraph — when a clear collapses the board and opens a NEW theme
  // word, briefly pulse those tiles (anticipation) at ALL levels. Distinct from
  // the tutorial answer-glow above: transient, reaction-driven, never naming the
  // word. Reuses the board's revealGlow rendering.
  const [cascadeGlow, setCascadeGlow] = useState<CellId[]>([]);
  const cascadeGlowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (state.status !== 'playing' || state.lastChainDepth <= 0) return;
    const cells = selectCascadeTelegraph(
      state.level,
      state.foundWords,
      LOCALE_CONFIGS[state.level.locale],
      state.lastChainDepth,
    );
    if (cells.length === 0) return;
    setCascadeGlow(cells);
    if (cascadeGlowTimer.current) clearTimeout(cascadeGlowTimer.current);
    cascadeGlowTimer.current = setTimeout(() => setCascadeGlow([]), 1300);
    return () => {
      if (cascadeGlowTimer.current) clearTimeout(cascadeGlowTimer.current);
    };
    // Keyed on chainEventKey: one telegraph per committed move.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.chainEventKey]);

  const { state: progressState, clearLevel, openChest, openMutation } = progress;
  const [showUndoAdModal, setShowUndoAdModal] = useState(false);
  const config = LOCALE_CONFIGS[level.locale];

  // Async dictionary fallback. The local validator rejects with reason='unknown'
  // for any non-theme word. We then ask /api/dictionary/check whether the
  // candidate is a real word; if it is, we retroactively credit it as a bonus
  // match via onForceBonus. Lets the player claim ANY valid dictionary word
  // on the board instead of being stuck on the curated chain.
  const dictRetryLockRef = useRef<string | null>(null);
  useEffect(() => {
    if (state.lastValidation?.kind !== 'reject') return;
    if (state.lastValidation.reason !== 'unknown') return;
    const cells = state.lastRejectedCells;
    if (cells.length < 2) return;

    // Read letters from the level state that produced this rejection. Forward
    // and reversed both checked — the rejection didn't pick a direction.
    const letters = cells.map((id) => {
      const { col, row } = parseCell(id);
      const colObj = state.level.columns.find((c) => c.index === col);
      return colObj?.tiles[row] ?? '';
    });
    const forward = config.normalize(letters.join(''));
    const reversed = config.normalize(letters.slice().reverse().join(''));
    if (!forward) return;

    // De-dup retries: don't re-check the same word twice in a row. invalidShakeKey
    // changes on every reject so we key the lock on it instead of the cells.
    const key = `${state.invalidShakeKey}:${forward}|${reversed}`;
    if (dictRetryLockRef.current === key) return;
    dictRetryLockRef.current = key;

    let cancelled = false;
    (async () => {
      const [fOk, rOk] = await Promise.all([
        verifyDictionary(forward),
        forward === reversed ? Promise.resolve(false) : verifyDictionary(reversed),
      ]);
      if (cancelled) return;
      const accepted = fOk ? forward : rOk ? reversed : null;
      if (accepted) {
        handlers.onForceBonus(cells, accepted);
      } else {
        // Dictionary confirms it's not a real word — release the deferred
        // shake now (the submit didn't fire it, so the player gets a single
        // clear "nope" instead of a flash-then-nothing).
        handlers.onRejectConfirmed();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    state.lastValidation,
    state.lastRejectedCells,
    state.invalidShakeKey,
    state.level.columns,
    config,
    verifyDictionary,
    handlers,
  ]);

  // Rewarded-ad gate for additional undos. After the player burns through
  // FREE_UNDO_LIMIT free undos, the next undo opens a confirmation modal;
  // watching the ad refreshes the budget for two more free reverses.
  const rewardedAd = useRewardedAd({
    surface: 'retry',
    rewardKind: 'feature',
    onRewardEarned: () => {
      handlers.onRewardedUndoGranted();
      handlers.onUndo();
      setShowUndoAdModal(false);
    },
    onAdError: () => {
      // Ad failed to load — let the player undo anyway rather than soft-locking
      // them. The free counter still resets so future undos behave normally.
      handlers.onRewardedUndoGranted();
      handlers.onUndo();
      setShowUndoAdModal(false);
    },
  });

  const handleUndoPressed = useCallback(() => {
    if (state.needsRewardedAdForUndo) {
      setShowUndoAdModal(true);
      return;
    }
    handlers.onUndo();
  }, [state.needsRewardedAdForUndo, handlers]);
  // Idempotency: one submission per level — prevents retry loop on state-feedback re-renders.
  const submittedRef = useRef(false);
  const submissionIdRef = useRef<string | null>(null);
  useEffect(() => {
    submittedRef.current = false;
    submissionIdRef.current = null;
  }, [level.levelNumber, level.locale]);
  const clearCentersRef = useRef<Array<{ x: number; y: number }>>([]);
  const tutorial = useBlastTutorial(level, unlocksSeen, isVeteranPlayer, onUpdateUnlocks ?? (() => {}));

  // Controlled FTUE step. Advances based on observable game-state transitions.
  const [ftueStep, setFtueStep] = useState<FtueStep>(1);
  const prevSelectionKind = useRef(state.selection.kind);
  const prevWordsFound = useRef(state.foundWords.size);
  useEffect(() => {
    if (!tutorial.showFtueOverlay || isVeteranPlayer) return;
    const wasIdle = prevSelectionKind.current === 'idle';
    const isActive = state.selection.kind === 'active';
    if (wasIdle && isActive) {
      setFtueStep((s) => (s === 1 ? 2 : s));
    }
    prevSelectionKind.current = state.selection.kind;
  }, [state.selection.kind, tutorial.showFtueOverlay, isVeteranPlayer]);
  useEffect(() => {
    if (!tutorial.showFtueOverlay || isVeteranPlayer) return;
    const curr = state.foundWords.size;
    const prev = prevWordsFound.current;
    if (curr > prev) {
      setFtueStep((s) => {
        if (s === 2) return 3;
        if (s === 3 || s === 4) return curr >= 2 ? 5 : 4;
        if (s === 5) return 6;
        return s;
      });
    }
    prevWordsFound.current = curr;
  }, [state.foundWords, tutorial.showFtueOverlay, isVeteranPlayer]);
  // Auto-advance step 3 → 4 after 2s so the "letters fall" beat doesn't trap players.
  useEffect(() => {
    if (ftueStep !== 3) return;
    const t = setTimeout(() => setFtueStep((s) => (s === 3 ? 4 : s)), 2000);
    return () => clearTimeout(t);
  }, [ftueStep]);

  // Track level start on intro dismissal
  useEffect(() => {
    if (introDismissed) {
      const mechanics = mechanicsForLevel(level.levelNumber);
      const mechanicKeys = Object.keys(mechanics).filter((k) => mechanics[k as keyof typeof mechanics]);
      trackBlastLevelStarted({
        level: level.levelNumber,
        locale: level.locale,
        theme: level.theme,
        mechanics: mechanicKeys,
      });
    }
  }, [introDismissed, level]);

  // Track abandonment on unmount or when level complete
  useEffect(() => {
    return () => {
      // Only count a true abandon — a finished level (won OR lost) isn't one.
      if (!introDismissed || state.status !== 'playing') return;
      trackBlastLevelAbandoned({
        level: level.levelNumber,
        locale: level.locale,
        time_in_level_seconds: Math.round((Date.now() - levelStartTime) / 1000),
        words_found_count: state.foundWords.size,
      });
    };
  }, [introDismissed, state.status, state.foundWords, level, levelStartTime]);

  // Track level completed and submit — fires once per level transition.
  useEffect(() => {
    if (state.status !== 'levelComplete' || !introDismissed) return;
    if (submittedRef.current) return;
    submittedRef.current = true;

    if (!submissionIdRef.current) {
      submissionIdRef.current = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }

    const timeSeconds = Math.round((Date.now() - levelStartTime) / 1000);
    // score.ts adds 0.02 chestProgress per gem tile, so the real gem count is
    // chestProgress * 50. Pre-fix code used *10, which combined with backend
    // `earnedGems * 0.02` produced an effective delta of 0.004/gem — chest
    // sat at 0% level after level (the user-visible "chest not progressing"
    // regression at level 6).
    const gemsCollected = Math.round(state.chestProgress * 50);

    const submission = {
      levelNumber: level.levelNumber,
      locale: level.locale,
      wordsFound: Array.from(state.foundWords),
      timeSeconds,
      hintsUsed: state.hintsUsed,
      wrongAttempts: state.wrongAttempts,
      cascadesTriggered: state.cascadeCount,
      submissionId: submissionIdRef.current,
    };

    const stars = starRating(submission, level, state.bonusWordCount);
    // Personal-best tracking (local) — three-axis record so replay has more
    // than just stars to chase: bonus-word count and fastest time both flash
    // their own "NEW <X>!" beat on the complete card.
    const { record, newBests } = recordBestRun(level.locale, level.levelNumber, {
      stars,
      bonusWords: state.bonusWordCount,
      timeSeconds,
    });
    // Keep the legacy mirror in sync (other call sites still read it).
    recordBestStars(level.locale, level.levelNumber, stars);
    setFinalStats({
      timeSeconds,
      gemsCollected,
      stars,
      bestStars: record.stars,
      isNewBest: newBests.stars,
      bestBonus: record.bonusBest,
      fastestLabel: formatFastest(record.fastestSeconds),
      isNewFast: newBests.time,
      isNewBonus: newBests.bonus,
    });

    trackBlastLevelCompleted({
      level: level.levelNumber,
      locale: level.locale,
      theme: level.theme,
      time_seconds: timeSeconds,
      hints_used: state.hintsUsed,
      cascades: state.cascadeCount,
      stars,
      coins_earned: state.coins,
      gems_collected: gemsCollected,
    });

    clearLevel(submission, state.coins, gemsCollected, unlocksSeen);
    // Notify parent (typically BlastV2PageClient) of level completion so guests
    // can persist their progress immediately (before the Next button is clicked).
    onLevelCleared?.(level.levelNumber + 1);
  }, [state.status, introDismissed, level, levelStartTime, state.foundWords, state.hintsUsed, state.wrongAttempts, state.bonusWordCount, state.cascadeCount, state.coins, state.chestProgress, clearLevel, unlocksSeen, onLevelCleared]);

  const handleFtueComplete = () => {
    const updated = completeFtue(unlocksSeen);
    onUpdateUnlocks?.(updated);
  };

  const handleUnlockCardDismiss = () => {
    if (tutorial.showUnlockCard) {
      const updated = markUnlockSeen(unlocksSeen, tutorial.showUnlockCard);
      onUpdateUnlocks?.(updated);
    }
  };

  const handleUnlockCardSkipAll = () => {
    const updated = setSkipAll(unlocksSeen, true);
    onUpdateUnlocks?.(updated);
  };

  const handleConceptDismiss = () => {
    if (tutorial.showConceptCard) {
      const updated = markConceptSeen(unlocksSeen, tutorial.showConceptCard);
      onUpdateUnlocks?.(updated);
    }
  };

  const modeColor = MODE_COLORS[level.theme] || '#BFFF00';
  const { t } = useLanguage();
  // FX integration point: BlastFxOverlay mounts useBlastFx internally
  // Board ref is obtained internally by BlastBoard via useRef

  if (!introDismissed) {
    return (
      <>
        <BlastLevelIntroCard level={level} onDismiss={() => setIntroDismissed(true)} />
        {tutorial.showFtueOverlay && isVeteranPlayer && (
          <BlastFtueOverlay
            onComplete={handleFtueComplete}
            isVeteran={true}
          />
        )}
      </>
    );
  }

  // Concept intro lands AFTER the level intro fades — players read the
  // placement-rule explanation while still on a calm screen, then tap into
  // the live board. Marks the concept seen on dismiss so the card never
  // re-fires for the player.
  if (tutorial.showConceptCard) {
    return (
      <BlastConceptIntroCard
        concept={tutorial.showConceptCard}
        modeColor={modeColor}
        onDismiss={handleConceptDismiss}
      />
    );
  }

  if (state.status === 'levelFailed') {
    const foundThemeWordsCount = level.words.filter((w) => state.foundWords.has(w)).length;
    return (
      <BlastLevelFailedCard
        modeColor={modeColor}
        levelNumber={level.levelNumber}
        themeWordCount={level.words.length}
        wordsFound={foundThemeWordsCount}
        onRetry={() => onRetry?.()}
        onHome={onHome}
      />
    );
  }

  if (state.status === 'levelComplete' && showCompleteCard) {
    // Count how many theme words were actually found
    const foundThemeWordsCount = level.words.filter((w) => state.foundWords.has(w)).length;
    // Server-authoritative chest fullness drives the open ceremony — open-chest
    // 400s below 1.0, so the decision must read the persisted value, not the
    // live display blend.
    const chestReady = progressState.chestProgress >= 1;
    return (
      <BlastResultFlow
        coins={state.coins}
        cascadeCount={state.cascadeCount}
        modeColor={modeColor}
        theme={level.theme}
        levelNumber={level.levelNumber}
        themeWordCount={level.words.length}
        // On a partial finish the player did NOT find every theme word, so show
        // how many of the targets they actually got, not the full count.
        wordsFound={state.completionReason === 'partial' ? foundThemeWordsCount : level.words.length}
        bonusWordsFound={state.bonusWordCount}
        completionReason={state.completionReason ?? 'mastered'}
        timeSeconds={finalStats?.timeSeconds}
        bestChainDepth={bestChainDepth}
        stars={finalStats?.stars}
        bestStars={finalStats?.bestStars}
        isNewBest={finalStats?.isNewBest}
        bestBonus={finalStats?.bestBonus}
        fastestLabel={finalStats?.fastestLabel}
        isNewFast={finalStats?.isNewFast}
        isNewBonus={finalStats?.isNewBonus}
        chestNumber={progressState.chestNumber}
        chestProgress={Math.min(1, progressState.chestProgress + state.chestProgress)}
        chestProgressGain={state.chestProgress}
        chestReady={chestReady}
        chestContents={progressState.chestContents}
        openChest={openChest}
        openStatus={openMutation.status}
        onAdvance={onAdvance}
        onReplay={onRetry}
        onHome={onHome}
      />
    );
  }

  return (
    <div className="flex flex-col h-dvh overflow-hidden bg-[#0b1530] text-white" translate="no">
      {tutorial.showUnlockCard && (
        <BlastUnlockCard
          mechanic={tutorial.showUnlockCard}
          cardIndex={tutorial.unlockCardIndex}
          onDismiss={handleUnlockCardDismiss}
          onSkipAll={handleUnlockCardSkipAll}
        />
      )}
      <BlastHud
        levelNumber={state.level.levelNumber}
        // Persisted coins + this level's in-progress coins (surprise payouts,
        // word scores) so the counter ticks live during play — matching the
        // chest bar below. Without the `state.coins` term, a +75 coin_burst
        // wouldn't move the counter until level-end (gems would, coins wouldn't).
        coins={progressState.coins + state.coins}
        chestNumber={progressState.chestNumber}
        // Live chest progress combines the server-known progress with the
        // in-game accumulation (capped at 1) so the badge ticks forward as
        // gems land instead of jumping at level-end.
        chestProgress={Math.min(1, progressState.chestProgress + state.chestProgress)}
        chestContents={progressState.chestContents}
        onShuffle={handlers.onShuffle}
        strikeBudget={state.strikeBudget}
        strikesUsed={state.strikesUsed}
        modeColor={modeColor}
        theme={level.theme}
        targetWords={level.words}
        foundWords={Array.from(state.foundWords)}
        bonusWordCount={state.bonusWordCount}
        canUndo={state.canUndo && state.status === 'playing'}
        onUndo={handleUndoPressed}
        onHint={handlers.onRevealHint}
      />
      <div className="relative flex-1 min-h-0 flex items-stretch justify-center pb-[max(0.5rem,env(safe-area-inset-bottom))] px-2">
        <BlastAtmosphereOverlay modeColor={modeColor} />
        <BlastSurpriseBanner surprise={state.activeSurprise} modeColor={modeColor} />
        {state.nextWordMultiplier === 2 && (
          <div
            data-testid="surprise-charge-chip"
            className="pointer-events-none absolute top-3 right-3 z-30 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#0b1530]"
            style={{ background: '#FFE135', border: '2px solid #0b1530', boxShadow: '2px 2px 0 #0b1530' }}
          >
            {t('blast.surprise.chargedChip', '✨ ×2 charged')}
          </div>
        )}
        <BlastFxOverlay
          chainEventKey={state.chainEventKey}
          chainDepth={state.lastChainDepth}
          clearCenters={clearCentersRef.current}
          clearEventKey={state.chainEventKey}
          modeColor={modeColor}
        />
        <BlastWordCelebration
          eventKey={state.chainEventKey}
          centers={clearCentersRef.current}
          modeColor={modeColor}
          chainDepth={state.lastChainDepth}
          levelNumber={level.levelNumber}
        />
        <BlastWordFeedback
          dictCheckPending={state.dictCheckPending}
          lastValidation={state.lastValidation}
          eventKey={state.chainEventKey}
          modeColor={modeColor}
          t={t}
        />
        <BlastChainSoundListener />
        {/* Size-typed stage: drives container-query tile sizing on BOTH axes.
            Caps width on tablets/desktops; fills available height on phones.
            Tile size = min(width-fit, height-fit) so a 6-col / 2-row board
            no longer collapses to a thin strip at the bottom of the screen. */}
        <div
          className="relative w-full max-w-[min(96vw,520px)] h-full mx-auto flex items-stretch justify-center"
          style={{ zIndex: 10 }}
        >
        <BlastBoard
          level={state.level}
          selection={state.selection}
          invalidShakeKey={state.invalidShakeKey}
          onPointerDown={handlers.onPointerDown}
          onPointerEnter={handlers.onPointerMove}
          onPointerUp={handlers.onPointerUp}
          modeColor={modeColor}
          almosts={almosts}
          tileIds={state.tileIds}
          revealGlowCells={[...revealGlowCells, ...cascadeGlow, ...state.hintCells]}
          boardRows={initialBoardRows}
          onCommitSelection={(centers) => {
            clearCentersRef.current = centers;
          }}
        />
        </div>
      </div>
      {tutorial.showFtueOverlay && !isVeteranPlayer && ftueStep !== null && (
        <BlastFtueOverlay
          step={ftueStep}
          onComplete={handleFtueComplete}
        />
      )}
      <BlastUndoAdModal
        isOpen={showUndoAdModal}
        modeColor={modeColor}
        onWatchAd={() => rewardedAd.showAd()}
        onCancel={() => setShowUndoAdModal(false)}
      />
    </div>
  );
}
