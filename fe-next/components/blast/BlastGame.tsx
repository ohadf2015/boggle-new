'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';
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

  // Auto-cascade word callback: increment combo + play sound for each cascade word
  const handleAutoCascadeWord = useCallback(() => {
    combo.incrementCombo(true);
    playWordAcceptedSound();
  }, [combo, playWordAcceptedSound]);

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
    onSynergyDetected: useCallback((_comboType: BlastComboType) => {
      playComboSound(3);
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

  // Near-miss shimmer (psychological hook: shows what the player almost got)
  const nearMiss = useBlastNearMiss();

  // Spam detection
  const spamDetection = useSpamDetection();

  // Dictionary for hint system
  const { checkWord } = useDictionaryCache(config.language);

  // Min word length from wave config (defaults to 2)
  const minWordLength = waveConfig?.minWordLength ?? 2;

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

  // Confetti burst on board complete — fires once per wave clear (SP only)
  const confettiFiredRef = useRef(false);
  useEffect(() => {
    if (isMultiplayer) return;
    if (blast.gameState.isComplete && !confettiFiredRef.current) {
      confettiFiredRef.current = true;
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.6 },
        colors: ['#FFE135', '#FF6B35', '#FF1493', '#00FFFF', '#7FFF00'],
      });
    }
    // Reset guard when wave resets (waveNumber prop changes)
  }, [blast.gameState.isComplete, isMultiplayer]);

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

      // Detect whether the submitted word triggered a combo (used to skip near-miss shimmer)
      const detectedCombos = detectSpecialCombos(path, blast.tileStates);
      const hadCombo = detectedCombos.length > 0;

      // Report detected comboType to parent for multiplayer socket emit
      if (onWordWithComboTypeRef.current) {
        const comboType = detectedCombos.length > 0 ? detectedCombos[0].type : null;
        onWordWithComboTypeRef.current(data.word, comboType);
      }

      blast.clearTilesForWord(path, data.word, data.score);
      lastPathRef.current = [];

      // Trigger near-miss shimmer if no combo was already triggered
      nearMiss.check(path, blast.modifiedGrid ?? [], blast.tileStates, config.gridSize, hadCombo);
    }
  }, [blast, nearMiss, config.gridSize]);

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
      t={(key: string) => t(key) || undefined}
    />
    </div>
  );
}
