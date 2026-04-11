/** AdventureGame — Main orchestrator for adventure mode gameplay. */
'use client';

import React, { memo, useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { usePreviousValue } from '@/hooks/usePreviousValue';
import { trackLevelRetried, trackModalDismissed } from '@/utils/posthogEngagement';
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
import { GameHeader, GameSidebar, GameGridArea, GameLayout } from './ui';
import AdventureGameOverlays from './AdventureGameOverlays';
import MechanicBonusToast from './MechanicBonusToast';
import MechanicIndicator from './MechanicIndicator';
import RetryAssistModal from './RetryAssistModal';
import { getNearMissMessages } from '@/lib/adventure/nearMiss';
import { AdventureTutorial, hasSeenTutorial } from './AdventureTutorial';
import { AdventureUpgradeHUD } from './AdventureUpgradeHUD';
import AdventureThemeBanner from './AdventureThemeBanner';
import { AdventureToast } from './AdventureToast';
import { useAdventureGameCallbacks } from './hooks/useAdventureGameCallbacks';
import { useAdventureQuestTracking } from './hooks/useAdventureQuestTracking';
import { useAdventureGridInteraction } from './hooks/useAdventureGridInteraction';
import { useCrazyGamesLifecycle } from '@/hooks/useCrazyGamesLifecycle';
import { useInterstitialAd } from '@/hooks/useInterstitialAd';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useAdventureKeyboardShortcuts } from './hooks/useAdventureKeyboardShortcuts';
import { useAdventureSFX, useAdventureAnalytics } from './hooks/useAdventureSFXAndAnalytics';
import { useAdventureMusic } from '@/hooks/useAdventureMusic';
import type { LevelConfig, TileState, GridTileState } from '@/types/adventure';
import { pickHuntTarget } from '@/lib/adventure/huntMode';
import { pickRuneOffering, MAX_EQUIPPED_RUNES } from '@/lib/adventure/runeCatalog';
import type { RuneCardDef, RuneCard as RuneCardType } from '@/types/wordForge';
import { RunePicker } from '@/components/wordForge/RunePicker';
import { RuneBar } from '@/components/wordForge/RuneBar';
import dynamic from 'next/dynamic';
const WordWheelPixiRing = dynamic(() => import('@/components/daily/WordWheelPixiRing'), { ssr: false });

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

    const {
      gameState, tiles: tiles2D, tilesVersion, objectives, timeRemaining,
      timerStore,
      isPlaying, submitWordWithPath, startGame, pauseGame, completeLevel,
      resetGame, markCascadeComplete, isCascading, cascadePhase, addTime,
      activateFreeze, isFrozen, freezeUsed, useShuffle: shuffleTiles, shufflesRemaining, updateObjective,
      effectiveComboTimeout,
      upgradeState, upgradeTriggered, themedWordsFound, lastWordWasThemed,
      movesRemaining, currentHP, maxHP, takeDamage, heal,
      huntTargetWord, huntAttempts, huntFound, setHuntTarget, submitHuntGuess,
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

    const modeState = useAdventureModeAdapter(boostedLevelConfig);
    const tiles = useMemoizedFlatTiles(tiles2D, tilesVersion);
    const { recordAttempt, getLevelAttempt, getLevelCompletion, progression, updateWordAlbum, updateRunes, completeLevel: persistCompletion } = useProgression();
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
    // Show interstitial ad between adventure levels (natural break point)
    const { showInterstitial } = useInterstitialAd();
    const prevIsCompleteRef = useRef(false);
    useEffect(() => {
      if (gameState.isComplete && !prevIsCompleteRef.current) {
        showInterstitial('adventure-level-complete');
      }
      prevIsCompleteRef.current = gameState.isComplete;
    }, [gameState.isComplete, showInterstitial]);

    const getScoreMultiplier = useCallback(() => 1, []);
    const augmentedSkillEffects = useMemo(() => ({
      ...init.skillEffects,
      bossDamageMultiplier: init.skillEffects.bossDamageMultiplier * init.runeEffects.bossDamage,
    }), [init.skillEffects, init.runeEffects.bossDamage]);

    const minWordLength = levelConfig.minWordLength ?? 2;
    const { validateWord, isValidating, solvedWords } = useAdventureWordValidation({
      grid: initialGrid, language: language || 'en', minWordLength, foundWords: gameState.wordsFound, tiles: tiles2D,
      centerLetter: modeState.centerLetterRequired ? modeState.centerLetter : null,
    });
    // Hunt mode: pick a target word from the solved word set once it loads
    const huntTargetPickedRef = useRef(false);
    useEffect(() => {
      if (modeState.archetype !== 'hunt' || huntTargetPickedRef.current || !solvedWords) return;
      const target = pickHuntTarget(solvedWords);
      if (target) {
        setHuntTarget(target);
        huntTargetPickedRef.current = true;
      }
    }, [modeState.archetype, solvedWords, setHuntTarget]);

    // Forge mode: pre-level rune picker + equipped runes for RuneBar display
    const [forgePickerOpen, setForgePickerOpen] = useState(() => modeState.showRunePicker);
    const [forgeEquippedRunes, setForgeEquippedRunes] = useState<RuneCardType[]>([]);
    const forgeOffering = useMemo(
      () => modeState.showRunePicker ? pickRuneOffering(3) : [],
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [modeState.showRunePicker]
    );
    const handleForgePick = useCallback((rune: RuneCardDef, replaceIndex?: number) => {
      setForgeEquippedRunes(prev => {
        const card: RuneCardType = { def: rune, instanceId: `adv-pick-${rune.id}-${Date.now()}` };
        if (replaceIndex !== undefined) {
          const next = [...prev];
          next[replaceIndex] = card;
          return next;
        }
        return [...prev, card];
      });
      setForgePickerOpen(false);
    }, []);
    const handleForgeSkip = useCallback(() => { setForgePickerOpen(false); }, []);

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
      trackLevelRetried({
        world: levelConfig.world,
        level: levelConfig.level,
        attempt: (bestAttempt?.attemptCount ?? 0) + 1,
      });
      hintsUsedRef.current = 0;
      hasAwardedFlashGoldRef.current = false;
      resetTracking();
      setLastWordTileTypes([]);
      handleRetryBase();
    }, [handleRetryBase, resetTracking, levelConfig.world, levelConfig.level, bestAttempt]);

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
              showMoveCounter={modeState.showMoveCounter} movesRemaining={movesRemaining} />
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
          overlays={
            <AdventureGameOverlays
              bossConfig={bossOrch.bossConfig}
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
              saveFailed={!isGuest && levelCompletion.completionSaveFailedRef?.current && showLevelComplete}
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
              streakMilestone={streakMilestone}
            />
          }
        />
        {modeState.archetype === 'blast' && entryPhase === 'playing' && movesRemaining !== undefined && movesRemaining <= 3 && movesRemaining > 0 && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-20 animate-pulse">
            <div className="bg-neo-red/90 text-neo-cream font-neo-display font-black text-sm px-4 py-1.5 rounded-neo border-3 border-neo-black shadow-hard">
              {movesRemaining} {t('adventure.mode.blast.movesLeft')}
            </div>
          </div>
        )}
        {modeState.archetype === 'wheel' && entryPhase === 'playing' && (
          <div className="fixed inset-0 pointer-events-none z-10">
            <WordWheelPixiRing selectedIndices={selectedIndices} radius={Math.min(140, window.innerWidth * 0.18)} combo={gameState.comboCount} />
          </div>
        )}
        <AdventureToast
          upgradeTriggered={upgradeTriggered}
          lastWordWasThemed={lastWordWasThemed}
          themedBonusMultiplier={levelConfig.themedBonusMultiplier}
        />
        {upgradeState && Object.keys(upgradeState).length > 0 && (
          <div className="fixed top-2 right-16 z-10">
            <AdventureUpgradeHUD
              upgradeState={upgradeState}
              upgradeTriggered={upgradeTriggered}
            />
          </div>
        )}
        {levelConfig.themeDisplayKey && levelConfig.gameModeDisplayKey && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-10">
            <AdventureThemeBanner
              themeDisplayKey={levelConfig.themeDisplayKey}
              gameModeDisplayKey={levelConfig.gameModeDisplayKey}
              themedBonusMultiplier={levelConfig.themedBonusMultiplier ?? 1}
              themedWordCount={levelConfig.themedWordCount ?? 0}
              themedWordsFound={themedWordsFound.length}
              worldColorPrimary={getWorldConfig(levelConfig.world).colorPrimary}
            />
          </div>
        )}
        <MechanicBonusToast
          bonus={wordSubmit.mechanicBonus}
          onDismiss={wordSubmit.dismissMechanicBonus}
          bossActive={isBossLevel && bossOrch.isBossActive}
        />
        {entryPhase === 'playing' && levelConfig.worldMechanic && !(isBossLevel && bossOrch.isBossActive) && (
          <MechanicIndicator
            mechanic={levelConfig.worldMechanic}
            hitCount={wordSubmit.mechanicHitCount}
            worldNumber={levelConfig.world}
            className="fixed top-12 left-1/2 -translate-x-1/2 z-20"
          />
        )}
        {showRetryAssist && (
          <RetryAssistModal
            isOpen={showRetryAssist}
            consecutiveFailures={consecutiveFailures}
            bestWords={Math.max(gameState.wordsFound.length, bestAttempt?.bestWords ?? 0)}
            bestScore={Math.max(gameState.score, bestAttempt?.bestScore ?? 0)}
            attemptCount={(bestAttempt?.attemptCount ?? 0) + 1}
            nearMissMessages={getNearMissMessages(objectives)}
            onRetry={handleRetryFromAssist}
            onRetryWithBonus={handleRetryWithBonus}
            onRetryWithHint={handleRetryWithHint}
            onExit={() => { trackModalDismissed({ modalId: 'retry_assist', method: 'cta' }); onExit(); }}
          />
        )}
        {showTutorial && (
          <AdventureTutorial onComplete={() => setShowTutorial(false)} />
        )}
        {modeState.archetype === 'forge' && forgeEquippedRunes.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 z-30">
            <RuneBar runes={forgeEquippedRunes} maxSlots={MAX_EQUIPPED_RUNES} />
          </div>
        )}
      </div>
    );
  }
);

AdventureGame.displayName = 'AdventureGame';

export default AdventureGame;
