'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useBlastSounds } from './hooks/useBlastSounds';
import { useComboSystem } from '@/hooks/useComboSystem';
import { useWordSubmission } from '@/components/singleplayer/game/hooks/useWordSubmission';
import { useSpamDetection } from '@/components/singleplayer/game/hooks/useSpamDetection';
import { useBlastEngine } from './hooks/useBlastEngine';
import { useBlastObjectives } from './hooks/useBlastObjectives';
import { useBlastComboStreak, getComboWindowMs } from './hooks/useBlastComboStreak';
import { useBlastSequencer } from './hooks/useBlastSequencer';
import { BlastStage } from './BlastStage';
import { detectSpecialCombos, type BlastComboType, type SpecialCombo } from './utils/blastCombos';
import { getWaveObjectives, type WaveConfig } from './utils/blastWaveConfig';
import { getComboMultiplier } from '@/shared/utils/scoring';
import { MAX_CASCADE_CHAIN, CASCADE_MIN_WORD_LENGTH, MAX_CASCADE_WORDS_PER_LEVEL, CASCADE_CHAIN_BONUS_MULTIPLIER, type BlastGameConfig, type BlastResultsData, type BlastTileState, type BlastTileType } from './types';
import { detectVerticalWords, detectHorizontalWords } from './utils/blastVerticalScanner';
import { detectMatch3Clusters } from './utils/blastMatch3Detector';
import { useDictionaryCache } from '@/hooks/useDictionaryCache';
import { vibrateBlastBomb, vibrateBlastLightning, vibrateBlastPrism, vibrateBlastCascade } from '@/components/grid/hapticFeedback';
import { detectNearMiss } from './utils/blastNearMiss';
import type { ScoreFlyEvent } from './BlastScoreFly';
import type { ClearedTileEvent } from './BlastEffectsCanvas';

interface BlastGameProps {
  config: BlastGameConfig;
  mode?: 'singleplayer' | 'multiplayer';
  waveNumber?: number;
  waveConfig?: WaveConfig;
  cumulativeScore?: number;
  onWaveComplete?: (waveScore: number, waveWords: string[], clearPct: number) => void;
  onGameEnd: (results: BlastResultsData) => void;
  onQuit: () => void;
  onComboDetected?: (combos: SpecialCombo[]) => void;
  pendingDiscovery?: BlastComboType | null;
  acknowledgeDiscovery?: () => void;
  onWordWithComboType?: (word: string, comboType: string | null) => void;
  discoveredCombos?: Set<BlastComboType>;
  initialTileStates?: BlastTileState[][] | null;
  blastSeed?: number | null;
  remainingTime?: number | null;
  totalTime?: number;
  leaderboard?: Array<{ username: string; score: number; wordCount?: number; avatar?: any }>;
  username?: string;
}

/**
 * BlastGame — main orchestrator for Blast Mode.
 * Connects engine, word validation, combos, objectives, and renders BlastStage.
 */
export function BlastGame({
  config,
  mode = 'singleplayer',
  waveNumber = 1,
  waveConfig,
  cumulativeScore: _cumulativeScore = 0,
  onWaveComplete,
  onGameEnd,
  onQuit,
  onComboDetected,
  pendingDiscovery,
  acknowledgeDiscovery: _acknowledgeDiscovery,
  onWordWithComboType,
  discoveredCombos: _discoveredCombos,
  initialTileStates,
  blastSeed,
  remainingTime: _remainingTime,
  totalTime: _totalTime,
  leaderboard,
  username,
}: BlastGameProps) {
  const isMultiplayer = mode === 'multiplayer';
  const { t } = useLanguage();
  const { playComboSound } = useSoundEffects();
  const sounds = useBlastSounds();

  const minWordLength = waveConfig?.minWordLength ?? 2;

  // Wave objectives (SP only)
  const waveObjectives = useMemo(
    () => (isMultiplayer ? [] : getWaveObjectives(waveNumber)),
    [waveNumber, isMultiplayer],
  );

  // Core engine
  const engine = useBlastEngine(config, {
    movesAllowed: waveConfig?.movesAllowed,
    waveObjectives,
    currentWave: waveNumber,
    isMultiplayer,
    blastSeed: isMultiplayer ? blastSeed : undefined,
    initialTileStates: isMultiplayer ? initialTileStates : undefined,
  });

  // Combo system
  const combo = useComboSystem({
    trackMaxCombo: true,
    onComboSound: playComboSound,
    timerIntervalMs: 250,
  });

  // Animation sequencer
  const sequencer = useBlastSequencer();

  // Combo streak
  const comboStreak = useBlastComboStreak(getComboWindowMs(minWordLength));

  // Spam detection
  const spamDetection = useSpamDetection();

  // Dictionary cache for cascade word detection + validation gate
  const { checkWord, isLoaded: isDictionaryReady } = useDictionaryCache(config.language);

  // Effects state
  const [scoreFlyEvents, setScoreFlyEvents] = useState<ScoreFlyEvent[]>([]);
  const [comboFlash, setComboFlash] = useState<{ id: string; tier: 1 | 2 | 3 } | null>(null);
  const [comboTypeName, setComboTypeName] = useState<string | undefined>();
  const [clearedTilesForEffects, setClearedTilesForEffects] = useState<ClearedTileEvent[]>([]);
  const flyIdRef = useRef(0);

  // Word forming state
  const [formedWord, setFormedWord] = useState('');
  // Near-miss shimmer state
  const [nearMissCells, setNearMissCells] = useState<Array<{ row: number; col: number }>>([]);

  // Track last submitted path
  const lastPathRef = useRef<Array<{ row: number; col: number }>>([]);
  const [gameStartTime] = useState(() => Date.now());
  const onWordWithComboTypeRef = useRef(onWordWithComboType);
  useEffect(() => { onWordWithComboTypeRef.current = onWordWithComboType; }, [onWordWithComboType]);

  // Handle accepted word: clear tiles, cascade, track combos
  const handleWordAccepted = useCallback(async (data: { word: string; score: number }) => {
    if (lastPathRef.current.length === 0) return;

    const path = lastPathRef.current;
    lastPathRef.current = [];

    // Detect combos on the path
    const detectedCombos = detectSpecialCombos(path, engine.tileStates);
    const hadCombo = detectedCombos.length > 0;

    // Report combo to parent (MP socket)
    if (onWordWithComboTypeRef.current) {
      onWordWithComboTypeRef.current(data.word, hadCombo ? detectedCombos[0].type : null);
    }

    // Notify parent of combo discovery
    if (hadCombo && onComboDetected) {
      onComboDetected(detectedCombos);
    }

    // 1. Animate word clear (anticipation → clearing)
    const clearedInfo = path.map(p => ({
      row: p.row,
      col: p.col,
      type: engine.tileStates[p.row]?.[p.col]?.type ?? 'standard',
    }));
    await sequencer.animateWordClear(clearedInfo);

    // 1b. Fire cleared tile events for PixiJS particle effects
    setClearedTilesForEffects(clearedInfo.map(c => ({
      row: c.row, col: c.col, type: c.type as BlastTileType,
    })));

    // 2. Submit to engine (instant state update)
    const result = engine.submitWord(path, data.word, data.score);

    // 3. Score fly effect
    const avgRow = path.reduce((s, p) => s + p.row, 0) / path.length;
    const avgCol = path.reduce((s, p) => s + p.col, 0) / path.length;
    const flyId = `fly-${++flyIdRef.current}`;
    const tier: 1 | 2 | 3 = result.score >= 25 ? 3 : result.score >= 10 ? 2 : 1;
    setScoreFlyEvents(prev => [...prev.slice(-2), {
      id: flyId, score: result.score, startX: avgCol * 60, startY: avgRow * 60, tier,
    }]);

    // 4. Combo flash effect
    if (hadCombo && detectedCombos[0]) {
      const mult = detectedCombos[0].scoreMultiplier;
      const flashTier: 1 | 2 | 3 = mult >= 6 ? 3 : mult >= 4 ? 2 : 1;
      setComboFlash({ id: `flash-${flyIdRef.current}`, tier: flashTier });
      setComboTypeName(`${detectedCombos[0].type.toUpperCase()}!`);
      sounds.playComboActivation(flashTier);
    }

    // 5. Haptic feedback based on tile types in path
    const clearedTypes = new Set(clearedInfo.map(c => c.type));
    if (clearedTypes.has('bomb')) vibrateBlastBomb();
    else if (clearedTypes.has('lightning')) vibrateBlastLightning();
    else if (clearedTypes.has('prism')) vibrateBlastPrism();

    // 6. Near-miss detection — shimmer tiles the player almost included
    const nearMiss = detectNearMiss(path, engine.grid!, engine.tileStates, config.gridSize, hadCombo);
    if (nearMiss) {
      setNearMissCells(nearMiss.cells);
      setTimeout(() => setNearMissCells([]), 1200);
    }

    // 7. Run cascade + animate with multi-chain support
    let chainLevel = 0;
    let cascadeResult = engine.startCascade();
    await sequencer.animateCascade(cascadeResult.gravity, chainLevel);
    cascadeResult.commit?.();

    // Chain cascades: match-3 clusters + auto-formed words after gravity
    const foundWordsSet = new Set(engine.gameState.wordsFound);
    while (chainLevel < MAX_CASCADE_CHAIN) {
      const grid = engine.grid;
      if (!grid) break;

      const affectedCols = new Set(cascadeResult.gravity.newTiles.map(t => t.col));
      const affectedRows = new Set(cascadeResult.gravity.newTiles.map(t => t.row));
      // Also include rows where tiles fell TO
      for (const ft of cascadeResult.gravity.fallingTiles) {
        affectedRows.add(ft.row);
        affectedCols.add(ft.col);
      }

      let hadClears = false;

      // 1. Match-3 clusters (Candy Crush mechanic — most frequent cascade source)
      const clusters = detectMatch3Clusters(grid, engine.tileStates, affectedCols);
      if (clusters.length > 0) {
        chainLevel++;
        hadClears = true;
        for (const cluster of clusters) {
          const bonus = Math.round(cluster.cells.length * 3 * CASCADE_CHAIN_BONUS_MULTIPLIER * chainLevel);
          engine.submitWord(cluster.cells, `[${cluster.letter}×${cluster.cells.length}]`, bonus);
        }
      }

      // 2. Vertical auto-words
      const vertWords = detectVerticalWords(
        grid, engine.tileStates, checkWord, foundWordsSet, CASCADE_MIN_WORD_LENGTH, affectedCols,
      );
      if (vertWords.length > 0) {
        if (!hadClears) chainLevel++;
        hadClears = true;
        const toClear = vertWords.slice(0, MAX_CASCADE_WORDS_PER_LEVEL);
        for (const vw of toClear) {
          const bonus = Math.round(vw.word.length * vw.word.length * CASCADE_CHAIN_BONUS_MULTIPLIER * chainLevel);
          engine.submitWord(vw.path, vw.word, bonus);
          foundWordsSet.add(vw.word);
        }
      }

      // 3. Horizontal auto-words
      const horizWords = detectHorizontalWords(
        grid, engine.tileStates, checkWord, foundWordsSet, CASCADE_MIN_WORD_LENGTH, affectedRows,
      );
      if (horizWords.length > 0) {
        if (!hadClears) chainLevel++;
        hadClears = true;
        const toClear = horizWords.slice(0, MAX_CASCADE_WORDS_PER_LEVEL);
        for (const hw of toClear) {
          const bonus = Math.round(hw.word.length * hw.word.length * CASCADE_CHAIN_BONUS_MULTIPLIER * chainLevel);
          engine.submitWord(hw.path, hw.word, bonus);
          foundWordsSet.add(hw.word);
        }
      }

      if (!hadClears) break;

      // Cascade chain sound
      sounds.playCascadeChain(chainLevel);

      // Chain score fly — show chain multiplier at grid center
      const chainFlyId = `chain-${++flyIdRef.current}`;
      const chainTier: 1 | 2 | 3 = chainLevel >= 3 ? 3 : chainLevel >= 2 ? 2 : 1;
      const chainBonus = chainLevel * 5;
      setScoreFlyEvents(prev => [...prev.slice(-3), {
        id: chainFlyId, score: chainBonus,
        startX: (config.gridSize / 2) * 60, startY: (config.gridSize / 2) * 60,
        tier: chainTier,
      }]);

      // Chain combo flash + haptic
      if (chainLevel >= 2) {
        setComboFlash({ id: `chain-flash-${flyIdRef.current}`, tier: chainTier });
        vibrateBlastCascade();
      }

      // Cascade again with chain acceleration
      cascadeResult = engine.startCascade();
      await sequencer.animateCascade(cascadeResult.gravity, chainLevel);
      cascadeResult.commit?.();
    }

    // Track combo streak
    comboStreak.onWordSubmitted();

    sounds.playTileClear(clearedInfo.length);
  }, [engine, comboStreak, onComboDetected, sounds, sequencer, checkWord, config.gridSize]);

  // Score fly + combo flash handlers
  const handleScoreFlyComplete = useCallback((id: string) => {
    setScoreFlyEvents(prev => prev.filter(e => e.id !== id));
  }, []);
  const handleComboFlashComplete = useCallback(() => {
    setComboFlash(null);
    setComboTypeName(undefined);
  }, []);

  // Word submission pipeline
  const wordSubmission = useWordSubmission({
    language: config.language,
    minWordLength,
    grid: engine.grid,
    gameStartTime,
    getScoreMultiplier: () => getComboMultiplier(combo.comboLevel),
    fireRoundActive: false,
    combo,
    spamDetection,
    t: (key: string) => t(key) || key,
    playWordAcceptedSound: () => {}, // Blast uses useBlastSounds.playTileClear instead
    playComboSound,
    announceWordResult: () => {},
    announceCombo: () => {},
    onWordAccepted: handleWordAccepted,
  });

  // Handlers
  const handleWordSubmit = useCallback((word: string) => {
    wordSubmission.handleWordSubmit(word);
  }, [wordSubmission]);

  const handlePathSubmit = useCallback((cells: Array<{ row: number; col: number }>) => {
    lastPathRef.current = cells;
  }, []);

  const handleWordChange = useCallback((word: string) => {
    setFormedWord(word);
    if (word.length > 0) sounds.playPathTone(word.length);
  }, [sounds]);

  const handleQuit = useCallback(() => {
    onQuit();
  }, [onQuit]);

  // Objective tracking
  const objectives = useBlastObjectives({
    gameState: engine.gameState,
    tileTypeClears: engine.gameState.tileTypeClears,
    waveNumber,
    wordsFound: engine.gameState.wordsFound,
  });

  // Combo timeout sound when streak drops to 0
  const prevStreakLevelRef = useRef<number>(0);
  useEffect(() => {
    const currentLevel = comboStreak.streak.level;
    if (prevStreakLevelRef.current > 0 && currentLevel === 0) {
      sounds.playComboTimeout();
    }
    prevStreakLevelRef.current = currentLevel;
  }, [comboStreak.streak.level, sounds]);

  // Move warning sound at 3, 2, 1 moves remaining
  const prevMovesRef = useRef<number>(Infinity);
  useEffect(() => {
    const movesRemaining = engine.gameState.movesRemaining;
    if (movesRemaining < prevMovesRef.current && movesRemaining >= 1 && movesRemaining <= 3) {
      sounds.playMoveWarning(movesRemaining);
    }
    prevMovesRef.current = movesRemaining;
  }, [engine.gameState.movesRemaining, sounds]);

  // Game end detection (SP only — MP uses server timer)
  useEffect(() => {
    if (isMultiplayer) return undefined;

    // All objectives met
    if (objectives.allObjectivesComplete) {
      sounds.playWaveClear();
      const { score, wordsFound, tilesCleared, totalTiles } = engine.gameState;
      const clearPct = totalTiles > 0 ? Math.min(100, Math.round((tilesCleared / totalTiles) * 100)) : 0;
      const scoreThreshold = waveConfig?.scoreThreshold;

      if (onWaveComplete && (!scoreThreshold || score >= scoreThreshold)) {
        const timer = setTimeout(() => onWaveComplete(score, wordsFound, clearPct), 2000);
        return () => clearTimeout(timer);
      }

      const results = engine.getResults(combo.maxCombo);
      const timer = setTimeout(() => onGameEnd(results), 2000);
      return () => clearTimeout(timer);
    }

    // Board cleared (no objectives or objectives not met)
    if (engine.gameState.isComplete) {
      const results = engine.getResults(combo.maxCombo);
      const timer = setTimeout(() => onGameEnd(results), 2000);
      return () => clearTimeout(timer);
    }

    // Dead end — give player 5s grace to shuffle before auto-ending
    if (engine.gameState.isDeadEnd) {
      const results = engine.getResults(combo.maxCombo);
      const timer = setTimeout(() => onGameEnd(results), 5000);
      return () => clearTimeout(timer);
    }

    return undefined;
  }, [
    engine.gameState.isComplete,
    engine.gameState.isDeadEnd,
    objectives.allObjectivesComplete,
    engine,
    combo.maxCombo,
    onGameEnd,
    onWaveComplete,
    waveConfig,
    isMultiplayer,
    sounds,
  ]);

  // Loading state — wait for both grid generation AND dictionary cache
  if (!engine.grid || !isDictionaryReady) {
    return (
      <div className="flex-1 flex items-center justify-center" data-testid="blast-loading">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-neo-lime border-t-transparent rounded-full animate-spin" />
          <span className="text-neo-white/60 text-sm font-bold">
            {t('blast.generating') || 'Generating grid...'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 flex flex-col h-full" data-testid="blast-game-root">
      <BlastStage
        grid={engine.grid}
        tileStates={engine.tileStates}
        gridSize={config.gridSize}
        language={config.language}
        gameState={engine.gameState}
        waveNumber={waveNumber}
        comboLevel={combo.comboLevel}
        objectiveProgress={objectives.objectiveProgress}
        formedWord={formedWord}
        currentFeedback={wordSubmission.currentFeedback}
        sequencerState={sequencer.state}
        interactive={!engine.isCascading && !sequencer.state.isAnimating && pendingDiscovery == null}
        onWordSubmit={handleWordSubmit}
        onPathSubmit={handlePathSubmit}
        onWordChange={handleWordChange}
        onShuffle={engine.shuffleGrid}
        onQuit={handleQuit}
        noWordsRemaining={engine.noWordsRemaining}
        scoreFlyEvents={scoreFlyEvents}
        onScoreFlyComplete={handleScoreFlyComplete}
        comboFlash={comboFlash}
        onComboFlashComplete={handleComboFlashComplete}
        comboTypeName={comboTypeName}
        nearMissCells={nearMissCells}
        clearedTilesForEffects={clearedTilesForEffects}
        waveCleared={objectives.allObjectivesComplete}
        leaderboard={leaderboard}
        username={username}
        t={(key: string) => t(key) || undefined}
      />
    </div>
  );
}
