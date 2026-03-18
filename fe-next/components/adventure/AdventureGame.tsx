/**
 * AdventureGame — Main orchestrator for adventure mode gameplay.
 * Hook logic extracted to: useAdventureGameInit, useAdventureWordSubmit,
 * useAdventureLevelCompletion, useAdventureBossOrchestration.
 */
'use client';

import React, { memo, useCallback, useState, useEffect, useMemo, useRef } from 'react';
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
import { useFlashChallenge } from '@/hooks/useFlashChallenge';
import { useDailyQuests } from '@/hooks/useDailyQuests';
import { useChapterQuests } from '@/hooks/useChapterQuests';
import { getChapterNumber } from '@/lib/adventure/questConfig';
import FlashChallengeToast from './FlashChallengeToast';
import { getMasteryAura } from '@/lib/adventure/powerGrowth';
import { applyGemDetectorBoost, LEVELS_PER_WORLD } from '@/lib/adventure';
import { getWorldConfig } from '@/lib/adventure/levelConfig';
import { getStoryBeat } from '@/lib/adventure/storyConfig';
import { StoryBeatCard } from './StoryBeatCard';
import AdventureEffectsLayerFull, { AdventureEffectsLayer as EdgeVignetteLayer } from './effects/AdventureEffectsLayer';
import LevelCompleteModal from './LevelCompleteModal';
import LootChestReveal from './LootChestReveal';
import LevelEntryOverlay from './LevelEntryOverlay';
import { BossOverlay, PlayerHealthBar } from './boss';
import dynamic from 'next/dynamic';
import { VICTORY_DURATION_FRAMES, DEFEAT_DURATION_FRAMES, WORLD_UNLOCK_DURATION_FRAMES } from './cinematics';
import GameplayBackground from './themed/GameplayBackground';

// Dynamic imports — cinematics are heavy (Remotion) and only shown on level complete/defeat
const VictoryCinematic = dynamic(() => import('./cinematics/VictoryCinematic').then(mod => ({ default: mod.VictoryCinematic as React.ComponentType<any> })), { ssr: false });
const DefeatCinematic = dynamic(() => import('./cinematics/DefeatCinematic').then(mod => ({ default: mod.DefeatCinematic as React.ComponentType<any> })), { ssr: false });
const WorldUnlockCinematic = dynamic(() => import('./cinematics/WorldUnlockCinematic').then(mod => ({ default: mod.WorldUnlockCinematic as React.ComponentType<any> })), { ssr: false });
const CinematicPlayer = dynamic(() => import('./boss/cinematics/CinematicPlayer').then(mod => ({ default: mod.CinematicPlayer })), { ssr: false });
import { GameHeader, GameSidebar, GameGridArea, PauseOverlay, GameLayout } from './ui';
import { useCrazyGamesLifecycle } from '@/hooks/useCrazyGamesLifecycle';
import type { LevelConfig, TileState, GridTileState } from '@/types/adventure';

export interface GameTimerState { timeRemaining: number; totalTime: number; isPlaying: boolean; isPaused: boolean; }

interface AdventureGameProps {
  levelConfig: LevelConfig;
  initialGrid: string[][];
  onLevelComplete: (stars: number, score: number, wordsFound: number, goldEarned: number) => void;
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

    // Gem Detector upgrade: boost special tile spawning
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
      gameState, tiles: tiles2D, tilesVersion, objectives, timeRemaining, canComplete,
      isPlaying, cascadeComplete, submitWordWithPath, startGame, pauseGame, completeLevel,
      resetGame, markCascadeComplete, isCascading, cascadePhase, addTime, regenerateGrid,
      activateFreeze, isFrozen, freezeRemaining, freezeUsed, useShuffle, shufflesRemaining, updateObjective,
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
    const { recordAttempt, getLevelAttempt, progression, updateWordAlbum } = useProgression();
    const bestAttempt = useMemo(
      () => getLevelAttempt(levelConfig.world, levelConfig.level),
      [getLevelAttempt, levelConfig.world, levelConfig.level]
    );

    const [isPaused, setIsPaused] = useState(false);
    const [showLevelComplete, setShowLevelComplete] = useState(false);
    const [showLootChest, setShowLootChest] = useState(false);
    const [retriesUsed, setRetriesUsed] = useState(0);
    const [showStoryBeat, setShowStoryBeat] = useState(false);
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

    // Track tile types used in last word for flash challenges (useGoldTile)
    const [lastWordTileTypes, setLastWordTileTypes] = useState<string[]>([]);
    const prevWordsFoundLenRef = useRef(gameState.wordsFound.length);
    useEffect(() => {
      if (gameState.wordsFound.length > prevWordsFoundLenRef.current) {
        const activatedTypes = tiles.filter(t => t.activationEffect).map(t => t.type);
        setLastWordTileTypes(activatedTypes);
      }
      prevWordsFoundLenRef.current = gameState.wordsFound.length;
    }, [gameState.wordsFound.length, tiles]);

    const flashChallenge = useFlashChallenge({
      worldId: levelConfig.world,
      totalTimeSeconds: levelConfig.timerSeconds ?? 120,
      timeRemaining,
      wordsFound: gameState.wordsFound,
      isPlaying: isPlaying && entryPhase === 'playing' && !isPaused,
      lastWordTileTypes,
      locale: language,
    });

    // Award flash challenge gold when completed (guarded to fire once per challenge)
    const hasAwardedFlashGoldRef = useRef(false);
    useEffect(() => {
      if (flashChallenge.isChallengeComplete && flashChallenge.activeChallenge && !hasAwardedFlashGoldRef.current) {
        hasAwardedFlashGoldRef.current = true;
        init.addGold(flashChallenge.activeChallenge.rewardCoins);
      }
      if (!flashChallenge.isChallengeComplete) {
        hasAwardedFlashGoldRef.current = false;
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- using init.addGold (stable useCallback) instead of init (unstable object) to prevent infinite re-render loop
    }, [flashChallenge.isChallengeComplete, flashChallenge.activeChallenge, init.addGold]);

    // Boss objective tracking — sync boss state to reducer objectives
    // defeatBoss: track boss HP depletion as percentage
    // NOTE: must NOT guard on isBossActive — when boss HP reaches 0,
    // isActive becomes false in the same React batch as hp=0, so the
    // guard would skip the final 100% update.
    useEffect(() => {
      if (!isBossLevel) return;
      const depleted = bossOrch.bossMaxHP > 0
        ? Math.round(((bossOrch.bossMaxHP - bossOrch.bossCurrentHP) / bossOrch.bossMaxHP) * 100)
        : 0;
      updateObjective('defeatBoss', depleted, 'set');
    }, [isBossLevel, bossOrch.bossCurrentHP, bossOrch.bossMaxHP, updateObjective]);

    // surviveBattle: track player health percentage (updated continuously)
    useEffect(() => {
      if (!isBossLevel) return;
      const healthPct = bossOrch.playerHealthState.maxHP > 0
        ? Math.round((bossOrch.playerHealthState.currentHP / bossOrch.playerHealthState.maxHP) * 100)
        : 100;
      updateObjective('surviveBattle', healthPct, 'set');
    }, [isBossLevel, bossOrch.playerHealthState.currentHP, bossOrch.playerHealthState.maxHP, updateObjective]);

    // mechanicTrigger: increment when boss grid effect triggers
    const prevGridEffectRef = useRef(bossOrch.gridEffectTrigger);
    useEffect(() => {
      if (!isBossLevel) return;
      if (bossOrch.gridEffectTrigger !== prevGridEffectRef.current && bossOrch.gridEffectTrigger) {
        updateObjective('mechanicTrigger', 1, 'increment');
      }
      prevGridEffectRef.current = bossOrch.gridEffectTrigger;
    }, [isBossLevel, bossOrch.gridEffectTrigger, updateObjective]);

    // Daily quests — track progress for today's 3 quests
    const { recordProgress: recordQuestProgress } = useDailyQuests({
      initialProgress: progression?.dailyQuestProgress,
      lastQuestDate: progression?.dailyQuestDate,
    });

    // Chapter quests — track progress for current chapter
    const chapterNumber = getChapterNumber(levelConfig.level);
    const chapterQuests = useChapterQuests({ worldId: levelConfig.world, chapterNumber });

    // CrazyGames SDK lifecycle — report gameplay and trigger happyTime on achievements
    useCrazyGamesLifecycle({
      isGameActive: isPlaying && entryPhase === 'playing' && !isPaused,
      isGameOver: gameState.isComplete,
      isWinner: (gameState.stars ?? 0) >= 1,
      score: gameState.score,
      maxCombo: gameState.comboCount,
      wordsFound: gameState.wordsFound.length,
    });

    // Score multiplier: currently 1x base. AI director adjusts pacing (not score),
    // and upgrade-based score bonus is already applied via upgradeBonuses.scoreBonus.
    // This hook point remains for future world-specific or event-based score scaling.
    const getScoreMultiplier = useCallback(() => 1, []);

    // Augment skill effects with rune boss damage multiplier
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
    const { selectedIndices, currentWord, selectTile, clearSelection, getPath, pathPoints, adjacentIndices } = useAdventureSelection({
      tiles, gridSize: levelConfig.gridSize, disabled: !isPlaying || isPaused || isValidating, gridRef,
      onClickSubmit: handleClickSubmit,
    });

    const { hasHintsAvailable, getHint, currentHint, clearCurrentHint, recordActivity, showAutoHint, dismissAutoHint, remainingHintWords, findPathForWord } = useAdventureHints({
      grid: initialGrid, language: language || 'en', foundWords: gameState.wordsFound,
      isPlaying: isPlaying && entryPhase === 'playing' && !isPaused, inactivityThresholdMs: init.adjustedInactivityThresholdMs,
      maxHintsPerLevel: init.upgradeEffects.hintsPerLevel,
    });

    const isModalOpen = showLevelComplete || cinematics.showVictoryCinematic || cinematics.showDefeatCinematic || bossOrch.showBossIntro || bossOrch.showBossFireworks;
    // Stuck detection: auto-reveal a hint instead of firing an intrusive toast
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
      bossHealPerWord: init.upgradeEffects.bossHealPerWord,
      healPlayerHealth: bossOrch.isBossActive ? bossOrch.healPlayer : undefined,
      detonateActive,
      t, getPopupStartPosition: () => {
        if (selectedIndices.length === 0) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        const el = gridRef.current?.querySelectorAll('[role="gridcell"]')[selectedIndices[selectedIndices.length - 1]];
        if (el) { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
        return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      },
    });

    // Wire click-to-submit ref now that wordSubmit is available
    clickSubmitRef.current = wordSubmit.handleWordSubmit;

    const levelCompletion = useAdventureLevelCompletion({
      gameState, timeRemaining, timerSeconds: init.adjustedLevelConfig.timerSeconds,
      levelConfig, objectives, currentLevel: init.currentLevel,
      upgradeBonuses: init.upgradeBonuses, upgradeEffects: init.upgradeEffects,
      bonusGoldMultiplier: init.runeEffects.goldMultiplier * init.streakMultiplier,
      isFirstCompletion: !bestAttempt,
      awardXp: init.awardXp, addGold: init.addGold,
      recordAttempt, recordCompletion: init.recordCompletion, updateWordAlbum,
      endAIDirector: init.endAIDirector, handleEarnAchievement: init.handleEarnAchievement,
      pauseGame, completeLevel, showVictory: cinematics.showVictory, showDefeat: cinematics.showDefeat,
      showLevelComplete, showVictoryCinematic: cinematics.showVictoryCinematic,
      showDefeatCinematic: cinematics.showDefeatCinematic, isBossLevel,
      isBossActive: bossOrch.isBossActive, bossHealthPhase: bossOrch.bossHealthState.phase,
      playerIsDead: bossOrch.playerHealthState.isDead, endBossBattle: bossOrch.endBossBattle,
      triggerBossTaunt: bossOrch.triggerBossTaunt,
      playerHealthPercent: bossOrch.playerHealthState.maxHP > 0 ? Math.round((bossOrch.playerHealthState.currentHP / bossOrch.playerHealthState.maxHP) * 100) : 100,
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

    // Daily quest progress: track words found, long words, and combos
    const prevQuestWordsRef = useRef(gameState.wordsFound.length);
    useEffect(() => {
      const newWords = gameState.wordsFound.length - prevQuestWordsRef.current;
      if (newWords > 0) {
        recordQuestProgress('wordCount', newWords);
        chapterQuests.recordWordsFound(newWords);
        // Check for long words (6+ letters)
        const latestWord = gameState.wordsFound[gameState.wordsFound.length - 1];
        if (latestWord && latestWord.length >= 6) {
          recordQuestProgress('longWord');
          chapterQuests.recordLongWord();
        }
      }
      prevQuestWordsRef.current = gameState.wordsFound.length;
    }, [gameState.wordsFound, recordQuestProgress, chapterQuests]);

    useEffect(() => {
      if (gameState.comboCount >= 5) recordQuestProgress('comboStreak');
    }, [gameState.comboCount, recordQuestProgress]);

    // Chapter quest: streak master — track consecutive valid words
    useEffect(() => {
      if (gameState.comboCount > 0) {
        chapterQuests.recordStreakMaster();
      }
    }, [gameState.comboCount, chapterQuests]);

    // Chapter quest: flash challenge master — track completed flash challenges
    useEffect(() => {
      if (flashChallenge.isChallengeComplete) {
        chapterQuests.recordFlashChallengeMaster();
      }
    }, [flashChallenge.isChallengeComplete, chapterQuests]);

    // Chapter quest: world mechanic use — track when boss grid effect triggers
    const prevMechanicTriggerRef = useRef(bossOrch.gridEffectTrigger);
    useEffect(() => {
      if (bossOrch.gridEffectTrigger !== prevMechanicTriggerRef.current && bossOrch.gridEffectTrigger) {
        chapterQuests.recordWorldMechanicUse();
      }
      prevMechanicTriggerRef.current = bossOrch.gridEffectTrigger;
    }, [bossOrch.gridEffectTrigger, chapterQuests]);

    // Streamlined entry: cascade → playing (skip objectives parade + title burst)
    const handleCascadeComplete = useCallback(() => {
      markCascadeComplete();
      entryPhaseManager.advanceToPlaying();
      if (!isPlaying) { startGame(); init.startAIDirector(); }
      // Word Radar T5: free hint on level start
      if (init.upgradeEffects.freeStartHint) {
        setTimeout(() => getHint(), 500);
      }
    }, [markCascadeComplete, entryPhaseManager, isPlaying, startGame, init, getHint]);

    // Shared handler for objectives/title entry phases (no longer triggered in normal flow,
    // but still passed as props for backward compat)
    const handleEntryPhaseComplete = useCallback(() => {
      entryPhaseManager.advanceToPlaying();
      if (!isPlaying) { startGame(); init.startAIDirector(); }
    }, [entryPhaseManager, isPlaying, startGame, init]);

    const calculateTileCenter = useCallback((row: number, col: number) => {
      if (!gridRef.current) return { x: 0, y: 0 };
      const gridRect = gridRef.current.getBoundingClientRect();
      const tileSize = gridRect.width / levelConfig.gridSize;
      return { x: gridRect.left + col * tileSize + tileSize / 2, y: gridRect.top + row * tileSize + tileSize / 2 };
    }, [levelConfig.gridSize]);

    useEffect(() => {
      const chainTiles = tiles.filter(t => t.activationEffect === 'link' && t.activationTimestamp);
      if (chainTiles.length === 0) return;
      effects.setChainBurstConfig({ trigger: true, position: calculateTileCenter(chainTiles[0].row, chainTiles[0].col) });
    }, [tiles, calculateTileCenter, effects]);

    useEffect(() => {
      if (cascadePhase === 'removing' && wordSubmit.lastSubmittedWordRef.current) {
        const { word, path } = wordSubmit.lastSubmittedWordRef.current;
        if (path.length >= 3) {
          let cx = 0, cy = 0;
          for (const pos of path) { const c = calculateTileCenter(pos.row, pos.col); cx += c.x; cy += c.y; }
          cx /= path.length; cy /= path.length;
          let intensity: 1 | 2 | 3 | 4 = 1;
          if (word.length >= 10) intensity = 4;
          else if (word.length >= 7) intensity = 3;
          else if (word.length >= 5) intensity = 2;
          effects.addExplosion({ id: Date.now(), position: { x: cx, y: cy }, intensity });
        }
        wordSubmit.lastSubmittedWordRef.current = null;
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cascadePhase, calculateTileCenter, effects]);

    const handlePauseToggle = useCallback(() => {
      if (isPaused) { startGame(); setIsPaused(false); }
      else { pauseGame(); setIsPaused(true); }
    }, [isPaused, startGame, pauseGame]);

    const handleTileSelect = useCallback(
      (index: number, _tile: GridTileState) => {
        if (!isPlaying || isPaused || isValidating) return;
        selectTile(index); resetOnGameAction();
      }, [isPlaying, isPaused, isValidating, selectTile, resetOnGameAction]
    );

    const handleDragStart = useCallback(
      (index: number, _tile: GridTileState) => {
        if (!isPlaying || isPaused || isValidating) return;
        clearSelection(); selectTile(index);
      }, [isPlaying, isPaused, isValidating, clearSelection, selectTile]
    );

    const handleDragEnter = useCallback(
      (index: number, _tile: GridTileState) => {
        if (!isPlaying || isPaused || isValidating) return;
        selectTile(index);
      }, [isPlaying, isPaused, isValidating, selectTile]
    );

    // Refs for latest selection state — avoids stale closure in handleDragEnd (fixes outside-grid release + RAF lag)
    const selectedIndicesRef = useRef(selectedIndices);
    const currentWordRef = useRef(currentWord);
    useEffect(() => { selectedIndicesRef.current = selectedIndices; }, [selectedIndices]);
    useEffect(() => { currentWordRef.current = currentWord; }, [currentWord]);

    const handleDragEnd = useCallback(() => {
      const word = currentWordRef.current;
      const indices = selectedIndicesRef.current;
      if (!word || indices.length === 0) return;
      wordSubmit.handleWordSubmit(word, indices);
    }, [wordSubmit]);

    // Flow: cinematic → story beat → loot chest → level complete
    const showLootOrComplete = useCallback(() => {
      if (levelCompletion.lootDrops.length > 0 && gameState.stars > 0) {
        setShowLootChest(true);
      } else {
        setShowLevelComplete(true);
      }
    }, [levelCompletion.lootDrops, gameState.stars]);

    // Non-boss levels: show results UI when completion hook signals done
    useEffect(() => {
      if (levelCompletion.nonBossCompleted) {
        showLootOrComplete();
      }
    }, [levelCompletion.nonBossCompleted, showLootOrComplete]);

    const handleCinematicComplete = useCallback(() => {
      // After victory cinematic on boss level — check if next world is now unlocked
      if (
        cinematics.showVictoryCinematic && isBossLevel && gameState.stars > 0
        && levelConfig.world < 10 && !cinematics.showWorldUnlockCinematic
      ) {
        const nextWorld = levelConfig.world + 1;
        const currentWorldConfig = getWorldConfig(levelConfig.world);
        const nextWorldConfig = getWorldConfig(nextWorld);
        cinematics.handleCinematicComplete();
        cinematics.showWorldUnlock({
          previousWorldNumber: levelConfig.world,
          previousWorldName: t(`adventure.worlds.${currentWorldConfig.name}`),
          newWorldNumber: nextWorld,
          newWorldName: t(`adventure.worlds.${nextWorldConfig.name}`),
          previousColor: currentWorldConfig.colorPrimary,
          newColor: nextWorldConfig.colorPrimary,
          newSecondaryColor: nextWorldConfig.colorSecondary,
        });
        return;
      }

      cinematics.handleCinematicComplete();
      if (storyBeat && gameState.stars > 0) {
        setShowStoryBeat(true);
      } else {
        showLootOrComplete();
      }
    }, [cinematics, storyBeat, gameState.stars, showLootOrComplete, isBossLevel, levelConfig.world, t]);

    const handleStoryBeatContinue = useCallback(() => {
      setShowStoryBeat(false);
      showLootOrComplete();
    }, [showLootOrComplete]);

    const handleLootChestComplete = useCallback(() => {
      setShowLootChest(false);
      setShowLevelComplete(true);
    }, []);

    const hintsUsedRef = useRef(0);
    const handleContinue = useCallback(() => {
      if (gameState.stars >= 3) chapterQuests.recordLevelPerfect();
      if (isBossLevel && bossOrch.bossHealthState.phase === 'victory' && hintsUsedRef.current === 0) {
        chapterQuests.recordBossDefeatedNoHint();
      }
      // Score challenge quest: record final score
      if (gameState.score > 0) {
        chapterQuests.recordScoreChallenge(gameState.score);
      }
      // Boss high health: record if boss defeated with >75% player HP
      if (isBossLevel && bossOrch.bossHealthState.phase === 'victory' && bossOrch.playerHealthState.currentHP > bossOrch.playerHealthState.maxHP * 0.75) {
        chapterQuests.recordBossHighHealth();
      }
      // Full combo level: record if no combo breaks during the level
      if (gameState.stars > 0 && gameState.comboCount >= gameState.wordsFound.length && gameState.wordsFound.length > 0) {
        chapterQuests.recordFullComboLevel();
      }
      // Progression achievements — star milestones (totalStars includes stars from this level)
      const newTotalStars = (totalStars ?? 0) + gameState.stars;
      if (newTotalStars >= 50) init.handleEarnAchievement('STAR_COLLECTOR_50');
      if (newTotalStars >= 100) init.handleEarnAchievement('STAR_COLLECTOR_100');
      // World complete: finishing the boss level (level 7) means the world is done
      if (isBossLevel && gameState.stars > 0) {
        init.handleEarnAchievement('WORLD_COMPLETE');
      }
      // All bosses: finishing world 10 boss means all 10 bosses defeated
      if (isBossLevel && levelConfig.world === 10 && gameState.stars > 0) {
        init.handleEarnAchievement('ALL_BOSSES');
      }
      setShowLevelComplete(false);
      onLevelComplete(gameState.stars, gameState.score, gameState.wordsFound.length, levelCompletion.earnedGold);
    }, [gameState.stars, gameState.score, gameState.wordsFound.length, gameState.comboCount, levelCompletion.earnedGold, onLevelComplete, chapterQuests, isBossLevel, bossOrch.bossHealthState.phase, bossOrch.playerHealthState.currentHP, bossOrch.playerHealthState.maxHP, totalStars, init, levelConfig.world]);

    const handleRetry = useCallback(() => {
      setShowLevelComplete(false);
      setRetriesUsed(prev => prev + 1);
      levelCompletion.resetRewards();
      clearSelection();
      // Salvage Claw T2: retain a fraction of score on retry
      const retainedScore = init.upgradeEffects.retryScoreRetention > 0
        ? Math.floor(gameState.score * init.upgradeEffects.retryScoreRetention)
        : 0;
      resetGame({ retainedScore });
      bossOrch.resetBossHealth(); bossOrch.resetPlayerHealth();
      cinematics.resetCinematics(); startGame();
    }, [resetGame, startGame, clearSelection, bossOrch, cinematics, levelCompletion, init.upgradeEffects.retryScoreRetention, gameState.score]);

    const handleHintClick = useCallback(() => {
      if (hasHintsAvailable) { getHint(); dismissAutoHint(); hintsUsedRef.current += 1; }
    }, [hasHintsAvailable, getHint, dismissAutoHint]);

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
      if (!currentHint?.path) return [];
      return currentHint.path.map(pos => pos.row * levelConfig.gridSize + pos.col);
    }, [init.hintData, currentHint, levelConfig.gridSize, isFrozen, init.upgradeEffects.freezeHighlightsWord, remainingHintWords, findPathForWord]);

    const popupQueueTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const handlePopupComplete = useCallback(() => {
      if (popupQueueTimeoutRef.current) { clearTimeout(popupQueueTimeoutRef.current); popupQueueTimeoutRef.current = null; }
      effects.handlePopupComplete();
    }, [effects]);

    useEffect(() => {
      if (popupQueueTimeoutRef.current) { clearTimeout(popupQueueTimeoutRef.current); popupQueueTimeoutRef.current = null; }
      if (effects.currentPopup) {
        popupQueueTimeoutRef.current = setTimeout(() => { effects.handlePopupComplete(); popupQueueTimeoutRef.current = null; }, 3000);
      }
      return () => { if (popupQueueTimeoutRef.current) { clearTimeout(popupQueueTimeoutRef.current); } };
    }, [effects]);

    if (!isValidConfig) {
      return (
        <div data-testid="adventure-game" role="main" className="flex items-center justify-center h-full">
          <p className="text-neo-red font-bold">{t('adventure.loadError')}</p>
        </div>
      );
    }

    return (
      <div ref={effects.shakeRef} data-testid="adventure-game" role="main" aria-label="Adventure Mode Game" className="h-full w-full overflow-hidden relative" style={{ '--mastery-aura': masteryAura } as React.CSSProperties}>
        <GameplayBackground className="absolute inset-0 -z-10" />
        <GameLayout
          isBossActive={isBossLevel && bossOrch.isBossActive && !bossOrch.showBossIntro && !showLevelComplete}
          header={
            <GameHeader worldNumber={levelConfig.world} levelNumber={levelConfig.level}
              score={gameState.score} timeRemaining={timeRemaining} isPaused={isPaused}
              onPauseToggle={handlePauseToggle} onExit={onExit}
              gold={init.gold} xpProgress={init.xpProgress.progressPercent / 100} />
          }
          gridArea={
            <GameGridArea tiles={tiles} gridSize={levelConfig.gridSize}
              selectedIndices={selectedIndices} onTileSelect={handleTileSelect}
              onWordSubmit={wordSubmit.handleWordSubmit}
              onDragStart={handleDragStart} onDragEnter={handleDragEnter} onDragEnd={handleDragEnd}
              gridRef={gridRef}
              isInteractive={entryPhase === 'playing' && isPlaying && !isPaused && !isValidating}
              isDisabled={entryPhase !== 'playing' || !isPlaying || isPaused || isValidating}
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
              freezeSeconds={init.upgradeEffects.timeFreezeSeconds}
              freezeUsed={freezeUsed}
              isFrozen={isFrozen}
              onFreezeClick={() => activateFreeze(init.upgradeEffects.timeFreezeSeconds)}
              shufflesRemaining={shufflesRemaining}
              onShuffleClick={useShuffle}
              canDetonate={init.upgradeEffects.canDetonateWords}
              detonateActive={detonateActive}
              onDetonateToggle={() => setDetonateActive(prev => !prev)}
              chapterQuests={chapterQuests.quests}
              chapterQuestProgress={chapterQuests.progress}
              className="border-b-2 lg:border-b-0 lg:border-s-2 border-neo-black/30" />
          }
          overlays={
            <>
              <BossOverlay boss={bossOrch.bossConfig}
                maxHP={bossOrch.bossMaxHP}
                currentTaunt={bossOrch.bossTaunt}
                showTaunt={!!bossOrch.bossTaunt}
                showIntro={bossOrch.showBossIntro}
                onStartBattle={bossOrch.handleBossIntroStart}
                showVictory={showLevelComplete && bossOrch.bossHealthState.phase === 'victory'}
                showDefeat={showLevelComplete && (bossOrch.bossHealthState.phase === 'defeat' || bossOrch.playerHealthState.isDead)}
                stars={gameState.stars} score={gameState.score}
                wordsFound={gameState.wordsFound} gameState={gameState}
                onContinue={handleContinue} onRetry={handleRetry}
                worldNumber={levelConfig.world}
                healthState={bossOrch.bossHealthState}
                effectCallbacks={bossOrch.bossEffectCallbacks} />

              {isBossLevel && bossOrch.isBossActive && !bossOrch.showBossIntro && !showLevelComplete && !bossOrch.playerHealthState.isDead && (
                <div className="fixed bottom-[4.5rem] sm:bottom-24 lg:bottom-4 left-1/2 -translate-x-1/2 z-30 px-4 w-full max-w-md">
                  <PlayerHealthBar healthState={bossOrch.playerHealthState} />
                </div>
              )}

              {flashChallenge.activeChallenge && (
                <FlashChallengeToast
                  challenge={flashChallenge.activeChallenge}
                  isComplete={flashChallenge.isChallengeComplete}
                  onDismiss={flashChallenge.dismiss}
                  timeLeft={flashChallenge.challengeTimeLeft}
                />
              )}

              <PauseOverlay isOpen={isPaused && !showLevelComplete}
                onResume={handlePauseToggle} onRestart={handleRetry} onExit={onExit} />

              <LevelEntryOverlay levelNumber={levelConfig.level} worldNumber={levelConfig.world}
                isVisible={entryPhase === 'title'} onComplete={handleEntryPhaseComplete} />

              {cinematics.showVictoryCinematic && (
                <CinematicPlayer
                  composition={VictoryCinematic as unknown as React.ComponentType<Record<string, unknown>>}
                  compositionProps={{
                    starsEarned: gameState.stars, wordsFound: gameState.wordsFound.length,
                    finalScore: gameState.score, timeRemaining,
                    titleText: t('adventure.cinematic.victory'),
                    statLabels: { wordsFound: t('adventure.cinematic.wordsFound'), finalScore: t('adventure.cinematic.score'), timeRemaining: t('adventure.cinematic.timeLeft') },
                    starsLabel: t('adventure.cinematic.stars'),
                  }}
                  durationSeconds={VICTORY_DURATION_FRAMES / 30} onComplete={handleCinematicComplete}
                  fallbackType="victory" />
              )}

              {cinematics.showDefeatCinematic && (
                <CinematicPlayer
                  composition={DefeatCinematic as unknown as React.ComponentType<Record<string, unknown>>}
                  compositionProps={{
                    wordsFound: gameState.wordsFound.length,
                    bestWord: gameState.wordsFound.reduce((best, word) => word.length > best.length ? word : best, ''),
                    finalScore: gameState.score,
                    titleText: t('adventure.cinematic.defeat'),
                    encourageText: t('adventure.cinematic.encourageText'),
                    encourageSubtext: t('adventure.cinematic.encourageSubtext'),
                    statLabels: { wordsFound: t('adventure.cinematic.wordsFound'), finalScore: t('adventure.cinematic.score'), bestWord: t('adventure.cinematic.bestWord') },
                  }}
                  durationSeconds={DEFEAT_DURATION_FRAMES / 30} onComplete={handleCinematicComplete}
                  fallbackType="defeat" />
              )}

              {/* World Unlock Cinematic — plays after boss defeat when next world is unlocked */}
              {cinematics.showWorldUnlockCinematic && cinematics.worldUnlockProps && (
                <CinematicPlayer
                  composition={WorldUnlockCinematic as unknown as React.ComponentType<Record<string, unknown>>}
                  compositionProps={cinematics.worldUnlockProps as unknown as Record<string, unknown>}
                  durationSeconds={WORLD_UNLOCK_DURATION_FRAMES / 30}
                  onComplete={handleCinematicComplete}
                  fallbackType="victory" />
              )}

              <LootChestReveal
                isOpen={showLootChest}
                drops={levelCompletion.lootDrops}
                onComplete={handleLootChestComplete}
              />

              {!isBossLevel && (
                <LevelCompleteModal isOpen={showLevelComplete}
                  stars={gameState.stars} score={gameState.score} objectives={objectives}
                  levelNumber={levelConfig.level} worldNumber={levelConfig.world}
                  onContinue={handleContinue} onRetry={handleRetry} onExit={onExit}
                  totalStars={totalStars} bestAttempt={bestAttempt}
                  xpEarned={levelCompletion.earnedXp} goldEarned={levelCompletion.earnedGold}
                  isLastLevelOfWorld={levelConfig.level === LEVELS_PER_WORLD}
                  onNextWorld={onNextWorld}
                  canRetryFree={retriesUsed < (init.upgradeEffects.freeRetriesPerWorld ?? 0)} />
              )}

              {storyBeat && (
                <StoryBeatCard
                  worldId={levelConfig.world}
                  characterName={t(storyBeat.characterKey)}
                  dialogueKey={storyBeat.dialogueKey}
                  isVisible={showStoryBeat}
                  onContinue={handleStoryBeatContinue}
                />
              )}

              <EdgeVignetteLayer showEdgeVignetteFlash={bossOrch.showEdgeVignette} />

              <AdventureEffectsLayerFull currentPopup={effects.currentPopup}
                onPopupComplete={handlePopupComplete} scoreDisplayRef={effects.scoreDisplayRef}
                reaction={effects.reaction} onDismissReaction={effects.dismissReaction}
                chainBurstConfig={effects.chainBurstConfig}
                onChainBurstComplete={() => effects.setChainBurstConfig(null)}
                world={levelConfig.world} particleConfig={effects.particleConfig}
                onParticleComplete={() => effects.setParticleConfig(null)}
                pendingExplosions={effects.pendingExplosions}
                onExplosionComplete={effects.removeExplosion}
                levelUpData={levelCompletion.levelUpData}
                onLevelUpClose={levelCompletion.handleLevelUpClose}
                currentMilestone={init.currentMilestone}
                isBossLevel={isBossLevel}
                showBossFireworks={bossOrch.showBossFireworks}
                defeatedBossTier={bossOrch.defeatedBossTier} />
            </>
          }
        />
      </div>
    );
  }
);

AdventureGame.displayName = 'AdventureGame';

export default AdventureGame;
