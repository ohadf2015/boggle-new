/**
 * AdventureGame Component
 *
 * Main orchestrator for adventure mode gameplay.
 * Uses organized layout components for clean structure.
 */

'use client';

import React, { memo, useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useProgression } from '@/contexts/ProgressionContext';
import { useAdventureGame } from '@/hooks/useAdventureGame';
import { useAdventureWordValidation } from '@/hooks/useAdventureWordValidation';
import { useAdventureSelection } from '@/hooks/useAdventureSelection';
import { type GameStateForReactions } from '@/hooks/useLexiReactions';
import { useAdventureHints } from '@/hooks/useAdventureHints';
import { registerAllAbilities } from '@/lib/adventure/abilities';
import { useAdventureXp } from '@/hooks/useAdventureXp';
import { useAdventureCurrency } from '@/hooks/useAdventureCurrency';
import { useSkillPoints } from '@/hooks/useSkillPoints';
import { useSkillEffects } from '@/hooks/useSkillEffects';
import { useAdventureAchievements } from '@/hooks/useAdventureAchievements';
import { useAdventureEffects } from './effects/hooks/useAdventureEffects';
import { useAdventureCinematics } from './hooks/useAdventureCinematics';
import { useAdventureEntryPhase } from './hooks/useAdventureEntryPhase';
import { useAdventureBoss } from './hooks/useAdventureBoss';
import { useAdaptiveDifficulty } from '@/hooks/useAdaptiveDifficulty';
import { useEarthquakeFireRound } from '@/hooks/useEarthquakeFireRound';
import { useLexiStuckDetection } from '@/hooks/useLexiStuckDetection';
import { neoInfoToast } from '@/components/NeoToast';
import { useComboMilestone } from '@/hooks/useComboMilestone';
import { useAIDirector } from '@/hooks/useAIDirector';
import { type BossTier } from '@/components/celebration/BossDefeatFireworks';
import { type LevelUpPayload } from '@/components/education/LevelUpCelebration';
import AdventureEffectsLayer from './effects/AdventureEffectsLayer';
import { calculateAdventureXp } from '@/shared/utils/adventureXpUtils';
import LevelCompleteModal from './LevelCompleteModal';
import LevelEntryOverlay from './LevelEntryOverlay';
import { BossOverlay, PlayerHealthBar } from './boss';
import { usePlayerHealth } from '@/hooks/usePlayerHealth';
import type { EffectCallbacks } from '@/hooks/useBossEffectExecutor';
import {
  VictoryCinematic,
  VICTORY_DURATION_FRAMES,
  DefeatCinematic,
  DEFEAT_DURATION_FRAMES,
} from './cinematics';
import { CinematicPlayer } from './boss/cinematics/CinematicPlayer';
import GameplayBackground from './themed/GameplayBackground';
import { showAchievementToast } from '@/components/achievements/AchievementToast';
import { ADVENTURE_ACHIEVEMENTS } from '@/utils/adventureAchievementUtils';
import { GameHeader, GameSidebar, GameGridArea, PauseOverlay, GameLayout } from './ui';
import { EarthquakeWarning, FireRoundIndicator } from '@/components/earthquake';
import type { WordFeedback } from '@/components/game/WordFormingArea';
import type { LevelConfig, TileState, GridTileState } from '@/types/adventure';
import type { Language, DifficultyLevel } from '@/types';

// ==============================================
// TYPES
// ==============================================

export interface GameTimerState {
  timeRemaining: number;
  totalTime: number;
  isPlaying: boolean;
  isPaused: boolean;
}

interface AdventureGameProps {
  levelConfig: LevelConfig;
  initialGrid: string[][];
  onLevelComplete: (stars: number, score: number) => void;
  onExit: () => void;
  onTimerStateChange?: (timerState: GameTimerState) => void;
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
 * Memoize flat tiles using version counter for O(1) change detection.
 * Previously used O(n²) deep comparison which was expensive for 7x7 grids.
 */
function useMemoizedFlatTiles(tiles2D: TileState[][], tilesVersion: number): GridTileState[] {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => flattenTiles(tiles2D), [tilesVersion]);
}

// ==============================================
// COMPONENT
// ==============================================

const AdventureGame = memo<AdventureGameProps>(
  ({ levelConfig, initialGrid, onLevelComplete, onExit, onTimerStateChange, totalStars }) => {
    const isValidConfig = levelConfig.gridSize > 0 && levelConfig.objectives.length > 0;

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

    const prevComboCountRef = useRef(0);

    useEffect(() => {
      registerAllAbilities();
    }, []);

    const [levelUpData, setLevelUpData] = useState<LevelUpPayload | null>(null);
    const [hasAwardedLevelRewards, setHasAwardedLevelRewards] = useState(false);

    const {
      totalXp,
      currentLevel,
      xpProgress,
      awardXp,
      pendingUpdate: xpPendingUpdate,
      acknowledgePersistence: acknowledgeXpPersistence,
    } = useAdventureXp({
      userId: 'temp-user-id',
      initialXp: 0,
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
      initialGold: 0,
      initialUpgrades: { timeBonus: 0, scoreBonus: 0, xpBonus: 0 },
    });

    useSkillPoints({
      currentLevel,
      onLevelUp: ({ pointsAwarded }) => {
        console.log(`Earned ${pointsAwarded} skill point(s)!`);
      },
    });

    const skillEffects = useSkillEffects();

    const { earnAchievement, getCount } = useAdventureAchievements();

    // Helper to earn achievement and show toast notification
    const handleEarnAchievement = useCallback(
      (achievementId: keyof typeof ADVENTURE_ACHIEVEMENTS) => {
        const isNewOrUpgraded = earnAchievement(achievementId);
        if (isNewOrUpgraded) {
          const achievement = ADVENTURE_ACHIEVEMENTS[achievementId];
          const count = getCount(achievementId) + 1; // +1 because getCount returns previous value
          showAchievementToast({
            achievement,
            count,
            isNew: count === 1,
          });
        }
        return isNewOrUpgraded;
      },
      [earnAchievement, getCount]
    );

    const { currentMilestone, checkMilestone } = useComboMilestone();

    const upgradeBonuses = useMemo(() => {
      return {
        timeBonus: getUpgradeEffect('timeBonus').multiplier,
        scoreBonus: getUpgradeEffect('scoreBonus').multiplier,
        xpBonus: getUpgradeEffect('xpBonus').multiplier,
      };
    }, [getUpgradeEffect]);

    const adjustedLevelConfig = useMemo(() => {
      const bonusTime = Math.floor(adjustedConfig.timerSeconds * (upgradeBonuses.timeBonus - 1));
      return {
        ...adjustedConfig,
        timerSeconds: adjustedConfig.timerSeconds + bonusTime,
      };
    }, [adjustedConfig, upgradeBonuses.timeBonus]);

    const {
      gameState,
      tiles: tiles2D,
      tilesVersion,
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
      regenerateGrid,
    } = useAdventureGame({
      levelConfig: adjustedLevelConfig,
      initialGrid,
    });

    // O(1) change detection using version counter instead of O(n²) deep comparison
    const tiles = useMemoizedFlatTiles(tiles2D, tilesVersion);
    const { t, language } = useLanguage();
    const { recordAttempt, getLevelAttempt } = useProgression();
    const bestAttempt = useMemo(
      () => getLevelAttempt(levelConfig.world, levelConfig.level),
      [getLevelAttempt, levelConfig.world, levelConfig.level]
    );

    const [isPaused, setIsPaused] = useState(false);
    const [showLevelComplete, setShowLevelComplete] = useState(false);
    const [validationFeedback, setValidationFeedback] = useState<ValidationFeedback>({
      error: null,
      wasSubmitted: false,
      isValid: false,
    });
    const [lastAccepted, setLastAccepted] = useState<{ word: string; score: number } | null>(null);
    const [wordFeedback, setWordFeedback] = useState<WordFeedback | null>(null);

    const cinematics = useAdventureCinematics();

    const validationErrorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const wordSubmittedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const popupQueueTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastSubmittedWordRef = useRef<{ word: string; path: Array<{ row: number; col: number }> } | null>(null);

    const entryPhaseManager = useAdventureEntryPhase();
    const { entryPhase } = entryPhaseManager;

    // Earthquake / fire-round integration
    const {
      earthquakeState,
      fireRoundActive,
      fireRoundRemaining,
      getScoreMultiplier,
    } = useEarthquakeFireRound({
      enabled: isPlaying && entryPhase === 'playing' && !isPaused,
      gameDurationSeconds: adjustedLevelConfig.timerSeconds,
      currentTimeSeconds: timeRemaining,
      language: (language || 'en') as Language,
      difficulty: 'MEDIUM' as DifficultyLevel,
      mode: 'singleplayer',
      onGridRegenerate: (newGrid) => regenerateGrid(newGrid),
      onEarthquakeStart: () => pauseGame(),
      onEarthquakeShake: () => { /* shake phase — visual only via Phaser */ },
      onFireRoundStart: () => startGame(),
      onFireRoundEnd: () => { /* fire round ended, back to normal */ },
      onTimerPause: () => pauseGame(),
      onTimerResume: () => startGame(),
      config: { minGameDurationSeconds: 45 },
    });

    useEffect(() => {
      return () => {
        if (validationErrorTimeoutRef.current) clearTimeout(validationErrorTimeoutRef.current);
        if (wordSubmittedTimeoutRef.current) clearTimeout(wordSubmittedTimeoutRef.current);
        if (popupQueueTimeoutRef.current) clearTimeout(popupQueueTimeoutRef.current);
      };
    }, []);

    const minWordLength = levelConfig.minWordLength ?? 3;
    const { validateWord, isValidating } = useAdventureWordValidation({
      grid: initialGrid,
      language: language || 'en',
      minWordLength,
      foundWords: gameState.wordsFound,
      tiles: tiles2D,
    });

    const gridRef = useRef<HTMLDivElement>(null);

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
      disabled: !isPlaying || isPaused || isValidating,
      gridRef,
    });

    // Phaser drag word preview — takes priority over React selection during Phaser drags
    const [phaserCurrentWord, setPhaserCurrentWord] = useState<string>('');
    const effectiveCurrentWord = phaserCurrentWord || currentWord;

    const adjustedInactivityThresholdMs = useMemo(() => {
      const baseThreshold = 15000;
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

    const isBossLevel = levelConfig.isBossLevel;
    const boss = useAdventureBoss({
      isBossLevel,
      worldId: levelConfig.world,
      levelNumber: levelConfig.level,
      showBossIntroConfig: levelConfig.showBossIntro === true,
      timeRemaining,
      isPlaying,
      onStartGame: startGame,
      onStartAIDirector: startAIDirector,
    });

    const {
      isBossActive,
      bossConfig,
      bossTaunt,
      showBossTaunt,
      bossHealthState,
      bossHPPercentage,
      isEnraged: isBossEnraged,
      bossState,
      showBossIntro,
      showBossFireworks,
      defeatedBossTier,
      checkBossWord,
      dealBossDamage,
      triggerBossTaunt,
      startBossBattle,
      endBossBattle,
      resetBossHealth,
      handleBossIntroStart,
      handleBossIntroSkip,
    } = boss;

    // ==============================================
    // PLAYER HEALTH (Boss battles only)
    // ==============================================
    const playerHealth = usePlayerHealth(isBossLevel ? 100 : 0);
    const {
      healthState: playerHealthState,
      takeDamage: takePlayerDamage,
      resetHealth: resetPlayerHealth,
    } = playerHealth;

    const isModalOpen = showLevelComplete || cinematics.showVictoryCinematic || cinematics.showDefeatCinematic || showBossIntro || showBossFireworks;
    const { resetOnGameAction } = useLexiStuckDetection({
      onStuck: () => {
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

    const lexiGameStateRef = useRef<GameStateForReactions>({
      wordsFound: [],
      comboCount: 0,
      timeRemaining: 0,
      isComplete: false,
      stars: 0,
      worldId: 1,
    });

    useEffect(() => {
      lexiGameStateRef.current = {
        wordsFound: gameState.wordsFound,
        comboCount: gameState.comboCount,
        timeRemaining,
        isComplete: gameState.isComplete,
        stars: gameState.stars,
        worldId: levelConfig.world,
      };
    }, [gameState.wordsFound, gameState.comboCount, gameState.isComplete, gameState.stars, levelConfig.world, timeRemaining]);

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

    const effects = useAdventureEffects({
      gameStateForReactions: {
        gameState: lexiGameState,
        isPlaying: isPlaying && entryPhase === 'playing' && !isPaused,
      },
    });

    // ==============================================
    // BOSS EFFECT CALLBACKS (uses effects, must come after)
    // ==============================================
    const bossEffectCallbacks: EffectCallbacks = useMemo(() => ({
      onPlayerDamage: (amount: number) => {
        if (isBossLevel) {
          takePlayerDamage(amount);
        }
      },
      onTimerPenalty: (seconds: number) => {
        // Timer penalty - reduce remaining time by passing negative value
        addTime(-seconds);
      },
      onScreenShake: (intensity?: number) => {
        effects.shake(intensity ?? 4);
      },
      onDamageFlash: () => {
        // Flash effect handled by AdventureEffectsLayer
        // Could add a red flash overlay here
      },
      onScramble: () => {
        // Board scramble handled by game state
        console.log('[Boss Effect] Scramble triggered');
      },
    }), [isBossLevel, takePlayerDamage, effects, addTime]);

    const lastReportedStateRef = useRef<LastReportedTimerState | null>(null);

    useEffect(() => {
      const actuallyPlaying = isPlaying && entryPhase === 'playing';
      const lastState = lastReportedStateRef.current;

      const isSignificantChange =
        !lastState ||
        lastState.isPlaying !== actuallyPlaying ||
        lastState.isPaused !== isPaused ||
        lastState.phase !== entryPhase ||
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

    // Consolidated combo tracking effect - handles milestone check + prev tracking
    useEffect(() => {
      // Check milestone only when actively playing
      if (isPlaying && entryPhase === 'playing' && !isPaused) {
        checkMilestone(gameState.comboCount);
      }
      // Always track previous combo count for change detection
      prevComboCountRef.current = gameState.comboCount;
    }, [gameState.comboCount, isPlaying, entryPhase, isPaused, checkMilestone]);

    const handleCascadeComplete = useCallback(() => {
      markCascadeComplete();
      entryPhaseManager.advanceToObjectives();
    }, [markCascadeComplete, entryPhaseManager]);

    const handleObjectivesComplete = useCallback(() => {
      entryPhaseManager.advanceToTitle();
    }, [entryPhaseManager]);

    const handleTitleComplete = useCallback(() => {
      entryPhaseManager.advanceToPlaying();
      if (!isPlaying) {
        startGame();
        startAIDirector();
      }
    }, [isPlaying, startGame, startAIDirector, entryPhaseManager]);

    useEffect(() => {
      if ((gameState.isComplete || timeRemaining === 0) && !hasAwardedLevelRewards && gameState.stars > 0) {
        const difficultyMap: Record<number, 'easy' | 'medium' | 'hard'> = {
          1: 'easy',
          2: 'easy',
          3: 'medium',
          4: 'medium',
          5: 'hard',
        };
        const difficulty = difficultyMap[levelConfig.level] || 'medium';
        const isPerfectClear = gameState.stars === 3;
        const hasTimeBonus = timeRemaining > (adjustedLevelConfig.timerSeconds * 0.5);

        const baseXp = calculateAdventureXp(
          difficulty,
          Math.max(1, gameState.comboCount),
          {
            perfectClear: isPerfectClear,
            timeBonus: hasTimeBonus ? 0.1 : 0,
          }
        );
        const earnedXp = Math.floor(baseXp * upgradeBonuses.xpBonus);

        const oldLevel = currentLevel;
        const levelUpResult = awardXp(earnedXp);

        const baseGold = 10 * gameState.stars;
        const perfectClearGoldBonus = isPerfectClear ? 50 : 0;
        const totalGold = baseGold + perfectClearGoldBonus;
        addGold(totalGold);

        if (levelUpResult.leveledUp && levelUpResult.newLevel !== undefined) {
          setLevelUpData({
            oldLevel,
            newLevel: levelUpResult.newLevel,
            newTitles: [],
          });
        }

        setHasAwardedLevelRewards(true);
      }
    }, [gameState.isComplete, gameState.stars, gameState.comboCount, timeRemaining, hasAwardedLevelRewards, levelConfig.level, adjustedLevelConfig.timerSeconds, awardXp, addGold, currentLevel, upgradeBonuses.xpBonus]);

    // ==============================================
    // LEVEL COMPLETION EFFECTS (Split for performance)
    // Previously a single effect with 23 dependencies
    // Now split into focused effects for better memoization
    // ==============================================

    // Track if completion has been processed to prevent double-processing
    const completionProcessedRef = useRef(false);

    // Store callbacks in refs for stable references (reduces effect dependencies)
    const recordAttemptRef = useRef(recordAttempt);
    const recordCompletionRef = useRef(recordCompletion);
    const endAIDirectorRef = useRef(endAIDirector);
    const handleEarnAchievementRef = useRef(handleEarnAchievement);

    // Consolidated ref sync effect - keeps callback refs current and resets completion flag
    useEffect(() => {
      // Keep callback refs in sync for stable effect dependencies
      recordAttemptRef.current = recordAttempt;
      recordCompletionRef.current = recordCompletion;
      endAIDirectorRef.current = endAIDirector;
      handleEarnAchievementRef.current = handleEarnAchievement;
      // Reset completion flag when level changes (part of same lifecycle)
      completionProcessedRef.current = false;
    }, [recordAttempt, recordCompletion, endAIDirector, handleEarnAchievement, levelConfig.world, levelConfig.level]);

    // EFFECT 1: Victory/Defeat Detection & Cinematic Trigger
    // Focused on: detecting completion state and triggering cinematics
    useEffect(() => {
      // Skip if already showing completion UI or already processed
      if (showLevelComplete || cinematics.showVictoryCinematic || cinematics.showDefeatCinematic) return;
      if (completionProcessedRef.current) return;

      // Player death triggers immediate defeat for boss levels
      const playerDied = isBossLevel && playerHealthState.isDead;

      const shouldComplete = isBossLevel
        ? bossHealthState.phase === 'victory' || bossHealthState.phase === 'defeat' || timeRemaining === 0 || playerDied
        : gameState.isComplete || timeRemaining === 0;

      if (!shouldComplete) return;

      // Mark as processed to prevent double-processing
      completionProcessedRef.current = true;

      // Player death = defeat, boss defeated = victory
      const isVictory = isBossLevel
        ? bossHealthState.phase === 'victory' && !playerDied
        : gameState.stars > 0;

      // Trigger cinematic
      if (isVictory) {
        cinematics.showVictory();
      } else {
        cinematics.showDefeat();
      }
      pauseGame();

    }, [
      showLevelComplete,
      cinematics,
      gameState.isComplete,
      gameState.stars,
      timeRemaining,
      pauseGame,
      isBossLevel,
      bossHealthState.phase,
      playerHealthState.isDead,
    ]);

    // EFFECT 2: Boss Battle Completion
    // Focused on: boss-specific completion logic
    useEffect(() => {
      if (!completionProcessedRef.current) return;
      if (!isBossActive || !isBossLevel) return;

      const playerDied = playerHealthState.isDead;
      const isVictory = bossHealthState.phase === 'victory' && !playerDied;

      // End boss battle if not already ended
      if (bossHealthState.phase !== 'victory' && bossHealthState.phase !== 'defeat') {
        endBossBattle(isVictory);
      }

      triggerBossTaunt(isVictory ? 'onVictory' : 'onDefeat');

      if (isVictory) {
        handleEarnAchievementRef.current('BOSS_SLAYER');
      }
    }, [isBossActive, isBossLevel, bossHealthState.phase, playerHealthState.isDead, endBossBattle, triggerBossTaunt]);

    // EFFECT 3: Achievement & Progress Recording
    // Focused on: recording completion data and achievements
    useEffect(() => {
      if (!completionProcessedRef.current) return;
      // Only run once per completion
      if (!gameState.isComplete && timeRemaining > 0) return;

      // Award perfect level achievement
      if (gameState.stars === 3) {
        handleEarnAchievementRef.current('PERFECT_LEVEL');
      }

      // Build objective progress
      const objectiveProgress: Record<string, number> = {};
      for (const obj of objectives) {
        objectiveProgress[obj.type] = obj.current ?? 0;
      }

      // Record attempt
      recordAttemptRef.current(
        levelConfig.world,
        levelConfig.level,
        gameState.wordsFound.length,
        gameState.score,
        timeRemaining,
        objectiveProgress,
        gameState.stars > 0
      );

      // Record completion
      recordCompletionRef.current({
        isCompletion: gameState.stars > 0,
        timeRemaining,
        timerSeconds: adjustedLevelConfig.timerSeconds,
        score: gameState.score,
        words: gameState.wordsFound.length,
      });

      // End AI director
      endAIDirectorRef.current();
    }, [
      gameState.isComplete,
      gameState.stars,
      gameState.wordsFound.length,
      gameState.score,
      timeRemaining,
      objectives,
      levelConfig.world,
      levelConfig.level,
      adjustedLevelConfig.timerSeconds,
    ]);

    const getPopupStartPosition = useCallback(() => {
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

    const calculateTileCenter = useCallback((row: number, col: number) => {
      if (!gridRef.current) return { x: 0, y: 0 };
      const gridRect = gridRef.current.getBoundingClientRect();
      const tileSize = gridRect.width / levelConfig.gridSize;
      return {
        x: gridRect.left + col * tileSize + tileSize / 2,
        y: gridRect.top + row * tileSize + tileSize / 2,
      };
    }, [levelConfig.gridSize]);

    useEffect(() => {
      const chainActivatedTiles = tiles.filter(
        tile => tile.activationEffect === 'link' && tile.activationTimestamp
      );

      if (chainActivatedTiles.length === 0) return;

      const chainTile = chainActivatedTiles[0];
      const position = calculateTileCenter(chainTile.row, chainTile.col);

      effects.setChainBurstConfig({
        trigger: true,
        position,
      });
    }, [tiles, calculateTileCenter, effects]);

    useEffect(() => {
      if (cascadePhase === 'removing' && lastSubmittedWordRef.current) {
        const { word, path } = lastSubmittedWordRef.current;

        if (path.length >= 3) {
          let centerX = 0;
          let centerY = 0;

          for (const pos of path) {
            const tileCenter = calculateTileCenter(pos.row, pos.col);
            centerX += tileCenter.x;
            centerY += tileCenter.y;
          }

          centerX /= path.length;
          centerY /= path.length;

          let intensity: 1 | 2 | 3 | 4 = 1;
          if (word.length >= 10) intensity = 4;
          else if (word.length >= 7) intensity = 3;
          else if (word.length >= 5) intensity = 2;

          effects.addExplosion({
            id: Date.now(),
            position: { x: centerX, y: centerY },
            intensity,
          });
        }

        lastSubmittedWordRef.current = null;
      }
    }, [cascadePhase, calculateTileCenter, effects]);

    const handlePauseToggle = useCallback(() => {
      if (isPaused) {
        startGame();
        setIsPaused(false);
      } else {
        pauseGame();
        setIsPaused(true);
      }
    }, [isPaused, startGame, pauseGame]);

    const handleTileSelect = useCallback(
      (index: number, _tile: GridTileState) => {
        if (!isPlaying || isPaused || isValidating) return;
        selectTile(index);
        resetOnGameAction();
      },
      [isPlaying, isPaused, isValidating, selectTile, resetOnGameAction]
    );

    const handleDragStart = useCallback(
      (index: number, _tile: GridTileState) => {
        if (!isPlaying || isPaused || isValidating) return;
        clearSelection();
        selectTile(index);
      },
      [isPlaying, isPaused, isValidating, clearSelection, selectTile]
    );

    const handleDragEnter = useCallback(
      (index: number, _tile: GridTileState) => {
        if (!isPlaying || isPaused || isValidating) return;
        selectTile(index);
      },
      [isPlaying, isPaused, isValidating, selectTile]
    );

    const handleWordSubmit = useCallback(
      async (submittedWord: string, submittedIndices: number[]) => {
        // Use explicitly passed word/indices (from Phaser or React grid),
        // falling back to React selection state for backward compatibility
        const word = submittedWord || currentWord;
        const indices = submittedIndices.length > 0 ? submittedIndices : selectedIndices;

        if (!isPlaying || isPaused || word.length < minWordLength || isValidating || isCascading) return;

        if (validationErrorTimeoutRef.current) {
          clearTimeout(validationErrorTimeoutRef.current);
          validationErrorTimeoutRef.current = null;
        }
        if (wordSubmittedTimeoutRef.current) {
          clearTimeout(wordSubmittedTimeoutRef.current);
          wordSubmittedTimeoutRef.current = null;
        }

        setValidationFeedback(prev => ({ ...prev, error: null }));

        // Convert flat indices to row/col path using gridSize
        const path = indices.map(i => ({
          row: Math.floor(i / levelConfig.gridSize),
          col: i % levelConfig.gridSize,
        }));
        const result = await validateWord(word, path);

        if (result.isValid && result.score) {
          const startPos = getPopupStartPosition();
          let scoreValue = Math.floor(result.score * upgradeBonuses.scoreBonus * getScoreMultiplier());

          let bossBonus: string | undefined;
          if (isBossActive && bossConfig) {
            const mechResult = checkBossWord(word);
            scoreValue = Math.floor(scoreValue * mechResult.scoreMultiplier);

            let baseDamage = Math.floor(scoreValue / 10);
            baseDamage = Math.floor(baseDamage * skillEffects.bossDamageMultiplier);
            baseDamage = Math.floor(baseDamage * skillEffects.getLongWordDamageMultiplier(word.length));

            const mechanicMultiplier = mechResult.meetsRequirement ? 2.0 : 1.0;
            const damageDealt = dealBossDamage(baseDamage, gameState.comboCount, mechanicMultiplier, skillEffects.comboMultiplierBonus);

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

          effects.addScorePopup({
            id: Date.now(),
            value: scoreValue,
            x: startPos.x,
            y: startPos.y,
            word,
            bonus: bossBonus || comboBonus,
          });

          setValidationFeedback({ error: null, isValid: true, wasSubmitted: true });
          setLastAccepted({ word, score: scoreValue });
          setWordFeedback({ id: `${Date.now()}`, type: 'accepted', word, score: scoreValue, timestamp: Date.now() });
          lastSubmittedWordRef.current = { word, path };

          submitWordWithPath(word, scoreValue, path);
          clearSelection();
          clearCurrentHint();
          recordActivity();
          resetOnGameAction();
          recordAIWord(true, gameState.comboCount);

          if (gameState.wordsFound.length === 0) {
            handleEarnAchievement('FIRST_WORD');
          }
          if (word.length >= 6) {
            handleEarnAchievement('LONG_WORD_6');
          }
          if (word.length >= 8) {
            handleEarnAchievement('LONG_WORD_8');
          }
          if (gameState.comboCount >= 5) {
            handleEarnAchievement('WORD_STREAK_5');
          }
          if (gameState.comboCount >= 10) {
            handleEarnAchievement('WORD_STREAK_10');
          }

          wordSubmittedTimeoutRef.current = setTimeout(() => {
            setValidationFeedback({ error: null, wasSubmitted: false, isValid: false });
            setLastAccepted(null);
            setWordFeedback(null);
          }, 1200);
        } else if (result.errorKey) {
          const errorMessage = t(result.errorKey) || result.errorKey;
          setValidationFeedback({ error: errorMessage, isValid: false, wasSubmitted: false });
          setWordFeedback({ id: `${Date.now()}`, type: 'rejected', word, message: errorMessage, timestamp: Date.now() });
          clearSelection();

          recordAIWord(false, 0);

          if (prevComboCountRef.current > 0) {
            handleAITransition();
          }

          if (isBossActive) {
            triggerBossTaunt('onBadWord');
          }

          validationErrorTimeoutRef.current = setTimeout(() => {
            setValidationFeedback(prev => ({ ...prev, error: null }));
            setWordFeedback(null);
          }, 2000);
        }
      },
      [isPlaying, isPaused, isValidating, isCascading, currentWord, selectedIndices, levelConfig.gridSize, validateWord, submitWordWithPath, clearSelection, t, getPopupStartPosition, gameState.comboCount, gameState.wordsFound, clearCurrentHint, recordActivity, resetOnGameAction, isBossActive, bossConfig, checkBossWord, triggerBossTaunt, dealBossDamage, minWordLength, upgradeBonuses.scoreBonus, skillEffects, handleEarnAchievement, recordAIWord, prevComboCountRef, handleAITransition, effects, getScoreMultiplier]
    );

    const handleLevelUpClose = useCallback(() => {
      setLevelUpData(null);
    }, []);

    const handleCinematicComplete = useCallback(() => {
      cinematics.handleCinematicComplete();
      setShowLevelComplete(true);
    }, [cinematics]);

    const handleContinue = useCallback(() => {
      setShowLevelComplete(false);
      onLevelComplete(gameState.stars, gameState.score);
    }, [gameState.stars, gameState.score, onLevelComplete]);

    const handleRetry = useCallback(() => {
      setShowLevelComplete(false);
      setHasAwardedLevelRewards(false);
      completionProcessedRef.current = false;
      clearSelection();
      resetGame();
      resetBossHealth();
      resetPlayerHealth();
      cinematics.resetCinematics();
      startGame();
    }, [resetGame, startGame, clearSelection, resetPlayerHealth, resetBossHealth, cinematics]);

    const handleExit = onExit;

    const handleHintClick = useCallback(() => {
      if (hasHintsAvailable) {
        getHint();
        dismissAutoHint();
      }
    }, [hasHintsAvailable, getHint, dismissAutoHint]);

    const hintHighlightIndices = useMemo(() => {
      if (hintData.level !== 'none' && hintData.highlightTiles && hintData.highlightTiles.length > 0) {
        return hintData.highlightTiles.map(pos => pos.row * levelConfig.gridSize + pos.col);
      }
      if (!currentHint?.path) return [];
      return currentHint.path.map(pos => pos.row * levelConfig.gridSize + pos.col);
    }, [hintData, currentHint, levelConfig.gridSize]);

    const handlePopupComplete = useCallback(() => {
      if (popupQueueTimeoutRef.current) {
        clearTimeout(popupQueueTimeoutRef.current);
        popupQueueTimeoutRef.current = null;
      }
      effects.handlePopupComplete();
    }, [effects]);

    useEffect(() => {
      if (popupQueueTimeoutRef.current) {
        clearTimeout(popupQueueTimeoutRef.current);
        popupQueueTimeoutRef.current = null;
      }

      if (effects.currentPopup) {
        const POPUP_MAX_DURATION_MS = 3000;
        popupQueueTimeoutRef.current = setTimeout(() => {
          effects.handlePopupComplete();
          popupQueueTimeoutRef.current = null;
        }, POPUP_MAX_DURATION_MS);
      }

      return () => {
        if (popupQueueTimeoutRef.current) {
          clearTimeout(popupQueueTimeoutRef.current);
          popupQueueTimeoutRef.current = null;
        }
      };
    }, [effects]);

    const starsEarned = gameState.stars;

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
        ref={effects.shakeRef}
        data-testid="adventure-game"
        role="main"
        aria-label="Adventure Mode Game"
        className="h-full w-full overflow-hidden relative"
      >
        {/* Background */}
        <GameplayBackground className="absolute inset-0 -z-10" />

        <GameLayout
          header={
            <GameHeader
              worldNumber={levelConfig.world}
              levelNumber={levelConfig.level}
              score={gameState.score}
              timeRemaining={timeRemaining}
              isPaused={isPaused}
              onPauseToggle={handlePauseToggle}
              onExit={handleExit}
            />
          }
          gridArea={
            <GameGridArea
              tiles={tiles}
              gridSize={levelConfig.gridSize}
              selectedIndices={selectedIndices}
              onTileSelect={handleTileSelect}
              onWordSubmit={handleWordSubmit}
              onDragStart={handleDragStart}
              onDragEnter={handleDragEnter}
              gridRef={gridRef}
              isInteractive={entryPhase === 'playing' && isPlaying && !isPaused && !isValidating}
              isDisabled={entryPhase !== 'playing' || !isPlaying || isPaused || isValidating}
              entryPhase={entryPhase}
              showCascade={entryPhase === 'cascade'}
              onCascadeComplete={handleCascadeComplete}
              hintHighlightIndices={hintHighlightIndices}
              pathPoints={pathPoints}
              validationError={validationFeedback.error}
              isValidating={isValidating}
              isWordValid={validationFeedback.isValid}
              wasWordSubmitted={validationFeedback.wasSubmitted}
              lastAccepted={lastAccepted}
              selectedLength={selectedIndices.length}
              minWordLength={minWordLength}
              wordFeedback={wordFeedback}
              currentWord={effectiveCurrentWord}
              comboCount={gameState.comboCount}
              earthquakeState={earthquakeState}
              fireRoundActive={fireRoundActive}
              hintLevel={hintData.level}
              onPhaserWordChange={setPhaserCurrentWord}
            />
          }
          sidebar={
            <GameSidebar
              objectives={objectives}
              showSlideIn={entryPhase === 'objectives'}
              onSlideInComplete={handleObjectivesComplete}
              hasHintsAvailable={hasHintsAvailable}
              onHintClick={handleHintClick}
              showAutoHint={showAutoHint}
              currentHint={currentHint}
              hintLevel={hintData.level}
              className="border-t-2 lg:border-t-0 lg:border-l-2 border-neo-black/30"
            />
          }
          overlays={
            <>
              {/* Earthquake Warning Overlay */}
              <EarthquakeWarning isVisible={earthquakeState === 'warning'} />

              {/* Fire Round Indicator */}
              <FireRoundIndicator
                isActive={fireRoundActive}
                remainingSeconds={fireRoundRemaining}
              />

              {/* Boss Battle Overlay */}
              <BossOverlay
                boss={bossConfig}
                maxHP={isBossLevel ? 100 : 0}
                healthState={bossHealthState}
                currentTaunt={bossTaunt}
                showTaunt={showBossTaunt}
                showIntro={showBossIntro}
                onStartBattle={handleBossIntroStart}
                onSkipIntro={handleBossIntroSkip}
                showVictory={showLevelComplete && bossHealthState.phase === 'victory'}
                showDefeat={showLevelComplete && (bossHealthState.phase === 'defeat' || playerHealthState.isDead)}
                stars={starsEarned}
                score={gameState.score}
                wordsFound={gameState.wordsFound}
                gameState={gameState}
                onContinue={handleContinue}
                onRetry={handleRetry}
                worldNumber={levelConfig.world}
                effectCallbacks={bossEffectCallbacks}
              />

              {/* Player Health Bar (Boss levels only) */}
              {isBossLevel && isBossActive && !showBossIntro && !showLevelComplete && !playerHealthState.isDead && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 px-4 w-full max-w-md">
                  <PlayerHealthBar healthState={playerHealthState} />
                </div>
              )}

              {/* Pause Overlay */}
              <PauseOverlay
                isOpen={isPaused && !showLevelComplete}
                onResume={handlePauseToggle}
                onRestart={handleRetry}
                onExit={handleExit}
              />

              {/* Level Entry Overlay */}
              <LevelEntryOverlay
                levelNumber={levelConfig.level}
                worldNumber={levelConfig.world}
                isVisible={entryPhase === 'title'}
                onComplete={handleTitleComplete}
              />

              {/* Victory Cinematic */}
              {cinematics.showVictoryCinematic && (
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
                  cinematicType="victory"
                />
              )}

              {/* Defeat Cinematic */}
              {cinematics.showDefeatCinematic && (
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
                  cinematicType="defeat"
                />
              )}

              {/* Level Complete Modal */}
              {!isBossLevel && (
                <LevelCompleteModal
                  isOpen={showLevelComplete && cinematics.cinematicComplete}
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

              {/* Visual Effects */}
              <AdventureEffectsLayer
                currentPopup={effects.currentPopup}
                onPopupComplete={handlePopupComplete}
                scoreDisplayRef={effects.scoreDisplayRef}
                reaction={effects.reaction}
                onDismissReaction={effects.dismissReaction}
                chainBurstConfig={effects.chainBurstConfig}
                onChainBurstComplete={() => effects.setChainBurstConfig(null)}
                world={levelConfig.world}
                particleConfig={effects.particleConfig}
                onParticleComplete={() => effects.setParticleConfig(null)}
                pendingExplosions={effects.pendingExplosions}
                onExplosionComplete={effects.removeExplosion}
                levelUpData={levelUpData}
                onLevelUpClose={handleLevelUpClose}
                currentMilestone={currentMilestone}
                isBossLevel={isBossLevel}
                showBossFireworks={showBossFireworks}
                defeatedBossTier={defeatedBossTier}
              />
            </>
          }
        />
      </div>
    );
  }
);

AdventureGame.displayName = 'AdventureGame';

export default AdventureGame;
