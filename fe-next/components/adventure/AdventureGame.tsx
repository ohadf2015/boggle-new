/** AdventureGame — Main orchestrator for adventure mode gameplay. */
'use client';

import { memo, useCallback, useState, useMemo, useRef } from 'react';
import { usePreviousValue } from '@/hooks/usePreviousValue';
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
import { useChapterQuests } from '@/hooks/useChapterQuests';
import { getChapterNumber } from '@/lib/adventure/questConfig';
import { applyGemDetectorBoost, LEVELS_PER_WORLD } from '@/lib/adventure';
import { useMemoizedFlatTiles } from '@/lib/adventure/flattenTiles';
import AdventureGameShell from './AdventureGameShell';
import AdventureFinishCTA from './AdventureFinishCTA';
import { calculateStars, allObjectivesComplete } from '@/hooks/adventureGameReducer';
import { useAdventureDerivations } from './hooks/useAdventureDerivations';
import { useAdventureActions } from './hooks/useAdventureActions';
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
import type { LevelConfig } from '@/types/adventure';
import { MAX_EQUIPPED_RUNES } from '@/lib/adventure/runeCatalog';
import { RunePicker } from './RunePicker';

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
    const { t, language, dir } = useLanguage();
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

    // Apply forge timeBonus AFTER forgeEffects is available (can't fold into boostedLevelConfig due to hook order)
    const finalLevelConfig = useMemo(() => {
      if (forgeEffects.timeBonus === 0) return boostedLevelConfig;
      return { ...boostedLevelConfig, timerSeconds: (boostedLevelConfig.timerSeconds ?? 120) + forgeEffects.timeBonus };
    }, [boostedLevelConfig, forgeEffects.timeBonus]);

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
      levelConfig: finalLevelConfig, initialGrid,
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
    const [isPaused, setIsPaused] = useState(false);
    const [showLevelComplete, setShowLevelComplete] = useState(false);
    const [showLootChest, setShowLootChest] = useState(false);
    const [retriesUsed, setRetriesUsed] = useState(0);
    const [showStoryBeat, setShowStoryBeat] = useState(false);
    const [detonateActive, setDetonateActive] = useState(false);
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
      scrambleTiles: shuffleTiles,
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

    const chapterNumber = getChapterNumber(levelConfig.level);
    const chapterQuests = useChapterQuests({ worldId: levelConfig.world, chapterNumber });

    useAdventureQuestTracking({
      wordsFound: gameState.wordsFound, comboCount: gameState.comboCount,
      isBossLevel, bossCurrentHP: bossOrch.bossCurrentHP, bossMaxHP: bossOrch.bossMaxHP,
      playerCurrentHP: bossOrch.playerHealthState.currentHP, playerMaxHP: bossOrch.playerHealthState.maxHP,
      gridEffectTrigger: bossOrch.gridEffectTrigger,
      isChallengeComplete: flashChallenge.isChallengeComplete,
      chapterQuests, updateObjective,
    });

    useAdventureSFX({
      isPlaying, timeRemaining, wordsFoundLength: gameState.wordsFound.length,
      prevWordsFoundLen, comboCount: gameState.comboCount,
      sfx: {
        setGameActive, playCountdownBeep, playWordAcceptedSound, playComboSound,
        playCoinCollectSound,
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
      maxHintsPerLevel: init.upgradeEffects.hintsPerLevel + init.upgradeEffects.bonusHintsPerLevel + init.runeEffects.hintBonus + forgeEffects.hintBonus,
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

    const {
      bestAttempt, streakMilestone, previousBestStars, masteryAura, storyBeat,
      augmentedSkillEffects, forgeAugmentedBonuses, lexiGameState, getPopupStartPosition,
    } = useAdventureDerivations({
      init,
      forgeEffects,
      levelConfig,
      progression,
      getLevelAttempt,
      getLevelCompletion,
      gameState,
      timeRemaining,
      selectedIndices,
      gridRef,
    });

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
      upgradeBonuses: forgeAugmentedBonuses, skillEffects: augmentedSkillEffects,
      worldMechanic: levelConfig.worldMechanic ?? null,
      bossCurrentPhase: (bossOrch.bossMechanicState?.mechanicState?.currentPhase as string) ?? null,
      bossHealPerWord: init.upgradeEffects.bossHealPerWord,
      healPlayerHealth: bossOrch.isBossActive ? bossOrch.healPlayer : undefined,
      detonateActive,
      archetype: modeState.archetype,
      huntTargetWord,
      submitHuntGuess,
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
      userId: user?.id,
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
      isBossLevel,
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
      setShowLevelComplete, setRetriesUsed, setShowStoryBeat, setIsPaused,
      t, hintsUsed: hintsUsedRef.current,
      resetWordSubmitState: wordSubmit.resetWordSubmitState,
      resetFlashChallenge: flashChallenge.reset,
      completionSaveFailedRef: levelCompletion.completionSaveFailedRef,
      retrySaveCompletion: saveCompletionToDb,
      timeRemaining,
      timerSeconds: init.adjustedLevelConfig.timerSeconds ?? 120,
    });

    const { handleExitWithConfirm, handleRetry } = useAdventureActions({
      showLevelComplete, onExit, t,
      world: levelConfig.world, level: levelConfig.level,
      attemptCount: bestAttempt?.attemptCount ?? 0,
      hintsUsedRef, resetFlashGoldAward, resetTracking, resetLastWordTileTypes, handleRetryBase,
    });

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

    // "Finish Level" CTA: the level auto-ends once EVERY quest is done, but when
    // the required (primary) objectives are met and only an optional one remains,
    // let the player stop the clock and claim the stars they've already earned.
    const primaryObjectivesDone =
      objectives.length > 0 &&
      objectives.filter((o) => o.isPrimary).every((o) => (o.current ?? 0) >= o.target);
    const everyObjectiveDone = allObjectivesComplete(objectives);
    const showFinishCta =
      isPlaying &&
      entryPhase === 'playing' &&
      !isPaused &&
      !isBossLevel &&
      !isModalOpen &&
      primaryObjectivesDone &&
      !everyObjectiveDone;
    const starsSoFar = calculateStars(objectives);

    return (
      <>
      <AdventureGameShell
        bossOrch={bossOrch }
        wordSubmit={wordSubmit }
        gridInteraction={gridInteraction }
        modeState={modeState }
        init={init }
        gameState={gameState }
        effects={effects }
        levelConfig={levelConfig }
        chapterQuests={chapterQuests }
        overlayProps={overlayProps}
        timerStore={timerStore}
        isBossLevel={isBossLevel}
        showLevelComplete={showLevelComplete}
        isPaused={isPaused}
        isPlaying={isPlaying}
        entryPhase={entryPhase}
        timeRemaining={timeRemaining}
        effectiveComboTimeout={effectiveComboTimeout}
        masteryAura={masteryAura}
        currentHP={currentHP}
        maxHP={maxHP}
        movesRemaining={movesRemaining}
        themedWordsFound={themedWordsFound}
        upgradeState={upgradeState }
        upgradeTriggered={upgradeTriggered}
        lastWordWasThemed={lastWordWasThemed}
        showRetryAssist={showRetryAssist}
        consecutiveFailures={consecutiveFailures}
        showAutoHint={showAutoHint}
        currentHint={currentHint}
        nextHintCost={nextHintCost}
        hintGoldPending={hintGoldPending}
        freezeUsed={freezeUsed}
        isFrozen={isFrozen}
        shufflesRemaining={shufflesRemaining}
        detonateActive={detonateActive}
        hasHintsAvailable={hasHintsAvailable}
        minWordLength={minWordLength}
        currentWord={currentWord}
        isValidating={isValidating}
        tiles={tiles}
        selectedIndices={selectedIndices}
        hintHighlightIndices={hintHighlightIndices}
        adjacentIndices={adjacentIndices}
        pathPoints={pathPoints}
        objectives={objectives}
        huntTargetWord={huntTargetWord}
        huntAttempts={huntAttempts}
        huntFound={huntFound ?? false}
        bestAttempt={bestAttempt ?? null}
        forgeEquippedRunes={forgeEquippedRunes}
        gridRef={gridRef}
        handleExitWithConfirm={handleExitWithConfirm}
        handleCascadeComplete={handleCascadeComplete}
        handleEntryPhaseComplete={handleEntryPhaseComplete}
        handleHintClick={handleHintClick}
        activateFreeze={activateFreeze}
        shuffleTiles={shuffleTiles}
        playBoardShuffleSound={playBoardShuffleSound}
        setDetonateActive={setDetonateActive}
        handleRetryFromAssist={handleRetryFromAssist}
        handleRetryWithBonus={handleRetryWithBonus}
        handleRetryWithHint={handleRetryWithHint}
        onExit={onExit}
        submitHuntGuess={submitHuntGuess}
        t={t}
      />
      <AdventureFinishCTA
        visible={showFinishCta}
        starsSoFar={starsSoFar}
        onFinish={completeLevel}
        t={t}
        isRTL={dir === 'rtl'}
      />
      </>
    );
  }
);

AdventureGame.displayName = 'AdventureGame';

export default AdventureGame;
