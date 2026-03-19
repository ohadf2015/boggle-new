/** AdventureGame — Main orchestrator for adventure mode gameplay. */
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
import { getMasteryAura } from '@/lib/adventure/powerGrowth';
import { applyGemDetectorBoost, LEVELS_PER_WORLD } from '@/lib/adventure';
import { getStoryBeat } from '@/lib/adventure/storyConfig';
import GameplayBackground from './themed/GameplayBackground';
import { GameHeader, GameSidebar, GameGridArea, GameLayout } from './ui';
import AdventureGameOverlays from './AdventureGameOverlays';
import { useAdventureGameCallbacks } from './hooks/useAdventureGameCallbacks';
import { useAdventureQuestTracking } from './hooks/useAdventureQuestTracking';
import { useAdventureGridInteraction } from './hooks/useAdventureGridInteraction';
import { useCrazyGamesLifecycle } from '@/hooks/useCrazyGamesLifecycle';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
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
    const { playWordAcceptedSound, playComboSound, playComboBreakSound, setGameActive, playCountdownBeep } = useSoundEffects();

    const {
      gameState, tiles: tiles2D, tilesVersion, objectives, timeRemaining,
      isPlaying, submitWordWithPath, startGame, pauseGame, completeLevel,
      resetGame, markCascadeComplete, isCascading, cascadePhase, addTime,
      activateFreeze, isFrozen, freezeUsed, useShuffle, shufflesRemaining, updateObjective,
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

    const hasAwardedFlashGoldRef = useRef(false);
    useEffect(() => {
      if (flashChallenge.isChallengeComplete && flashChallenge.activeChallenge && !hasAwardedFlashGoldRef.current) {
        hasAwardedFlashGoldRef.current = true;
        init.addGold(flashChallenge.activeChallenge.rewardCoins);
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

    // SFX: gate sounds to active gameplay, countdown beep in last 10s
    useEffect(() => { setGameActive(isPlaying); return () => setGameActive(false); }, [isPlaying, setGameActive]);
    useEffect(() => { if (isPlaying && timeRemaining <= 10 && timeRemaining > 0) playCountdownBeep(timeRemaining); }, [isPlaying, timeRemaining, playCountdownBeep]);
    // SFX: play word accepted sound when a new word is found
    const prevWordsCountRef = useRef(0);
    useEffect(() => {
      if (gameState.wordsFound.length > prevWordsCountRef.current && isPlaying) {
        playWordAcceptedSound();
        if (gameState.comboCount >= 2) playComboSound(gameState.comboCount);
      }
      prevWordsCountRef.current = gameState.wordsFound.length;
    }, [gameState.wordsFound, gameState.comboCount, isPlaying, playWordAcceptedSound, playComboSound]);
    useCrazyGamesLifecycle({
      isGameActive: isPlaying && entryPhase === 'playing' && !isPaused,
      isGameOver: gameState.isComplete,
      isWinner: (gameState.stars ?? 0) >= 1,
      score: gameState.score,
      maxCombo: gameState.comboCount,
      wordsFound: gameState.wordsFound.length,
    });

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
      tiles, gridSize: levelConfig.gridSize, disabled: !isPlaying || isPaused || isValidating, gridRef,
      onClickSubmit: handleClickSubmit,
    });

    const { hasHintsAvailable, getHint, currentHint, clearCurrentHint, recordActivity, showAutoHint, dismissAutoHint, remainingHintWords, findPathForWord } = useAdventureHints({
      grid: initialGrid, language: language || 'en', foundWords: gameState.wordsFound,
      isPlaying: isPlaying && entryPhase === 'playing' && !isPaused, inactivityThresholdMs: init.adjustedInactivityThresholdMs,
      maxHintsPerLevel: init.upgradeEffects.hintsPerLevel,
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

    const handleCascadeComplete = useCallback(() => {
      markCascadeComplete();
      entryPhaseManager.advanceToPlaying();
      if (!isPlaying) { startGame(); init.startAIDirector(); }
      if (init.upgradeEffects.freeStartHint) {
        setTimeout(() => getHint(), 500);
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
    const { handleCinematicComplete, handleContinue, handleRetry } = useAdventureGameCallbacks({
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
    });

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
              onPauseToggle={gridInteraction.handlePauseToggle} onExit={onExit}
              gold={init.gold} xpProgress={init.xpProgress.progressPercent / 100} />
          }
          gridArea={
            <GameGridArea tiles={tiles} gridSize={levelConfig.gridSize}
              selectedIndices={selectedIndices} onTileSelect={gridInteraction.handleTileSelect}
              onWordSubmit={wordSubmit.handleWordSubmit}
              onDragStart={gridInteraction.handleDragStart} onDragEnter={gridInteraction.handleDragEnter} onDragEnd={gridInteraction.handleDragEnd}
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
            <AdventureGameOverlays
              bossConfig={bossOrch.bossConfig} bossMaxHP={bossOrch.bossMaxHP}
              bossTaunt={bossOrch.bossTaunt} showBossIntro={bossOrch.showBossIntro}
              handleBossIntroStart={bossOrch.handleBossIntroStart}
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
              dismissChallenge={flashChallenge.dismiss} challengeTimeLeft={flashChallenge.challengeTimeLeft}
              isPaused={isPaused} entryPhase={entryPhase}
              levelNumber={levelConfig.level} worldNumber={levelConfig.world}
              showVictoryCinematic={cinematics.showVictoryCinematic}
              showDefeatCinematic={cinematics.showDefeatCinematic}
              showWorldUnlockCinematic={cinematics.showWorldUnlockCinematic}
              worldUnlockProps={cinematics.worldUnlockProps}
              timeRemaining={timeRemaining} t={t}
              showLootChest={showLootChest} lootDrops={levelCompletion.lootDrops}
              objectives={objectives} totalStars={totalStars} bestAttempt={bestAttempt}
              earnedXp={levelCompletion.earnedXp} earnedGold={levelCompletion.earnedGold}
              isLastLevelOfWorld={levelConfig.level === LEVELS_PER_WORLD} onNextWorld={onNextWorld}
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
      </div>
    );
  }
);

AdventureGame.displayName = 'AdventureGame';

export default AdventureGame;
