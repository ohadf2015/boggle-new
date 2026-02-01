/**
 * AdventureGame Component
 *
 * Main orchestrator for adventure mode gameplay.
 * Combines grid, objectives, timer, and level completion flow.
 */

'use client';

import React, { memo, useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { Pause, Play, LogOut, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useProgression } from '@/contexts/ProgressionContext';
import { useAdventureGame } from '@/hooks/useAdventureGame';
import { useAdventureWordValidation } from '@/hooks/useAdventureWordValidation';
import { useAdventureSelection } from '@/hooks/useAdventureSelection';
import { useLexiReactions, type GameStateForReactions } from '@/hooks/useLexiReactions';
import { useAdventureHints } from '@/hooks/useAdventureHints';
import { useBossMechanics } from '@/hooks/useBossMechanics';
import { useBossHealth } from '@/hooks/useBossHealth';
import { registerAllAbilities } from '@/lib/adventure/abilities';
import { useAdventureXp } from '@/hooks/useAdventureXp';
import { useAdventureCurrency } from '@/hooks/useAdventureCurrency';
import { useSkillPoints } from '@/hooks/useSkillPoints';
import { useSkillEffects } from '@/hooks/useSkillEffects';
import { useAdventureAchievements } from '@/hooks/useAdventureAchievements';
import { usePowerUpInventory } from '@/hooks/usePowerUpInventory';
import { useScreenShake } from '@/hooks/useScreenShake';
import { useParticleBudget } from '@/hooks/useParticleBudget';
import { useAdaptiveDifficulty } from '@/hooks/useAdaptiveDifficulty';
import { useLexiStuckDetection } from '@/hooks/useLexiStuckDetection';
import { neoInfoToast } from '@/components/NeoToast';
import { useComboMilestone } from '@/hooks/useComboMilestone';
import { useAIDirector } from '@/hooks/useAIDirector';
import { BossDefeatFireworks, type BossTier } from '@/components/celebration/BossDefeatFireworks';
import { ScorePopup } from './juice/ScorePopup';
import { ComboTierBadge, type ComboTier } from '@/components/animations/ComboTierBadge';
import { ChainParticleBurst } from '@/components/animations/ChainParticleBurst';
import { AdaptiveParticles } from './juice/AdaptiveParticles';
import { ExplosionEffect } from './juice/ExplosionEffect';
import { LevelUpCelebration, type LevelUpPayload } from '@/components/education/LevelUpCelebration';
import { calculateAdventureXp } from '@/shared/utils/adventureXpUtils';
import AdventureGrid from './AdventureGrid';
import AdventureObjectives from './AdventureObjectives';
import AdventureTimer from './AdventureTimer';
import LevelCompleteModal from './LevelCompleteModal';
import LevelEntryOverlay from './LevelEntryOverlay';
import LexiReaction from './LexiReaction';
import { BossOverlay } from './boss';
import { ComboMilestoneOverlay } from './ComboMilestoneOverlay';
import { VictoryCinematic, VICTORY_DURATION_FRAMES, DefeatCinematic, DEFEAT_DURATION_FRAMES } from './cinematics';
import { CinematicPlayer } from './boss/cinematics/CinematicPlayer';
import GameplayBackground from './themed/GameplayBackground';
import { PowerUpBar } from './power-ups';
import { HintMessage } from './HintMessage';
import type { LevelConfig, TileState, GridTileState, HintResult } from '@/types/adventure';

// ==============================================
// TYPES
// ==============================================

/** Timer state for parent coordination with music hook */
export interface GameTimerState {
  timeRemaining: number;
  totalTime: number;
  isPlaying: boolean;
  isPaused: boolean;
}

interface AdventureGameProps {
  /** Level configuration */
  levelConfig: LevelConfig;
  /** Initial grid letters (2D array) */
  initialGrid: string[][];
  /** Callback when level is completed */
  onLevelComplete: (stars: number, score: number) => void;
  /** Callback to exit the game */
  onExit: () => void;
  /** Callback to report timer state to parent (for music coordination) */
  onTimerStateChange?: (timerState: GameTimerState) => void;
  /** Total stars accumulated across all levels */
  totalStars?: number;
}

interface ScorePopup {
  id: number;
  value: number;
  x: number;
  y: number;
  word?: string;
  bonus?: string;
}

interface PendingExplosion {
  id: number;
  position: { x: number; y: number };
  intensity: 1 | 2 | 3 | 4;
}

interface LastReportedTimerState {
  isPlaying: boolean;
  isPaused: boolean;
  phase: string;
  timeRemaining: number;
}

interface ValidationFeedback {
  error: string | null;
  wasSubmitted: boolean;
  isValid: boolean;
}

// ==============================================
// HELPER FUNCTIONS
// ==============================================

/**
 * Flatten 2D TileState array and add id/row/col
 */
function flattenTiles(tiles2D: TileState[][]): GridTileState[] {
  const flat: GridTileState[] = [];
  for (let row = 0; row < tiles2D.length; row++) {
    for (let col = 0; col < tiles2D[row].length; col++) {
      flat.push({
        ...tiles2D[row][col],
        id: `tile-${row}-${col}`,
        row,
        col,
      });
    }
  }
  return flat;
}

/**
 * Compare 2D tile arrays for equality (avoiding new references)
 * Returns true if tiles are structurally identical
 */
function tilesEqual(a: TileState[][], b: TileState[][]): boolean {
  if (a.length !== b.length) return false;
  for (let row = 0; row < a.length; row++) {
    if (a[row].length !== b[row].length) return false;
    for (let col = 0; col < a[row].length; col++) {
      const tileA = a[row][col];
      const tileB = b[row][col];
      // Compare relevant tile properties from TileState interface
      if (
        tileA.letter !== tileB.letter ||
        tileA.type !== tileB.type ||
        tileA.isCleared !== tileB.isCleared ||
        tileA.isFrozen !== tileB.isFrozen ||
        tileA.isChained !== tileB.isChained
      ) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Hook to memoize flattened tiles with structural equality check
 * Prevents unnecessary re-renders when tiles2D reference changes but content is same
 */
function useMemoizedFlatTiles(tiles2D: TileState[][]): GridTileState[] {
  const prevTilesRef = useRef<TileState[][] | null>(null);
  const flatTilesRef = useRef<GridTileState[]>([]);

  // Only recompute if tiles actually changed
  if (!prevTilesRef.current || !tilesEqual(prevTilesRef.current, tiles2D)) {
    prevTilesRef.current = tiles2D;
    flatTilesRef.current = flattenTiles(tiles2D);
  }

  return flatTilesRef.current;
}

// ==============================================
// COMPONENT
// ==============================================

const AdventureGame = memo<AdventureGameProps>(
  ({ levelConfig, initialGrid, onLevelComplete, onExit, onTimerStateChange, totalStars }) => {
    // Validate config
    const isValidConfig = levelConfig.gridSize > 0 && levelConfig.objectives.length > 0;

    // Adaptive difficulty system (affects timer, score targets, power-up cooldowns, and hints)
    const {
      tier,
      adjustedConfig,
      hintData,
      powerUpCooldownMultiplier,
      recordCompletion,
    } = useAdaptiveDifficulty({
      world: levelConfig.world,
      level: levelConfig.level,
    });

    // Meta-progression hooks
    // TODO: Replace 'temp-user-id' with actual user ID from auth context in future phase
    const {
      totalXp,
      currentLevel,
      xpProgress,
      awardXp,
      pendingUpdate: xpPendingUpdate,
      acknowledgePersistence: acknowledgeXpPersistence,
    } = useAdventureXp({
      userId: 'temp-user-id',
      initialXp: 0, // TODO: Load from user profile
    });

    const {
      gold,
      upgrades,
      addGold,
      purchase,
      getUpgradeEffect,
      pendingUpdate: currencyPendingUpdate,
      acknowledgePersistence: acknowledgeCurrencyPersistence,
    } = useAdventureCurrency({
      userId: 'temp-user-id',
      initialGold: 0, // TODO: Load from user profile
      initialUpgrades: { timeBonus: 0, scoreBonus: 0, xpBonus: 0 }, // TODO: Load from user profile
    });

    const { shakeRef, shake } = useScreenShake();
    const particleBudget = useParticleBudget();

    // Skill point awarding on level up (SKILL-02 requirement)
    useSkillPoints({
      currentLevel,
      onLevelUp: ({ pointsAwarded }) => {
        // Skill point notification handled by LevelUpCelebration
        console.log(`Earned ${pointsAwarded} skill point(s)!`);
      },
    });

    // Skill effects for gameplay modifiers (SKILL-04 requirement)
    const skillEffects = useSkillEffects();

    // Adventure achievements tracking (ACHIEVE-01 requirement)
    const { earnAchievement } = useAdventureAchievements();

    // Power-up inventory for persistence
    const powerUpInventory = usePowerUpInventory();

    // Combo milestone tracking (POLISH-03 requirement)
    const { currentMilestone, checkMilestone } = useComboMilestone();

    // AI Director for dynamic difficulty tuning (DDA-01 through DDA-05)
    // Tracks player performance and provides invisible pacing adjustments
    // Generate stable session ID for uniqueness (fallback for Jest environment)
    const [aiDirectorSessionId] = useState(() => {
      const randomPart = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID().slice(0, 8)
        : Math.random().toString(36).slice(2, 10);
      return `session-${levelConfig.world}-${levelConfig.level}-${randomPart}`;
    });
    const {
      intensityAdjustments,
      flowState,
      startSession: startAIDirector,
      endSession: endAIDirector,
      recordWord: recordAIWord,
      handleTransition: handleAITransition,
      isBossBattle: isAIBossBattle,
    } = useAIDirector({
      world: levelConfig.world,
      level: levelConfig.level,
      sessionId: aiDirectorSessionId,
      enableAnalytics: true,
    });

    // Track previous combo count for detecting combo breaks
    const prevComboCountRef = useRef(0);

    // Reset cooldowns on level change (POWER-06 requirement)
    const previousLevelRef = useRef(levelConfig.level);
    useEffect(() => {
      if (levelConfig.level !== previousLevelRef.current) {
        powerUpInventory.resetCooldowns();
        previousLevelRef.current = levelConfig.level;
      }
    }, [levelConfig.level, powerUpInventory]);

    // Register all boss abilities on mount (required for Phase 30 integration)
    useEffect(() => {
      registerAllAbilities();
    }, []);

    // Task 3: Level-up modal state
    // NOTE: Must be declared BEFORE any hooks that reference them (including upgradeBonuses useMemo)
    const [levelUpData, setLevelUpData] = useState<LevelUpPayload | null>(null);
    const [hasAwardedLevelRewards, setHasAwardedLevelRewards] = useState(false);

    // Task 4: Get upgrade multipliers (memoized to avoid recalculating every render)
    // NOTE: Must be declared BEFORE adjustedLevelConfig which uses upgradeBonuses.timeBonus
    const upgradeBonuses = useMemo(() => {
      return {
        timeBonus: getUpgradeEffect('timeBonus').multiplier,
        scoreBonus: getUpgradeEffect('scoreBonus').multiplier,
        xpBonus: getUpgradeEffect('xpBonus').multiplier,
      };
    }, [getUpgradeEffect]);

    // Apply time bonus to level config (create modified config with bonus time)
    // NOTE: adjustedConfig already has tier-based timer adjustments from useAdaptiveDifficulty
    const adjustedLevelConfig = useMemo(() => {
      // Time bonus multiplier increases starting time
      const bonusTime = Math.floor(adjustedConfig.timerSeconds * (upgradeBonuses.timeBonus - 1));
      return {
        ...adjustedConfig,
        timerSeconds: adjustedConfig.timerSeconds + bonusTime,
      };
    }, [adjustedConfig, upgradeBonuses.timeBonus]);

    // Game state from hook
    const {
      gameState,
      tiles: tiles2D,
      objectives,
      timeRemaining,
      canComplete,
      isPlaying,
      cascadeComplete,
      submitWordWithPath,
      startGame,
      pauseGame,
      completeLevel,
      resetGame,
      markCascadeComplete,
      isCascading,
      cascadePhase,
      addTime,
    } = useAdventureGame({
      levelConfig: adjustedLevelConfig,
      initialGrid,
    });

    // Flatten tiles for AdventureGrid component (uses structural equality)
    const tiles = useMemoizedFlatTiles(tiles2D);

    // Language context for translations
    const { t, language } = useLanguage();

    // Progression context for recording attempts
    const { recordAttempt, getLevelAttempt } = useProgression();

    // Get best attempt for this level (for partial progress display)
    const bestAttempt = useMemo(
      () => getLevelAttempt(levelConfig.world, levelConfig.level),
      [getLevelAttempt, levelConfig.world, levelConfig.level]
    );

    // Local UI state
    const [isPaused, setIsPaused] = useState(false);
    const [showLevelComplete, setShowLevelComplete] = useState(false);
    const [popupQueue, setPopupQueue] = useState<ScorePopup[]>([]);
    const [pendingExplosions, setPendingExplosions] = useState<PendingExplosion[]>([]);

    // Power-up state
    const [scoreMultiplier, setScoreMultiplier] = useState(1);
    const [multiplierExpiresAt, setMultiplierExpiresAt] = useState<number | undefined>();
    const [hintWord, setHintWord] = useState<string | undefined>();
    const [hintTiles, setHintTiles] = useState<Array<{ row: number; col: number }> | undefined>();
    const [hintExpiresAt, setHintExpiresAt] = useState<number | undefined>();

    // Chain particle burst state
    const [chainBurstConfig, setChainBurstConfig] = useState<{
      trigger: boolean;
      position: { x: number; y: number };
    } | null>(null);

    // Consolidated validation feedback state
    const [validationFeedback, setValidationFeedback] = useState<ValidationFeedback>({
      error: null,
      wasSubmitted: false,
      isValid: false,
    });

    // Boss defeat fireworks state
    const [showBossFireworks, setShowBossFireworks] = useState(false);
    const [defeatedBossTier, setDefeatedBossTier] = useState<BossTier>('standard');

    // Victory/defeat cinematic state
    const [showVictoryCinematic, setShowVictoryCinematic] = useState(false);
    const [showDefeatCinematic, setShowDefeatCinematic] = useState(false);
    const [cinematicComplete, setCinematicComplete] = useState(false);

    // Refs for timeout cleanup
    const validationErrorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const wordSubmittedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const popupQueueTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Track last word for explosion calculation
    const lastSubmittedWordRef = useRef<{ word: string; path: Array<{ row: number; col: number }> } | null>(null);

    // Track entry sequence phases
    const [entryPhase, setEntryPhase] = useState<'cascade' | 'objectives' | 'title' | 'playing'>('cascade');

    // Ref for score display target (for ScorePopup animation)
    const scoreDisplayRef = useRef<HTMLDivElement>(null);

    // Cleanup all timeouts on unmount
    useEffect(() => {
      return () => {
        if (validationErrorTimeoutRef.current) {
          clearTimeout(validationErrorTimeoutRef.current);
        }
        if (wordSubmittedTimeoutRef.current) {
          clearTimeout(wordSubmittedTimeoutRef.current);
        }
        if (popupQueueTimeoutRef.current) {
          clearTimeout(popupQueueTimeoutRef.current);
        }
      };
    }, []);

    // Current popup from queue
    const currentPopup = popupQueue[0] ?? null;

    // Word validation hook (must come before selection hook which depends on isValidating)
    // Pass tiles for score calculation with special tile multipliers (gold 3x, rainbow 1.25x)
    // minWordLength comes from levelConfig (World 1 uses 2, others default to 3)
    const minWordLength = levelConfig.minWordLength ?? 3;
    const { validateWord, isValidating } = useAdventureWordValidation({
      grid: initialGrid,
      language: language || 'en',
      minWordLength,
      foundWords: gameState.wordsFound,
      tiles: tiles2D,
    });

    // Ref to grid for coordinate calculation
    const gridRef = useRef<HTMLDivElement>(null);

    // Selection hook with adjacency validation
    const {
      selectedIndices,
      currentWord,
      selectTile,
      clearSelection,
      getPath,
      pathPoints,
    } = useAdventureSelection({
      tiles,
      gridSize: levelConfig.gridSize,
      disabled: !isPlaying || isPaused || isValidating || isCascading,
      gridRef,
    });

    // Hint system hook with AI Director pacing adjustments (DDA-02)
    // Apply hintEscalationRate to make hints appear faster when player is frustrated
    // or slower when player is bored (to maintain challenge)
    const adjustedInactivityThresholdMs = useMemo(() => {
      const baseThreshold = 15000; // 15 seconds base
      // Higher escalation rate = faster hints (lower threshold)
      // hintEscalationRate: 0.5x (slower) to 2.0x (faster)
      return Math.floor(baseThreshold / intensityAdjustments.hintEscalationRate);
    }, [intensityAdjustments.hintEscalationRate]);

    const {
      hasHintsAvailable,
      getHint,
      currentHint,
      clearCurrentHint,
      recordActivity,
      showAutoHint,
      dismissAutoHint,
    } = useAdventureHints({
      grid: initialGrid,
      language: language || 'en',
      foundWords: gameState.wordsFound,
      isPlaying: isPlaying && entryPhase === 'playing' && !isPaused,
      inactivityThresholdMs: adjustedInactivityThresholdMs,
    });

    // Boss mechanics hook (active only on boss levels)
    const isBossLevel = levelConfig.isBossLevel;
    const {
      isActive: isBossActive,
      boss: bossConfig,
      currentTaunt: bossTaunt,
      showTaunt: showBossTaunt,
      checkWord: checkBossWord,
      triggerTaunt: triggerBossTaunt,
      bossState,
    } = useBossMechanics({
      worldId: isBossLevel ? levelConfig.world : null,
    });

    // Boss health hook (tracks HP and phase transitions)
    const bossMaxHP = isBossLevel ? 100 : 0; // Boss HP (could be configured per boss in future)
    const {
      healthState: bossHealthState,
      dealDamage: dealBossDamage,
      startBattle: startBossBattle,
      endBattle: endBossBattle,
      resetHealth: resetBossHealth,
      hpPercentage: bossHPPercentage,
      isEnraged: isBossEnraged,
    } = useBossHealth(bossMaxHP);

    // Boss intro state (shown before gameplay on boss levels)
    const [showBossIntro, setShowBossIntro] = useState(
      isBossLevel && levelConfig.showBossIntro === true
    );

    // Lexi stuck detection (DEBT-03 + DEBT-04 integration)
    // Detects when player hasn't made progress and shows helpful hint
    const isModalOpen = showLevelComplete || showVictoryCinematic || showDefeatCinematic || showBossIntro || showBossFireworks;
    const { resetOnGameAction } = useLexiStuckDetection({
      onStuck: () => {
        // Show Lexi hint when player is stuck
        neoInfoToast(t('adventure.lexi.stuckHint') || 'Need a hint? Try looking for shorter words first!', {
          icon: '💡',
          duration: 5000,
        });
      },
      isPlaying: isPlaying && entryPhase === 'playing',
      isPaused,
      isModalOpen,
      isBossLevel,
    });

    // Lexi reaction state - transform game state to reaction format
    // Using ref + effect to avoid recreating object on every timer tick (60 runs/minute → ~6 runs/minute)
    const lexiGameStateRef = useRef<GameStateForReactions>({
      wordsFound: [],
      comboCount: 0,
      timeRemaining: 0,
      isComplete: false,
      stars: 0,
      worldId: 1,
    });

    // Update ref only when significant values change (not timer ticks)
    // This prevents useLexiReactions from re-running every second
    useEffect(() => {
      lexiGameStateRef.current = {
        wordsFound: gameState.wordsFound,
        comboCount: gameState.comboCount,
        timeRemaining, // Include current time for completeness
        isComplete: gameState.isComplete,
        stars: gameState.stars,
        worldId: levelConfig.world,
      };
    }, [gameState.wordsFound, gameState.comboCount, gameState.isComplete, gameState.stars, levelConfig.world, timeRemaining]);

    // Memoize based only on significant changes (not timeRemaining)
    // The ref is updated by the effect above, this just provides stable object identity
    const lexiGameState = useMemo(() => {
      return {
        wordsFound: gameState.wordsFound,
        comboCount: gameState.comboCount,
        timeRemaining: lexiGameStateRef.current.timeRemaining,
        isComplete: gameState.isComplete,
        stars: gameState.stars,
        worldId: levelConfig.world,
      };
    }, [gameState.wordsFound, gameState.comboCount, gameState.isComplete, gameState.stars, levelConfig.world]);

    // Lexi reactions hook
    const { reaction, dismissReaction } = useLexiReactions({
      gameState: lexiGameState,
      isPlaying: isPlaying && entryPhase === 'playing' && !isPaused,
    });

    // Report timer state to parent for music coordination
    // Parent (AdventureView) owns the useAdventureMusic hook to play music on all screens
    // Performance: Only report on significant changes (not every second tick)
    const lastReportedStateRef = useRef<LastReportedTimerState | null>(null);

    useEffect(() => {
      const actuallyPlaying = isPlaying && entryPhase === 'playing';
      const lastState = lastReportedStateRef.current;

      // Determine if this is a significant change worth reporting
      const isSignificantChange =
        !lastState ||
        lastState.isPlaying !== actuallyPlaying ||
        lastState.isPaused !== isPaused ||
        lastState.phase !== entryPhase ||
        // Report every 5 seconds during gameplay, or when time is critical (<10s)
        Math.floor(lastState.timeRemaining / 5) !== Math.floor(timeRemaining / 5) ||
        timeRemaining <= 10;

      if (isSignificantChange && onTimerStateChange) {
        lastReportedStateRef.current = {
          isPlaying: actuallyPlaying,
          isPaused,
          phase: entryPhase,
          timeRemaining,
        };
        onTimerStateChange({
          timeRemaining,
          totalTime: adjustedLevelConfig.timerSeconds,
          isPlaying: actuallyPlaying,
          isPaused,
        });
      }
    }, [timeRemaining, isPlaying, isPaused, entryPhase, onTimerStateChange, adjustedLevelConfig.timerSeconds]);

    // Boss low-time taunt trigger (when timer drops below 15 seconds)
    const bossLowTimeTriggedRef = useRef(false);
    useEffect(() => {
      if (isBossActive && isPlaying && timeRemaining <= 15 && timeRemaining > 0 && !bossLowTimeTriggedRef.current) {
        bossLowTimeTriggedRef.current = true;
        triggerBossTaunt('onLowTime');
      }
      // Reset trigger on game reset
      if (timeRemaining > 15) {
        bossLowTimeTriggedRef.current = false;
      }
    }, [isBossActive, isPlaying, timeRemaining, triggerBossTaunt]);

    // Check combo milestone when combo count changes
    useEffect(() => {
      if (isPlaying && entryPhase === 'playing' && !isPaused) {
        checkMilestone(gameState.comboCount);
      }
    }, [gameState.comboCount, isPlaying, entryPhase, isPaused, checkMilestone]);

    // Track combo count for detecting combo breaks (DDA-03)
    // Updates AFTER handleWordSubmit reads prevComboCountRef
    useEffect(() => {
      prevComboCountRef.current = gameState.comboCount;
    }, [gameState.comboCount]);

    // Trigger fireworks when boss is defeated (phase transitions to 'victory')
    const prevBossPhaseRef = useRef(bossHealthState.phase);
    useEffect(() => {
      let hideTimeout: NodeJS.Timeout | undefined;

      // Detect phase transition to 'victory' (not on initial render)
      if (bossHealthState.phase === 'victory' && prevBossPhaseRef.current !== 'victory') {
        // Determine boss tier based on level number
        // Mini boss: levels 5, 10 (every 5th level except multiples of 15/20)
        // Standard boss: levels 15 (or multiples)
        // Elite boss: levels 20+ (or final bosses)
        const level = levelConfig.level;
        let tier: BossTier = 'mini';
        if (level >= 20 || level % 20 === 0) {
          tier = 'elite';
        } else if (level >= 15 || level % 15 === 0) {
          tier = 'standard';
        }

        setDefeatedBossTier(tier);
        setShowBossFireworks(true);

        // Hide after animation completes (use tier config duration + buffer)
        // mini: 3s, standard: 5s, elite: 8s
        const durations: Record<BossTier, number> = {
          mini: 3500,
          standard: 5500,
          elite: 8500,
        };
        hideTimeout = setTimeout(() => {
          setShowBossFireworks(false);
        }, durations[tier]);
      }

      // Update ref for next comparison
      prevBossPhaseRef.current = bossHealthState.phase;

      // Always return cleanup function (even if undefined timeout)
      return () => {
        if (hideTimeout) {
          clearTimeout(hideTimeout);
        }
      };
    }, [bossHealthState.phase, levelConfig.level]);

    // Handle cascade completion to advance to objectives phase
    const handleCascadeComplete = useCallback(() => {
      markCascadeComplete();
      setEntryPhase('objectives');
    }, [markCascadeComplete]);

    // Handle objectives slide-in completion to advance to title phase
    const handleObjectivesComplete = useCallback(() => {
      setEntryPhase('title');
    }, []);

    // Handle title animation completion to start gameplay (or show boss intro)
    const handleTitleComplete = useCallback(() => {
      if (showBossIntro && bossConfig) {
        // Boss levels: show intro cutscene before starting gameplay
        setEntryPhase('playing');
      } else {
        setEntryPhase('playing');
        if (!isPlaying) {
          startGame();
          // Start AI Director session when gameplay begins (DDA-01)
          startAIDirector();
        }
      }
    }, [isPlaying, startGame, showBossIntro, bossConfig, startAIDirector]);

    // Handle boss intro start (player ready to fight)
    const handleBossIntroStart = useCallback(() => {
      setShowBossIntro(false);
      startBossBattle(); // Transition from intro → active phase
      if (!isPlaying) {
        startGame();
        // Start AI Director session for boss battles (DDA-05 - gets neutral adjustments)
        startAIDirector();
      }
      // Trigger start taunt after intro dismissal
      triggerBossTaunt('onStart');
    }, [isPlaying, startGame, triggerBossTaunt, startBossBattle, startAIDirector]);

    // Handle boss intro skip
    const handleBossIntroSkip = useCallback(() => {
      setShowBossIntro(false);
      startBossBattle(); // Transition from intro → active phase
      if (!isPlaying) {
        startGame();
        // Start AI Director session for boss battles (DDA-05 - gets neutral adjustments)
        startAIDirector();
      }
    }, [isPlaying, startGame, startBossBattle, startAIDirector]);

    // Task 3: Award XP and gold on level complete
    useEffect(() => {
      // Only award once per level attempt
      if ((gameState.isComplete || timeRemaining === 0) && !hasAwardedLevelRewards && gameState.stars > 0) {
        // Calculate XP based on level difficulty and performance
        const difficultyMap: Record<number, 'easy' | 'medium' | 'hard'> = {
          1: 'easy',
          2: 'easy',
          3: 'medium',
          4: 'medium',
          5: 'hard',
        };
        const difficulty = difficultyMap[levelConfig.level] || 'medium';

        // Perfect clear bonus if all objectives met with stars
        const isPerfectClear = gameState.stars === 3;

        // Time bonus if completed quickly (more than 50% time remaining)
        const hasTimeBonus = timeRemaining > (adjustedLevelConfig.timerSeconds * 0.5);

        // Calculate XP (apply XP bonus multiplier from upgrades)
        const baseXp = calculateAdventureXp(
          difficulty,
          Math.max(1, gameState.comboCount),
          {
            perfectClear: isPerfectClear,
            timeBonus: hasTimeBonus ? 0.1 : 0, // +10% for quick completion
          }
        );
        const earnedXp = Math.floor(baseXp * upgradeBonuses.xpBonus);

        const oldLevel = currentLevel;
        const levelUpResult = awardXp(earnedXp);

        // Award gold (10-30 gold based on stars, + 50 bonus for perfect clear)
        const baseGold = 10 * gameState.stars;
        const perfectClearGoldBonus = isPerfectClear ? 50 : 0;
        const totalGold = baseGold + perfectClearGoldBonus;
        addGold(totalGold);

        // Check if player leveled up
        if (levelUpResult.leveledUp && levelUpResult.newLevel !== undefined) {
          setLevelUpData({
            oldLevel,
            newLevel: levelUpResult.newLevel,
            newTitles: [], // TODO: Add title system in future phase
          });
        }

        setHasAwardedLevelRewards(true);
      }
    }, [gameState.isComplete, gameState.stars, gameState.comboCount, timeRemaining, hasAwardedLevelRewards, levelConfig.level, adjustedLevelConfig.timerSeconds, awardXp, addGold, currentLevel, upgradeBonuses.xpBonus]);

    // Check for level completion and record attempt
    useEffect(() => {
      // Guard against running multiple times - completion is already handled
      if (showLevelComplete || showVictoryCinematic || showDefeatCinematic) return;

      if (gameState.isComplete || timeRemaining === 0) {
        // Determine if victory or defeat
        const isVictory = gameState.stars > 0 || bossHealthState.phase === 'victory';

        // Show appropriate cinematic first (before level complete modal)
        if (isVictory) {
          setShowVictoryCinematic(true);
        } else {
          setShowDefeatCinematic(true);
        }
        pauseGame();

        // Handle boss battle completion
        if (isBossActive && isBossLevel) {
          // Timer expired or objectives complete
          const isVictory = bossHealthState.phase === 'victory' || gameState.stars > 0;

          // End boss battle (only if not already in victory/defeat phase)
          if (bossHealthState.phase !== 'victory' && bossHealthState.phase !== 'defeat') {
            endBossBattle(isVictory);
          }

          // Trigger boss victory/defeat taunt
          triggerBossTaunt(isVictory ? 'onVictory' : 'onDefeat');

          // Earn boss slayer achievement on victory (ACHIEVE-01 requirement)
          if (isVictory) {
            earnAchievement('BOSS_SLAYER');
          }
        }

        // Perfect level achievement for 3-star completion (ACHIEVE-01 requirement)
        if (gameState.stars === 3) {
          earnAchievement('PERFECT_LEVEL');
        }

        // Record attempt (including failures) for partial progress tracking
        // Build objective progress map from current objectives
        const objectiveProgress: Record<string, number> = {};
        for (const obj of objectives) {
          objectiveProgress[obj.type] = obj.current ?? 0;
        }

        // Record the attempt (stars > 0 means completion)
        recordAttempt(
          levelConfig.world,
          levelConfig.level,
          gameState.wordsFound.length,
          gameState.score,
          timeRemaining,
          objectiveProgress,
          gameState.stars > 0
        );

        // Record completion for adaptive difficulty tier updates
        recordCompletion({
          isCompletion: gameState.stars > 0,
          timeRemaining,
          timerSeconds: adjustedLevelConfig.timerSeconds,
          score: gameState.score,
          words: gameState.wordsFound.length,
        });

        // End AI Director session on level complete/fail (DDA-01)
        endAIDirector();
      }
    }, [
      showLevelComplete, // Guard dependency - must be first to prevent infinite loops
      showVictoryCinematic,
      showDefeatCinematic,
      gameState.isComplete,
      timeRemaining,
      pauseGame,
      recordAttempt,
      recordCompletion,
      levelConfig.world,
      levelConfig.level,
      gameState.wordsFound.length,
      gameState.score,
      gameState.stars,
      objectives,
      isBossActive,
      isBossLevel,
      bossHealthState.phase,
      endBossBattle,
      triggerBossTaunt,
      adjustedLevelConfig.timerSeconds,
      earnAchievement,
      endAIDirector,
    ]);

    // Helper to calculate popup start position from last selected tile
    const getPopupStartPosition = useCallback(() => {
      // Get position of last selected tile (center of word)
      if (selectedIndices.length === 0) {
        return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      }

      const lastIndex = selectedIndices[selectedIndices.length - 1];
      const gridElement = gridRef.current;
      const tileElement = gridElement?.querySelectorAll('[role="gridcell"]')[lastIndex];

      if (tileElement) {
        const rect = tileElement.getBoundingClientRect();
        return {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        };
      }

      return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    }, [selectedIndices]);

    // Helper to calculate tile center position for chain particle burst
    const calculateTileCenter = useCallback((row: number, col: number) => {
      if (!gridRef.current) return { x: 0, y: 0 };
      const gridRect = gridRef.current.getBoundingClientRect();
      const tileSize = gridRect.width / levelConfig.gridSize;
      return {
        x: gridRect.left + col * tileSize + tileSize / 2,
        y: gridRect.top + row * tileSize + tileSize / 2,
      };
    }, [levelConfig.gridSize]);

    // Detect chain tile activation and trigger particle burst
    useEffect(() => {
      // Find tiles with 'link' activation effect
      const chainActivatedTiles = tiles.filter(
        tile => tile.activationEffect === 'link' && tile.activationTimestamp
      );

      if (chainActivatedTiles.length > 0) {
        // Use the first chain tile (in case multiple activate simultaneously)
        const chainTile = chainActivatedTiles[0];
        const position = calculateTileCenter(chainTile.row, chainTile.col);

        setChainBurstConfig({
          trigger: true,
          position,
        });
      }
    }, [tiles, calculateTileCenter]);

    // Trigger explosion at REMOVING phase start for 3+ tile words
    useEffect(() => {
      if (cascadePhase === 'removing' && lastSubmittedWordRef.current) {
        const { word, path } = lastSubmittedWordRef.current;

        // Only explode for 3+ tile words
        if (path.length >= 3) {
          // Calculate center position of cleared tiles
          let centerX = 0;
          let centerY = 0;

          for (const pos of path) {
            const tileCenter = calculateTileCenter(pos.row, pos.col);
            centerX += tileCenter.x;
            centerY += tileCenter.y;
          }

          centerX /= path.length;
          centerY /= path.length;

          // Calculate intensity from word length (3-4=1, 5-6=2, 7-9=3, 10+=4)
          let intensity: 1 | 2 | 3 | 4 = 1;
          if (word.length >= 10) {
            intensity = 4;
          } else if (word.length >= 7) {
            intensity = 3;
          } else if (word.length >= 5) {
            intensity = 2;
          }

          // Add explosion to pending list
          setPendingExplosions(prev => [...prev, {
            id: Date.now(),
            position: { x: centerX, y: centerY },
            intensity,
          }]);
        }

        // Clear ref after processing
        lastSubmittedWordRef.current = null;
      }
    }, [cascadePhase, calculateTileCenter]);

    // Handle pause toggle
    const handlePauseToggle = useCallback(() => {
      if (isPaused) {
        startGame();
        setIsPaused(false);
      } else {
        pauseGame();
        setIsPaused(true);
      }
    }, [isPaused, startGame, pauseGame]);

    // Handle tile selection (for click)
    const handleTileSelect = useCallback(
      (index: number, _tile: GridTileState) => {
        if (!isPlaying || isPaused || isValidating || isCascading) return;
        selectTile(index);
        resetOnGameAction(); // DEBT-04: Reset Lexi stuck detection timer on tile click
      },
      [isPlaying, isPaused, isValidating, isCascading, selectTile, resetOnGameAction]
    );

    // Handle drag start
    const handleDragStart = useCallback(
      (index: number, _tile: GridTileState) => {
        if (!isPlaying || isPaused || isValidating || isCascading) return;
        // Clear previous selection and start new one
        clearSelection();
        selectTile(index);
      },
      [isPlaying, isPaused, isValidating, isCascading, clearSelection, selectTile]
    );

    // Handle drag enter (when dragging over tiles)
    const handleDragEnter = useCallback(
      (index: number, _tile: GridTileState) => {
        if (!isPlaying || isPaused || isValidating || isCascading) return;
        selectTile(index);
      },
      [isPlaying, isPaused, isValidating, isCascading, selectTile]
    );

    // Handle word submission with validation
    const handleWordSubmit = useCallback(
      async (_word: string, _indices: number[]) => {
        // Use currentWord and getPath() from selection hook for validated path
        // minWordLength from levelConfig (World 1 = 2, others = 3)
        if (!isPlaying || isPaused || currentWord.length < minWordLength || isValidating || isCascading) return;

        // Clear previous timeouts to prevent stale state updates
        if (validationErrorTimeoutRef.current) {
          clearTimeout(validationErrorTimeoutRef.current);
          validationErrorTimeoutRef.current = null;
        }
        if (wordSubmittedTimeoutRef.current) {
          clearTimeout(wordSubmittedTimeoutRef.current);
          wordSubmittedTimeoutRef.current = null;
        }

        // Clear any previous error
        setValidationFeedback(prev => ({ ...prev, error: null }));

        // Get validated path from selection hook
        const path = getPath();

        // Validate word
        const result = await validateWord(currentWord, path);

        if (result.isValid && result.score) {
          // Get position BEFORE clearing selection
          const startPos = getPopupStartPosition();
          // Task 4: Apply score bonus multiplier from upgrades
          let scoreValue = Math.floor(result.score * upgradeBonuses.scoreBonus);

          // Apply power-up score multiplier (stacks multiplicatively with other bonuses)
          scoreValue = Math.floor(scoreValue * scoreMultiplier);

          // Apply boss mechanic multiplier on boss levels
          let bossBonus: string | undefined;
          if (isBossActive && bossConfig) {
            const mechResult = checkBossWord(currentWord);
            scoreValue = Math.floor(scoreValue * mechResult.scoreMultiplier);

            // Deal damage to boss with skill effects applied
            // Base damage = word score / 10 (scaled to reasonable HP pool)
            let baseDamage = Math.floor(scoreValue / 10);

            // Apply skill effects: boss damage multiplier and long word bonus
            baseDamage = Math.floor(baseDamage * skillEffects.bossDamageMultiplier);
            baseDamage = Math.floor(baseDamage * skillEffects.getLongWordDamageMultiplier(currentWord.length));

            const mechanicMultiplier = mechResult.meetsRequirement ? 2.0 : 1.0;
            const damageDealt = dealBossDamage(baseDamage, gameState.comboCount, mechanicMultiplier, skillEffects.comboMultiplierBonus);

            // Trigger taunt based on mechanic result
            if (mechResult.triggerTaunt) {
              triggerBossTaunt(mechResult.triggerTaunt);
            } else if (scoreValue >= 50) {
              triggerBossTaunt('onGoodWord');
            }

            if (mechResult.meetsRequirement) {
              bossBonus = 'BOSS!';
            }
          }

          const comboBonus = gameState.comboCount > 1 ? `${gameState.comboCount}x` : undefined;

          // Add score popup to queue
          setPopupQueue(prev => [...prev, {
            id: Date.now(),
            value: scoreValue,
            x: startPos.x,
            y: startPos.y,
            word: currentWord,
            bonus: bossBonus || comboBonus,
          }]);

          // Valid word - submit with calculated score and path for special tile effects
          setValidationFeedback({ error: null, isValid: true, wasSubmitted: true });

          // Store word for explosion calculation at REMOVING phase
          lastSubmittedWordRef.current = { word: currentWord, path };

          submitWordWithPath(currentWord, scoreValue, path);
          clearSelection();
          // Clear any hint and reset inactivity timer
          clearCurrentHint();
          recordActivity();
          resetOnGameAction(); // DEBT-04: Reset Lexi stuck detection timer

          // Record valid word for AI Director performance tracking (DDA-01)
          recordAIWord(true, gameState.comboCount);

          // Track achievements (ACHIEVE-01 requirement)
          // First word achievement
          if (gameState.wordsFound.length === 0) {
            earnAchievement('FIRST_WORD');
          }
          // Long word achievements
          if (currentWord.length >= 6) {
            earnAchievement('LONG_WORD_6');
          }
          if (currentWord.length >= 8) {
            earnAchievement('LONG_WORD_8');
          }
          // Combo streak achievements
          if (gameState.comboCount >= 5) {
            earnAchievement('WORD_STREAK_5');
          }
          if (gameState.comboCount >= 10) {
            earnAchievement('WORD_STREAK_10');
          }

          // Reset after animation duration with proper cleanup
          wordSubmittedTimeoutRef.current = setTimeout(() => {
            setValidationFeedback({ error: null, wasSubmitted: false, isValid: false });
          }, 400);
        } else if (result.errorKey) {
          // Invalid word - show error
          const errorMessage = t(result.errorKey) || result.errorKey;
          setValidationFeedback({ error: errorMessage, isValid: false, wasSubmitted: false });
          clearSelection();

          // Record invalid word for AI Director performance tracking (DDA-01)
          recordAIWord(false, 0);

          // Detect combo break and trigger AI Director transition (DDA-03)
          // Combo breaks when player had an active combo and submitted invalid word
          if (prevComboCountRef.current > 0) {
            handleAITransition();
          }

          // Trigger boss bad word taunt on boss levels
          if (isBossActive) {
            triggerBossTaunt('onBadWord');
          }

          // Clear error after 2 seconds with proper cleanup
          validationErrorTimeoutRef.current = setTimeout(() => {
            setValidationFeedback(prev => ({ ...prev, error: null }));
          }, 2000);
        }
      },
      [isPlaying, isPaused, isValidating, isCascading, currentWord, getPath, validateWord, submitWordWithPath, clearSelection, t, getPopupStartPosition, gameState.comboCount, gameState.wordsFound, clearCurrentHint, recordActivity, resetOnGameAction, isBossActive, bossConfig, checkBossWord, triggerBossTaunt, dealBossDamage, minWordLength, upgradeBonuses.scoreBonus, scoreMultiplier, skillEffects, earnAchievement, recordAIWord, prevComboCountRef, handleAITransition]
    );

    // Handle level-up modal dismiss
    const handleLevelUpClose = useCallback(() => {
      setLevelUpData(null);
    }, []);

    // Handle cinematic completion (victory/defeat)
    const handleCinematicComplete = useCallback(() => {
      setShowVictoryCinematic(false);
      setShowDefeatCinematic(false);
      setCinematicComplete(true);
      setShowLevelComplete(true);
    }, []);

    // Handle level complete continue
    const handleContinue = useCallback(() => {
      setShowLevelComplete(false);
      onLevelComplete(gameState.stars, gameState.score);
    }, [gameState.stars, gameState.score, onLevelComplete]);

    // Handle retry
    const handleRetry = useCallback(() => {
      setShowLevelComplete(false);
      setHasAwardedLevelRewards(false); // Reset reward flag for retry
      clearSelection();
      resetGame();
      startGame();
    }, [resetGame, startGame, clearSelection]);

    // Handle exit - directly use onExit since no additional logic needed
    const handleExit = onExit;

    // Power-up handlers
    const handleFreezeTime = useCallback((newTime: number) => {
      // Apply the time extension via the hook's addTime method
      // Note: newTime from PowerUpBar already calculates the extension
      // We extract just the added seconds (10s for Freeze Time)
      const FREEZE_TIME_SECONDS = 10;
      addTime(FREEZE_TIME_SECONDS);
      // Trigger AI Director transition at power-up activation (DDA-03)
      handleAITransition();
    }, [addTime, handleAITransition]);

    const handleHint = useCallback((hint: HintResult) => {
      setHintWord(hint.word);
      setHintTiles(hint.tiles);
      setHintExpiresAt(Date.now() + 5000);
      // Clear hint after 5 seconds
      setTimeout(() => {
        setHintWord(undefined);
        setHintTiles(undefined);
        setHintExpiresAt(undefined);
      }, 5000);
      // Trigger AI Director transition at power-up activation (DDA-03)
      handleAITransition();
    }, [handleAITransition]);

    const handleScoreMultiplier = useCallback((expiresAt: number) => {
      setScoreMultiplier(2);
      setMultiplierExpiresAt(expiresAt);
      // Reset after 30 seconds
      setTimeout(() => {
        setScoreMultiplier(1);
        setMultiplierExpiresAt(undefined);
      }, 30000);
      // Trigger AI Director transition at power-up activation (DDA-03)
      handleAITransition();
    }, [handleAITransition]);

    // Handle hint button click
    const handleHintClick = useCallback(() => {
      if (hasHintsAvailable) {
        getHint();
        dismissAutoHint();
      }
    }, [hasHintsAvailable, getHint, dismissAutoHint]);

    // Convert hint path to indices for grid highlighting
    // Combines adaptive difficulty hints, power-up hints, and manual hints
    const hintHighlightIndices = useMemo(() => {
      // Adaptive difficulty hint takes highest precedence (appears after multiple failures)
      if (hintData.level !== 'none' && hintData.highlightTiles && hintData.highlightTiles.length > 0) {
        return hintData.highlightTiles.map(pos => pos.row * levelConfig.gridSize + pos.col);
      }
      // Power-up hint takes second precedence
      if (hintTiles) {
        return hintTiles.map(pos => pos.row * levelConfig.gridSize + pos.col);
      }
      // Otherwise use manual hint from hint button
      if (!currentHint?.path) return [];
      return currentHint.path.map(pos => pos.row * levelConfig.gridSize + pos.col);
    }, [hintData, currentHint, levelConfig.gridSize, hintTiles]);

    // Handle score popup completion with safety timeout fallback
    const handlePopupComplete = useCallback(() => {
      // Clear safety timeout when popup completes normally
      if (popupQueueTimeoutRef.current) {
        clearTimeout(popupQueueTimeoutRef.current);
        popupQueueTimeoutRef.current = null;
      }
      setPopupQueue(prev => prev.slice(1));
    }, []);

    // Safety mechanism: clear stuck popups after max duration
    useEffect(() => {
      // Clear any existing timeout when popup changes (prevents stale timeout accumulation)
      if (popupQueueTimeoutRef.current) {
        clearTimeout(popupQueueTimeoutRef.current);
        popupQueueTimeoutRef.current = null;
      }

      if (currentPopup) {
        const POPUP_MAX_DURATION_MS = 3000; // Max 3 seconds per popup
        popupQueueTimeoutRef.current = setTimeout(() => {
          setPopupQueue(prev => prev.slice(1));
          popupQueueTimeoutRef.current = null;
        }, POPUP_MAX_DURATION_MS);
      }

      // Cleanup on unmount or when popup changes
      return () => {
        if (popupQueueTimeoutRef.current) {
          clearTimeout(popupQueueTimeoutRef.current);
          popupQueueTimeoutRef.current = null;
        }
      };
    }, [currentPopup]);

    // Task 2: Wire screen shake and adaptive particles on combos
    const [particleConfig, setParticleConfig] = useState<{
      trigger: boolean;
      intensity: number;
      origin: { x: number; y: number };
    } | null>(null);

    // Handle combo tier changes - trigger screen shake and particles
    const handleComboTierChange = useCallback((tier: ComboTier) => {
      // Map combo tier thresholds to shake intensity (pixels)
      const shakeIntensityMap: Record<number, number> = {
        2: 2,  // Nice! - subtle shake
        4: 4,  // Great! - moderate shake
        7: 6,  // Amazing! - strong shake
        10: 8, // Legendary! - intense shake
      };
      const intensity = shakeIntensityMap[tier.threshold] || 2;
      shake(intensity);

      // Trigger adaptive particles (intensity 1-4 based on tier)
      const particleIntensity = Math.ceil(tier.threshold / 3); // 2→1, 4→2, 7→3, 10→4
      setParticleConfig({
        trigger: true,
        intensity: particleIntensity,
        origin: { x: 0.5, y: 0.4 }, // Center-top for combo celebrations
      });
    }, [shake]);

    // Calculate star count for display
    const starsEarned = gameState.stars;

    // Render error state for invalid config
    if (!isValidConfig) {
      return (
        <div
          data-testid="adventure-game"
          role="main"
          className="flex items-center justify-center h-full"
        >
          <p className="text-neo-red font-bold">Invalid level configuration</p>
        </div>
      );
    }

    return (
      <div
        ref={shakeRef}
        data-testid="adventure-game"
        role="main"
        aria-label="Adventure Mode Game"
        className={cn(
          'relative flex flex-col h-full',
          'text-neo-white'
        )}
      >
        {/* Simplified ambient background for gameplay - less distracting than full WorldBackground */}
        <GameplayBackground className="absolute inset-0 -z-10" />

        {/* Header - Mobile-optimized compact layout */}
        <header
          className={cn(
            'flex items-center justify-between',
            'px-2 sm:px-3 py-1',
            'bg-neo-navy/80 border-b-2 border-neo-black/30',
            'flex-shrink-0' // Prevent header from shrinking
          )}
        >
          {/* Level Info - Compact on mobile */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            <h1 className="text-sm sm:text-lg font-black whitespace-nowrap">
              <span className="hidden sm:inline">{t('adventure.level')} </span>
              <span className="sm:hidden">L</span>
              {levelConfig.level}
            </h1>
            <div
              ref={scoreDisplayRef}
              data-testid="score-display"
              className="font-mono font-bold text-xs sm:text-sm"
            >
              {gameState.score}
            </div>
          </div>

          {/* Timer and Pause - Always visible */}
          <div className="flex items-center gap-1 sm:gap-2">
            <AdventureTimer timeRemaining={timeRemaining} size="compact" />
            <button
              onClick={handlePauseToggle}
              aria-label={isPaused ? 'Resume' : 'Pause'}
              className={cn(
                'p-1 sm:p-1.5 rounded-neo',
                'bg-neo-white/10 hover:bg-neo-white/20',
                'transition-colors duration-200'
              )}
            >
              {isPaused ? (
                <Play className="w-3 h-3 sm:w-4 sm:h-4" />
              ) : (
                <Pause className="w-3 h-3 sm:w-4 sm:h-4" />
              )}
            </button>
          </div>
        </header>

        {/* Main Game Area - Compact layout, minimal spacing on mobile */}
        <main className="flex-1 flex flex-col lg:flex-row lg:items-start lg:justify-center gap-0.5 sm:gap-2 p-0.5 sm:p-2 overflow-y-auto min-h-0">
          {/* Grid Section - Centered, minimal top spacing on mobile */}
          <div className="flex-shrink-0 flex flex-col items-center justify-start gap-0.5 sm:gap-1 min-h-0 relative mt-0 sm:mt-2 lg:mt-4">
            {/* Combo Tier Badge - Positioned above grid */}
            <ComboTierBadge
              comboCount={gameState.comboCount}
              className="absolute top-0 sm:top-[10%] left-1/2 -translate-x-1/2 z-50"
              onTierChange={handleComboTierChange}
            />

            {/* Feedback Container - Compact on mobile, fixed height prevents layout shift */}
            <div
              data-testid="feedback-container"
              className="h-[28px] sm:h-[36px] flex items-center justify-center relative"
            >
              {/* Minimum Word Length Hint - Shows when selecting but not yet meeting minimum */}
              {selectedIndices.length > 0 && selectedIndices.length < minWordLength && (
                <div
                  data-testid="min-word-hint"
                  className={cn(
                    'px-3 py-1 rounded-full',
                    'bg-neo-white/10 border border-neo-white/20',
                    'text-neo-white/70 text-xs font-medium',
                    'flex items-center gap-1.5',
                    'animate-in fade-in duration-150'
                  )}
                >
                  <span>
                    {minWordLength === 2
                      ? t('adventure.hints.minLetters2') || '2+ letters'
                      : t('adventure.hints.minLetters3') || '3+ letters'}
                  </span>
                  <span className="font-bold text-neo-lime">
                    {selectedIndices.length}/{minWordLength}
                  </span>
                </div>
              )}

              {/* Validation Feedback */}
              {validationFeedback.error && (
                <div
                  data-testid="validation-error"
                  className={cn(
                    'px-4 py-1.5 rounded-neo',
                    'bg-neo-red/20 border-2 border-neo-red',
                    'text-neo-red font-bold text-sm',
                    'animate-neo-shake'
                  )}
                >
                  {validationFeedback.error}
                </div>
              )}

              {/* Loading Indicator */}
              {isValidating && (
                <div
                  data-testid="validation-loading"
                  className="text-neo-cyan font-bold text-sm animate-pulse"
                >
                  {t('common.validating') || 'Validating...'}
                </div>
              )}
            </div>

            {/* Adaptive Difficulty Hint Message */}
            {hintData.level !== 'none' && (
              <div className="flex items-center justify-center">
                <HintMessage hintData={hintData} />
              </div>
            )}

            <AdventureGrid
              ref={gridRef}
              tiles={tiles}
              gridSize={levelConfig.gridSize}
              selectedIndices={selectedIndices}
              onTileSelect={handleTileSelect}
              onWordSubmit={handleWordSubmit}
              onDragStart={handleDragStart}
              onDragEnter={handleDragEnter}
              interactive={entryPhase === 'playing' && isPlaying && !isPaused && !isValidating && !isCascading}
              disabled={entryPhase !== 'playing' || !isPlaying || isPaused || isValidating || isCascading}
              showWordPreview
              className="max-w-md w-full"
              pathPoints={pathPoints}
              isWordValid={validationFeedback.isValid}
              wasWordSubmitted={validationFeedback.wasSubmitted}
              showCascade={entryPhase === 'cascade'}
              onCascadeComplete={handleCascadeComplete}
              hintHighlightIndices={hintHighlightIndices}
            />
          </div>

          {/* Sidebar - Objectives & Info - Mobile-optimized */}
          <aside
            className={cn(
              // Mobile: horizontal scroll, Desktop: fixed width sidebar
              'flex-shrink-0 w-full lg:w-48 xl:w-56',
              'flex flex-row lg:flex-col gap-1.5 sm:gap-2',
              'overflow-x-auto lg:overflow-visible',
              'lg:border-l-2 lg:border-neo-black/20 lg:pl-2',
              // Compact padding
              'p-1.5 sm:p-2 rounded-neo',
              'bg-neo-navy/95 backdrop-blur-lg',
              'border-2 border-neo-white/20',
              'shadow-hard',
              // Safe area for notched mobile devices
              'mb-16 sm:mb-20 lg:mb-0' // Leave space for PowerUpBar on mobile
            )}
          >
            {/* Objectives - Takes more space on mobile */}
            <div className="flex-shrink-0 min-w-[140px] lg:min-w-0">
              <h2 className="text-[10px] sm:text-xs font-bold text-neo-white/80 uppercase tracking-wide mb-0.5 sm:mb-1">
                {t('adventure.game.objectives')}
              </h2>
              <AdventureObjectives
                objectives={objectives}
                showSlideIn={entryPhase === 'objectives'}
                onSlideInComplete={handleObjectivesComplete}
              />
            </div>

            {/* Combo Display - Compact on mobile */}
            <div
              data-testid="combo-display"
              className={cn(
                'flex-shrink-0 min-w-[80px] lg:min-w-0',
                'p-1.5 sm:p-2 rounded-neo',
                'bg-neo-black/30 border-2 border-neo-cyan/30'
              )}
            >
              <p className="text-[10px] sm:text-xs font-bold text-neo-white/70 uppercase tracking-wide">
                {t('adventure.game.combo')}
              </p>
              <p className="text-lg sm:text-xl font-black text-neo-cyan drop-shadow-[0_0_8px_rgba(0,255,255,0.5)]">
                x{gameState.comboCount}
              </p>
            </div>

            {/* Hint Button - Compact on mobile */}
            <button
              onClick={handleHintClick}
              disabled={!hasHintsAvailable}
              data-testid="hint-button"
              aria-label={t('adventure.game.hint')}
              className={cn(
                'flex-shrink-0 flex items-center justify-center gap-1',
                'p-1.5 sm:p-2 rounded-neo',
                'text-xs sm:text-sm font-bold transition-all duration-200',
                'min-w-[70px] lg:min-w-0',
                hasHintsAvailable
                  ? 'bg-neo-yellow text-neo-black border-2 border-neo-black shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-hard-pressed'
                  : 'bg-neo-black/30 text-neo-white/40 border-2 border-neo-white/10 cursor-not-allowed'
              )}
            >
              <Lightbulb className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">{t('adventure.game.hint')}</span>
            </button>

            {/* Auto-Hint Prompt - Hidden on mobile to save space */}
            {showAutoHint && (
              <div
                data-testid="auto-hint-prompt"
                className={cn(
                  'hidden sm:block flex-shrink-0',
                  'p-1.5 sm:p-2 rounded-neo',
                  'bg-neo-yellow/20 border-2 border-neo-yellow/50',
                  'animate-neo-pop'
                )}
              >
                <p className="text-[10px] sm:text-xs font-bold text-neo-yellow text-center">
                  {t('adventure.game.hintAvailable')}
                </p>
              </div>
            )}

            {/* Current Hint Display - More compact on mobile */}
            {currentHint && (
              <div
                data-testid="current-hint-display"
                className={cn(
                  'flex-shrink-0 min-w-[90px] lg:min-w-0',
                  'p-1.5 sm:p-2 rounded-neo',
                  'bg-neo-lime/20 border-2 border-neo-lime/50'
                )}
              >
                <p className="text-[10px] sm:text-xs font-bold text-neo-lime text-center">
                  {t('adventure.game.hintUsed')}
                </p>
                <p className="text-sm sm:text-base font-black text-neo-white text-center">
                  {currentHint.word}
                </p>
              </div>
            )}
          </aside>
        </main>

        {/* Power-Up Bar (only during active gameplay) */}
        {entryPhase === 'playing' && isPlaying && !isPaused && !showLevelComplete && (
          <PowerUpBar
            timeRemaining={timeRemaining}
            totalTime={adjustedLevelConfig.timerSeconds}
            tiles={tiles2D}
            wordsFound={gameState.wordsFound}
            cascadeActive={isCascading}
            cooldownMultiplier={powerUpCooldownMultiplier}
            onFreezeTime={handleFreezeTime}
            onHint={handleHint}
            onScoreMultiplier={handleScoreMultiplier}
          />
        )}

        {/* Boss Battle Overlay (all boss UI components with Phase 30 integration) */}
        <BossOverlay
          boss={bossConfig}
          maxHP={bossMaxHP}
          healthState={bossHealthState}
          currentTaunt={bossTaunt}
          showTaunt={showBossTaunt}
          showIntro={showBossIntro}
          onStartBattle={handleBossIntroStart}
          onSkipIntro={handleBossIntroSkip}
          showVictory={showLevelComplete && bossHealthState.phase === 'victory'}
          showDefeat={showLevelComplete && bossHealthState.phase === 'defeat'}
          stars={starsEarned}
          score={gameState.score}
          wordsFound={gameState.wordsFound}
          gameState={gameState}
          onContinue={handleContinue}
          onRetry={handleRetry}
          worldNumber={levelConfig.world}
        />

        {/* Pause Overlay */}
        {isPaused && !showLevelComplete && (
          <div
            data-testid="pause-overlay"
            className={cn(
              'absolute inset-0 z-40',
              'flex flex-col items-center justify-center',
              'bg-neo-black/80 backdrop-blur-sm'
            )}
          >
            <h2 className="text-3xl font-black mb-8">{t('adventure.game.paused')}</h2>
            <div className="flex flex-col gap-4 w-48">
              <button
                onClick={handlePauseToggle}
                aria-label={t('common.resume')}
                className={cn(
                  'py-3 px-6',
                  'bg-neo-lime text-neo-black',
                  'font-black text-lg',
                  'border-3 border-neo-black rounded-neo',
                  'shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5',
                  'active:translate-y-0.5 active:shadow-hard-pressed',
                  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan',
                  'transition-all duration-200'
                )}
              >
                {t('common.resume')}
              </button>
              <button
                onClick={handleExit}
                aria-label={t('common.exit')}
                className={cn(
                  'py-3 px-6',
                  'flex items-center justify-center gap-2',
                  'bg-neo-white/10 text-neo-white',
                  'font-bold',
                  'border-2 border-neo-white/20 rounded-neo',
                  'hover:bg-neo-white/20 hover:border-neo-white/30',
                  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-lime',
                  'transition-all duration-200'
                )}
              >
                <LogOut className="w-5 h-5" />
                {t('common.exit')}
              </button>
            </div>
          </div>
        )}

        {/* Level Entry Overlay - shows during title phase */}
        <LevelEntryOverlay
          levelNumber={levelConfig.level}
          worldNumber={levelConfig.world}
          isVisible={entryPhase === 'title'}
          onComplete={handleTitleComplete}
        />

        {/* Victory Cinematic */}
        {showVictoryCinematic && (
          <CinematicPlayer
            composition={VictoryCinematic as unknown as React.ComponentType<Record<string, unknown>>}
            compositionProps={{
              starsEarned: gameState.stars,
              wordsFound: gameState.wordsFound.length,
              finalScore: gameState.score,
              timeRemaining: timeRemaining,
            }}
            durationSeconds={VICTORY_DURATION_FRAMES / 30}
            onComplete={handleCinematicComplete}
          />
        )}

        {/* Defeat Cinematic */}
        {showDefeatCinematic && (
          <CinematicPlayer
            composition={DefeatCinematic as unknown as React.ComponentType<Record<string, unknown>>}
            compositionProps={{
              wordsFound: gameState.wordsFound.length,
              bestWord: gameState.wordsFound.reduce((best, word) =>
                word.length > best.length ? word : best, ''
              ),
              finalScore: gameState.score,
            }}
            durationSeconds={DEFEAT_DURATION_FRAMES / 30}
            onComplete={handleCinematicComplete}
          />
        )}

        {/* Level Complete: Standard Modal (boss levels use BossOverlay) */}
        {!isBossLevel && (
          <LevelCompleteModal
            isOpen={showLevelComplete && cinematicComplete}
            stars={starsEarned}
            score={gameState.score}
            objectives={objectives}
            levelNumber={levelConfig.level}
            worldNumber={levelConfig.world}
            onContinue={handleContinue}
            onRetry={handleRetry}
            onExit={handleExit}
            totalStars={totalStars}
            bestAttempt={bestAttempt}
          />
        )}

        {/* Score Popup Animation */}
        {currentPopup && (
          <ScorePopup
            score={currentPopup.value}
            position={{ x: currentPopup.x, y: currentPopup.y }}
            targetPosition={scoreDisplayRef.current ? {
              x: scoreDisplayRef.current.getBoundingClientRect().left + scoreDisplayRef.current.getBoundingClientRect().width / 2,
              y: scoreDisplayRef.current.getBoundingClientRect().top + scoreDisplayRef.current.getBoundingClientRect().height / 2,
            } : undefined}
            comboMultiplier={currentPopup.bonus ? parseFloat(currentPopup.bonus.replace('x', '')) : undefined}
            onComplete={handlePopupComplete}
          />
        )}

        {/* Lexi Mascot Reactions */}
        <LexiReaction
          reaction={reaction}
          onDismiss={dismissReaction}
        />

        {/* Chain Particle Burst */}
        {chainBurstConfig && (
          <ChainParticleBurst
            trigger={chainBurstConfig.trigger}
            position={chainBurstConfig.position}
            world={levelConfig.world}
            onComplete={() => setChainBurstConfig(null)}
          />
        )}

        {/* Adaptive Particles for combo tier changes */}
        {particleConfig && (
          <AdaptiveParticles
            type="combo"
            intensity={particleConfig.intensity}
            origin={particleConfig.origin}
            onComplete={() => setParticleConfig(null)}
          />
        )}

        {/* Explosion Effects (triggered at REMOVING phase) */}
        {pendingExplosions.map((explosion) => (
          <ExplosionEffect
            key={explosion.id}
            position={explosion.position}
            intensity={explosion.intensity}
            onComplete={() => {
              setPendingExplosions(prev => prev.filter(e => e.id !== explosion.id));
            }}
          />
        ))}

        {/* Level-Up Celebration Modal */}
        <LevelUpCelebration
          levelUpData={levelUpData}
          onClose={handleLevelUpClose}
        />

        {/* Combo Milestone Overlay */}
        <ComboMilestoneOverlay milestone={currentMilestone} />

        {/* Boss Defeat Fireworks */}
        {isBossLevel && (
          <BossDefeatFireworks
            active={showBossFireworks}
            bossTier={defeatedBossTier}
          />
        )}
      </div>
    );
  }
);

AdventureGame.displayName = 'AdventureGame';

export default AdventureGame;
