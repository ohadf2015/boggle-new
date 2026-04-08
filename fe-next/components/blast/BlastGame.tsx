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
import { GameParticles } from '@/components/effects/GameParticles';
import { detectSpecialCombos, type BlastComboType, type SpecialCombo } from './utils/blastCombos';
import { getWaveObjectives, type WaveConfig } from './utils/blastWaveConfig';
import { getComboMultiplier } from '@/shared/utils/scoring';
import { MAX_CASCADE_CHAIN, CASCADE_MIN_WORD_LENGTH, MAX_CASCADE_WORDS_PER_LEVEL, CASCADE_CHAIN_BONUS_MULTIPLIER, CASCADE_MOMENTUM_THRESHOLDS, CASCADE_MOMENTUM_PER_WORD, CASCADE_MOMENTUM_LONG_WORD_BONUS, CASCADE_MOMENTUM_DECAY, CASCADE_TIER_MAX_CHAIN, CASCADE_HIGHLIGHT_DURATION, CASCADE_HIGHLIGHT_LINGER, type BlastGameConfig, type BlastResultsData, type BlastTileState, type BlastTileType } from './types';
import { detectVerticalWords, detectHorizontalWords } from './utils/blastVerticalScanner';
import { detectMatch3Clusters } from './utils/blastMatch3Detector';
import { useDictionaryCache } from '@/hooks/useDictionaryCache';
import { vibrateBlastBomb, vibrateBlastLightning, vibrateBlastPrism, vibrateBlastCascade } from '@/components/grid/hapticFeedback';
import { detectNearMiss } from './utils/blastNearMiss';
import { planSugarCrush } from './utils/blastSugarCrush';
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
    return () => {
      setGameActive(false);
      stopMusic();
      if (explosionShakeTimerRef.current) clearTimeout(explosionShakeTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setGameActive]);

  // Effects state
  const [scoreFlyEvents, setScoreFlyEvents] = useState<ScoreFlyEvent[]>([]);
  const [comboFlash, setComboFlash] = useState<{ id: string; tier: 1 | 2 | 3 } | null>(null);
  const [comboTypeName, setComboTypeName] = useState<string | undefined>();
  const [clearedTilesForEffects, setClearedTilesForEffects] = useState<ClearedTileEvent[]>([]);
  const flyIdRef = useRef(0);

  // Particle effect triggers (incrementing counters — each change fires the effect)
  const [wordFoundParticle, setWordFoundParticle] = useState(0);
  const [comboParticle, setComboParticle] = useState(0);
  const [waveClearParticle, setWaveClearParticle] = useState(0);

  // Word forming state
  const [formedWord, setFormedWord] = useState('');
  // Near-miss shimmer state
  const [nearMissCells, setNearMissCells] = useState<Array<{ row: number; col: number }>>([]);
  // Cascade highlight: cells to glow before cascade clears them
  const [cascadeHighlightCells, setCascadeHighlightCells] = useState<Array<{ row: number; col: number }>>([]);
  const [cascadeHighlightWord, setCascadeHighlightWord] = useState<string | null>(null);

  // Word praise feedback state
  const [lastWordLength, setLastWordLength] = useState(0);
  const [wordSubmitCount, setWordSubmitCount] = useState(0);

  // Explosion screen shake — triggered by bomb/countdown explosions
  const [explosionShake, setExplosionShake] = useState(false);
  const explosionShakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sugar Crush end-of-level sequence
  const sugarCrushRunningRef = useRef(false);

  // Track last submitted path
  const lastPathRef = useRef<Array<{ row: number; col: number }>>([]);
  const [gameStartTime] = useState(() => Date.now());

  // Cascade momentum: accumulates as player finds words, decays on idle turns
  const cascadeMomentumRef = useRef(0);
  const onWordWithComboTypeRef = useRef(onWordWithComboType);
  useEffect(() => { onWordWithComboTypeRef.current = onWordWithComboType; }, [onWordWithComboType]);

  // Refs for game-end effect — avoid stale closures on callback props and dynamic values
  const onGameEndRef = useRef(onGameEnd);
  useEffect(() => { onGameEndRef.current = onGameEnd; }, [onGameEnd]);
  const onWaveCompleteRef = useRef(onWaveComplete);
  useEffect(() => { onWaveCompleteRef.current = onWaveComplete; }, [onWaveComplete]);
  const engineRef = useRef(engine);
  useEffect(() => { engineRef.current = engine; }, [engine]);
  const maxComboRef = useRef(combo.maxCombo);
  useEffect(() => { maxComboRef.current = combo.maxCombo; }, [combo.maxCombo]);
  const waveConfigRef = useRef(waveConfig);
  useEffect(() => { waveConfigRef.current = waveConfig; }, [waveConfig]);

  // Handle accepted word: clear tiles, cascade, track combos
  const handleWordAccepted = useCallback(async (data: { word: string; score: number }) => {
    if (lastPathRef.current.length === 0) return;

    const path = lastPathRef.current;
    lastPathRef.current = [];

    // Track word length for praise feedback
    setLastWordLength(path.length);
    setWordSubmitCount(c => c + 1);

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

    // Trigger word-found particle effect
    setWordFoundParticle(c => c + 1);

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
      id: flyId, score: result.score,
      startX: ((avgCol + 0.5) / config.gridSize) * 100,
      startY: ((avgRow + 0.5) / config.gridSize) * 100,
      tier,
    }]);

    // 4. Combo flash effect
    if (hadCombo && detectedCombos[0]) {
      const mult = detectedCombos[0].scoreMultiplier;
      const flashTier: 1 | 2 | 3 = mult >= 6 ? 3 : mult >= 4 ? 2 : 1;
      setComboFlash({ id: `flash-${flyIdRef.current}`, tier: flashTier });
      setComboTypeName(t(`blast.combo.${detectedCombos[0].type}`) || `${detectedCombos[0].type.toUpperCase()}!`);
      sounds.playComboActivation(flashTier);
      setComboParticle(c => c + 1);
    }

    // 5. Haptic + sound feedback based on tile types in path
    const clearedTypes = new Set(clearedInfo.map(c => c.type));
    if (clearedTypes.has('bomb')) vibrateBlastBomb();
    else if (clearedTypes.has('lightning')) vibrateBlastLightning();
    else if (clearedTypes.has('prism')) vibrateBlastPrism();
    // Play sounds for ALL special tile types in the path
    for (const type of clearedTypes) {
      if (type !== 'standard') sounds.playSpecialTileSound(type);
    }

    // 5b. Screen shake on bomb/countdown explosions
    const hasBombExplosion = clearedTypes.has('bomb') || clearedTypes.has('countdown');
    if (hasBombExplosion || (result.countdownExplosions && result.countdownExplosions.length > 0)) {
      if (explosionShakeTimerRef.current) clearTimeout(explosionShakeTimerRef.current);
      setExplosionShake(true);
      explosionShakeTimerRef.current = setTimeout(() => setExplosionShake(false), 400);
    }

    // 6. Near-miss detection — shimmer tiles the player almost included
    const nearMiss = detectNearMiss(path, engine.grid!, engine.tileStates, config.gridSize, hadCombo);
    if (nearMiss) {
      setNearMissCells(nearMiss.cells);
      setTimeout(() => setNearMissCells([]), 1200);
    }

    // 7. Run cascade + animate with multi-chain support (try/finally ensures isCascading resets)
    // Build cascade momentum: consecutive words increase allowed chain depth
    const wordLen = path.length;
    cascadeMomentumRef.current += CASCADE_MOMENTUM_PER_WORD + (wordLen >= 5 ? CASCADE_MOMENTUM_LONG_WORD_BONUS : 0);

    // Determine momentum tier → max chain depth for this cascade
    let momentumTier = 0;
    for (let i = CASCADE_MOMENTUM_THRESHOLDS.length - 1; i >= 0; i--) {
      if (cascadeMomentumRef.current >= CASCADE_MOMENTUM_THRESHOLDS[i]) {
        momentumTier = i;
        break;
      }
    }
    const maxChainForMomentum = CASCADE_TIER_MAX_CHAIN[momentumTier] ?? 1;

    // Pause combo timer so cascades don't penalise the player's streak
    comboStreak.pauseTimer();
    let chainLevel = 0;
    try {
    let cascadeResult = engine.startCascade();
    // Pass commit as callback so sequencer sets falling phase BEFORE grid updates —
    // prevents 1-frame flash where tiles appear at destination without animation
    await sequencer.animateCascade(cascadeResult.gravity, chainLevel, () => cascadeResult.commit?.());

    // Chain cascades: match-3 clusters + auto-formed words after gravity
    const cascadeBonusMult = waveConfig?.cascadeChainBonus ?? CASCADE_CHAIN_BONUS_MULTIPLIER;
    const foundWordsSet = new Set(engine.gameState.wordsFound);
    const effectiveMaxChain = Math.min(MAX_CASCADE_CHAIN, maxChainForMomentum);
    while (chainLevel < effectiveMaxChain) {
      // Use the CURRENT cascadeResult (from either initial or previous iteration's gravity)
      const affectedCols = new Set(cascadeResult.gravity.newTiles.map(t => t.col));
      const affectedRows = new Set(cascadeResult.gravity.newTiles.map(t => t.row));
      for (const ft of cascadeResult.gravity.fallingTiles) {
        affectedRows.add(ft.row);
        affectedCols.add(ft.col);
      }

      // Read latest state from refs AFTER the previous gravity committed
      const { grid, tileStates: latestTiles } = engine.getLatestState();
      if (!grid) break;

      // Collect all cascade finds for this level BEFORE submitting
      type CascadeFind = { cells: Array<{ row: number; col: number }>; label: string; bonusFn: (cl: number) => number };
      const cascadeFinds: CascadeFind[] = [];

      // 1. Match-3 clusters
      const allClusters = detectMatch3Clusters(grid, latestTiles, affectedCols);
      const clusters = allClusters.slice(0, MAX_CASCADE_WORDS_PER_LEVEL);
      for (const cluster of clusters) {
        cascadeFinds.push({
          cells: cluster.cells,
          label: `[${cluster.letter}×${cluster.cells.length}]`,
          bonusFn: (cl) => Math.round(cluster.cells.length * 3 * cascadeBonusMult * cl),
        });
      }

      // 2. Vertical auto-words
      const vertWords = detectVerticalWords(
        grid, latestTiles, checkWord, foundWordsSet, CASCADE_MIN_WORD_LENGTH, affectedCols,
      );
      for (const vw of vertWords.slice(0, MAX_CASCADE_WORDS_PER_LEVEL)) {
        cascadeFinds.push({
          cells: vw.path,
          label: vw.word,
          bonusFn: (cl) => Math.round(vw.word.length * vw.word.length * cascadeBonusMult * cl),
        });
      }

      // 3. Horizontal auto-words
      const horizWords = detectHorizontalWords(
        grid, latestTiles, checkWord, foundWordsSet, CASCADE_MIN_WORD_LENGTH, affectedRows,
      );
      for (const hw of horizWords.slice(0, MAX_CASCADE_WORDS_PER_LEVEL)) {
        cascadeFinds.push({
          cells: hw.path,
          label: hw.word,
          bonusFn: (cl) => Math.round(hw.word.length * hw.word.length * cascadeBonusMult * cl),
        });
      }

      // Break if nothing found this iteration
      if (cascadeFinds.length === 0) break;

      chainLevel++;

      // ── Highlight phase: show cascade words on grid before clearing ──
      const allHighlightCells = cascadeFinds.flatMap(f => f.cells);
      const firstWordLabel = cascadeFinds[0].label;
      setCascadeHighlightCells(allHighlightCells);
      setCascadeHighlightWord(firstWordLabel.startsWith('[') ? firstWordLabel : firstWordLabel.toUpperCase());
      await new Promise<void>(r => setTimeout(r, CASCADE_HIGHLIGHT_DURATION));
      setCascadeHighlightWord(null);
      await new Promise<void>(r => setTimeout(r, CASCADE_HIGHLIGHT_LINGER));
      setCascadeHighlightCells([]);

      // Now submit all finds
      let totalClearsThisLevel = 0;
      for (const find of cascadeFinds) {
        const bonus = find.bonusFn(chainLevel);
        const result = engine.submitWord(find.cells, find.label, bonus);
        totalClearsThisLevel += result.clearedTiles.length;
        foundWordsSet.add(find.label);
      }

      // Cascade chain sound
      sounds.playCascadeChain(chainLevel);

      // Chain score fly
      const chainFlyId = `chain-${++flyIdRef.current}`;
      const chainTier: 1 | 2 | 3 = chainLevel >= 3 ? 3 : chainLevel >= 2 ? 2 : 1;
      const chainBonus = chainLevel * 5;
      setScoreFlyEvents(prev => [...prev.slice(-3), {
        id: chainFlyId, score: chainBonus,
        startX: 50, startY: 50,
        tier: chainTier,
      }]);

      // Chain combo flash + haptic
      if (chainLevel >= 2) {
        setComboFlash({ id: `chain-flash-${flyIdRef.current}`, tier: chainTier });
        vibrateBlastCascade();
      }

      // Run gravity for this chain level — sequencer sets falling phase before commit
      cascadeResult = engine.startCascade();
      await sequencer.animateCascade(cascadeResult.gravity, chainLevel, () => cascadeResult.commit?.());
    }
    } finally {
    // Mark cascade sequence as complete — releases the interactivity gate
    // MUST run even if cascade throws, otherwise isCascading stays true and dead-end detection is blocked
    engine.stopCascade();
    }

    // Decay momentum if no cascade triggered (cool-down mechanic)
    if (chainLevel === 0) {
      cascadeMomentumRef.current = Math.max(0, cascadeMomentumRef.current - CASCADE_MOMENTUM_DECAY);
    }

    // Resume combo timer after cascades complete
    comboStreak.resumeTimer();

    // Track combo streak
    comboStreak.onWordSubmitted();

    sounds.playTileClear(clearedInfo.length);
    sounds.playLongWordBonus(path.length);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, comboStreak, onComboDetected, sounds, sequencer, checkWord, config.gridSize, waveConfig?.cascadeChainBonus]);

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
  const handleWordSubmit = useCallback((word: string) => {
    wordSubmission.handleWordSubmit(word);
  }, [wordSubmission]);

  const handlePathSubmit = useCallback((cells: Array<{ row: number; col: number }>) => {
    lastPathRef.current = cells;
  }, []);

  const handleWordChange = useCallback((word: string, _count: number) => {
    setFormedWord(word);
    if (word.length > prevWordLenRef.current) {
      sounds.playTileSelect();
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

  // Play wave-clear sound once when objectives are met (but don't end the game)
  const waveClearPlayedRef = useRef(false);
  useEffect(() => {
    if (objectives.allObjectivesComplete && !waveClearPlayedRef.current) {
      sounds.playWaveClear();
      setWaveClearParticle(c => c + 1);
      waveClearPlayedRef.current = true;
    }
  }, [objectives.allObjectivesComplete, sounds]);

  // Game end detection
  // SP: moves run out, board clears, or dead end. MP: server timer controls end, but dead-end still triggers locally.
  // Uses refs for callbacks/dynamic values to avoid stale closures without re-triggering the effect.
  // IMPORTANT: Do NOT include `engine` in deps — Sugar Crush mutates tileStates which would
  // recreate the engine object, cancel the async loop via cleanup, and restart it infinitely.
  useEffect(() => {
    // Board cleared — all tiles gone (SP only — MP wave logic is server-driven)
    if (!isMultiplayer && engine.gameState.isComplete) {
      const { score, wordsFound, tilesCleared, totalTiles } = engine.gameState;
      const clearPct = totalTiles > 0 ? Math.min(100, Math.round((tilesCleared / totalTiles) * 100)) : 0;
      const scoreThreshold = waveConfigRef.current?.scoreThreshold;

      if (onWaveCompleteRef.current && objectives.allObjectivesComplete && (!scoreThreshold || score >= scoreThreshold)) {
        const timer = setTimeout(() => onWaveCompleteRef.current?.(score, wordsFound, clearPct), 2000);
        return () => clearTimeout(timer);
      }

      const results = engine.getResults(maxComboRef.current);
      const timer = setTimeout(() => onGameEndRef.current(results), 2000);
      return () => clearTimeout(timer);
    }

    // Dead end (includes moves exhausted) — run Sugar Crush finale, then end game
    if (engine.gameState.isDeadEnd) {
      if (sugarCrushRunningRef.current) return undefined; // Sugar Crush in progress — wait
      sugarCrushRunningRef.current = true;

      let cancelled = false;

      // Run Sugar Crush asynchronously, then end game
      // Read engine from ref inside async so we always get latest state without depending on engine object
      (async () => {
        const eng = engineRef.current;
        const tiles = eng.getLatestState().tileStates;
        const steps = planSugarCrush(tiles, config.gridSize);

        if (steps.length > 0) {
          // Execute each step with staggered timing
          for (let i = 0; i < steps.length; i++) {
            if (cancelled) return;
            const step = steps[i];
            const delay = i === 0 ? step.delayMs : step.delayMs - steps[i - 1].delayMs;
            await new Promise<void>(r => setTimeout(r, delay));
            if (cancelled) return;

            // Convert tile to special type
            engineRef.current.setTileStates(prev => prev.map((row, ri) =>
              row.map((tile, ci) => {
                if (ri === step.row && ci === step.col) {
                  return { ...tile, type: step.convertTo, hitsRemaining: 1, activationEffect: 'sugar-crush' as any };
                }
                return tile;
              }),
            ));

            // Play conversion sound + screen shake for high-intensity
            sounds.playSpecialTileSound(step.convertTo);
            if (step.intensity === 'high' || step.convertTo === 'bomb') {
              if (explosionShakeTimerRef.current) clearTimeout(explosionShakeTimerRef.current);
              setExplosionShake(true);
              explosionShakeTimerRef.current = setTimeout(() => setExplosionShake(false), 400);
            }
          }

          // Brief pause before the chain reaction finale
          if (!cancelled) await new Promise<void>(r => setTimeout(r, 500));
        }

        if (cancelled) return;

        // End game — read latest state from ref
        const latestEngine = engineRef.current;
        const { score, wordsFound, tilesCleared, totalTiles } = latestEngine.gameState;
        const clearPct = totalTiles > 0 ? Math.min(100, Math.round((tilesCleared / totalTiles) * 100)) : 0;
        const scoreThreshold = waveConfigRef.current?.scoreThreshold;

        if (onWaveCompleteRef.current && objectives.allObjectivesComplete && (!scoreThreshold || score >= scoreThreshold)) {
          onWaveCompleteRef.current(score, wordsFound, clearPct);
        } else {
          const results = latestEngine.getResults(maxComboRef.current);
          onGameEndRef.current(results);
        }
      })();

      return () => { cancelled = true; sugarCrushRunningRef.current = false; };
    }

    return undefined;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- engine excluded: Sugar Crush mutates tileStates which recreates engine; using engineRef instead
  }, [
    engine.gameState.isComplete,
    engine.gameState.isDeadEnd,
    objectives.allObjectivesComplete,
    isMultiplayer,
    config.gridSize, sounds,
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
    <div className="blast-game relative flex-1 flex flex-col h-full" data-testid="blast-game-root">
      {/* Particle effects — self-gate on device performance */}
      <GameParticles preset="wordFound" trigger={wordFoundParticle} />
      <GameParticles preset="comboBreak" trigger={comboParticle} />
      <GameParticles preset="victory" trigger={waveClearParticle} />

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
        onWordSubmit={handleWordSubmit}
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
