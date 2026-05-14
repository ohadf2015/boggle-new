'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import type { BlastLevel, CellId } from '@/lib/blast/v2/types';
import { markUnlockSeen, completeFtue, setSkipAll, type UnlocksSeen, type MechanicKey } from '@/lib/blast/v2/tutorial/unlocks-seen';
import { useBlastV2 } from '@/lib/blast/v2/useBlastV2';
import { detectAlmostWords, detectAllCascades } from '@/lib/blast/v2/engine';
import { scanFormableThemeWords } from '@/lib/blast/v2/engine/word-scan';
import { LOCALE_CONFIGS } from '@/lib/blast/v2/locale-config';
import { useChainHaptics } from '@/lib/blast/v2/fx/useChainHaptics';
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
  const { state, handlers } = useBlastV2(level);
  useChainHaptics({ chainEventKey: state.chainEventKey, chainDepth: state.lastChainDepth });
  useChainEventBus({ chainEventKey: state.chainEventKey, chainDepth: state.lastChainDepth });
  // Cascade pacing — Royal Match style. Complete card delayed by `(chainDepth-1)*350 + 700`ms
  // so each cascade beat + final ovation flash plays out visibly before the modal pops.
  const showCompleteCard = useCompleteCardDelay({ status: state.status, chainDepth: state.lastChainDepth });
  const almosts = useMemo(
    () => detectAlmostWords(state.level, state.foundWords, LOCALE_CONFIGS[state.level.locale]),
    [state.level, state.foundWords],
  );
  const [revealGlowCells, setRevealGlowCells] = useState<CellId[]>([]);
  // Compute reveal glow cells when a word is found: glow the next formable word
  useEffect(() => {
    if (state.status === 'levelComplete') {
      setRevealGlowCells([]);
      return;
    }
    const cascades = detectAllCascades(state.level, state.foundWords, LOCALE_CONFIGS[state.level.locale]);
    if (cascades.length > 0) {
      // Glow the first (next) formable word
      setRevealGlowCells(cascades[0].cells);
    } else {
      setRevealGlowCells([]);
    }
  }, [state.foundWords, state.level, state.status]);
  const { state: progressState, clearLevel, openChest, openMutation } = useBlastProgress();
  const [showChestModal, setShowChestModal] = useState(false);
  // Idempotency: one submission per level — prevents retry loop on state-feedback re-renders.
  const submittedRef = useRef(false);
  const submissionIdRef = useRef<string | null>(null);
  useEffect(() => {
    submittedRef.current = false;
    submissionIdRef.current = null;
  }, [level.levelNumber, level.locale]);
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
    const gemsCollected = Math.round(state.chestProgress * 10);

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
        onNext={onAdvance}
      />
    );
  }

  return (
    <div className="flex flex-col min-h-dvh bg-[#0b1530] text-white">
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
        chestProgress={progressState.chestProgress}
        chestContents={progressState.chestContents}
        onShuffle={handlers.onShuffle}
        onHint={() => {
          /* Plan 5 wires hints */
        }}
      />
      <div className="relative flex-1 flex items-end justify-center pb-[max(1rem,env(safe-area-inset-bottom))]">
        <BlastAtmosphereOverlay modeColor={modeColor} />
        <BlastFxOverlay chainEventKey={state.chainEventKey} chainDepth={state.lastChainDepth} />
        <BlastChainSoundListener />
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
        />
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
