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
import FlashChallengeToast from './FlashChallengeToast';
import { neoInfoToast } from '@/components/NeoToast';
import { getMasteryAura } from '@/lib/adventure/powerGrowth';
import { getStoryBeat } from '@/lib/adventure/storyConfig';
import { StoryBeatCard } from './StoryBeatCard';
import AdventureEffectsLayerFull, { AdventureEffectsLayer as EdgeVignetteLayer } from './effects/AdventureEffectsLayer';
import LevelCompleteModal from './LevelCompleteModal';
import LevelEntryOverlay from './LevelEntryOverlay';
import { BossOverlay, PlayerHealthBar } from './boss';
import dynamic from 'next/dynamic';
import { VICTORY_DURATION_FRAMES, DEFEAT_DURATION_FRAMES } from './cinematics';
import GameplayBackground from './themed/GameplayBackground';

// Dynamic imports — cinematics are heavy (Remotion) and only shown on level complete/defeat
const VictoryCinematic = dynamic(() => import('./cinematics/VictoryCinematic').then(mod => ({ default: mod.VictoryCinematic as React.ComponentType<any> })), { ssr: false });
const DefeatCinematic = dynamic(() => import('./cinematics/DefeatCinematic').then(mod => ({ default: mod.DefeatCinematic as React.ComponentType<any> })), { ssr: false });
const CinematicPlayer = dynamic(() => import('./boss/cinematics/CinematicPlayer').then(mod => ({ default: mod.CinematicPlayer })), { ssr: false });
import { GameHeader, GameSidebar, GameGridArea, PauseOverlay, GameLayout } from './ui';
import { useCrazyGamesLifecycle } from '@/hooks/useCrazyGamesLifecycle';
import type { LevelConfig, TileState, GridTileState } from '@/types/adventure';

export interface GameTimerState { timeRemaining: number; totalTime: number; isPlaying: boolean; isPaused: boolean; }

interface AdventureGameProps {
  levelConfig: LevelConfig;
  initialGrid: string[][];
  onLevelComplete: (stars: number, score: number) => void;
  onExit: () => void;
  onTimerStateChange?: (timerState: GameTimerState) => void;
  totalStars?: number;
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
  ({ levelConfig, initialGrid, onLevelComplete, onExit, onTimerStateChange, totalStars }) => {
    const isValidConfig = levelConfig.gridSize > 0 && levelConfig.objectives.length > 0;

    const init = useAdventureGameInit({ world: levelConfig.world, level: levelConfig.level, timerSeconds: levelConfig.timerSeconds ?? 120 });
    const {
      gameState, tiles: tiles2D, tilesVersion, objectives, timeRemaining, canComplete,
      isPlaying, cascadeComplete, submitWordWithPath, startGame, pauseGame, completeLevel,
      resetGame, markCascadeComplete, isCascading, cascadePhase, addTime, regenerateGrid,
    } = useAdventureGame({ levelConfig: init.adjustedLevelConfig, initialGrid });

    const tiles = useMemoizedFlatTiles(tiles2D, tilesVersion);
    const { t, language } = useLanguage();
    const { recordAttempt, getLevelAttempt } = useProgression();
    const bestAttempt = useMemo(
      () => getLevelAttempt(levelConfig.world, levelConfig.level),
      [getLevelAttempt, levelConfig.world, levelConfig.level]
    );

    const [isPaused, setIsPaused] = useState(false);
    const [showLevelComplete, setShowLevelComplete] = useState(false);
    const [showStoryBeat, setShowStoryBeat] = useState(false);
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
    });

    // CrazyGames SDK lifecycle — report gameplay and trigger happyTime on achievements
    useCrazyGamesLifecycle({
      isGameActive: isPlaying && entryPhase === 'playing' && !isPaused,
      isGameOver: gameState.isComplete,
      isWinner: (gameState.stars ?? 0) >= 1,
      score: gameState.score,
      maxCombo: gameState.comboCount,
      wordsFound: gameState.wordsFound.length,
    });

    const getScoreMultiplier = () => 1;

    const minWordLength = levelConfig.minWordLength ?? 3;
    const { validateWord, isValidating } = useAdventureWordValidation({
      grid: initialGrid, language: language || 'en', minWordLength, foundWords: gameState.wordsFound, tiles: tiles2D,
    });
    const gridRef = useRef<HTMLDivElement>(null);
    const { selectedIndices, currentWord, selectTile, clearSelection, getPath, pathPoints } = useAdventureSelection({
      tiles, gridSize: levelConfig.gridSize, disabled: !isPlaying || isPaused || isValidating, gridRef,
    });
    const effectiveCurrentWord = currentWord;

    const { hasHintsAvailable, getHint, currentHint, clearCurrentHint, recordActivity, showAutoHint, dismissAutoHint } = useAdventureHints({
      grid: initialGrid, language: language || 'en', foundWords: gameState.wordsFound,
      isPlaying: isPlaying && entryPhase === 'playing' && !isPaused, inactivityThresholdMs: init.adjustedInactivityThresholdMs,
    });

    const isModalOpen = showLevelComplete || cinematics.showVictoryCinematic || cinematics.showDefeatCinematic || bossOrch.showBossIntro || bossOrch.showBossFireworks;
    const { resetOnGameAction } = useLexiStuckDetection({
      onStuck: () => { neoInfoToast(t('adventure.lexi.stuckHint'), { icon: '💡', duration: 5000 }); },
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
      isPlaying, isPaused, isValidating, isCascading, currentWord, selectedIndices,
      gridSize: levelConfig.gridSize, minWordLength, validateWord, submitWordWithPath,
      clearSelection, clearCurrentHint, recordActivity, resetOnGameAction,
      comboCount: gameState.comboCount, wordsFound: gameState.wordsFound,
      isBossActive: bossOrch.isBossActive, bossConfig: bossOrch.bossConfig,
      checkBossWord: bossOrch.checkBossWord, dealBossDamage: bossOrch.dealBossDamage,
      triggerBossTaunt: bossOrch.triggerBossTaunt, handleEarnAchievement: init.handleEarnAchievement,
      recordAIWord: init.recordAIWord, handleAITransition: init.handleAITransition,
      addScorePopup: effects.addScorePopup, getScoreMultiplier,
      upgradeBonuses: init.upgradeBonuses, skillEffects: init.skillEffects,
      bossHealPerWord: init.upgradeEffects.bossHealPerWord,
      healPlayerHealth: bossOrch.isBossActive ? bossOrch.healPlayer : undefined,
      t, getPopupStartPosition: () => {
        if (selectedIndices.length === 0) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        const el = gridRef.current?.querySelectorAll('[role="gridcell"]')[selectedIndices[selectedIndices.length - 1]];
        if (el) { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
        return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      },
    });

    const levelCompletion = useAdventureLevelCompletion({
      gameState, timeRemaining, timerSeconds: init.adjustedLevelConfig.timerSeconds,
      levelConfig, objectives, currentLevel: init.currentLevel,
      upgradeBonuses: init.upgradeBonuses, upgradeEffects: init.upgradeEffects,
      awardXp: init.awardXp, addGold: init.addGold,
      recordAttempt, recordCompletion: init.recordCompletion,
      endAIDirector: init.endAIDirector, handleEarnAchievement: init.handleEarnAchievement,
      pauseGame, showVictory: cinematics.showVictory, showDefeat: cinematics.showDefeat,
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
      entryPhaseManager.advanceToObjectives();
    }, [markCascadeComplete, entryPhaseManager]);

    const handleObjectivesComplete = useCallback(() => {
      entryPhaseManager.advanceToTitle();
    }, [entryPhaseManager]);

    const handleTitleComplete = useCallback(() => {
      entryPhaseManager.advanceToPlaying();
      if (!isPlaying) { startGame(); init.startAIDirector(); }
    }, [isPlaying, startGame, init, entryPhaseManager]);

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

    const handleCinematicComplete = useCallback(() => {
      cinematics.handleCinematicComplete();
      if (storyBeat && gameState.stars > 0) {
        setShowStoryBeat(true);
      } else {
        setShowLevelComplete(true);
      }
    }, [cinematics, storyBeat, gameState.stars]);

    const handleStoryBeatContinue = useCallback(() => {
      setShowStoryBeat(false);
      setShowLevelComplete(true);
    }, []);

    const handleContinue = useCallback(() => {
      setShowLevelComplete(false);
      onLevelComplete(gameState.stars, gameState.score);
    }, [gameState.stars, gameState.score, onLevelComplete]);

    const handleRetry = useCallback(() => {
      setShowLevelComplete(false);
      levelCompletion.resetRewards();
      clearSelection(); resetGame();
      bossOrch.resetBossHealth(); bossOrch.resetPlayerHealth();
      cinematics.resetCinematics(); startGame();
    }, [resetGame, startGame, clearSelection, bossOrch, cinematics, levelCompletion]);

    const handleHintClick = useCallback(() => {
      if (hasHintsAvailable) { getHint(); dismissAutoHint(); }
    }, [hasHintsAvailable, getHint, dismissAutoHint]);

    const hintHighlightIndices = useMemo(() => {
      if (init.hintData.level !== 'none' && (init.hintData.highlightTiles?.length ?? 0) > 0) {
        return init.hintData.highlightTiles!.map(pos => pos.row * levelConfig.gridSize + pos.col);
      }
      if (!currentHint?.path) return [];
      return currentHint.path.map(pos => pos.row * levelConfig.gridSize + pos.col);
    }, [init.hintData, currentHint, levelConfig.gridSize]);

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
          <p className="text-neo-red font-bold">Invalid level configuration</p>
        </div>
      );
    }

    return (
      <div ref={effects.shakeRef} data-testid="adventure-game" role="main" aria-label="Adventure Mode Game" className="h-full w-full overflow-hidden relative" style={{ '--mastery-aura': masteryAura } as React.CSSProperties}>
        <GameplayBackground className="absolute inset-0 -z-10" />
        <GameLayout
          header={
            <GameHeader worldNumber={levelConfig.world} levelNumber={levelConfig.level}
              score={gameState.score} timeRemaining={timeRemaining} isPaused={isPaused}
              onPauseToggle={handlePauseToggle} onExit={onExit} />
          }
          gridArea={
            <GameGridArea tiles={tiles} gridSize={levelConfig.gridSize}
              selectedIndices={selectedIndices} onTileSelect={handleTileSelect}
              onWordSubmit={wordSubmit.handleWordSubmit}
              onDragStart={handleDragStart} onDragEnter={handleDragEnter}
              gridRef={gridRef}
              isInteractive={entryPhase === 'playing' && isPlaying && !isPaused && !isValidating}
              isDisabled={entryPhase !== 'playing' || !isPlaying || isPaused || isValidating}
              entryPhase={entryPhase} showCascade={entryPhase === 'cascade'}
              onCascadeComplete={handleCascadeComplete}
              hintHighlightIndices={hintHighlightIndices} pathPoints={pathPoints}
              validationError={wordSubmit.validationFeedback.error}
              isValidating={isValidating}
              isWordValid={wordSubmit.validationFeedback.isValid}
              wasWordSubmitted={wordSubmit.validationFeedback.wasSubmitted}
              lastAccepted={wordSubmit.lastAccepted}
              selectedLength={selectedIndices.length} minWordLength={minWordLength}
              wordFeedback={wordSubmit.wordFeedback}
              currentWord={effectiveCurrentWord}
              worldId={levelConfig.world}
              hintLevel={init.hintData.level} />
          }
          sidebar={
            <GameSidebar objectives={objectives}
              showSlideIn={entryPhase === 'objectives'} onSlideInComplete={handleObjectivesComplete}
              hasHintsAvailable={hasHintsAvailable} onHintClick={handleHintClick}
              showAutoHint={showAutoHint} currentHint={currentHint}
              hintLevel={init.hintData.level}
              className="border-t-2 lg:border-t-0 lg:border-l-2 border-neo-black/30" />
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
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 px-4 w-full max-w-md">
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
                isVisible={entryPhase === 'title'} onComplete={handleTitleComplete} />

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

              {!isBossLevel && (
                <LevelCompleteModal isOpen={showLevelComplete && cinematics.cinematicComplete}
                  stars={gameState.stars} score={gameState.score} objectives={objectives}
                  levelNumber={levelConfig.level} worldNumber={levelConfig.world}
                  onContinue={handleContinue} onRetry={handleRetry} onExit={onExit}
                  totalStars={totalStars} bestAttempt={bestAttempt} />
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
