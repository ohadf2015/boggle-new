'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useHideNavigation } from '@/contexts/NavigationContext';
import type { BlastLevel, CellId } from '@/lib/blast/v2/types';
import { markUnlockSeen, markConceptSeen, completeFtue, setSkipAll, type UnlocksSeen } from '@/lib/blast/v2/tutorial/unlocks-seen';
import { useBlastV2 } from '@/lib/blast/v2/useBlastV2';
import { getBlastDictionary } from '@/lib/blast/v2/engine/blast-dictionary';
import { detectAlmostWords, detectAllCascades } from '@/lib/blast/v2/engine';
import { scanFormableThemeWords } from '@/lib/blast/v2/engine/word-scan';
import { LOCALE_CONFIGS } from '@/lib/blast/v2/locale-config';
import { useChainHaptics } from '@/lib/blast/v2/fx/useChainHaptics';
import { useBlastHaptics } from '@/lib/blast/v2/fx/useBlastHaptics';
import { useChainEventBus } from '@/lib/blast/v2/fx/useChainEventBus';
import { BlastChainSoundListener } from '@/lib/blast/v2/fx/BlastChainSoundListener';
import { useCompleteCardDelay } from '@/lib/blast/v2/fx/useCompleteCardDelay';
import { useBlastProgress } from '@/lib/blast/v2/useBlastProgress';
import { useBlastTutorial } from '@/hooks/useBlastTutorial';
import { starRating } from '@/lib/blast/v2/anti-cheat';
import { mechanicsForLevel } from '@/lib/blast/v2/mechanic-flags';
import { trackBlastLevelStarted, trackBlastLevelCompleted, trackBlastLevelAbandoned } from '@/lib/blast/v2/telemetry';
import { BlastBoard } from './BlastBoard';
import { BlastHud } from './BlastHud';
import { BlastLevelIntroCard } from './BlastLevelIntroCard';
import { BlastLevelCompleteCard } from './BlastLevelCompleteCard';
import { BlastChestOpenModal } from './BlastChestOpenModal';
import { BlastFxOverlay } from './BlastFxOverlay';
import { BlastAtmosphereOverlay } from './BlastAtmosphereOverlay';
import { BlastFtueOverlay, type FtueStep } from './BlastFtueOverlay';
import { BlastUnlockCard } from './BlastUnlockCard';
import { BlastConceptIntroCard } from './BlastConceptIntroCard';
import { BlastWordCelebration } from './BlastWordCelebration';

type Props = {
  level: BlastLevel;
  unlocksSeen?: UnlocksSeen;
  isVeteranPlayer?: boolean;
  onAdvance: () => void;
  onUpdateUnlocks?: (unlocks: UnlocksSeen) => void;
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
  unlocksSeen = {},
  isVeteranPlayer = false,
  onAdvance,
  onUpdateUnlocks,
}: Props) {
  const [introDismissed, setIntroDismissed] = useState(false);
  const [levelStartTime] = useState(() => Date.now());
  // Free-form dictionary predicate. Loaded asynchronously per locale and
  // held in state so a re-render lights up the broader vocabulary the
  // moment it's available. Until then validation falls back to the
  // theme/bonus paths exactly as before.
  const [dictCheck, setDictCheck] = useState<((w: string) => boolean) | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    getBlastDictionary(level.locale)
      .then((predicate) => {
        if (!cancelled) setDictCheck(() => predicate);
      })
      .catch(() => {
        /* Dictionary load failed — keep theme-only validation. */
      });
    return () => {
      cancelled = true;
    };
  }, [level.locale]);
  const { state, handlers } = useBlastV2(level, { dictionaryCheck: dictCheck });
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
  const [finalStats, setFinalStats] = useState<{ timeSeconds: number; gemsCollected: number; stars: number } | null>(null);
  useChainHaptics({ chainEventKey: state.chainEventKey, chainDepth: state.lastChainDepth });
  // Selection-count derived from active drag — only counts cells that are
  // currently part of the live trace, so backtracking doesn't double-tick.
  const selectionCount = state.selection.kind === 'active' ? state.selection.cells.length : 0;
  useBlastHaptics({
    selectionCount,
    invalidKey: state.invalidShakeKey,
    foundCount: state.foundWords.size,
    status: state.status,
  });
  useChainEventBus({ chainEventKey: state.chainEventKey, chainDepth: state.lastChainDepth });
  // Cascade pacing — Royal Match style. Complete card delayed by `(chainDepth-1)*350 + 700`ms
  // so each cascade beat + final ovation flash plays out visibly before the modal pops.
  const showCompleteCard = useCompleteCardDelay({ status: state.status, chainDepth: state.lastChainDepth });
  const almosts = useMemo(
    () => detectAlmostWords(state.level, state.foundWords, LOCALE_CONFIGS[state.level.locale]),
    [state.level, state.foundWords],
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
  const { state: progressState, clearLevel, openChest, openMutation } = useBlastProgress();
  const [showChestModal, setShowChestModal] = useState(false);
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
      if (!introDismissed || state.status === 'levelComplete') return; // Only track if playing
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
      wrongAttempts: 0,
      cascadesTriggered: state.cascadeCount,
      submissionId: submissionIdRef.current,
    };

    const stars = starRating(submission, level);
    setFinalStats({ timeSeconds, gemsCollected, stars });

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

    clearLevel(submission, state.coins, gemsCollected);
  }, [state.status, introDismissed, level, levelStartTime, state.foundWords, state.hintsUsed, state.cascadeCount, state.coins, state.chestProgress, clearLevel]);

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
  // FX integration point: BlastFxOverlay mounts useBlastFx internally
  // Board ref is obtained internally by BlastBoard via useRef

  // Show chest modal when complete
  useEffect(() => {
    if (state.status === 'levelComplete' && progressState.chestProgress >= 1.0 && !showChestModal) {
      setShowChestModal(true);
    }
  }, [state.status, progressState.chestProgress, showChestModal]);

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

  // Show chest open ceremony if chest is full
  if (showChestModal && progressState.chestContents) {
    return (
      <BlastChestOpenModal
        contents={progressState.chestContents}
        isOpen={true}
        onClose={() => {
          setShowChestModal(false);
          setIntroDismissed(false); // Reset for next level
          onAdvance();
        }}
      />
    );
  }

  if (state.status === 'levelComplete' && showCompleteCard) {
    return (
      <BlastLevelCompleteCard
        coins={state.coins}
        cascadeCount={state.cascadeCount}
        modeColor={modeColor}
        levelNumber={level.levelNumber}
        wordsFound={state.foundWords.size}
        wordsFoundList={Array.from(state.foundWords)}
        timeSeconds={finalStats?.timeSeconds}
        gemsCollected={finalStats?.gemsCollected}
        bestChainDepth={bestChainDepth}
        stars={finalStats?.stars}
        onNext={onAdvance}
      />
    );
  }

  return (
    <div className="flex flex-col h-dvh overflow-hidden bg-[#0b1530] text-white">
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
        coins={progressState.coins}
        chestNumber={progressState.chestNumber}
        // Live chest progress combines the server-known progress with the
        // in-game accumulation (capped at 1) so the badge ticks forward as
        // gems land instead of jumping at level-end.
        chestProgress={Math.min(1, progressState.chestProgress + state.chestProgress)}
        chestContents={progressState.chestContents}
        onShuffle={handlers.onShuffle}
        modeColor={modeColor}
        theme={level.theme}
        targetWords={level.words}
        foundWords={Array.from(state.foundWords)}
        canUndo={state.canUndo && state.status === 'playing'}
        onUndo={handlers.onUndo}
        onHint={() => {
          /* Plan 5 wires hints */
        }}
      />
      <div className="relative flex-1 min-h-0 flex items-stretch justify-center pb-[max(0.5rem,env(safe-area-inset-bottom))] px-2">
        <BlastAtmosphereOverlay modeColor={modeColor} />
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
          revealGlowCells={revealGlowCells}
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
    </div>
  );
}
