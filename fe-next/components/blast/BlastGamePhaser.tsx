/**
 * BlastGamePhaser — Phaser-backed blast game variant.
 *
 * Reuses ALL existing hooks (useBlastGame, useComboSystem, useWordSubmission,
 * useSpamDetection, useBlastHint) but routes grid rendering through
 * GameBridge → Phaser canvas instead of React DOM.
 *
 * Renders BlastGameLayoutPhaser (Phaser canvas grid + React UI chrome).
 */

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
import { useBlastHint } from './hooks/useBlastHint';
import { useBlastBridge } from './hooks/useBlastBridge';
import { BlastGameLayoutPhaser } from './BlastGameLayoutPhaser';
import { useDictionaryCache } from '@/hooks/useDictionaryCache';
import type { BlastGameConfig, BlastResultsData } from './types';
import type { WaveConfig } from './utils/blastWaveConfig';
import { getComboMultiplier } from '@/shared/utils/scoring';

// ─── Props ───────────────────────────────────────────────────────────────────

interface BlastGamePhaserProps {
  config: BlastGameConfig;
  waveNumber?: number;
  waveConfig?: WaveConfig;
  cumulativeScore?: number;
  onWaveComplete?: (waveScore: number, waveWords: string[], clearPct: number) => void;
  onGameEnd: (results: BlastResultsData) => void;
  onQuit: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function BlastGamePhaser({
  config,
  waveNumber = 1,
  waveConfig,
  cumulativeScore = 0,
  onWaveComplete,
  onGameEnd,
  onQuit,
}: BlastGamePhaserProps) {
  const { t } = useLanguage();
  const { playWordAcceptedSound, playComboSound } = useSoundEffects();
  const { isLowEnd } = useDevicePerformance();

  // Combo system
  const combo = useComboSystem({
    trackMaxCombo: true,
    onComboSound: playComboSound,
    timerIntervalMs: isLowEnd ? 500 : 250,
  });

  const handleAutoCascadeWord = useCallback(() => {
    combo.incrementCombo(true);
    playWordAcceptedSound();
  }, [combo, playWordAcceptedSound]);

  // Core blast game state
  const blast = useBlastGame(config, { onAutoCascadeWord: handleAutoCascadeWord });

  // Spam detection
  const spamDetection = useSpamDetection();

  // Dictionary for hint system
  const { checkWord } = useDictionaryCache(config.language);

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

  // Game timing
  const gameStartTimeRef = useRef(0);
  useEffect(() => {
    if (gameStartTimeRef.current === 0) {
      gameStartTimeRef.current = Date.now();
    }
  }, []);

  // Confetti burst on board complete
  const confettiFiredRef = useRef(false);
  useEffect(() => {
    if (blast.gameState.isComplete && !confettiFiredRef.current) {
      confettiFiredRef.current = true;
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFE135', '#FF6B35', '#FF1493', '#00FFFF', '#7FFF00'],
      });
    }
  }, [blast.gameState.isComplete]);

  // Word forming state (from Phaser bridge)
  const [formedWord, setFormedWord] = useState('');

  // Quit/end game dialogs
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [showEndGameConfirm, setShowEndGameConfirm] = useState(false);

  // Track last submitted path for tile clearing
  const lastPathRef = useRef<Array<{ row: number; col: number }>>([]);

  const handleWordAccepted = useCallback((data: { word: string; score: number }) => {
    if (lastPathRef.current.length > 0) {
      blast.clearTilesForWord(lastPathRef.current, data.word, data.score);
      lastPathRef.current = [];
    }
  }, [blast]);

  // Word submission hook
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

  // Handle Phaser word submit (from bridge)
  const handleWordSubmit = useCallback((word: string) => {
    wordSubmission.handleWordSubmit(word);
  }, [wordSubmission]);

  // Handle Phaser path submit (stores path for tile clearing)
  const handlePathSubmit = useCallback((word: string, path: Array<{ row: number; col: number; letter: string }>) => {
    lastPathRef.current = path.map(({ row, col }) => ({ row, col }));
    handleWordSubmit(word);
  }, [handleWordSubmit]);

  // Handle word change from Phaser (for word display)
  const handleWordChange = useCallback((_word: string, _letterCount: number) => {
    setFormedWord(_word);
  }, []);

  // ── GameBridge sync via useBlastBridge ────────────────────────────────────
  useBlastBridge({
    grid: blast.modifiedGrid,
    tileStates: blast.tileStates,
    comboLevel: combo.comboLevel,
    hintPath,
    waveNumber,
    onWordSubmit: handlePathSubmit,
    onWordChange: handleWordChange,
  });

  // Detect game completion or dead end
  useEffect(() => {
    if (blast.gameState.isComplete) {
      const { score, wordsFound, tilesCleared, totalTiles } = blast.gameState;
      const clearPct = totalTiles > 0 ? Math.min(100, Math.round((tilesCleared / totalTiles) * 100)) : 0;
      const scoreThreshold = waveConfig?.scoreThreshold;

      if (onWaveComplete && (!scoreThreshold || score >= scoreThreshold)) {
        const timer = setTimeout(() => {
          onWaveComplete(score, wordsFound, clearPct);
        }, 2000);
        return () => clearTimeout(timer);
      }

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
  }, [blast.gameState.isComplete, blast.gameState.isDeadEnd, blast, combo.maxCombo, onGameEnd, onWaveComplete, waveConfig]);

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
    return null;
  }

  return (
    <BlastGameLayoutPhaser
      gameState={blast.gameState}
      waveNumber={waveNumber}
      cumulativeScore={cumulativeScore}
      scoreThreshold={waveConfig?.scoreThreshold}
      comboLevel={combo.comboLevel}
      comboTimeRemaining={combo.comboTimeRemaining}
      comboDanger={combo.isDangerState}
      formedWord={formedWord}
      currentFeedback={wordSubmission.currentFeedback}
      noWordsRemaining={blast.noWordsRemaining}
      cascadeChainLevel={blast.cascadeChainLevel}
      cascadeHighlightData={blast.cascadeHighlightData}
      cascadeHighlightPhase={blast.cascadeHighlightPhase}
      onShuffle={blast.shuffleRemainingTiles}
      onQuitRequest={handleQuitRequest}
      onConfirmQuit={handleConfirmQuit}
      onEndGame={handleEndGame}
      showQuitConfirm={showQuitConfirm}
      setShowQuitConfirm={setShowQuitConfirm}
      showEndGameConfirm={showEndGameConfirm}
      setShowEndGameConfirm={setShowEndGameConfirm}
      hintPath={hintPath}
      hasHintAvailable={hasHintAvailable}
      onRequestHint={requestHint}
      onClearHint={clearHint}
      t={(key: string) => t(key) || undefined}
    />
  );
}
