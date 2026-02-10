'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useComboSystem } from '@/hooks/useComboSystem';
import { useWordSubmission } from '@/components/singleplayer/game/hooks/useWordSubmission';
import { useSpamDetection } from '@/components/singleplayer/game/hooks/useSpamDetection';
import { useBlastGame } from './hooks/useBlastGame';
import { BlastGameLayout } from './BlastGameLayout';
import type { BlastGameConfig, BlastResultsData } from './types';

interface BlastGameProps {
  config: BlastGameConfig;
  onGameEnd: (results: BlastResultsData) => void;
  onQuit: () => void;
}

/**
 * BlastGame - Connects useBlastGame hook with word submission,
 * combo system, and the layout component.
 *
 * Key difference from SinglePlayerGame: no timer, no bots.
 * Word submission intercepts valid words to clear tiles.
 */
export function BlastGame({ config, onGameEnd, onQuit }: BlastGameProps) {
  const { t } = useLanguage();
  const { playWordAcceptedSound, playComboSound } = useSoundEffects();

  // Core blast game state
  const blast = useBlastGame(config);

  // Combo system
  const combo = useComboSystem({
    trackMaxCombo: true,
    onComboSound: playComboSound,
  });

  // Spam detection
  const spamDetection = useSpamDetection();

  // Game timing - initialized once via effect
  const gameStartTimeRef = useRef(0);
  useEffect(() => {
    if (gameStartTimeRef.current === 0) {
      gameStartTimeRef.current = Date.now();
    }
  }, []);

  // Word forming state (from GridComponent drag)
  const [formedWord, setFormedWord] = useState('');

  // Quit dialog
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  // End game confirmation dialog
  const [showEndGameConfirm, setShowEndGameConfirm] = useState(false);

  // Word submission hook - reuses proven validation pipeline
  const wordSubmission = useWordSubmission({
    language: config.language,
    minWordLength: 2,
    grid: blast.modifiedGrid,
    gameStartTime: gameStartTimeRef.current,
    getScoreMultiplier: () => 1,
    fireRoundActive: false,
    combo,
    spamDetection,
    t: (key: string) => t(key) || key,
    playWordAcceptedSound,
    playComboSound,
    announceWordResult: () => {},
    announceCombo: () => {},
  });

  // Track last submitted path for tile clearing
  const lastPathRef = useRef<Array<{ row: number; col: number }>>([]);

  // Handle word submission: validate via useWordSubmission, tile clearing
  // happens reactively via the useEffect below when score changes
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

  // Watch for score changes in wordSubmission and sync to blast
  const prevScoreRef = useRef(0);
  useEffect(() => {
    const currentScore = wordSubmission.score;
    if (currentScore > prevScoreRef.current) {
      const diff = currentScore - prevScoreRef.current;
      // If word was accepted, clear the tiles
      if (lastPathRef.current.length > 0) {
        const lastWord = wordSubmission.foundWords[wordSubmission.foundWords.length - 1];
        if (lastWord && lastWord.isValid) {
          blast.clearTilesForWord(lastPathRef.current, lastWord.word, diff);
          lastPathRef.current = [];
        }
      }
    }
    prevScoreRef.current = currentScore;
  }, [wordSubmission.score, wordSubmission.foundWords, blast]);

  // Detect game completion or dead end → show results
  useEffect(() => {
    if (blast.gameState.isComplete || blast.gameState.isDeadEnd) {
      const results = blast.getResultsData(combo.maxCombo);
      // Small delay for celebration overlay to show
      const timer = setTimeout(() => {
        onGameEnd(results);
      }, blast.gameState.isComplete ? 2000 : 500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [blast.gameState.isComplete, blast.gameState.isDeadEnd, blast, combo.maxCombo, onGameEnd]);

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

  return (
    <BlastGameLayout
      grid={blast.modifiedGrid}
      tileStates={blast.tileStates}
      gridSize={config.gridSize}
      language={config.language}
      explosions={blast.explosions}
      cascadePhase={blast.cascadePhase}
      cascadeAnimationData={blast.cascadeAnimationData}
      gameState={blast.gameState}
      comboLevel={combo.comboLevel}
      comboTimeRemaining={combo.comboTimeRemaining}
      comboDanger={combo.isDangerState}
      formedWord={formedWord}
      currentFeedback={wordSubmission.currentFeedback}
      onWordSubmit={handleWordSubmit}
      onPathSubmit={handlePathSubmit}
      onWordChange={handleWordChange}
      onExplosionComplete={blast.dismissExplosion}
      onQuitRequest={handleQuitRequest}
      onConfirmQuit={handleConfirmQuit}
      onEndGame={handleEndGame}
      showQuitConfirm={showQuitConfirm}
      setShowQuitConfirm={setShowQuitConfirm}
      showEndGameConfirm={showEndGameConfirm}
      setShowEndGameConfirm={setShowEndGameConfirm}
      t={(key: string) => t(key) || undefined}
    />
  );
}
