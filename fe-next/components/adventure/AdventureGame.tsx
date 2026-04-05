/** AdventureGame — Main orchestrator for adventure mode gameplay. */
'use client';

import React, { memo, useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { usePreviousValue } from '@/hooks/usePreviousValue';
import { useLanguage } from '@/contexts/LanguageContext';
import { useProgression } from '@/contexts/ProgressionContext';
import { useAdventureGame } from '@/hooks/useAdventureGame';
import { useAdventureWordValidation } from '@/hooks/useAdventureWordValidation';
import { useAdventureSelection } from '@/hooks/useAdventureSelection';
import { useAdventureHints } from '@/hooks/useAdventureHints';
import { useAdventureEffects } from './effects/hooks/useAdventureEffects';
import { useAdventureCinematics } from './hooks/useAdventureCinematics';
import { useAdventureEntryPhase } from './hooks/useAdventureEntryPhase';
import { useAdventureGameInit } from './hooks/useAdventureGameInit';
import { useAdventureWordSubmit } from './hooks/useAdventureWordSubmit';
import { useAdventureLevelCompletion } from './hooks/useAdventureLevelCompletion';
import { useAdventureBossOrchestration } from './hooks/useAdventureBossOrchestration';
import { useLexiStuckDetection } from '@/hooks/useLexiStuckDetection';
import { useGemDetectorHighlights } from '@/hooks/useGemDetectorHighlights';
import { useFlashChallenge } from '@/hooks/useFlashChallenge';
import { useDailyQuests } from '@/hooks/useDailyQuests';
import { useChapterQuests } from '@/hooks/useChapterQuests';
import { getChapterNumber } from '@/lib/adventure/questConfig';
import { getMasteryAura } from '@/lib/adventure/powerGrowth';
import { applyGemDetectorBoost, LEVELS_PER_WORLD } from '@/lib/adventure';
import { getStoryBeat } from '@/lib/adventure/storyConfig';
import GameplayBackground from './themed/GameplayBackground';
import { GameHeader, GameSidebar, GameGridArea, GameLayout } from './ui';
import AdventureGameOverlays from './AdventureGameOverlays';
import RetryAssistModal from './RetryAssistModal';
import { AdventureTutorial, hasSeenTutorial } from './AdventureTutorial';
import { useAdventureGameCallbacks } from './hooks/useAdventureGameCallbacks';
import { useAdventureQuestTracking } from './hooks/useAdventureQuestTracking';
import { useAdventureGridInteraction } from './hooks/useAdventureGridInteraction';
import { useCrazyGamesLifecycle } from '@/hooks/useCrazyGamesLifecycle';
import { useCrazyGamesAds } from '@/hooks/useCrazyGamesAds';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useAdventureKeyboardShortcuts } from './hooks/useAdventureKeyboardShortcuts';
import { useAdventureSFX, useAdventureAnalytics } from './hooks/useAdventureSFXAndAnalytics';
import { useAdventureMusic } from '@/hooks/useAdventureMusic';
import type { LevelConfig, TileState, GridTileState } from '@/types/adventure';

export interface GameTimerState { timeRemaining: number; totalTime: number; isPlaying: boolean; isPaused: boolean; }

interface AdventureGameProps {
  levelConfig: LevelConfig;
  initialGrid: string[][];
  onLevelComplete: (stars: number, score: number, wordsFound: number, goldEarned: number, longWords?: number) => void;
  onExit: () => void;
  onTimerStateChange?: (timerState: GameTimerState) => void;
  totalStars?: number;
  /** Callback to navigate to world map (used on last level of world) */
  onNextWorld?: () => void;
}

interface LastReportedTimerState { isPlaying: boolean; isPaused: boolean; phase: string; timeRemaining: number; }

function flattenTiles(tiles2D: TileState[][]): GridTileState[] {
  const flat: GridTileState[] = [];
  for (let row = 0; row < tiles2D.length; row++) {
    for (let col = 0; col < tiles2D[row].length; col++) {
      flat.push({ ...tiles2D[row][col], id: `tile-${row}-${col}`, row, col });
    }
  }
  return flat;
}

function useMemoizedFlatTiles(tiles2D: TileState[][], tilesVersion: number): GridTileState[] {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => flattenTiles(tiles2D), [tilesVersion]);
}

const AdventureGame = memo<AdventureGameProps>(
  ({ levelConfig, initialGrid, onLevelComplete, onExit, onTimerStateChange, totalStars, onNextWorld }) => {
    const isValidConfig = levelConfig.gridSize > 0 && levelConfig.objectives.length > 0;
    const init = useAdventureGameInit({ world: levelConfig.world, level: levelConfig.level, timerSeconds: levelConfig.timerSeconds ?? 120 });

    const boostedLevelConfig = useMemo(() => {
      const { specialTileBoost, guaranteedGoldTile } = init.upgradeEffects;
      if (specialTileBoost <= 0 && !guaranteedGoldTile) return init.adjustedLevelConfig;
      return {
        ...init.adjustedLevelConfig,
        specialTiles: applyGemDetectorBoost(
          init.adjustedLevelConfig.specialTiles,
          init.adjustedLevelConfig.gridSize,
          specialTileBoost,
          guaranteedGoldTile
        ),
      };
    }, [init.adjustedLevelConfig, init.upgradeEffects]);
    const { t, language } = useLanguage();
    const {
      playWordAcceptedSound, playComboSound, setGameActive, playCountdownBeep,
      playLevelUpSound, playBossEntranceSound, playBossHitSound, playBossPhaseChangeSound,
      playBossDefeatSound, playTimerUrgentSound,
      playCoinCollectSound, playQuestCompleteSound, playBoardShuffleSound,
      playBossDefeatLegendarySound, playLegendaryWordSound,
      playFlashChallengeSound,
    } = useSoundEffects();

    const {
      gameState, tiles: tiles2D, tilesVersion, objectives, timeRemaining,
      timerStore,
      isPlaying, submitWordWithPath, startGame, pauseGame, completeLevel,
      resetGame, markCascadeComplete, isCascading, cascadePhase, addTime,
      activateFreeze, isFrozen, freezeUsed, useShuffle: shuffleTiles, shufflesRemaining, updateObjective,
      effectiveComboTimeout,
    } = useAdventureGame({
      levelConfig: boostedLevelConfig, initialGrid,
      comboDecayMultiplier: init.upgradeEffects.comboDecayMultiplier * init.runeEffects.comboDecay,
      upgradeConfig: {
        bombTimerInvert: init.upgradeEffects.bombTimerInvert,
        specialTileBoost: init.upgradeEffects.specialTileBoost,
        guaranteedGoldTile: init.upgradeEffects.guaranteedGoldTile,
        shuffleUses: init.upgradeEffects.shuffleUsesPerLevel,
        iceTileReduction: init.upgradeEffects.iceTileReduction,
      },
      language: language || 'en',
    });

    const tiles = useMemoizedFlatTiles(tiles2D, tilesVersion);
    const { recordAttempt, getLevelAttempt, getLevelCompletion, progression, updateWordAlbum, completeLevel: persistCompletion } = useProgression();
    // Wrap to ensure correct return type for saveCompletion prop
    const saveCompletionToDb = useCallback(
      async (world: number, level: number, stars: 0 | 1 | 2 | 3, score: number, words: number, goldEarned?: number, longWords?: number): Promise<boolean> => {
        const result = await persistCompletion(world, level, stars, score, words, goldEarned, longWords);
        return result ?? false;
      },
      [persistCompletion]
    );
    const bestAttempt = useMemo(
      () => getLevelAttempt(levelConfig.world, levelConfig.level),
      [getLevelAttempt, levelConfig.world, levelConfig.level]
    );
    const previousBestStars = useMemo(
      () => getLevelCompletion?.(levelConfig.world, levelConfig.level)?.stars ?? 0,
      [getLevelCompletion, levelConfig.world, levelConfig.level]
    );

    const [isPaused, setIsPaused] = useState(false);
    const [showLevelComplete, setShowLevelComplete] = useState(false);
    const [showLootChest, setShowLootChest] = useState(false);
    const [retriesUsed, setRetriesUsed] = useState(0);
    const [showStoryBeat, setShowStoryBeat] = useState(false);
    const [showTutorial, setShowTutorial] = useState(() => !hasSeenTutorial());
    const [detonateActive, setDetonateActive] = useState(false);
    const masteryAura = useMemo(() => getMasteryAura(init.currentLevel), [init.currentLevel]);
    const storyBeat = useMemo(() => getStoryBeat(levelConfig.world, levelConfig.level), [levelConfig.world, levelConfig.level]);
    const cinematics = useAdventureCinematics();
    const entryPhaseManager = useAdventureEntryPhase();
    const { entryPhase } = entryPhaseManager;
    const isBossLevel = !!levelConfig.isBossLevel;

    const bossOrch = useAdventureBossOrchestration({
      isBossLevel, worldId: levelConfig.world, levelNumber: levelConfig.level,
      showBossIntroConfig: levelConfig.showBossIntro === true,
      timeRemaining, isPlaying, startGame, startAIDirector: init.startAIDirector,
      addTime, shake: (intensity: number) => effects.shake(intensity),
      bossDamageMultiplier: init.upgradeEffects.bossDamageMultiplier,
      blockFirstAttack: init.upgradeEffects.blockFirstAttack,
      scrambleImmunity: init.upgradeEffects.scrambleImmunity,
    });

    const [lastWordTileTypes, setLastWordTileTypes] = useState<string[]>([]);
    const prevWordsFoundLen = usePreviousValue(gameState.wordsFound.length);
    useEffect(() => {
      if (prevWordsFoundLen !== undefined && gameState.wordsFound.length > prevWordsFoundLen) {
        const activatedTypes = tiles.filter(t => t.activationEffect).map(t => t.type);
        setLastWordTileTypes(activatedTypes);
      }
    }, [gameState.wordsFound.length, prevWordsFoundLen, tiles]);

    // Flash challenges disabled during boss fights — boss mechanics are the challenge
    const flashChallenge = useFlashChallenge({
      worldId: levelConfig.world,
      totalTimeSeconds: levelConfig.timerSeconds ?? 120,
      timeRemaining: isBossLevel ? 999 : timeRemaining,
      wordsFound: gameState.wordsFound,
      isPlaying: !isBossLevel && isPlaying && entryPhase === 'playing' && !isPaused,
      lastWordTileTypes,
      locale: language,
    });

    // Play sound when a new flash challenge appears
    const prevChallengeIdRef = useRef<string | null>(null);
    useEffect(() => {
      if (flashChallenge.activeChallenge && flashChallenge.activeChallenge.id !== prevChallengeIdRef.current) {
        prevChallengeIdRef.current = flashChallenge.activeChallenge.id;
        playFlashChallengeSound();
      }
      if (!flashChallenge.activeChallenge) {
        prevChallengeIdRef.current = null;
      }
    }, [flashChallenge.activeChallenge, playFlashChallengeSound]);

    const hasAwardedFlashGoldRef = useRef(false);
    useEffect(() => {
      if (flashChallenge.isChallengeComplete && flashChallenge.activeChallenge && !hasAwardedFlashGoldRef.current) {
        hasAwardedFlashGoldRef.current = true;
        init.addGold(flashChallenge.activeChallenge.rewardCoins);
        playCoinCollectSound();
      }
      if (!flashChallenge.isChallengeComplete) {
        hasAwardedFlashGoldRef.current = false;
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [flashChallenge.isChallengeComplete, flashChallenge.activeChallenge, init.addGold]);

    const { recordProgress: recordQuestProgress } = useDailyQuests({
      initialProgress: progression?.dailyQuestProgress,
      lastQuestDate: progression?.dailyQuestDate,
    });
    const chapterNumber = getChapterNumber(levelConfig.level);
    const chapterQuests = useChapterQuests({ worldId: levelConfig.world, chapterNumber });

    useAdventureQuestTracking({
      wordsFound: gameState.wordsFound, comboCount: gameState.comboCount,
      isBossLevel, bossCurrentHP: bossOrch.bossCurrentHP, bossMaxHP: bossOrch.bossMaxHP,
      playerCurrentHP: bossOrch.playerHealthState.currentHP, playerMaxHP: bossOrch.playerHealthState.maxHP,
      gridEffectTrigger: bossOrch.gridEffectTrigger,
      isChallengeComplete: flashChallenge.isChallengeComplete,
      recordQuestProgress, chapterQuests, updateObjective,
    });

    useAdventureSFX({
      isPlaying, timeRemaining, wordsFoundLength: gameState.wordsFound.length,
      prevWordsFoundLen, comboCount: gameState.comboCount,
      sfx: {
        setGameActive, playCountdownBeep, playWordAcceptedSound, playComboSound,
        playLevelUpSound, playBossEntranceSound, playBossHitSound, playBossPhaseChangeSound,
        playBossDefeatSound, playTimerUrgentSound, playBossDefeatLegendarySound, playLegendaryWordSound,
      },
      isBossLevel,
      showBossIntro: bossOrch.showBossIntro,
      showBossFireworks: bossOrch.showBossFireworks,
      bossHealthPhase: bossOrch.bossHealthState.phase,
      bossCurrentHP: bossOrch.bossCurrentHP,
      // showLevelComplete acts as non-boss level completion trigger
      nonBossCompleted: !isBossLevel && showLevelComplete,
      gameStars: gameState.stars,
      lastWordLength: gameState.wordsFound.length > 0 ? gameState.wordsFound[gameState.wordsFound.length - 1]?.length : undefined,
    });
    // In-game music: AdventureGame owns this so timer-driven track switches
    // never cause AdventureView to re-render.
    useAdventureMusic({
      worldNumber: levelConfig.world,
      isPlaying: isPlaying && entryPhase === 'playing' && !isPaused,
      isPaused,
      timeRemaining,
      totalTime: init.adjustedLevelConfig.timerSeconds,
      enabled: true,
      isBossLevel,
    });
    useCrazyGamesLifecycle({
      isGameActive: isPlaying && entryPhase === 'playing' && !isPaused,
      isGameOver: gameState.isComplete,
      isWinner: (gameState.stars ?? 0) >= 1,
      score: gameState.score,
      maxCombo: gameState.comboCount,
      wordsFound: gameState.wordsFound.length,
    });
    // Show midgame ad between adventure levels (natural break point)
    const { requestMidgameAd: cgRequestMidgameAd } = useCrazyGamesAds();
    const prevIsCompleteRef = useRef(false);
    useEffect(() => {
      if (gameState.isComplete && !prevIsCompleteRef.current) {
        cgRequestMidgameAd();
      }
      prevIsCompleteRef.current = gameState.isComplete;
    }, [gameState.isComplete, cgRequestMidgameAd]);

    const getScoreMultiplier = useCallback(() => 1, []);
    const augmentedSkillEffects = useMemo(() => ({
      ...init.skillEffects,
      bossDamageMultiplier: init.skillEffects.bossDamageMultiplier * init.runeEffects.bossDamage,
    }), [init.skillEffects, init.runeEffects.bossDamage]);

    const minWordLength = levelConfig.minWordLength ?? 2;
    const { validateWord, isValidating } = useAdventureWordValidation({
      grid: initialGrid, language: language || 'en', minWordLength, foundWords: gameState.wordsFound, tiles: tiles2D,
    });
    const gridRef = useRef<HTMLDivElement>(null);
    const clickSubmitRef = useRef<(word: string, indices: number[]) => void>(null);
    const handleClickSubmit = useCallback((word: string, indices: number[]) => {
      clickSubmitRef.current?.(word, indices);
    }, []);
    const { selectedIndices, currentWord, selectTile, clearSelection, pathPoints, adjacentIndices } = useAdventureSelection({
      tiles, gridSize: levelConfig.gridSize, disabled: !isPlaying || isPaused, gridRef,
      onClickSubmit: handleClickSubmit,
    });

    const handleSpendGold = useCallback((amount: number): boolean => {
      if (init.gold < amount) return false;
      init.addGold(-amount);
      return true;
      // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally using init.gold and init.addGold, not the whole init object
    }, [init.gold, init.addGold]);

    const { hasHintsAvailable, getHint, currentHint, clearCurrentHint, recordActivity, showAutoHint, dismissAutoHint, remainingHintWords, findPathForWord, nextHintCost } = useAdventureHints({
      grid: initialGrid, language: language || 'en', foundWords: gameState.wordsFound,
      isPlaying: isPlaying && entryPhase === 'playing' && !isPaused, inactivityThresholdMs: init.adjustedInactivityThresholdMs,
      maxHintsPerLevel: init.upgradeEffects.hintsPerLevel + init.upgradeEffects.bonusHintsPerLevel,
      freeHintsPerLevel: init.upgradeEffects.hintsPerLevel,
      onSpendGold: handleSpendGold,
    });

    // Gem Detector upgrade: highlight starting tiles of highest-scoring available words
    const gemDetectorLevel = init.upgrades.gemDetector ?? 0;
    const gemDetectorHighlights = useGemDetectorHighlights({
      gemDetectorLevel,
      remainingWords: remainingHintWords,
      findPathForWord,
      gridSize: levelConfig.gridSize,
    });

    const isModalOpen = showLevelComplete || cinematics.showVictoryCinematic || cinematics.showDefeatCinematic || bossOrch.showBossIntro || bossOrch.showBossFireworks;
    const { resetOnGameAction } = useLexiStuckDetection({
      onStuck: () => { if (hasHintsAvailable) { getHint(); dismissAutoHint(); } },
      isPlaying: isPlaying && entryPhase === 'playing', isPaused, isModalOpen, isBossLevel,
    });

    const lexiGameState = useMemo(() => ({
      wordsFound: gameState.wordsFound, comboCount: gameState.comboCount, timeRemaining,
      isComplete: gameState.isComplete, stars: gameState.stars, worldId: levelConfig.world,
    }), [gameState.wordsFound, gameState.comboCount, gameState.isComplete, gameState.stars, levelConfig.world, timeRemaining]);

    const effects = useAdventureEffects({
      gameStateForReactions: { gameState: lexiGameState, isPlaying: isPlaying && entryPhase === 'playing' && !isPaused },
    });

    const getPopupStartPosition = useCallback(() => {
      if (selectedIndices.length === 0) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      const el = gridRef.current?.querySelectorAll('[role="gridcell"]')[selectedIndices[selectedIndices.length - 1]];
      if (el) { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
      return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    }, [selectedIndices, gridRef]);

    const wordSubmit = useAdventureWordSubmit({
      isPlaying, isPaused, isValidating, isCascading, currentWord, selectedIndices, tiles,
      gridSize: levelConfig.gridSize, minWordLength, validateWord, submitWordWithPath,
      clearSelection, clearCurrentHint, recordActivity, resetOnGameAction,
      comboCount: gameState.comboCount, wordsFound: gameState.wordsFound,
      isBossActive: bossOrch.isBossActive, bossConfig: bossOrch.bossConfig,
      checkBossWord: bossOrch.checkBossWord, dealBossDamage: bossOrch.dealBossDamage,
      triggerBossTaunt: bossOrch.triggerBossTaunt, handleEarnAchievement: init.handleEarnAchievement,
      recordAIWord: init.recordAIWord, handleAITransition: init.handleAITransition,
      addScorePopup: effects.addScorePopup, getScoreMultiplier,
      upgradeBonuses: init.upgradeBonuses, skillEffects: augmentedSkillEffects,
      worldMechanic: levelConfig.worldMechanic ?? null,
      bossCurrentPhase: (bossOrch.bossMechanicState?.mechanicState?.currentPhase as string) ?? null,
      bossHealPerWord: init.upgradeEffects.bossHealPerWord,
      healPlayerHealth: bossOrch.isBossActive ? bossOrch.healPlayer : undefined,
      detonateActive,
      t, getPopupStartPosition,
    });

    clickSubmitRef.current = wordSubmit.handleWordSubmit;

    const levelCompletion = useAdventureLevelCompletion({
      gameState, timeRemaining, timerSeconds: init.adjustedLevelConfig.timerSeconds,
      levelConfig, objectives, currentLevel: init.currentLevel,
      upgradeBonuses: init.upgradeBonuses, upgradeEffects: init.upgradeEffects,
      bonusGoldMultiplier: init.runeEffects.goldMultiplier * init.streakMultiplier,
      isFirstCompletion: !bestAttempt,
      awardXp: init.awardXp, addGold: init.addGold,
      recordAttempt, recordCompletion: init.recordCompletion, saveCompletion: saveCompletionToDb, updateWordAlbum,
      endAIDirector: init.endAIDirector, handleEarnAchievement: init.handleEarnAchievement,
      pauseGame, completeLevel, showVictory: cinematics.showVictory, showDefeat: cinematics.showDefeat,
      showLevelComplete, showVictoryCinematic: cinematics.showVictoryCinematic,
      showDefeatCinematic: cinematics.showDefeatCinematic, isBossLevel,
      isBossActive: bossOrch.isBossActive, bossHealthPhase: bossOrch.bossHealthState.phase,
      playerIsDead: bossOrch.playerHealthState.isDead, endBossBattle: bossOrch.endBossBattle,
      triggerBossTaunt: bossOrch.triggerBossTaunt,
      playerHealthPercent: bossOrch.playerHealthState.maxHP > 0 ? Math.round((bossOrch.playerHealthState.currentHP / bossOrch.playerHealthState.maxHP) * 100) : 100,
      flashChallengeGold: flashChallenge.isChallengeComplete && flashChallenge.activeChallenge
        ? flashChallenge.activeChallenge.rewardCoins : undefined,
    });
    const lastReportedStateRef = useRef<LastReportedTimerState | null>(null);
    useEffect(() => {
      const actuallyPlaying = isPlaying && entryPhase === 'playing';
      const lastState = lastReportedStateRef.current;
      const isSignificantChange = !lastState ||
        lastState.isPlaying !== actuallyPlaying || lastState.isPaused !== isPaused ||
        lastState.phase !== entryPhase ||
        Math.floor(lastState.timeRemaining / 5) !== Math.floor(timeRemaining / 5) ||
        timeRemaining <= 10;

      if (isSignificantChange && onTimerStateChange) {
        lastReportedStateRef.current = { isPlaying: actuallyPlaying, isPaused, phase: entryPhase, timeRemaining };
        onTimerStateChange({ timeRemaining, totalTime: init.adjustedLevelConfig.timerSeconds, isPlaying: actuallyPlaying, isPaused });
      }
    }, [timeRemaining, isPlaying, isPaused, entryPhase, onTimerStateChange, init.adjustedLevelConfig.timerSeconds]);

    useEffect(() => {
      if (isPlaying && entryPhase === 'playing' && !isPaused) {
        init.checkMilestone(gameState.comboCount);
      }
      wordSubmit.prevComboCountRef.current = gameState.comboCount;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameState.comboCount, isPlaying, entryPhase, isPaused, init]);

    // Auto-pause when tab/app goes to background (prevents timer drain on mobile)
    useEffect(() => {
      const handleVisibilityChange = () => {
        if (document.hidden && isPlaying && entryPhase === 'playing' && !isPaused) {
          pauseGame();
          setIsPaused(true);
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [isPlaying, entryPhase, isPaused, pauseGame]);

    const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => () => { if (hintTimerRef.current) clearTimeout(hintTimerRef.current); }, []);

    const handleCascadeComplete = useCallback(() => {
      markCascadeComplete();
      entryPhaseManager.advanceToPlaying();
      if (!isPlaying) { startGame(); init.startAIDirector(); }
      if (init.upgradeEffects.freeStartHint) {
        hintTimerRef.current = setTimeout(() => { hintTimerRef.current = null; getHint(); }, 500);
      }
    }, [markCascadeComplete, entryPhaseManager, isPlaying, startGame, init, getHint]);

    const handleEntryPhaseComplete = useCallback(() => {
      entryPhaseManager.advanceToPlaying();
      if (!isPlaying) { startGame(); init.startAIDirector(); }
    }, [entryPhaseManager, isPlaying, startGame, init]);

    const gridInteraction = useAdventureGridInteraction({
      isPlaying, isPaused, isValidating, selectTile, clearSelection,
      resetOnGameAction, startGame, pauseGame, setIsPaused,
      selectedIndices, currentWord, handleWordSubmit: wordSubmit.handleWordSubmit,
      tiles, cascadePhase, lastSubmittedWordRef: wordSubmit.lastSubmittedWordRef,
      gridRef, gridSize: levelConfig.gridSize, effects,
    });

    const showLootOrComplete = useCallback(() => {
      if (levelCompletion.lootDrops.length > 0 && gameState.stars > 0) {
        setShowLootChest(true);
      } else {
        setShowLevelComplete(true);
      }
    }, [levelCompletion.lootDrops, gameState.stars]);

    const { resetTracking } = useAdventureAnalytics({
      isPlaying, entryPhase, worldNumber: levelConfig.world, levelNumber: levelConfig.level,
      gameStars: gameState.stars, gameScore: gameState.score,
      nonBossCompleted: levelCompletion.nonBossCompleted,
      showVictoryCinematic: cinematics.showVictoryCinematic,
      showDefeatCinematic: cinematics.showDefeatCinematic,
      consecutiveFailures: (bestAttempt?.consecutiveFailures ?? 0) + 1,
    });

    useEffect(() => {
      if (levelCompletion.nonBossCompleted) {
        showLootOrComplete();
      }
    }, [levelCompletion.nonBossCompleted, showLootOrComplete]);

    const handleStoryBeatContinue = useCallback(() => {
      setShowStoryBeat(false);
      showLootOrComplete();
    }, [showLootOrComplete]);

    const handleLootChestComplete = useCallback(() => {
      setShowLootChest(false);
      setShowLevelComplete(true);
    }, []);

    const hintsUsedRef = useRef(0);
    const { handleCinematicComplete, handleContinue, handleRetry: handleRetryBase } = useAdventureGameCallbacks({
      gameStars: gameState.stars, gameScore: gameState.score,
      wordsFoundList: gameState.wordsFound, comboCount: gameState.comboCount,
      isBossLevel, worldNumber: levelConfig.world, levelNumber: levelConfig.level,
      bossHealthPhase: bossOrch.bossHealthState.phase,
      playerHealthCurrentHP: bossOrch.playerHealthState.currentHP,
      playerHealthMaxHP: bossOrch.playerHealthState.maxHP,
      resetBossHealth: bossOrch.resetBossHealth, resetPlayerHealth: bossOrch.resetPlayerHealth,
      showVictoryCinematic: cinematics.showVictoryCinematic,
      showWorldUnlockCinematic: cinematics.showWorldUnlockCinematic,
      handleCinematicCompleteBase: cinematics.handleCinematicComplete,
      showWorldUnlock: cinematics.showWorldUnlock, resetCinematics: cinematics.resetCinematics,
      earnedGold: levelCompletion.earnedGold, resetRewards: levelCompletion.resetRewards,
      recordLevelPerfect: chapterQuests.recordLevelPerfect,
      recordBossDefeatedNoHint: chapterQuests.recordBossDefeatedNoHint,
      recordScoreChallenge: chapterQuests.recordScoreChallenge,
      recordBossHighHealth: chapterQuests.recordBossHighHealth,
      recordFullComboLevel: chapterQuests.recordFullComboLevel,
      handleEarnAchievement: init.handleEarnAchievement,
      upgradeRetryScoreRetention: init.upgradeEffects.retryScoreRetention,
      onLevelComplete, totalStars, clearSelection, resetGame, startGame,
      storyBeat, showLootOrComplete,
      setShowLevelComplete, setRetriesUsed, setShowStoryBeat,
      t, hintsUsed: hintsUsedRef.current,
      resetWordSubmitState: wordSubmit.resetWordSubmitState,
      resetFlashChallenge: flashChallenge.reset,
      completionSaveFailedRef: levelCompletion.completionSaveFailedRef,
      retrySaveCompletion: saveCompletionToDb,
    });

    const handleRetry = useCallback(() => {
      hintsUsedRef.current = 0;
      hasAwardedFlashGoldRef.current = false;
      resetTracking();
      setLastWordTileTypes([]);
      handleRetryBase();
    }, [handleRetryBase, resetTracking]);

    // RetryAssistModal — progressive assists for consecutive failures
    const [showRetryAssist, setShowRetryAssist] = useState(false);
    const consecutiveFailures = (bestAttempt?.consecutiveFailures ?? 0) + (showLevelComplete && gameState.stars === 0 ? 1 : 0);

    // Show RetryAssistModal after defeat cinematic when player has failed multiple times
    useEffect(() => {
      if (showLevelComplete && gameState.stars === 0 && consecutiveFailures >= 2) {
        setShowRetryAssist(true);
      }
    }, [showLevelComplete, gameState.stars, consecutiveFailures]);

    const handleRetryWithBonus = useCallback(() => {
      setShowRetryAssist(false);
      addTime(15); // 15 second bonus
      handleRetry();
    }, [handleRetry, addTime]);

    const handleRetryWithHint = useCallback(() => {
      setShowRetryAssist(false);
      handleRetry();
      // Hint will be auto-triggered after game starts via a short delay
      setTimeout(() => { if (getHint) getHint(); }, 1500);
    }, [handleRetry, getHint]);

    const handleRetryFromAssist = useCallback(() => {
      setShowRetryAssist(false);
      handleRetry();
    }, [handleRetry]);

    const [hintGoldPending, setHintGoldPending] = useState(false);
    const executeHintAction = useCallback(() => {
      getHint(); dismissAutoHint(); hintsUsedRef.current += 1;
      setHintGoldPending(false);
    }, [getHint, dismissAutoHint]);

    const handleHintClick = useCallback(() => {
      if (!hasHintsAvailable) return;
      // Confirm gold spend when hint isn't free
      if (nextHintCost > 0 && !hintGoldPending) {
        setHintGoldPending(true);
        // Auto-dismiss after 5s — track timer to prevent setState on unmount
        if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
        hintTimerRef.current = setTimeout(() => setHintGoldPending(false), 5000);
        return;
      }
      executeHintAction();
    }, [hasHintsAvailable, nextHintCost, hintGoldPending, executeHintAction]);

    const hintHighlightIndices = useMemo(() => {
      if (init.hintData.level !== 'none' && (init.hintData.highlightTiles?.length ?? 0) > 0) {
        return init.hintData.highlightTiles!.map(pos => pos.row * levelConfig.gridSize + pos.col);
      }
      // Time Freeze T2: highlight longest findable word while frozen
      if (isFrozen && init.upgradeEffects.freezeHighlightsWord && remainingHintWords.length > 0) {
        const longestWord = remainingHintWords.reduce((a, b) => b.length > a.length ? b : a, '');
        const path = findPathForWord(longestWord);
        if (path) return path.map(pos => pos.row * levelConfig.gridSize + pos.col);
      }
      if (currentHint?.path) {
        return currentHint.path.map(pos => pos.row * levelConfig.gridSize + pos.col);
      }
      // Gem Detector: subtly highlight starting tiles of high-value words
      if (gemDetectorHighlights.length > 0) {
        return gemDetectorHighlights;
      }
      return [];
    }, [init.hintData, currentHint, levelConfig.gridSize, isFrozen, init.upgradeEffects.freezeHighlightsWord, remainingHintWords, findPathForWord, gemDetectorHighlights]);


    // Exit confirmation — prevents accidental game loss from stray taps
    const handleExitWithConfirm = useCallback(() => {
      // Skip confirmation if game is already complete
      if (showLevelComplete) { onExit(); return; }
      if (window.confirm(t('adventure.game.confirmExitDesc'))) onExit();
    }, [onExit, showLevelComplete, t]);

    useAdventureKeyboardShortcuts({
      entryPhase, showLevelComplete, hasHintsAvailable, onHintClick: handleHintClick,
      freezeUsed, timeFreezeSeconds: init.upgradeEffects.timeFreezeSeconds,
      activateFreeze, shufflesRemaining, shuffleTiles,
      canDetonateWords: init.upgradeEffects.canDetonateWords,
      setDetonateActive, handlePauseToggle: gridInteraction.handlePauseToggle,
    });

    if (!isValidConfig) {
      return (
        <div data-testid="adventure-game" role="main" className="flex items-center justify-center h-full">
          <p className="text-neo-red font-bold">{t('adventure.loadError')}</p>
        </div>
      );
    }

    return (
      <div ref={effects.shakeRef} data-testid="adventure-game" data-adventure-game role="main" aria-label={t('adventure.game.title')} className="h-full w-full overflow-hidden relative" style={{ '--mastery-aura': masteryAura } as React.CSSProperties}>
        <GameplayBackground className="absolute inset-0 -z-10" />
        <GameLayout
          isBossActive={isBossLevel && bossOrch.isBossActive && !bossOrch.showBossIntro && !showLevelComplete}
          header={
            <GameHeader worldNumber={levelConfig.world} levelNumber={levelConfig.level}
              score={gameState.score} timerStore={timerStore} isPaused={isPaused}
              onPauseToggle={gridInteraction.handlePauseToggle} onExit={handleExitWithConfirm}
              gold={init.gold} xpProgress={init.xpProgress.progressPercent / 100}
              isBossLevel={isBossLevel} elapsedTime={isBossLevel ? timeRemaining : undefined}
              comboCount={gameState.comboCount} comboTimeoutMs={effectiveComboTimeout} />
          }
          gridArea={
            <GameGridArea tiles={tiles} gridSize={levelConfig.gridSize}
              selectedIndices={selectedIndices} onTileSelect={gridInteraction.handleTileSelect}
              onWordSubmit={wordSubmit.handleWordSubmit}
              onDragStart={gridInteraction.handleDragStart} onDragEnter={gridInteraction.handleDragEnter} onDragEnd={gridInteraction.handleDragEnd}
              gridRef={gridRef}
              isInteractive={entryPhase === 'playing' && isPlaying && !isPaused}
              isDisabled={entryPhase !== 'playing' || !isPlaying || isPaused}
              entryPhase={entryPhase} showCascade={entryPhase === 'cascade'}
              onCascadeComplete={handleCascadeComplete}
              hintHighlightIndices={hintHighlightIndices} adjacentIndices={adjacentIndices} pathPoints={pathPoints}
              validationError={wordSubmit.validationFeedback.error}
              isValidating={isValidating}
              isWordValid={wordSubmit.validationFeedback.isValid}
              wasWordSubmitted={wordSubmit.validationFeedback.wasSubmitted}
              lastAccepted={wordSubmit.lastAccepted}
              selectedLength={selectedIndices.length} minWordLength={minWordLength}
              wordFeedback={wordSubmit.wordFeedback}
              currentWord={currentWord}
              worldId={levelConfig.world}
              hintLevel={init.hintData.level}
              bossGridEffect={bossOrch.gridEffectTrigger}
              lockedTileIndices={bossOrch.lockedTiles} />
          }
          sidebar={
            <GameSidebar objectives={objectives}
              showSlideIn={entryPhase === 'objectives'} onSlideInComplete={handleEntryPhaseComplete}
              hasHintsAvailable={hasHintsAvailable} onHintClick={handleHintClick}
              showAutoHint={showAutoHint} currentHint={currentHint}
              hintLevel={init.hintData.level}
              nextHintCost={nextHintCost}
              hintGoldPending={hintGoldPending}
              freezeSeconds={init.upgradeEffects.timeFreezeSeconds}
              freezeUsed={freezeUsed}
              isFrozen={isFrozen}
              onFreezeClick={() => activateFreeze(init.upgradeEffects.timeFreezeSeconds)}
              shufflesRemaining={shufflesRemaining}
              onShuffleClick={() => { shuffleTiles(); playBoardShuffleSound(); }}
              canDetonate={init.upgradeEffects.canDetonateWords}
              detonateActive={detonateActive}
              onDetonateToggle={() => setDetonateActive(prev => !prev)}
              chapterQuests={chapterQuests.quests}
              chapterQuestProgress={chapterQuests.progress}
              className="border-b-2 lg:border-b-0 lg:border-s-2 border-neo-black/30" />
          }
          overlays={
            <AdventureGameOverlays
              bossConfig={bossOrch.bossConfig} bossMaxHP={bossOrch.bossMaxHP}
              bossTaunt={bossOrch.bossTaunt} showBossIntro={bossOrch.showBossIntro}
              handleBossIntroStart={bossOrch.handleBossIntroStart}
              handleBossIntroSkip={bossOrch.handleBossIntroSkip}
              bossHealthState={bossOrch.bossHealthState} bossEffectCallbacks={bossOrch.bossEffectCallbacks}
              isBossLevel={isBossLevel} isBossActive={bossOrch.isBossActive}
              showBossFireworks={bossOrch.showBossFireworks} defeatedBossTier={bossOrch.defeatedBossTier}
              showEdgeVignette={bossOrch.showEdgeVignette} playerHealthState={bossOrch.playerHealthState}
              showLevelComplete={showLevelComplete} gameStars={gameState.stars}
              gameScore={gameState.score} wordsFound={gameState.wordsFound} gameState={gameState}
              handleContinue={handleContinue} handleRetry={handleRetry} onExit={onExit}
              handleCinematicComplete={handleCinematicComplete} handlePauseToggle={gridInteraction.handlePauseToggle}
              handleEntryPhaseComplete={handleEntryPhaseComplete}
              handleStoryBeatContinue={handleStoryBeatContinue} handleLootChestComplete={handleLootChestComplete}
              handlePopupComplete={gridInteraction.handlePopupComplete}
              activeChallenge={flashChallenge.activeChallenge} isChallengeComplete={flashChallenge.isChallengeComplete}
              isChallengeFailed={flashChallenge.isChallengeFailed}
              dismissChallenge={flashChallenge.dismiss} challengeTimeLeft={flashChallenge.challengeTimeLeft}
              isPaused={isPaused} entryPhase={entryPhase}
              levelNumber={levelConfig.level} worldNumber={levelConfig.world}
              showVictoryCinematic={cinematics.showVictoryCinematic}
              showDefeatCinematic={cinematics.showDefeatCinematic}
              showWorldUnlockCinematic={cinematics.showWorldUnlockCinematic}
              worldUnlockProps={cinematics.worldUnlockProps}
              timeRemaining={timeRemaining} t={t}
              showLootChest={showLootChest} lootDrops={levelCompletion.lootDrops}
              objectives={objectives} totalStars={totalStars} bestAttempt={bestAttempt ?? null} previousBestStars={previousBestStars}
              earnedXp={levelCompletion.earnedXp} earnedGold={levelCompletion.earnedGold}
              isLastLevelOfWorld={levelConfig.level === LEVELS_PER_WORLD} onNextWorld={onNextWorld}
              saveFailed={levelCompletion.completionSaveFailedRef?.current && showLevelComplete}
              onRetrySave={() => {
                saveCompletionToDb(
                  levelConfig.world, levelConfig.level,
                  gameState.stars as 0 | 1 | 2 | 3,
                  gameState.score, gameState.wordsFound.length,
                  levelCompletion.earnedGold
                ).then((ok) => {
                  if (ok) {
                    if (levelCompletion.completionSaveFailedRef) levelCompletion.completionSaveFailedRef.current = false;
                    if (levelCompletion.completionSavedRef) levelCompletion.completionSavedRef.current = true;
                  }
                });
              }}
              retriesUsed={retriesUsed} freeRetriesPerWorld={init.upgradeEffects.freeRetriesPerWorld ?? 0}
              storyBeat={storyBeat} showStoryBeat={showStoryBeat}
              currentPopup={effects.currentPopup} scoreDisplayRef={effects.scoreDisplayRef}
              reaction={effects.reaction} dismissReaction={effects.dismissReaction}
              chainBurstConfig={effects.chainBurstConfig} setChainBurstConfig={effects.setChainBurstConfig}
              particleConfig={effects.particleConfig} setParticleConfig={effects.setParticleConfig}
              pendingExplosions={effects.pendingExplosions} removeExplosion={effects.removeExplosion}
              levelUpData={levelCompletion.levelUpData} handleLevelUpClose={levelCompletion.handleLevelUpClose}
              currentMilestone={init.currentMilestone}
            />
          }
        />
        {showRetryAssist && (
          <RetryAssistModal
            isOpen={showRetryAssist}
            consecutiveFailures={consecutiveFailures}
            bestWords={gameState.wordsFound.length}
            bestScore={gameState.score}
            attemptCount={(bestAttempt?.attemptCount ?? 0) + 1}
            onRetry={handleRetryFromAssist}
            onRetryWithBonus={handleRetryWithBonus}
            onRetryWithHint={handleRetryWithHint}
            onExit={onExit}
          />
        )}
        {showTutorial && (
          <AdventureTutorial onComplete={() => setShowTutorial(false)} />
        )}
      </div>
    );
  }
);

AdventureGame.displayName = 'AdventureGame';

export default AdventureGame;
