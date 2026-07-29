'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import CircularTimer from '@/components/CircularTimer';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHasRealAdProvider } from '@/hooks/useHasRealAdProvider';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useMusic } from '@/contexts/MusicContext';
import { createHighlightRecorder, type HighlightRecorder } from '@/lib/blast/highlightRecorder';
import { useBlastSounds } from './hooks/useBlastSounds';
import { useComboSystem } from '@/hooks/useComboSystem';
import { useWordSubmission } from '@/components/singleplayer/game/hooks/useWordSubmission';
import { useSpamDetection } from '@/components/singleplayer/game/hooks/useSpamDetection';
import { useBlastEngine } from './hooks/useBlastEngine';
import { useBlastObjectives } from './hooks/useBlastObjectives';
import { useBlastHint } from './hooks/useBlastHint';
import { pickHintTarget } from './utils/blastHintPicker';
import { BlastHintButton } from './BlastHintButton';
import { BlastHintToast } from './BlastHintToast';
import { useBlastComboStreak, getComboWindowMs } from './hooks/useBlastComboStreak';
import { useBlastSequencer } from './hooks/useBlastSequencer';
import { useBlastColorSeeding } from './hooks/useBlastColorSeeding';
import { BlastStage } from './BlastStage';
import { BlastWaveIntro } from './BlastWaveIntro';
import { BlastSugarCrushFinale } from './BlastSugarCrushFinale';
import { BlastMoveWarningMascot } from './BlastMoveWarningMascot';
import { BlastFxBridge } from './BlastFxBridge';
import { type BlastComboType, type SpecialCombo } from './utils/blastCombos';
import { getWaveObjectives, type WaveConfig } from './utils/blastWaveConfig';
import type { BlastWaveModifier } from './utils/blastModifiers';
import { useJellyEnabled, useCakeEnabled, useChocolateEnabled } from '@/lib/blast/ccMechanicFlags';
import { validateWaveObjectives } from './utils/blastObjectiveValidator';
import { getComboMultiplier } from '@/shared/utils/scoring';
import { type BlastGameConfig, type BlastResultsData, type BlastTileState, type BlastTileType } from './types';
import { useDictionaryCache } from '@/hooks/useDictionaryCache';
import { useBlastCascade } from './hooks/useBlastCascade';
import { useBlastWordHandler } from './hooks/useBlastWordHandler';
import { useBlastGameEnd, type DeadEndFinaleTile } from './hooks/useBlastGameEnd';
import { BlastContinueModal } from './BlastContinueModal';
import { shouldOfferBlastContinue } from './utils/blastContinueOffer';
import type { BlastPregameBuff } from './BlastPregameBuffModal';
import { useBlastBuffEffects } from './hooks/useBlastBuffEffects';
import { useBlastObjectiveEffects } from './hooks/useBlastObjectiveEffects';
import type { ScoreFlyEvent } from './BlastScoreFly';
import type { ClearedTileEvent } from './BlastEffectsCanvas';
import { useGameStore } from '@/hooks/gameState';
import { useIdleDetection } from '@/hooks/useIdleDetection';
import { trackDeadTime } from '@/utils/growthTracking';
import type { LetterGrid, Avatar } from '@/shared/types';

const BLAST_DEAD_TIME_THRESHOLD_MS = 15000;
const BLAST_CONTINUE_BONUS_MOVES = 5;

interface BlastGameProps {
  config: BlastGameConfig;
  mode?: 'singleplayer' | 'multiplayer';
  // waveNumber: legacy singleplayer-only prop. MP Blast converted to timer-era (no waves).
  // For MP, defaults to 1 (never passed by callers). SP uses for objectives/seeding.
  // Kept as optional to maintain SP compatibility without forcing MP to pass it.
  waveNumber?: number;
  waveConfig?: WaveConfig;
  cumulativeScore?: number;
  onWaveComplete?: (waveScore: number, waveWords: string[], clearPct: number) => void;
  onGameEnd: (results: BlastResultsData) => void;
  onMPDeadEnd?: () => void;
  /** MP only: local player cleared the shared board — parent fires the win celebration / special results. */
  onMPBoardCleared?: () => void;
  onHighlightStart?: (finalScore: number) => void;
  onQuit: () => void;
  onComboDetected?: (combos: SpecialCombo[]) => void;
  pendingDiscovery?: BlastComboType | null;
  acknowledgeDiscovery?: () => void;
  onWordWithComboType?: (word: string, comboType: string | null) => void;
  discoveredCombos?: Set<BlastComboType>;
  initialTileStates?: BlastTileState[][] | null;
  blastSeed?: number | null;
  /** MP only: server-authoritative letter grid (from `startGame`/store `letterGrid`). */
  serverGrid?: LetterGrid | null;
  remainingTime?: number | null;
  totalTime?: number;
  leaderboard?: Array<{ username: string; score: number; wordCount?: number; avatar?: Avatar }>;
  username?: string;
  initialBuff?: BlastPregameBuff | null;
  /** SP-only: extra word-score multiplier from the active wave modifier (1 = none). */
  modifierScoreMultiplier?: number;
  /** SP-only: active wave modifier descriptor — surfaced as a HUD chip. */
  activeModifier?: BlastWaveModifier | null;
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
  onMPDeadEnd,
  onMPBoardCleared,
  onHighlightStart,
  onQuit,
  onComboDetected,
  pendingDiscovery,
  acknowledgeDiscovery: _acknowledgeDiscovery,
  onWordWithComboType,
  discoveredCombos: _discoveredCombos,
  initialTileStates,
  blastSeed,
  serverGrid,
  remainingTime: _remainingTime,
  totalTime: _totalTime,
  leaderboard,
  username,
  initialBuff,
  modifierScoreMultiplier = 1,
  activeModifier,
}: BlastGameProps) {
  const isMultiplayer = mode === 'multiplayer';
  const { t } = useLanguage();
  const hasRealAdProvider = useHasRealAdProvider();
  const { playComboSound, playBoardShuffleSound, setGameActive } = useSoundEffects();
  const { fadeToTrack, stopMusic, TRACKS } = useMusic();
  const sounds = useBlastSounds();

  const minWordLength = waveConfig?.minWordLength ?? 2;

  // CC-mechanic flags (SP only — MP boards are server-authoritative)
  const jellyEnabled = useJellyEnabled();
  const cakeEnabled = useCakeEnabled();
  const chocolateEnabled = useChocolateEnabled();

  // Wave objectives (SP only)
  const waveObjectives = useMemo(
    () => (isMultiplayer ? [] : getWaveObjectives(waveNumber, config.language, {
      jelly: jellyEnabled, cake: cakeEnabled, chocolate: chocolateEnabled,
    })),
    [waveNumber, isMultiplayer, config.language, jellyEnabled, cakeEnabled, chocolateEnabled],
  );

  // Core engine
  const engine = useBlastEngine(config, {
    movesAllowed: waveConfig?.movesAllowed,
    waveObjectives,
    currentWave: waveNumber,
    isMultiplayer,
    blastSeed: isMultiplayer ? blastSeed : undefined,
    initialTileStates: isMultiplayer ? initialTileStates : undefined,
    mpInitialGrid: isMultiplayer ? serverGrid : undefined,
    minWordLength,
  });

  // Pre-game buff effects (wave-1, SP only): bomb seed, shield revive, combo2x score multiplier.
  const { scoreMultiplier: buffScoreMultiplier, shieldConsumed, shieldToastVisible, buffIntroVisible } =
    useBlastBuffEffects({ buff: initialBuff, waveNumber, isMultiplayer, engine });

  // Color tag seeding for color_power objectives (SP only)
  useBlastColorSeeding({
    objectives: waveObjectives,
    waveNumber,
    tileStates: engine.tileStates,
    seedTileStates: engine.seedTileStates,
    isMultiplayer,
  });

  const combo = useComboSystem({ trackMaxCombo: true, onComboSound: playComboSound, timerIntervalMs: 250 });
  const sequencer = useBlastSequencer();
  const comboStreak = useBlastComboStreak(getComboWindowMs(minWordLength));
  const spamDetection = useSpamDetection();

  // Highlight recorder for Blast Highlight Reel feature
  const highlightRecorderRef = useRef<HighlightRecorder>(createHighlightRecorder());

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

  // Flush queued board updates after cascade completes.
  // Coalesce to last is intentional: each blastBoardUpdate is a full (grid, tileStates)
  // snapshot that supersedes prior snapshots. Queued entries are terminal states of N
  // distinct moves (self + opponents), not animation frames of one cascade. Server does
  // not broadcast in-flight frames, so sequential apply cannot recover intermediate FX —
  // it would just waste work and still land on the same final state.
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

  // Start highlight recorder when game becomes playable
  useEffect(() => {
    if (engine.grid && isDictionaryReady) {
      highlightRecorderRef.current.start();
    }
  }, [engine.grid, isDictionaryReady]);

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
    // Compose buff (combo2x) and SP wave-modifier multipliers into one factor.
    scoreMultiplier: buffScoreMultiplier * modifierScoreMultiplier,
    recorder: highlightRecorderRef.current,
    // Variable "treasure roll" reward is SOLO-only — MP scoring is server-authoritative.
    enableTreasureRoll: !isMultiplayer,
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

  const handleIdle = useCallback(() => {
    trackDeadTime(isMultiplayer ? 'blast_multiplayer' : 'blast', BLAST_DEAD_TIME_THRESHOLD_MS, {
      waveNumber,
      score: engine.gameState.score,
    });
  }, [isMultiplayer, waveNumber, engine.gameState.score]);
  const { reportActivity: reportIdleActivity } = useIdleDetection({
    enabled: !engine.gameState.isComplete && !engine.gameState.isDeadEnd,
    thresholdMs: BLAST_DEAD_TIME_THRESHOLD_MS,
    onIdle: handleIdle,
    sessionKey: `${waveNumber}`,
  });

  const handleWordChange = useCallback((word: string, _count: number) => {
    reportIdleActivity();
    setFormedWord(word);
    if (word.length > prevWordLenRef.current) {
      sounds.playTileSelect();
    } else if (word.length === 0 && prevWordLenRef.current >= 2) {
      // Path cancelled without submission — descending deflate tone
      sounds.playPathCancel(prevWordLenRef.current);
    }
    prevWordLenRef.current = word.length;
    if (word.length > 0) sounds.playPathTone(word.length);
  }, [sounds, reportIdleActivity]);

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

  // Validate wave objectives against the freshly generated board, ONCE per
  // wave. Repairs target_word / color_power if the seeded targets are
  // unreachable on this particular grid (e.g. word can't be spelled by an
  // adjacent path, or the board lacks enough color-tagged tiles).
  // Without this, players see goals that are mathematically impossible.
  const [validatedObjectives, setValidatedObjectives] = useState(waveObjectives);
  const validatedWaveRef = useRef<number>(-1);
  useEffect(() => {
    if (validatedWaveRef.current === waveNumber) return;
    if (isMultiplayer) return;
    const grid = engine.grid;
    const tileStates = engine.tileStates;
    if (!grid || grid.length === 0 || tileStates.length === 0) return;
    validatedWaveRef.current = waveNumber;
    setValidatedObjectives(
      validateWaveObjectives(waveObjectives, grid, tileStates, config.language),
    );
  }, [waveNumber, waveObjectives, engine.grid, engine.tileStates, config.language, isMultiplayer]);
  // Reset to raw objectives when the wave (and thus the parent's `waveObjectives`) changes.
  useEffect(() => {
    if (validatedWaveRef.current !== waveNumber) {
      setValidatedObjectives(waveObjectives);
    }
  }, [waveNumber, waveObjectives]);

  // Objective tracking — pass the (validated, language-aware) objectives so
  // the banner reads the same target_word/color_power that the engine baked
  // into the board. Recomputing from waveNumber would default the language
  // to 'en' and silently re-seed a different (English) target word.
  const objectives = useBlastObjectives({
    gameState: engine.gameState,
    tileTypeClears: engine.gameState.tileTypeClears,
    objectives: validatedObjectives,
    wordsFound: engine.gameState.wordsFound,
    initialTileTypeCounts,
  });

  // Hint flow — wave-6+ button, free first use, ad-gated thereafter.
  // pickTarget reads live grid+tileStates at click time so the hint
  // tracks the current board, not the wave-start snapshot.
  const hint = useBlastHint({
    waveNumber,
    pickTarget: () => {
      if (!engine.grid) return null;
      return pickHintTarget(objectives.objectiveProgress, engine.grid, engine.tileStates);
    },
    addBonusScore: engine.addBonusScore,
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
    // Mark all finale tiles as cleared so they disappear from the board
    const coords = new Set(tiles.map(t => `${t.row},${t.col}`));
    engine.setTileStates(prev => prev.map((row, ri) =>
      row.map((tile, ci) => coords.has(`${ri},${ci}`) ? { ...tile, isCleared: true } : tile),
    ));
    sounds.playSpecialTileSound('bomb');
    if (explosionShakeTimerRef.current) clearTimeout(explosionShakeTimerRef.current);
    setExplosionShake(3);
    explosionShakeTimerRef.current = setTimeout(() => setExplosionShake(0), 800);
  }, [sounds, engine]);

  // Rewarded-ad "continue" offer — SP only, single-use per game.
  // While the modal is open we defer Sugar Crush so the player can revive cleanly.
  const hasUsedContinueRef = useRef(false);
  // Distinct from hasUsedContinueRef: this only flips on accept, NOT decline.
  // Plumbed into results so BlastView can gate save on "ad watched OR wave passed".
  const adContinueAcceptedRef = useRef(false);
  const [continueDeclined, setContinueDeclined] = useState(false);
  // Suppress the offer once the wave goal is already met — the player has
  // effectively won the wave, so prompting for extra moves is noise. The
  // dead-end branch in useBlastGameEnd will simply call onWaveComplete.
  const objectiveAlreadyMet = engine.gameState.totalTiles > 0
    && (engine.gameState.tilesCleared / engine.gameState.totalTiles) * 100 >= 90;
  const continueModalOpen = shouldOfferBlastContinue({
    hasRealAdProvider,
    isMultiplayer,
    isDeadEnd: engine.gameState.isDeadEnd,
    noWordsRemaining: engine.noWordsRemaining,
    hasUsedContinue: hasUsedContinueRef.current,
    continueDeclined,
    objectiveAlreadyMet,
  });

  const handleContinueAccept = useCallback(() => {
    hasUsedContinueRef.current = true;
    adContinueAcceptedRef.current = true;
    engine.revive(BLAST_CONTINUE_BONUS_MOVES);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- engine.revive method ref
  }, [engine.revive]);
  const handleContinueDecline = useCallback(() => {
    hasUsedContinueRef.current = true;
    setContinueDeclined(true);
  }, []);

  // Sprint 3 polish: enrich results with target_word context so the wave-end
  // card can acknowledge the goal either way (found vs missed). Reads the
  // current objectiveProgress at fail/success time.
  const handleGameEnd = useCallback((results: BlastResultsData) => {
    const targetObj = objectives.objectiveProgress.find(
      p => p.objective.type === 'target_word',
    );
    const enriched: BlastResultsData = {
      ...results,
      adContinueUsed: adContinueAcceptedRef.current,
      ...(targetObj?.objective.targetWord
        ? { targetWord: targetObj.objective.targetWord, targetWordFound: targetObj.isComplete }
        : {}),
    };
    onGameEnd(enriched);
  }, [objectives.objectiveProgress, onGameEnd]);

  // Game end detection + Sugar Crush (extracted to useBlastGameEnd)
  const { sugarCrushActive } = useBlastGameEnd({
    engine, isMultiplayer, gridSize: config.gridSize,
    waveConfig, objectives, onGameEnd: handleGameEnd, onMPDeadEnd, onMPBoardCleared, onWaveComplete,
    onHighlightStart,
    maxCombo: combo.maxCombo, sounds,
    setExplosionShake, explosionShakeTimerRef,
    onDeadEndFinale: handleDeadEndFinale,
    deferDeadEndFinale: continueModalOpen,
    recorder: highlightRecorderRef.current,
  });

  // Loading state — wait for both grid generation AND dictionary cache
  if (!engine.grid || !isDictionaryReady) {
    return (
      <div className="flex-1 flex items-center justify-center" data-testid="blast-loading">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-neo-lime border-t-transparent rounded-full animate-spin" />
          <span className="text-neo-white text-sm font-bold">
            {t('blast.generating')}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="blast-game relative flex-1 flex flex-col h-full" data-testid="blast-game-root">
      <BlastFxBridge
        wordFoundCounter={wordFoundParticle}
        comboBreakCounter={comboParticle}
        waveClearCounter={waveClearParticle}
      />

      {waveConfig?.archetype && (
        <BlastWaveIntro waveNumber={waveNumber} archetype={waveConfig.archetype} t={tAdapter} />
      )}

      <BlastSugarCrushFinale active={sugarCrushActive} t={tAdapter} />

      <BlastContinueModal
        isOpen={continueModalOpen}
        bonusMoves={BLAST_CONTINUE_BONUS_MOVES}
        onContinue={handleContinueAccept}
        onDecline={handleContinueDecline}
        t={t}
      />

      <BlastMoveWarningMascot movesRemaining={engine.gameState.movesRemaining} t={tAdapter} />

      {shieldToastVisible && (
        <div data-testid="blast-shield-triggered-toast" role="status" aria-live="polite" className="fixed top-20 left-1/2 -translate-x-1/2 z-[80] flex items-center gap-2 rounded-neo border-neo-thick border-black bg-neo-cyan px-5 py-3 font-neo-display text-base font-black uppercase tracking-wide text-neo-navy shadow-hard-lg animate-neo-pop">
          <span className="text-xl">🛡️</span>{t('blast.pregameBuff.shieldTriggered') || 'Shield saved you!'}
        </div>
      )}

      {buffIntroVisible && initialBuff && (() => {
        const buffMeta = {
          shield: { emoji: '🛡️', bg: 'bg-neo-cyan' },
          bomb: { emoji: '💣', bg: 'bg-neo-pink' },
          combo2x: { emoji: '⚡', bg: 'bg-neo-lime' },
        }[initialBuff];
        const label = t(`blast.pregameBuff.${initialBuff}`) || initialBuff;
        const desc = t(`blast.pregameBuff.${initialBuff}Desc`) || '';
        return (
          <div
            data-testid="blast-buff-intro-toast"
            role="status"
            aria-live="polite"
            className={`fixed top-20 left-1/2 -translate-x-1/2 z-[80] flex items-center gap-3 rounded-neo border-neo-thick border-black ${buffMeta.bg} px-5 py-3 font-neo-display text-base font-black uppercase tracking-wide text-neo-navy shadow-hard-lg animate-neo-pop`}
          >
            <span className="text-2xl">{buffMeta.emoji}</span>
            <div className="flex flex-col leading-tight">
              <span>{t('blast.pregameBuff.activeLabel', { buff: label }) || `${label} active`}</span>
              {desc && <span className="text-[10px] font-bold normal-case opacity-80">{desc}</span>}
            </div>
          </div>
        );
      })()}

      <BlastStage
        grid={engine.grid}
        tileStates={engine.tileStates}
        gridSize={config.gridSize}
        language={config.language}
        gameState={engine.gameState}
        waveNumber={waveNumber}
        comboLevel={combo.comboLevel}
        formedWord={formedWord}
        currentFeedback={wordSubmission.currentFeedback}
        sequencerState={sequencer.state}
        interactive={!engine.isCascading && !sequencer.state.isAnimating && pendingDiscovery == null && !engine.gameState.isDeadEnd && !engine.gameState.isComplete}
        onWordSubmit={wordSubmission.handleWordSubmit}
        onPathSubmit={handlePathSubmit}
        onWordChange={handleWordChange}
        onShuffle={handleShuffle}
        onQuit={handleQuit}
        activeModifier={isMultiplayer ? null : activeModifier}
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
        activeBuff={!isMultiplayer && waveNumber === 1 ? (initialBuff ?? null) : null}
        buffConsumed={initialBuff === 'shield' ? shieldConsumed : false}
        objectiveProgress={objectives.objectiveProgress}
        ddaBoostActive={!isMultiplayer && engine.ddaBoostActive}
        hintSlot={!isMultiplayer ? (
          <BlastHintButton
            waveNumber={waveNumber}
            unlocked={hint.unlocked}
            freeAvailable={hint.freeAvailable}
            onFreeHint={() => { hint.consumeFreeHint(); }}
            onAdHint={() => { hint.consumeAdHint(); }}
            t={tAdapter}
          />
        ) : null}
        hintToast={<BlastHintToast target={hint.active} t={tAdapter} />}
        remainingTime={_remainingTime}
        totalTime={_totalTime}
        t={tAdapter}
      />
    </div>
  );
}
