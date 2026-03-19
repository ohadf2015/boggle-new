'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
// canvas-confetti is lazy-loaded on board completion (saves ~3kB from initial chunk)
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useComboSystem } from '@/hooks/useComboSystem';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { useWordSubmission } from '@/components/singleplayer/game/hooks/useWordSubmission';
import { useSpamDetection } from '@/components/singleplayer/game/hooks/useSpamDetection';
import { useBlastGame } from './hooks/useBlastGame';
import { useBlastSugarCrush } from './hooks/useBlastSugarCrush';
import { BlastComboFlash } from './BlastComboFlash';
import { BlastComboDiscovery } from './BlastComboDiscovery';
import { useBlastHint } from './hooks/useBlastHint';
import { useBlastPersonalBest } from './hooks/useBlastPersonalBest';
import { useBlastObjectives } from './hooks/useBlastObjectives';
import { useBlastNearMiss } from './hooks/useBlastNearMiss';
import { calculateBonusMoves } from './utils/blastMoveUtils';
import { BlastGameLayout } from './BlastGameLayout';
import { useDictionaryCache } from '@/hooks/useDictionaryCache';
import type { BlastGameConfig, BlastResultsData } from './types';
import { detectSpecialCombos, type BlastComboType, type SpecialCombo } from './utils/blastCombos';
import { getWaveObjectives, type WaveConfig } from './utils/blastWaveConfig';
import { getComboMultiplier } from '@/shared/utils/scoring';
import { useBlastComboSync } from '@/hooks/gameState';
import { useBlastComboStreak, getComboWindowMs } from './hooks/useBlastComboStreak';
import { useBlastHotTiles } from './hooks/useBlastHotTiles';
import { useBlastIntensity } from './hooks/useBlastIntensity';

interface BlastGameProps {
  config: BlastGameConfig;
  /** Game mode: 'singleplayer' uses objectives, sugar crush, waves; 'multiplayer' skips them */
  mode?: 'singleplayer' | 'multiplayer';
  /** Current wave number (1-based) */
  waveNumber?: number;
  /** Wave-specific config from blastWaveConfig */
  waveConfig?: WaveConfig;
  /** Cumulative score from previous waves */
  cumulativeScore?: number;
  /** Called when the board is cleared and score threshold is met */
  onWaveComplete?: (waveScore: number, waveWords: string[], clearPct: number) => void;
  onGameEnd: (results: BlastResultsData) => void;
  onQuit: () => void;
  /** Called when a combo is detected — for first-time discovery tracking */
  onComboDetected?: (combos: SpecialCombo[]) => void;
  /** Non-null when a first-time discovery banner is pending display */
  pendingDiscovery?: BlastComboType | null;
  /** Clears pendingDiscovery after banner auto-dismisses */
  acknowledgeDiscovery?: () => void;
  /**
   * Multiplayer: called when local player submits a word with a detected combo.
   * Parent can use this to include comboType in the socket submitWord emit.
   */
  onWordWithComboType?: (word: string, comboType: string | null) => void;
  /** Discovered combos for in-game codex access */
  discoveredCombos?: Set<import('./utils/blastCombos').BlastComboType>;
  /**
   * Pre-built tile states from server overlay (multiplayer).
   * When provided, useBlastGame skips generateTileStates and uses these directly.
   */
  initialTileStates?: import('./types').BlastTileState[][] | null;
  /**
   * Seed for deterministic multiplayer refills.
   * Broadcast by server with startGame; ensures cascade refills are identical.
   */
  blastSeed?: number | null;
  /** Multiplayer: seconds remaining from server timer */
  remainingTime?: number | null;
  /** Multiplayer: total game duration in seconds */
  totalTime?: number;
  /** Multiplayer: current leaderboard */
  leaderboard?: Array<{ username: string; score: number; wordCount?: number; avatar?: any }>;
  /** Multiplayer: current player's username */
  username?: string;
}

/**
 * BlastGame - Connects useBlastGame hook with word submission,
 * combo system, and the layout component.
 *
 * Key difference from SinglePlayerGame: no timer, no bots.
 * Word submission intercepts valid words to clear tiles.
 */
export function BlastGame({
  config,
  mode = 'singleplayer',
  waveNumber = 1,
  waveConfig,
  cumulativeScore = 0,
  onWaveComplete,
  onGameEnd,
  onQuit,
  onComboDetected,
  pendingDiscovery,
  acknowledgeDiscovery,
  onWordWithComboType,
  discoveredCombos,
  initialTileStates,
  blastSeed,
  remainingTime,
  totalTime,
  leaderboard,
  username,
}: BlastGameProps) {
  const isMultiplayer = mode === 'multiplayer';
  const { t } = useLanguage();
  const { playWordAcceptedSound, playComboSound } = useSoundEffects();
  const { isLowEnd } = useDevicePerformance();

  // Combo system
  const combo = useComboSystem({
    trackMaxCombo: true,
    onComboSound: playComboSound,
    timerIntervalMs: isLowEnd ? 500 : 250,
  });

  // Auto-cascade word callback: play sound but do NOT increment player combo.
  // Cascades are game-generated events — boosting the player's combo for them
  // creates phantom feedback that cheapens intentional combos.
  const handleAutoCascadeWord = useCallback(() => {
    playWordAcceptedSound();
  }, [playWordAcceptedSound]);

  // Memoize wave objectives so they don't cause re-initialization
  // MP doesn't use wave objectives — skip computation entirely
  const waveObjectives = useMemo(
    () => isMultiplayer ? [] : getWaveObjectives(waveNumber),
    [waveNumber, isMultiplayer],
  );

  // Objective tile types for highlighting (memoized Set for BlastTileOverlay)
  const objectiveTileTypes = useMemo(() => {
    if (isMultiplayer) return new Set<string>();
    const types = new Set<string>();
    for (const obj of waveObjectives) {
      if ((obj.type === 'collect_type' || obj.type === 'clear_all_type') && obj.tileType) {
        types.add(obj.tileType);
      }
    }
    return types;
  }, [waveObjectives, isMultiplayer]);

  // Sugar Crush sequence (PSYC-03): fires when moves run out, converting tiles to specials
  const sugarCrush = useBlastSugarCrush();

  // Ref to sugarCrush.start — allows onMovesExhausted to reference latest start without stale closure
  const sugarCrushStartRef = useRef(sugarCrush.start);
  sugarCrushStartRef.current = sugarCrush.start;

  // Sugar crush callback — fires when moves run out
  const handleMovesExhausted = useCallback(() => {
    sugarCrushStartRef.current(
      blastTileStatesRef.current,
      config.gridSize,
      blastSetTileStatesRef.current,
      blastAddExplosionRef.current,
      blastAddBonusScoreRef.current,
      blastEndGameRef.current,
    );
  }, [config.gridSize]);

  // Core blast game state (with cascade callback + move limit from wave config)
  const blast = useBlastGame(config, {
    onAutoCascadeWord: handleAutoCascadeWord,
    movesAllowed: waveConfig?.movesAllowed,
    waveObjectives,
    isMultiplayer,
    onSynergyDetected: useCallback((_comboType: BlastComboType, scoreMultiplier: number) => {
      // Scale audio intensity with combo power: 2x→1, 3x→2, 4-5x→3, 6x→4
      playComboSound(Math.min(5, Math.ceil(scoreMultiplier / 1.5)));
    }, [playComboSound]),
    onComboDetected: useCallback((combos: SpecialCombo[]) => {
      onComboDetected?.(combos);
    }, [onComboDetected]),
    onMovesExhausted: handleMovesExhausted,
    initialTileStates: isMultiplayer ? initialTileStates : undefined,
    blastSeed: isMultiplayer ? blastSeed : undefined,
  });

  // Stable refs to blast methods for use inside onMovesExhausted callback
  // (avoids stale closure over blast object which changes on each render)
   
  const blastTileStatesRef = useRef(blast.tileStates);
  blastTileStatesRef.current = blast.tileStates;  

   
  const blastSetTileStatesRef = useRef(blast.setTileStates);
  blastSetTileStatesRef.current = blast.setTileStates;  

   
  const blastAddExplosionRef = useRef(blast.addExplosion);
  blastAddExplosionRef.current = blast.addExplosion;  

   
  const blastAddBonusScoreRef = useRef(blast.addBonusScore);
  blastAddBonusScoreRef.current = blast.addBonusScore;  

  // After sugar crush completes: in singleplayer end the game; in multiplayer unlock moves
  // (soft pressure — server timer is authoritative for game end in multiplayer)
  const blastEndGameRef = useRef<(totalBonus: number) => void>(() => {});

  blastEndGameRef.current = useCallback((totalBonus: number) => {
    void totalBonus;
    if (isMultiplayer) {
      // Soft pressure: Sugar Crush spectacle done, switch to unlimited moves
      blast.unlockMoves();
    } else {
      blast.endGame();
    }
  }, [blast, isMultiplayer]);

  // Multiplayer combo sync — show another player's combo flash when blastComboSync fires.
  // blastComboSync is set by usePlayerGameEvents when the server broadcasts the event.
  // Each new sync has a unique id so this effect fires once per event.
  const blastComboSync = useBlastComboSync();
  useEffect(() => {
    if (blastComboSync) {
      blast.triggerComboFlash(blastComboSync.comboType);
    }
  // Only fire when a new combo sync arrives (id is unique per event)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blastComboSync?.id]);

  // Min word length from wave config (defaults to 2) — hoisted for use by combo streak
  const minWordLength = waveConfig?.minWordLength ?? 2;

  // Personal best (loss aversion hook: shows target to beat)
  const personalBest = useBlastPersonalBest();

  // Near-miss shimmer (psychological hook: shows what the player almost got)
  const nearMiss = useBlastNearMiss();

  // Combo streak — tracks consecutive word submissions within a time window
  const comboStreak = useBlastComboStreak(getComboWindowMs(minWordLength));

  // Pause combo timer during cascades to prevent unfair decay
  useEffect(() => {
    if (blast.cascadePhase === 'clearing' || blast.cascadePhase === 'falling' || blast.cascadePhase === 'appearing') {
      comboStreak.pauseTimer();
    } else {
      comboStreak.resumeTimer();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- comboStreak object ref changes; we only need pause/resume fns
  }, [blast.cascadePhase, comboStreak.pauseTimer, comboStreak.resumeTimer]);

  // Hot tiles — bonus multiplier tiles in the last 25% of timed rounds (SP only)
  const hotTiles = useBlastHotTiles({
    gridSize: config.gridSize,
    roundDuration: (totalTime ?? 120) * 1000,
    tileStates: blast.tileStates,
    enabled: !isMultiplayer,
  });

  // Intensity — drives reactive background and board glow based on game state
  const intensity = useBlastIntensity({
    comboLevel: combo.comboLevel,
    cascadeChainLevel: blast.cascadeChainLevel ?? 0,
    comboStreakLevel: comboStreak.streak.level,
    isHotPhase: hotTiles.isHotPhase,
    wordsFoundCount: blast.gameState.wordsFound.length,
  });

  // Spam detection
  const spamDetection = useSpamDetection();

  // Dictionary for hint system
  const { checkWord } = useDictionaryCache(config.language);

  // Hint system — gated in multiplayer (no hints in MP)
  const foundWordsSet = useMemo(
    () => new Set(blast.gameState.wordsFound),
    [blast.gameState.wordsFound],
  );
  const spHint = useBlastHint(
    blast.modifiedGrid ?? [],
    config.language,
    checkWord,
    foundWordsSet,
    minWordLength,
  );
  const hintPath = isMultiplayer ? null : spHint.hintPath;
  const hasHintAvailable = isMultiplayer ? false : spHint.hasHintAvailable;
  const requestHint = isMultiplayer ? undefined : spHint.requestHint;
  const clearHint = isMultiplayer ? undefined : spHint.clearHint;

  // Objective tracking
  const spObjectives = useBlastObjectives({
    gameState: blast.gameState,
    tileTypeClears: blast.gameState.tileTypeClears,
    waveNumber,
    wordsFound: blast.gameState.wordsFound,
  });
  const objectiveProgress = spObjectives.objectiveProgress;
  const allObjectivesComplete = spObjectives.allObjectivesComplete;

  // Game timing - initialized once via effect
  const gameStartTimeRef = useRef(0);
  useEffect(() => {
    if (gameStartTimeRef.current === 0) {
      gameStartTimeRef.current = Date.now();
    }
  }, []);

  // Hot tile timer update — check elapsed time every second to activate hot phase
  useEffect(() => {
    if (isMultiplayer || !gameStartTimeRef.current) return;
    const interval = setInterval(() => {
      const elapsed = Date.now() - gameStartTimeRef.current;
      hotTiles.onTimerUpdate(elapsed);
    }, 1000);
    return () => clearInterval(interval);
  }, [isMultiplayer, hotTiles]);

  // Confetti burst + celebration Sugar Crush on board complete (SP only)
  const confettiFiredRef = useRef(false);
  useEffect(() => {
    if (isMultiplayer) return;
    if (blast.gameState.isComplete && !confettiFiredRef.current) {
      confettiFiredRef.current = true;
      import('canvas-confetti').then(({ default: confetti }) => {
        confetti({
          particleCount: 40,
          spread: 50,
          origin: { y: 0.6 },
          colors: ['#FFE135', '#FF6B35', '#FF1493', '#00FFFF', '#7FFF00'],
        });
      });
      // Celebration Sugar Crush: fire when ≥3 moves remain (reward, not consolation)
      if (blast.gameState.movesRemaining >= 3 && isFinite(blast.gameState.totalMoves)) {
        sugarCrushStartRef.current(
          blastTileStatesRef.current,
          config.gridSize,
          blastSetTileStatesRef.current,
          blastAddExplosionRef.current,
          blastAddBonusScoreRef.current,
          () => {}, // no-op onComplete — board already complete
        );
      }
    }
    // Reset guard when wave resets (waveNumber prop changes)
  }, [blast.gameState.isComplete, blast.gameState.movesRemaining, blast.gameState.totalMoves, isMultiplayer, config.gridSize]);

  // Word forming state (from GridComponent drag)
  const [formedWord, setFormedWord] = useState('');

  // Quit dialog
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  // End game confirmation dialog
  const [showEndGameConfirm, setShowEndGameConfirm] = useState(false);

  // Bonus move popup (auto-clears after animation)
  const [bonusMoveAwarded, setBonusMoveAwarded] = useState<number | undefined>();
  const bonusMoveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track last submitted path for tile clearing
  const lastPathRef = useRef<Array<{ row: number; col: number }>>([]);

  // Ref to onWordWithComboType — avoids stale closure in handleWordAccepted
  const onWordWithComboTypeRef = useRef(onWordWithComboType);
  useEffect(() => { onWordWithComboTypeRef.current = onWordWithComboType; }, [onWordWithComboType]);

  // Direct callback when a word is accepted
  const handleWordAccepted = useCallback((data: { word: string; score: number }) => {
    // Check for bonus moves from long words
    const bonus = calculateBonusMoves(data.word.length);
    if (bonus > 0) {
      setBonusMoveAwarded(bonus);
      if (bonusMoveTimerRef.current) clearTimeout(bonusMoveTimerRef.current);
      bonusMoveTimerRef.current = setTimeout(() => setBonusMoveAwarded(undefined), 1500);
    }

    if (lastPathRef.current.length > 0) {
      const path = lastPathRef.current;

      // Detect combos once — pass to clearTilesForWord to avoid redundant O(P²) detection
      const detectedCombos = detectSpecialCombos(path, blast.tileStates);
      const hadCombo = detectedCombos.length > 0;

      // Report detected comboType to parent for multiplayer socket emit
      if (onWordWithComboTypeRef.current) {
        const comboType = hadCombo ? detectedCombos[0].type : null;
        onWordWithComboTypeRef.current(data.word, comboType);
      }

      blast.clearTilesForWord(path, data.word, data.score, detectedCombos);
      lastPathRef.current = [];

      // Trigger near-miss shimmer if no combo was already triggered
      nearMiss.check(path, blast.modifiedGrid ?? [], blast.tileStates, config.gridSize, hadCombo);
    }

    // Track combo streak — consecutive word submissions within time window
    comboStreak.onWordSubmitted();
  }, [blast, nearMiss, config.gridSize, comboStreak]);

  // Word submission hook - reuses proven validation pipeline
  const wordSubmission = useWordSubmission({
    language: config.language,
    minWordLength,
    grid: blast.modifiedGrid,
    gameStartTime: gameStartTimeRef.current,
    getScoreMultiplier: () => getComboMultiplier(combo.comboLevel),
    fireRoundActive: false,
    combo,
    spamDetection,
    t: (key: string) => t(key) || key,
    playWordAcceptedSound,
    playComboSound,
    announceWordResult: () => {},
    announceCombo: () => {},
    onWordAccepted: handleWordAccepted,
  });

  // DDA: silently track word rejections (PSYC-04)
  // After 3+ consecutive rejections, next gravity refill spawns more special tiles
  const lastFeedbackIdRef = useRef<string | null>(null);
  useEffect(() => {
    const fb = wordSubmission.currentFeedback;
    if (fb && fb.type === 'rejected' && fb.id !== lastFeedbackIdRef.current) {
      lastFeedbackIdRef.current = fb.id;
      blast.trackWordFail();
    }
  }, [wordSubmission.currentFeedback, blast]);

  // Handle word submission: validate via useWordSubmission
  const handleWordSubmit = useCallback((word: string) => {
    wordSubmission.handleWordSubmit(word);
  }, [wordSubmission]);

  // Handle path submission (stores the path for tile clearing)
  const handlePathSubmit = useCallback((cells: Array<{ row: number; col: number }>) => {
    lastPathRef.current = cells;
  }, []);

  // Handle word change from grid (for word display)
  const handleWordChange = useCallback((word: string) => {
    setFormedWord(word);
  }, []);

  // Detect game completion or dead end
  // In multiplayer, server timer is authoritative — skip local game-end triggers
  // Priority: objectives met → wave complete, board cleared without objectives → game end, dead end → game end
  useEffect(() => {
    // Multiplayer: server controls game end via timer; local state doesn't trigger onGameEnd
    if (isMultiplayer) return undefined;

    // All objectives met → wave complete (regardless of board clear state)
    if (allObjectivesComplete) {
      const { score, wordsFound, tilesCleared, totalTiles } = blast.gameState;
      const clearPct = totalTiles > 0 ? Math.min(100, Math.round((tilesCleared / totalTiles) * 100)) : 0;
      const scoreThreshold = waveConfig?.scoreThreshold;

      if (onWaveComplete && (!scoreThreshold || score >= scoreThreshold)) {
        const timer = setTimeout(() => {
          onWaveComplete(score, wordsFound, clearPct);
        }, 2000);
        return () => clearTimeout(timer);
      }

      // Objectives met but score threshold not met — game ends
      const results = blast.getResultsData(combo.maxCombo);
      const timer = setTimeout(() => {
        onGameEnd(results);
      }, 2000);
      return () => clearTimeout(timer);
    }

    // Board cleared but objectives NOT met — game ends (failed wave)
    if (blast.gameState.isComplete) {
      const results = blast.getResultsData(combo.maxCombo);
      const timer = setTimeout(() => {
        onGameEnd(results);
      }, 2000);
      return () => clearTimeout(timer);
    }

    // Dead end (no valid words or moves exhausted) — game ends
    if (blast.gameState.isDeadEnd) {
      const results = blast.getResultsData(combo.maxCombo);
      const timer = setTimeout(() => {
        onGameEnd(results);
      }, 500);
      return () => clearTimeout(timer);
    }

    return undefined;
  }, [blast.gameState.isComplete, blast.gameState.isDeadEnd, allObjectivesComplete, blast, combo.maxCombo, onGameEnd, onWaveComplete, waveConfig, isMultiplayer]);

  const handleQuitRequest = useCallback(() => {
    setShowQuitConfirm(true);
  }, []);

  const handleConfirmQuit = useCallback(() => {
    setShowQuitConfirm(false);
    onQuit();
  }, [onQuit]);

  const handleEndGame = useCallback(() => {
    setShowEndGameConfirm(false);
    blast.endGame();
  }, [blast]);

  if (!blast.modifiedGrid) {
    return null; // Grid still loading
  }

  // Block grid during discovery banners or Sugar Crush sequence
  const isDiscoveryActive = pendingDiscovery != null || sugarCrush.isActive;

  return (
    <div className="relative flex-1 flex flex-col h-full" data-testid="blast-game-root">
      <BlastComboFlash
        activeFlash={blast.activeComboFlash}
        onComplete={blast.clearComboFlash}
      />
      <BlastComboDiscovery
        pendingDiscovery={pendingDiscovery ?? null}
        onComplete={acknowledgeDiscovery ?? (() => {})}
      />
      <BlastGameLayout
      isMultiplayer={isMultiplayer}
      remainingTime={remainingTime}
      totalTime={totalTime}
      leaderboard={leaderboard}
      username={username}
      isDiscoveryActive={isDiscoveryActive}
      shimmerCells={nearMiss.shimmerCells}
      grid={blast.modifiedGrid}
      tileStates={blast.tileStates}
      gridSize={config.gridSize}
      language={config.language}
      explosions={blast.explosions}
      scorePopups={blast.scorePopups}
      cascadePhase={blast.cascadePhase}
      cascadeAnimationData={blast.cascadeAnimationData}
      cascadeChainLevel={blast.cascadeChainLevel}
      cascadeHighlightData={blast.cascadeHighlightData}
      cascadeHighlightPhase={blast.cascadeHighlightPhase}
      gameState={blast.gameState}
      waveNumber={waveNumber}
      cumulativeScore={cumulativeScore}
      scoreThreshold={waveConfig?.scoreThreshold}
      comboLevel={combo.comboLevel}
      comboTimeRemaining={combo.comboTimeRemaining}
      comboDanger={combo.isDangerState}
      formedWord={formedWord}
      currentFeedback={wordSubmission.currentFeedback}
      onWordSubmit={handleWordSubmit}
      onPathSubmit={handlePathSubmit}
      onWordChange={handleWordChange}
      noWordsRemaining={blast.noWordsRemaining}
      onExplosionComplete={blast.dismissExplosion}
      onScorePopupComplete={blast.dismissScorePopup}
      onShuffle={blast.shuffleRemainingTiles}
      onQuitRequest={handleQuitRequest}
      onConfirmQuit={handleConfirmQuit}
      onEndGame={handleEndGame}
      showQuitConfirm={showQuitConfirm}
      setShowQuitConfirm={setShowQuitConfirm}
      showEndGameConfirm={showEndGameConfirm}
      setShowEndGameConfirm={setShowEndGameConfirm}
      objectiveProgress={objectiveProgress}
      objectiveTileTypes={objectiveTileTypes}
      bonusMoveAwarded={bonusMoveAwarded}
      hintPath={hintPath}
      hasHintAvailable={hasHintAvailable}
      onRequestHint={requestHint}
      onClearHint={clearHint}
      discoveredCombos={discoveredCombos}
      personalBestScore={personalBest?.bestScore ?? null}
      streak={comboStreak.streak}
      arcRef={comboStreak.arcRef}
      hotTiles={hotTiles.hotTiles}
      isHotPhase={hotTiles.isHotPhase}
      intensity={intensity}
      t={(key: string) => t(key) || undefined}
    />
    </div>
  );
}
