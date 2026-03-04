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

interface BlastGameProps {
  config: BlastGameConfig;
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
  waveNumber = 1,
  waveConfig,
  cumulativeScore = 0,
  onWaveComplete,
  onGameEnd,
  onQuit,
  onComboDetected,
  pendingDiscovery,
  acknowledgeDiscovery,
}: BlastGameProps) {
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
  const waveObjectives = useMemo(() => getWaveObjectives(waveNumber), [waveNumber]);

  // Core blast game state (with cascade callback + move limit from wave config)
  const blast = useBlastGame(config, {
    onAutoCascadeWord: handleAutoCascadeWord,
    movesAllowed: waveConfig?.movesAllowed,
    waveObjectives,
    onSynergyDetected: useCallback((_comboType: BlastComboType) => {
      // Play max combo sound as audio sting for any combo synergy
      playComboSound(3);
    }, [playComboSound]),
    onComboDetected: useCallback((combos: SpecialCombo[]) => {
      onComboDetected?.(combos);
    }, [onComboDetected]),
  });

  // Near-miss shimmer (psychological hook: shows what the player almost got)
  const nearMiss = useBlastNearMiss();

  // Spam detection
  const spamDetection = useSpamDetection();

  // Dictionary for hint system
  const { checkWord } = useDictionaryCache(config.language);

  // Min word length from wave config (defaults to 2)
  const minWordLength = waveConfig?.minWordLength ?? 2;

  // Hint system
  const foundWordsSet = useMemo(
    () => new Set(blast.gameState.wordsFound),
    [blast.gameState.wordsFound],
  );
  const { hintPath, hasHintAvailable, requestHint, clearHint } = useBlastHint(
    blast.modifiedGrid ?? [],
    config.language,
    checkWord,
    foundWordsSet,
    minWordLength,
  );

  // Objective tracking
  const { objectiveProgress, allObjectivesComplete } = useBlastObjectives({
    gameState: blast.gameState,
    tileTypeClears: blast.gameState.tileTypeClears,
    waveNumber,
    wordsFound: blast.gameState.wordsFound,
  });

  // Game timing - initialized once via effect
  const gameStartTimeRef = useRef(0);
  useEffect(() => {
    if (gameStartTimeRef.current === 0) {
      gameStartTimeRef.current = Date.now();
    }
  }, []);

  // Confetti burst on board complete — fires once per wave clear
  const confettiFiredRef = useRef(false);
  useEffect(() => {
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
  }, [blast.gameState.isComplete]);

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
    // DDA: silently track failed words to boost special tile spawn after 3+ consecutive failures
    onWordRejected: blast.trackWordFail,
  });

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
  useEffect(() => {
    if (blast.gameState.isComplete && allObjectivesComplete) {
      const { score, wordsFound, tilesCleared, totalTiles } = blast.gameState;
      const clearPct = totalTiles > 0 ? Math.min(100, Math.round((tilesCleared / totalTiles) * 100)) : 0;
      const scoreThreshold = waveConfig?.scoreThreshold;

      // Wave complete: board cleared + objectives met + threshold met (or no threshold)
      if (onWaveComplete && (!scoreThreshold || score >= scoreThreshold)) {
        const timer = setTimeout(() => {
          onWaveComplete(score, wordsFound, clearPct);
        }, 2000);
        return () => clearTimeout(timer);
      }

      // Board cleared but threshold not met — game ends
      const results = blast.getResultsData(combo.maxCombo);
      const timer = setTimeout(() => {
        onGameEnd(results);
      }, 2000);
      return () => clearTimeout(timer);
    }

    if (blast.gameState.isDeadEnd) {
      const results = blast.getResultsData(combo.maxCombo);
      const timer = setTimeout(() => {
        onGameEnd(results);
      }, 500);
      return () => clearTimeout(timer);
    }

    return undefined;
  }, [blast.gameState.isComplete, blast.gameState.isDeadEnd, allObjectivesComplete, blast, combo.maxCombo, onGameEnd, onWaveComplete, waveConfig]);

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

  const isDiscoveryActive = pendingDiscovery != null;

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
