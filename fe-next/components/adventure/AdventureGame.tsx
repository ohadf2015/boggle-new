/** AdventureGame — Main orchestrator for adventure mode gameplay. */
'use client';

import React, { memo, useCallback, useState, useMemo, useRef } from 'react';
import { usePreviousValue } from '@/hooks/usePreviousValue';
import { trackLevelRetried } from '@/utils/posthogEngagement';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useProgression } from '@/contexts/ProgressionContext';
import { useAdventureGame } from '@/hooks/useAdventureGame';
import { useAdventureModeAdapter } from '@/hooks/useAdventureModeAdapter';
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
import { useAdventureTimerReport } from './hooks/useAdventureTimerReport';
import { useAutoPauseOnHidden } from './hooks/useAutoPauseOnHidden';
import { useHintGoldConfirm } from './hooks/useHintGoldConfirm';
import { useRetryAssistFlow } from './hooks/useRetryAssistFlow';
import { useAdventureForgePicker } from './hooks/useAdventureForgePicker';
import { useHintHighlightIndices } from './hooks/useHintHighlightIndices';
import { useFlashChallengeRewards } from './hooks/useFlashChallengeRewards';
import { useLootCompletionFlow } from './hooks/useLootCompletionFlow';
import { useHuntTargetPicker } from './hooks/useHuntTargetPicker';
import { useEntryPhaseHandlers } from './hooks/useEntryPhaseHandlers';
import { useCombatComboMilestone } from './hooks/useCombatComboMilestone';
import { useLastWordTileTypes } from './hooks/useLastWordTileTypes';
import { useInterstitialOnLevelComplete } from './hooks/useInterstitialOnLevelComplete';
import { useLexiStuckDetection } from '@/hooks/useLexiStuckDetection';
import { useGemDetectorHighlights } from '@/hooks/useGemDetectorHighlights';
import { useFlashChallenge } from '@/hooks/useFlashChallenge';
import { useDailyQuests } from '@/hooks/useDailyQuests';
import { useChapterQuests } from '@/hooks/useChapterQuests';
import { getChapterNumber } from '@/lib/adventure/questConfig';
import { getWorldConfig } from '@/lib/adventure/levelConfig';
import { getMasteryAura } from '@/lib/adventure/powerGrowth';
import { applyGemDetectorBoost, LEVELS_PER_WORLD } from '@/lib/adventure';
import { getStoryBeat } from '@/lib/adventure/storyConfig';
import { getStreakMilestone } from '@/lib/adventure/adventureStreak';
import GameplayBackground from './themed/GameplayBackground';
import { GameHeader, GameSidebar, GameGridArea, GameLayout, GameInfoStrip } from './ui';
import AdventureGameOverlays from './AdventureGameOverlays';
import AdventureTailOverlays from './AdventureTailOverlays';
import { hasSeenTutorial } from './AdventureTutorial';
import { useAdventureGameCallbacks } from './hooks/useAdventureGameCallbacks';
import { useAdventureOverlayProps } from './hooks/useAdventureOverlayProps';
import { useAdventureQuestTracking } from './hooks/useAdventureQuestTracking';
import { useAdventureGridInteraction } from './hooks/useAdventureGridInteraction';
import { useCrazyGamesLifecycle } from '@/hooks/useCrazyGamesLifecycle';
import { useInterstitialAd } from '@/hooks/useInterstitialAd';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useAdventureKeyboardShortcuts } from './hooks/useAdventureKeyboardShortcuts';
import { useAdventureSFX, useAdventureAnalytics } from './hooks/useAdventureSFXAndAnalytics';
import { useAdventureMusic } from '@/hooks/useAdventureMusic';
import type { LevelConfig, TileState, GridTileState } from '@/types/adventure';
import { MAX_EQUIPPED_RUNES } from '@/lib/adventure/runeCatalog';
import { RunePicker } from '@/components/wordForge/RunePicker';

export interface GameTimerState { timeRemaining: number; totalTime: number; isPlaying: boolean; isPaused: boolean; }

interface AdventureGameProps {
  levelConfig: LevelConfig;
  initialGrid: string[][];
  onLevelComplete: (stars: number, score: number, wordsFound: number, goldEarned: number, longWords?: number, wordList?: string[], timePlayed?: number) => void;
  onExit: () => void;
  onTimerStateChange?: (timerState: GameTimerState) => void;
  totalStars?: number;
  /** Callback to navigate to world map (used on last level of world) */
  onNextWorld?: () => void;
}


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
    const { user } = useAuth();
    const isGuest = !user?.id;
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
      playCoinCollectSound, playQuestCompleteSound: _playQuestCompleteSound, playBoardShuffleSound,
      playBossDefeatLegendarySound, playLegendaryWordSound,
      playFlashChallengeSound,
    } = useSoundEffects();

    // Forge mode: pre-level rune picker + equipped runes for RuneBar display
    const hasRunePick = boostedLevelConfig.hasRunePick ?? false;
    const {
      forgePickerOpen, forgeEquippedRunes, forgeOffering, forgeEffects,
      handleForgePick, handleForgeSkip,
    } = useAdventureForgePicker({ hasRunePick });

    const {
      gameState, tiles: tiles2D, tilesVersion, objectives, timeRemaining,
      timerStore,
      isPlaying, submitWordWithPath, startGame, pauseGame, completeLevel,
      resetGame, markCascadeComplete, isCascading, cascadePhase, addTime,
      activateFreeze, isFrozen, freezeUsed, useShuffle: shuffleTiles, shufflesRemaining, updateObjective,
      effectiveComboTimeout,
      upgradeState, upgradeTriggered, themedWordsFound, lastWordWasThemed,
      movesRemaining, currentHP, maxHP,
      huntTargetWord, huntAttempts, huntFound, setHuntTarget, submitHuntGuess,
    } = useAdventureGame({
      levelConfig: boostedLevelConfig, initialGrid,
      comboDecayMultiplier: init.upgradeEffects.comboDecayMultiplier * init.runeEffects.comboDecay * forgeEffects.comboDecay,
      upgradeConfig: {
        bombTimerInvert: init.upgradeEffects.bombTimerInvert,
        specialTileBoost: init.upgradeEffects.specialTileBoost,
        guaranteedGoldTile: init.upgradeEffects.guaranteedGoldTile,
        shuffleUses: init.upgradeEffects.shuffleUsesPerLevel,
        iceTileReduction: init.upgradeEffects.iceTileReduction,
      },
      upgradeState: init.upgrades,
      language: language || 'en',
    });

    const modeState = useAdventureModeAdapter(boostedLevelConfig);
    const tiles = useMemoizedFlatTiles(tiles2D, tilesVersion);
    const { recordAttempt, getLevelAttempt, getLevelCompletion, progression, updateWordAlbum, updateRunes, completeLevel: persistCompletion } = useProgression();
    // Wrap to ensure correct return type for saveCompletion prop
    const saveCompletionToDb = useCallback(
      async (
        world: number, level: number, stars: 0 | 1 | 2 | 3, score: number, words: number,
        goldEarned?: number, longWords?: number, wordsFound?: string[],
        flashChallengeGold?: number, timePlayed?: number
      ): Promise<boolean> => {
        const result = await persistCompletion(
          world, level, stars, score, words,
          goldEarned, longWords, wordsFound, flashChallengeGold, timePlayed
        );
        return result ?? false;
      },
      [persistCompletion]
    );
    const bestAttempt = useMemo(
      () => getLevelAttempt(levelConfig.world, levelConfig.level),
      [getLevelAttempt, levelConfig.world, levelConfig.level]
    );
    const streakMilestone = useMemo(
      () => getStreakMilestone(progression?.streak?.currentStreak ?? 0),
      [progression?.streak?.currentStreak]
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

    const { lastWordTileTypes, resetLastWordTileTypes } = useLastWordTileTypes({ wordsFoundLength: gameState.wordsFound.length, tiles });
    const prevWordsFoundLen = usePreviousValue(gameState.wordsFound.length);

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

    const { resetFlashGoldAward } = useFlashChallengeRewards({
      activeChallenge: flashChallenge.activeChallenge,
      isChallengeComplete: flashChallenge.isChallengeComplete,
      addGold: init.addGold,
      playFlashChallengeSound,
      playCoinCollectSound,
    });

    const { recordProgress: recordQuestProgress } = useDailyQuests({
      initialProgress: progression?.dailyQuestProgress,
      lastQuestDate: progression?.dailyQuestDate,
      currentWorld: progression?.currentWorld,
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
    const { showInterstitial } = useInterstitialAd();
    useInterstitialOnLevelComplete({
      isComplete: gameState.isComplete, showInterstitial,
      worldNumber: levelConfig.world, levelNumber: levelConfig.level,
    });

    const getScoreMultiplier = useCallback(() => 1, []);
    const augmentedSkillEffects = useMemo(() => ({
      ...init.skillEffects,
      bossDamageMultiplier: init.skillEffects.bossDamageMultiplier * init.runeEffects.bossDamage * forgeEffects.bossDamage,
    }), [init.skillEffects, init.runeEffects.bossDamage, forgeEffects.bossDamage]);

    const minWordLength = levelConfig.minWordLength ?? 2;
    const { validateWord, isValidating, solvedWords } = useAdventureWordValidation({
      grid: initialGrid, language: language || 'en', minWordLength, foundWords: gameState.wordsFound, tiles: tiles2D,
      centerLetter: modeState.centerLetterRequired ? modeState.centerLetter : null,
    });
    useHuntTargetPicker({ archetype: modeState.archetype, solvedWords, setHuntTarget });

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

    // Coarsen timeRemaining to avoid re-render every second — only changes at the 10s threshold
    const coarseTimeRemaining = timeRemaining <= 10 ? timeRemaining : 11;
    const lexiGameState = useMemo(() => ({
      wordsFound: gameState.wordsFound, comboCount: gameState.comboCount, timeRemaining: coarseTimeRemaining,
      isComplete: gameState.isComplete, stars: gameState.stars, worldId: levelConfig.world,
    }), [gameState.wordsFound, gameState.comboCount, coarseTimeRemaining, gameState.isComplete, gameState.stars, levelConfig.world]);

    const effects = useAdventureEffects({
      gameStateForReactions: { gameState: lexiGameState, isPlaying: isPlaying && entryPhase === 'playing' && !isPaused },
    });

    const getPopupStartPosition = useCallback(() => {
      if (selectedIndices.length === 0) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      const el = gridRef.current?.querySelectorAll('[role="gridcell"]')[selectedIndices[selectedIndices.length - 1]];
      if (el) { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
      return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    }, [selectedIndices, gridRef]);

    // Merge forge-picked rune score bonus into upgrade bonuses
    const forgeAugmentedBonuses = useMemo(() => ({
      ...init.upgradeBonuses,
      scoreBonus: init.upgradeBonuses.scoreBonus * forgeEffects.scoreMultiplier,
    }), [init.upgradeBonuses, forgeEffects.scoreMultiplier]);

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
      upgradeBonuses: forgeAugmentedBonuses, skillEffects: augmentedSkillEffects,
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
      upgradeBonuses: forgeAugmentedBonuses, upgradeEffects: init.upgradeEffects,
      bonusGoldMultiplier: init.runeEffects.goldMultiplier * init.streakMultiplier * forgeEffects.goldMultiplier,
      isFirstCompletion: !bestAttempt,
      awardXp: init.awardXp, addGold: init.addGold,
      recordAttempt, recordCompletion: init.recordCompletion, saveCompletion: saveCompletionToDb, updateWordAlbum, updateRunes,
      currentRunes: progression?.runes, currentFragments: progression?.runeFragments,
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
    useAdventureTimerReport({
      timeRemaining,
      totalTime: init.adjustedLevelConfig.timerSeconds,
      isPlaying,
      isPaused,
      entryPhase,
      onTimerStateChange,
    });

    useCombatComboMilestone({
      comboCount: gameState.comboCount,
      isPlaying, entryPhase, isPaused,
      checkMilestone: init.checkMilestone,
      prevComboCountRef: wordSubmit.prevComboCountRef,
    });

    useAutoPauseOnHidden({ isPlaying, isPaused, entryPhase, pauseGame, setIsPaused });

    const { handleCascadeComplete, handleEntryPhaseComplete } = useEntryPhaseHandlers({
      markCascadeComplete,
      advanceToPlaying: entryPhaseManager.advanceToPlaying,
      isPlaying,
      startGame,
      startAIDirector: init.startAIDirector,
      freeStartHint: init.upgradeEffects.freeStartHint,
      getHint,
    });

    const gridInteraction = useAdventureGridInteraction({
      isPlaying, isPaused, isValidating, selectTile, clearSelection,
      resetOnGameAction, startGame, pauseGame, setIsPaused,
      selectedIndices, currentWord, handleWordSubmit: wordSubmit.handleWordSubmit,
      tiles, cascadePhase, lastSubmittedWordRef: wordSubmit.lastSubmittedWordRef,
      gridRef, gridSize: levelConfig.gridSize, effects,
    });

    const { showLootOrComplete, handleStoryBeatContinue, handleLootChestComplete } = useLootCompletionFlow({
      lootDropsLength: levelCompletion.lootDrops?.length ?? 0,
      stars: gameState.stars,
      nonBossCompleted: levelCompletion.nonBossCompleted,
      setShowLootChest, setShowLevelComplete, setShowStoryBeat,
    });

    const { resetTracking } = useAdventureAnalytics({
      isPlaying, entryPhase, worldNumber: levelConfig.world, levelNumber: levelConfig.level,
      gameStars: gameState.stars, gameScore: gameState.score,
      nonBossCompleted: levelCompletion.nonBossCompleted,
      showVictoryCinematic: cinematics.showVictoryCinematic,
      showDefeatCinematic: cinematics.showDefeatCinematic,
      consecutiveFailures: (bestAttempt?.consecutiveFailures ?? 0) + 1,
    });

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
      timeRemaining,
      timerSeconds: init.adjustedLevelConfig.timerSeconds ?? 120,
    });

    const handleRetry = useCallback(() => {
      trackLevelRetried({
        world: levelConfig.world,
        level: levelConfig.level,
        attempt: (bestAttempt?.attemptCount ?? 0) + 1,
      });
      hintsUsedRef.current = 0;
      resetFlashGoldAward();
      resetTracking();
      resetLastWordTileTypes();
      handleRetryBase();
    }, [handleRetryBase, resetTracking, resetFlashGoldAward, resetLastWordTileTypes, levelConfig.world, levelConfig.level, bestAttempt]);

    const consecutiveFailures = (bestAttempt?.consecutiveFailures ?? 0) + (showLevelComplete && gameState.stars === 0 ? 1 : 0);
    const {
      showRetryAssist,
      handleRetryWithBonus, handleRetryWithHint, handleRetryFromAssist,
    } = useRetryAssistFlow({
      handleRetry, addTime, getHint,
      showLevelComplete, stars: gameState.stars, consecutiveFailures,
    });

    const { hintGoldPending, handleHintClick } = useHintGoldConfirm({
      hasHintsAvailable,
      nextHintCost,
      getHint,
      dismissAutoHint,
      onHintConsumed: useCallback(() => { hintsUsedRef.current += 1; }, []),
    });

    const hintHighlightIndices = useHintHighlightIndices({
      hintData: init.hintData,
      currentHint,
      gridSize: levelConfig.gridSize,
      isFrozen,
      freezeHighlightsWord: init.upgradeEffects.freezeHighlightsWord,
      remainingHintWords,
      findPathForWord,
      gemDetectorHighlights,
    });


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

    const overlayProps = useAdventureOverlayProps({
      bossOrch, cinematics, effects, levelCompletion, flashChallenge,
      gameState, modeState, init, levelConfig,
      isBossLevel, showLevelComplete, showLootChest, showStoryBeat, storyBeat,
      isPaused, entryPhase, timeRemaining, retriesUsed,
      objectives, totalStars, bestAttempt: bestAttempt ?? null, previousBestStars,
      streakMilestone, isGuest,
      isLastLevelOfWorld: levelConfig.level === LEVELS_PER_WORLD,
      t, saveCompletionToDb,
      handleContinue, handleRetry, onExit,
      handleCinematicComplete,
      handlePauseToggle: gridInteraction.handlePauseToggle,
      handleEntryPhaseComplete,
      handleStoryBeatContinue,
      handleLootChestComplete,
      handlePopupComplete: gridInteraction.handlePopupComplete,
      onNextWorld,
    });

    if (!isValidConfig) {
      return (
        <div data-testid="adventure-game" role="main" className="flex items-center justify-center h-full">
          <p className="text-neo-red font-bold">{t('adventure.loadError')}</p>
        </div>
      );
    }

    // Forge mode: show rune picker before gameplay starts
    if (forgePickerOpen && forgeOffering.length > 0) {
      return (
        <RunePicker
          offering={forgeOffering}
          equippedRunes={forgeEquippedRunes}
          maxSlots={MAX_EQUIPPED_RUNES}
          round={1}
          onPick={handleForgePick}
          onSkip={handleForgeSkip}
        />
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
              comboCount={gameState.comboCount} comboTimeoutMs={effectiveComboTimeout}
              modeDisplayKey={modeState.archetype !== 'classic' ? modeState.modeDisplayKey : undefined}
              showMoveCounter={modeState.showMoveCounter} movesRemaining={movesRemaining}
              showLifeBar={modeState.showLifeBar} currentHP={currentHP} maxHP={maxHP}
              infoStrip={
                (levelConfig.themeDisplayKey || (levelConfig.worldMechanic && !(isBossLevel && bossOrch.isBossActive)) || (upgradeState && Object.keys(upgradeState).length > 0)) ? (
                  <GameInfoStrip
                    themeDisplayKey={levelConfig.themeDisplayKey}
                    themedWordsFound={themedWordsFound.length}
                    themedWordCount={levelConfig.themedWordCount ?? 0}
                    themedBonusMultiplier={levelConfig.themedBonusMultiplier ?? 1}
                    worldColorPrimary={getWorldConfig(levelConfig.world).colorPrimary}
                    mechanic={!(isBossLevel && bossOrch.isBossActive) ? (levelConfig.worldMechanic ?? null) : null}
                    mechanicHitCount={wordSubmit.mechanicHitCount}
                    upgradeState={upgradeState}
                    upgradeTriggered={upgradeTriggered}
                  />
                ) : undefined
              } />
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
              centerLetter={modeState.centerLetterRequired ? modeState.centerLetter : null}
              hintLevel={init.hintData.level}
              bossGridEffect={bossOrch.gridEffectTrigger}
              lockedTileIndices={bossOrch.lockedTiles} />
          }
          sidebar={
            <GameSidebar objectives={objectives}
              showLifeBar={modeState.showLifeBar} currentHP={currentHP} maxHP={maxHP}
              showTargetWordUI={modeState.showTargetWordUI} huntTargetLength={huntTargetWord?.length ?? 0}
              huntAttempts={huntAttempts} onHuntGuess={submitHuntGuess} huntFound={huntFound ?? false}
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
          overlays={<AdventureGameOverlays {...overlayProps} />}
        />
        <AdventureTailOverlays
          archetype={modeState.archetype}
          currentHP={currentHP}
          movesRemaining={movesRemaining}
          isPlaying={isPlaying}
          upgradeTriggered={upgradeTriggered}
          lastWordWasThemed={lastWordWasThemed}
          themedBonusMultiplier={levelConfig.themedBonusMultiplier}
          mechanicBonus={wordSubmit.mechanicBonus}
          dismissMechanicBonus={wordSubmit.dismissMechanicBonus}
          bossActive={isBossLevel && bossOrch.isBossActive}
          showRetryAssist={showRetryAssist}
          consecutiveFailures={consecutiveFailures}
          wordsFoundCount={gameState.wordsFound.length}
          score={gameState.score}
          bestAttempt={bestAttempt ?? null}
          objectives={objectives}
          onRetryFromAssist={handleRetryFromAssist}
          onRetryWithBonus={handleRetryWithBonus}
          onRetryWithHint={handleRetryWithHint}
          onExit={onExit}
          showTutorial={showTutorial}
          onTutorialComplete={() => setShowTutorial(false)}
          forgeEquippedRunes={forgeEquippedRunes}
          maxRuneSlots={MAX_EQUIPPED_RUNES}
        />
      </div>
    );
  }
);

AdventureGame.displayName = 'AdventureGame';

export default AdventureGame;
