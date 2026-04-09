'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useMusic } from '@/contexts/MusicContext';
import { useBlastSounds } from './hooks/useBlastSounds';
import { useComboSystem } from '@/hooks/useComboSystem';
import { useWordSubmission } from '@/components/singleplayer/game/hooks/useWordSubmission';
import { useSpamDetection } from '@/components/singleplayer/game/hooks/useSpamDetection';
import { useBlastEngine } from './hooks/useBlastEngine';
import { useBlastObjectives } from './hooks/useBlastObjectives';
import { useBlastComboStreak, getComboWindowMs } from './hooks/useBlastComboStreak';
import { useBlastSequencer } from './hooks/useBlastSequencer';
import { BlastStage } from './BlastStage';
import { BlastWaveIntro } from './BlastWaveIntro';
import { BlastSugarCrushFinale } from './BlastSugarCrushFinale';
import { BlastMoveWarningMascot } from './BlastMoveWarningMascot';
import { GameParticles } from '@/components/effects/GameParticles';
import { type BlastComboType, type SpecialCombo } from './utils/blastCombos';
import { getWaveObjectives, type WaveConfig } from './utils/blastWaveConfig';
import { getComboMultiplier } from '@/shared/utils/scoring';
import { type BlastGameConfig, type BlastResultsData, type BlastTileState, type BlastTileType } from './types';
import { useDictionaryCache } from '@/hooks/useDictionaryCache';
import { useBlastCascade } from './hooks/useBlastCascade';
import { useBlastWordHandler } from './hooks/useBlastWordHandler';
import { useBlastGameEnd, type DeadEndFinaleTile } from './hooks/useBlastGameEnd';
import { useBlastObjectiveEffects } from './hooks/useBlastObjectiveEffects';
import type { ScoreFlyEvent } from './BlastScoreFly';
import type { ClearedTileEvent } from './BlastEffectsCanvas';
import { useGameStore } from '@/hooks/gameState';
import type { LetterGrid } from '@/shared/types';

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
  const { playComboSound, playBoardShuffleSound, setGameActive } = useSoundEffects();
  const { fadeToTrack, stopMusic, TRACKS } = useMusic();
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
    minWordLength,
  });

  const combo = useComboSystem({ trackMaxCombo: true, onComboSound: playComboSound, timerIntervalMs: 250 });
  const sequencer = useBlastSequencer();
  const comboStreak = useBlastComboStreak(getComboWindowMs(minWordLength));
  const spamDetection = useSpamDetection();

  // MP board sync: apply server-authoritative board state when blastBoardUpdate arrives
  // Queue updates during cascade to prevent ref corruption mid-animation
  const pendingBoardUpdatesRef = useRef<Array<{ grid: LetterGrid; tileStates: BlastTileState[][] }>>([]);
  const blastBoardUpdate = useGameStore((s) => s.blastBoardUpdate);
  useEffect(() => {
    if (!isMultiplayer || !blastBoardUpdate) return;
    const boardData = { grid: blastBoardUpdate.grid, tileStates: blastBoardUpdate.tileStates };
    useGameStore.getState().setBlastBoardUpdate(null);
    // If mid-cascade, queue — apply after cascade completes
    if (engine.isCascading) {
      pendingBoardUpdatesRef.current.push(boardData);
      return;
    }
    // Not cascading: apply immediately to correct any drift
    engine.applyServerBoard(boardData.grid, boardData.tileStates);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally using engine.* properties, not full engine object
  }, [blastBoardUpdate, isMultiplayer, username, engine.isCascading, engine.applyServerBoard]);

  // Flush queued board updates after cascade completes — only apply the last (each is a full snapshot)
  useEffect(() => {
    if (!engine.isCascading && pendingBoardUpdatesRef.current.length > 0) {
      const queue = pendingBoardUpdatesRef.current;
      const last = queue[queue.length - 1];
      pendingBoardUpdatesRef.current = [];
      engine.applyServerBoard(last.grid, last.tileStates);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally using engine.* properties
  }, [engine.isCascading, engine.applyServerBoard]);

  // Dictionary cache for cascade word detection + validation gate
  const { checkWord, isLoaded: isDictionaryReady } = useDictionaryCache(config.language);

  // Enable sound gate on mount, disable on unmount
  useEffect(() => {
    setGameActive(true);
    fadeToTrack(TRACKS.BLAST, 800, 800);
    const explosionShakeTimer = explosionShakeTimerRef;
    const nearMissTimer = nearMissTimerRef;
    return () => {
      setGameActive(false);
      stopMusic();
      if (explosionShakeTimer.current) clearTimeout(explosionShakeTimer.current);
      if (nearMissTimer.current) clearTimeout(nearMissTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setGameActive]);

  // Effects + UI state
  const [scoreFlyEvents, setScoreFlyEvents] = useState<ScoreFlyEvent[]>([]);
  const [comboFlash, setComboFlash] = useState<{ id: string; tier: 1 | 2 | 3 } | null>(null);
  const [comboTypeName, setComboTypeName] = useState<string | undefined>();
  const [clearedTilesForEffects, setClearedTilesForEffects] = useState<ClearedTileEvent[]>([]);
  const flyIdRef = useRef(0);
  const [wordFoundParticle, setWordFoundParticle] = useState(0);
  const [comboParticle, setComboParticle] = useState(0);
  const [waveClearParticle, setWaveClearParticle] = useState(0);
  const [formedWord, setFormedWord] = useState('');
  const [nearMissCells, setNearMissCells] = useState<Array<{ row: number; col: number }>>([]);
  const [cascadeHighlightCells, setCascadeHighlightCells] = useState<Array<{ row: number; col: number }>>([]);
  const [cascadeHighlightWord, setCascadeHighlightWord] = useState<string | null>(null);
  const [lastWordLength, setLastWordLength] = useState(0);
  const [wordSubmitCount, setWordSubmitCount] = useState(0);
  const [explosionShake, setExplosionShake] = useState(0);
  const explosionShakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nearMissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPathRef = useRef<Array<{ row: number; col: number }>>([]);
  const [gameStartTime] = useState(() => Date.now());

  const onWordWithComboTypeRef = useRef(onWordWithComboType);
  useEffect(() => { onWordWithComboTypeRef.current = onWordWithComboType; }, [onWordWithComboType]);

  // Cascade system (extracted hook)
  const { runCascade } = useBlastCascade({
    engine, sequencer, sounds, comboStreak, checkWord,
    waveConfig,
    setCascadeHighlightCells, setCascadeHighlightWord,
    setScoreFlyEvents, setComboFlash, flyIdRef,
  });

  // Word-accepted pipeline (extracted to useBlastWordHandler)
  const { handleWordAccepted } = useBlastWordHandler({
    engine, sequencer, sounds, runCascade,
    lastPathRef, flyIdRef, explosionShakeTimerRef, nearMissTimerRef,
    onWordWithComboTypeRef, onComboDetected,
    config, t,
    effects: {
      setLastWordLength, setWordSubmitCount, setWordFoundParticle,
      setClearedTilesForEffects, setScoreFlyEvents,
      setComboFlash, setComboTypeName, setComboParticle,
      setExplosionShake, setNearMissCells,
    },
  });

  // Score fly + combo flash handlers
  const handleScoreFlyComplete = useCallback((id: string) => {
    setScoreFlyEvents(prev => prev.filter(e => e.id !== id));
  }, []);
  const handleComboFlashComplete = useCallback(() => {
    setComboFlash(null);
    setComboTypeName(undefined);
  }, []);

  // Word submission pipeline
  const getScoreMultiplier = useCallback(() => getComboMultiplier(combo.comboLevel), [combo.comboLevel]);
  const tSafe = useCallback((key: string) => t(key) || key, [t]);
  const noop = useCallback(() => {}, []);

  const wordSubmission = useWordSubmission({
    language: config.language,
    minWordLength,
    grid: engine.grid,
    gameStartTime,
    getScoreMultiplier,
    fireRoundActive: false,
    combo,
    spamDetection,
    t: tSafe,
    playWordAcceptedSound: noop, // Blast uses useBlastSounds.playTileClear instead
    playComboSound,
    announceWordResult: noop,
    announceCombo: noop,
    onWordAccepted: handleWordAccepted,
  });

  // Handlers

  const handlePathSubmit = useCallback((cells: Array<{ row: number; col: number }>) => {
    lastPathRef.current = cells;
  }, []);

  const handleWordChange = useCallback((word: string, _count: number) => {
    setFormedWord(word);
    if (word.length > prevWordLenRef.current) {
      sounds.playTileSelect();
    } else if (word.length === 0 && prevWordLenRef.current >= 2) {
      // Path cancelled without submission — descending deflate tone
      sounds.playPathCancel(prevWordLenRef.current);
    }
    prevWordLenRef.current = word.length;
    if (word.length > 0) sounds.playPathTone(word.length);
  }, [sounds]);

  // Play rejection sound + consume a move when word is rejected
  const prevFeedbackIdRef = useRef<string | null>(null);
  useEffect(() => {
    const fb = wordSubmission.currentFeedback;
    if (fb && (fb.type === 'rejected' || fb.type === 'duplicate') && fb.id !== prevFeedbackIdRef.current) {
      if (fb.type === 'rejected') sounds.playWordReject();
      engine.consumeMove();
      engine.trackWordFail();
    }
    prevFeedbackIdRef.current = fb?.id ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally using engine.* methods
  }, [wordSubmission.currentFeedback, sounds, engine.consumeMove, engine.trackWordFail]);

  const handleQuit = useCallback(() => {
    onQuit();
  }, [onQuit]);

  const handleShuffle = useCallback(() => {
    engine.shuffleGrid();
    playBoardShuffleSound();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally using engine.* method
  }, [engine.shuffleGrid, playBoardShuffleSound]);

  const tAdapter = useCallback((key: string) => t(key) || undefined, [t]);

  // Compute initial tile type counts once per wave (for clear_all_type objectives)
  const initialTileTypeCounts = useMemo(() => {
    const tiles = engine.tileStates;
    if (!tiles.length) return undefined;
    const counts: Record<string, number> = {};
    for (const row of tiles) {
      for (const tile of row) {
        if (!tile.isCleared) {
          counts[tile.type] = (counts[tile.type] || 0) + 1;
        }
      }
    }
    return counts as Record<import('./types').BlastTileType, number>;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- capture once per wave
  }, [waveNumber]);

  // Objective tracking
  const objectives = useBlastObjectives({
    gameState: engine.gameState,
    tileTypeClears: engine.gameState.tileTypeClears,
    waveNumber,
    wordsFound: engine.gameState.wordsFound,
    initialTileTypeCounts,
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
  const prevWordLenRef = useRef<number>(0);
  const prevMovesRef = useRef<number>(Infinity);
  useEffect(() => {
    const movesRemaining = engine.gameState.movesRemaining;
    if (movesRemaining < prevMovesRef.current && movesRemaining >= 1 && movesRemaining <= 3) {
      sounds.playMoveWarning(movesRemaining);
    }
    prevMovesRef.current = movesRemaining;
  }, [engine.gameState.movesRemaining, sounds]);

  // Objective completion effects (extracted to useBlastObjectiveEffects)
  useBlastObjectiveEffects({
    objectives, engine, sounds, t,
    setScoreFlyEvents, setComboFlash, setComboTypeName,
    setExplosionShake, setWaveClearParticle,
    explosionShakeTimerRef, flyIdRef,
  });

  // Dead-end finale: flag every leftover tile as a 'bomb' event so spawnDebris routes
  // them through physics.applyExplosion — no new physics code, maximum visual payoff.
  const handleDeadEndFinale = useCallback((tiles: DeadEndFinaleTile[]) => {
    setClearedTilesForEffects(tiles.map(t => ({
      row: t.row, col: t.col, type: 'bomb' as BlastTileType,
    })));
    sounds.playSpecialTileSound('bomb');
    if (explosionShakeTimerRef.current) clearTimeout(explosionShakeTimerRef.current);
    setExplosionShake(3);
    explosionShakeTimerRef.current = setTimeout(() => setExplosionShake(0), 800);
  }, [sounds]);

  // Game end detection + Sugar Crush (extracted to useBlastGameEnd)
  const { sugarCrushActive } = useBlastGameEnd({
    engine, isMultiplayer, gridSize: config.gridSize,
    waveConfig, objectives, onGameEnd, onWaveComplete,
    maxCombo: combo.maxCombo, sounds,
    setExplosionShake, explosionShakeTimerRef,
    onDeadEndFinale: handleDeadEndFinale,
  });

  // Loading state — wait for both grid generation AND dictionary cache
  if (!engine.grid || !isDictionaryReady) {
    return (
      <div className="flex-1 flex items-center justify-center" data-testid="blast-loading">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-neo-lime border-t-transparent rounded-full animate-spin" />
          <span className="text-neo-white/60 text-sm font-bold">
            {t('blast.generating')}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="blast-game relative flex-1 flex flex-col h-full" data-testid="blast-game-root">
      {/* Particle effects — self-gate on device performance */}
      <GameParticles preset="wordFound" trigger={wordFoundParticle} />
      <GameParticles preset="comboBreak" trigger={comboParticle} />
      <GameParticles preset="victory" trigger={waveClearParticle} />

      {waveConfig?.archetype && (
        <BlastWaveIntro waveNumber={waveNumber} archetype={waveConfig.archetype} t={tAdapter} />
      )}

      <BlastSugarCrushFinale active={sugarCrushActive} t={tAdapter} />

      <BlastMoveWarningMascot movesRemaining={engine.gameState.movesRemaining} t={tAdapter} />

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
        interactive={!engine.isCascading && !sequencer.state.isAnimating && pendingDiscovery == null && !engine.gameState.isDeadEnd && !engine.gameState.isComplete}
        onWordSubmit={wordSubmission.handleWordSubmit}
        onPathSubmit={handlePathSubmit}
        onWordChange={handleWordChange}
        onShuffle={handleShuffle}
        onQuit={handleQuit}
        noWordsRemaining={engine.noWordsRemaining}
        scoreFlyEvents={scoreFlyEvents}
        onScoreFlyComplete={handleScoreFlyComplete}
        comboFlash={comboFlash}
        onComboFlashComplete={handleComboFlashComplete}
        comboTypeName={comboTypeName}
        nearMissCells={nearMissCells}
        cascadeHighlightCells={cascadeHighlightCells}
        cascadeHighlightWord={cascadeHighlightWord}
        clearedTilesForEffects={clearedTilesForEffects}
        waveCleared={objectives.allObjectivesComplete}
        leaderboard={leaderboard}
        username={username}
        comboStreak={comboStreak.streak}
        comboStreakArcRef={comboStreak.arcRef}
        explosionShake={explosionShake}
        lastWordLength={lastWordLength}
        wordSubmitCount={wordSubmitCount}
        t={tAdapter}
      />
    </div>
  );
}
