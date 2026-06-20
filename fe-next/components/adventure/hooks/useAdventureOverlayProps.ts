/**
 * useAdventureOverlayProps — assembles the props bag for AdventureGameOverlays.
 * Pulls grouped hook results (bossOrch, cinematics, effects, levelCompletion, etc.)
 * and returns a single spreadable object so AdventureGame stays presentational.
 */
import React, { useCallback, useMemo } from 'react';
import type { AdventureGameOverlaysProps } from '../AdventureGameOverlays';
import type {
  AdventureGameState, FlashChallenge, LevelConfig, LevelObjective, LevelAttempt, LootDrop,
} from '@/types/adventure';
import type { BossConfig, BossHealthState } from '@/types/boss';
import type { EffectCallbacks } from '@/hooks/useBossEffectExecutor';
import type { PlayerHealthState } from '@/hooks/usePlayerHealth';
import type { WorldUnlockCinematicProps } from '../cinematics/WorldUnlockCinematic';
import type { StoryBeat } from '@/lib/adventure/storyConfig';
import type { LexiReaction } from '@/hooks/useLexiReactions';
import type { LevelUpPayload } from '@/components/education/LevelUpCelebration';
import type { ComboMilestoneConfig } from '@/hooks/useComboMilestone';
import type { BossTier } from '@/components/celebration/BossDefeatFireworks';
import type { HintLevel } from '@/lib/adaptiveDifficulty';
import { LEVELS_PER_WORLD } from '@/lib/adventure';
import { peekQueue } from '@/lib/adventure/offlineCompletionQueue';

type ScorePopup = AdventureGameOverlaysProps['currentPopup'];
type ChainBurstConfig = AdventureGameOverlaysProps['chainBurstConfig'];
type ParticleConfig = AdventureGameOverlaysProps['particleConfig'];
type PendingExplosion = AdventureGameOverlaysProps['pendingExplosions'][number];

interface BossOrchInput {
  bossConfig: BossConfig | null;
  bossTaunt: string | null;
  showBossIntro: boolean;
  handleBossIntroStart: () => void;
  handleBossIntroSkip?: () => void;
  bossHealthState: BossHealthState;
  bossEffectCallbacks: EffectCallbacks;
  dealBossDamage: (baseDamage: number, mechanicMultiplier: number) => number;
  isBossActive: boolean;
  showBossFireworks: boolean;
  defeatedBossTier: BossTier | null;
  showEdgeVignette: boolean;
  playerHealthState: PlayerHealthState;
}

interface CinematicsInput {
  showVictoryCinematic: boolean;
  showDefeatCinematic: boolean;
  showWorldUnlockCinematic: boolean;
  worldUnlockProps: WorldUnlockCinematicProps | null;
}

interface EffectsInput {
  currentPopup: ScorePopup;
  scoreDisplayRef: React.RefObject<HTMLDivElement | null>;
  reaction: LexiReaction | null;
  dismissReaction: () => void;
  chainBurstConfig: ChainBurstConfig;
  setChainBurstConfig: (v: ChainBurstConfig) => void;
  particleConfig: ParticleConfig;
  setParticleConfig: (v: ParticleConfig) => void;
  pendingExplosions: PendingExplosion[];
  removeExplosion: (id: number) => void;
}

interface LevelCompletionInput {
  lootDrops: LootDrop[];
  earnedXp: number;
  earnedGold: number;
  levelUpData: LevelUpPayload | null;
  handleLevelUpClose: () => void;
  completionSaveFailedRef?: { current: boolean };
  completionSavedRef?: { current: boolean };
}

interface FlashChallengeInput {
  activeChallenge: FlashChallenge | null;
  isChallengeComplete: boolean;
  isChallengeFailed?: boolean;
  dismiss: () => void;
  challengeTimeLeft: number;
}

interface ModeStateInput {
  archetype: string;
  movesLimit: number;
  centerLetterRequired: boolean;
  centerLetter: string | null;
}

interface InitInput {
  hintData: { level: HintLevel };
  upgradeEffects: { freeRetriesPerWorld?: number };
  adjustedLevelConfig: { timerSeconds?: number };
  currentMilestone: ComboMilestoneConfig | null;
}

export interface UseAdventureOverlayPropsParams {
  bossOrch: BossOrchInput;
  cinematics: CinematicsInput;
  effects: EffectsInput;
  levelCompletion: LevelCompletionInput;
  flashChallenge: FlashChallengeInput;
  gameState: AdventureGameState;
  modeState: ModeStateInput;
  init: InitInput;
  isBossLevel: boolean;
  showLevelComplete: boolean;
  showLootChest: boolean;
  showStoryBeat: boolean;
  storyBeat: StoryBeat | null;
  isPaused: boolean;
  entryPhase: string;
  levelConfig: LevelConfig;
  timeRemaining: number;
  retriesUsed: number;
  objectives: LevelObjective[];
  totalStars?: number;
  bestAttempt: LevelAttempt | null;
  previousBestStars: number;
  streakMilestone: { days: number; rewardGold: number; titleKey: string } | null;
  isGuest: boolean;
  isLastLevelOfWorld: boolean;
  t: (key: string) => string;
  saveCompletionToDb: (
    world: number, level: number, stars: 0 | 1 | 2 | 3, score: number, words: number,
    goldEarned?: number, longWords?: number, wordsFound?: string[],
    flashChallengeGold?: number, timePlayed?: number
  ) => Promise<boolean>;
  handleContinue: () => void;
  handleRetry: () => void;
  onExit: () => void;
  handleCinematicComplete: () => void;
  handlePauseToggle: () => void;
  handleEntryPhaseComplete: () => void;
  handleStoryBeatContinue: () => void;
  handleLootChestComplete: () => void;
  handlePopupComplete: () => void;
  onNextWorld?: () => void;
}

export function useAdventureOverlayProps(p: UseAdventureOverlayPropsParams): AdventureGameOverlaysProps {
  const { bossOrch, cinematics, effects, levelCompletion, flashChallenge, gameState, modeState, init, levelConfig } = p;

  const onRetrySave = useCallback(() => {
    const longWords = gameState.wordsFound.filter((w: string) => w.length >= 6).length;
    const timePlayed = Math.max(0, Math.floor((init.adjustedLevelConfig.timerSeconds ?? 120) - p.timeRemaining));
    p.saveCompletionToDb(
      levelConfig.world, levelConfig.level,
      gameState.stars as 0 | 1 | 2 | 3,
      gameState.score, gameState.wordsFound.length,
      levelCompletion.earnedGold, longWords, gameState.wordsFound,
      undefined, timePlayed,
    ).then((ok) => {
      if (ok) {
        if (levelCompletion.completionSaveFailedRef) levelCompletion.completionSaveFailedRef.current = false;
        if (levelCompletion.completionSavedRef) levelCompletion.completionSavedRef.current = true;
      }
    });
  }, [gameState, init.adjustedLevelConfig.timerSeconds, p, levelConfig.world, levelConfig.level, levelCompletion]);

  const modeStats = useMemo(() => {
    if (modeState.archetype === 'classic' || modeState.archetype === 'boss') return null;
    return {
      archetype: modeState.archetype,
      movesRemaining: gameState.movesRemaining,
      movesTotal: modeState.movesLimit,
      huntAttempts: gameState.huntAttempts?.length,
      huntFound: gameState.huntFound,
      centerLetterWords: modeState.centerLetterRequired
        ? gameState.wordsFound.filter((w: string) =>
            w.toLowerCase().includes((modeState.centerLetter ?? '').toLowerCase()),
          ).length
        : undefined,
      totalWords: gameState.wordsFound.length,
    };
  }, [modeState, gameState]);

  // Suppress the "Progress not saved" banner if the save was queued for offline
  // replay — the system will retry it when connectivity returns or on next mount.
  // Showing the banner in that case is a false alarm that scares the player.
  // Note: the gate is global (any pending queue item), not per-level, so a stale
  // queued item from another level will also suppress the banner here.
  const hasPendingQueuedSaves = p.showLevelComplete && peekQueue().length > 0;
  const saveFailed = !p.isGuest && !!levelCompletion.completionSaveFailedRef?.current && p.showLevelComplete && !hasPendingQueuedSaves;

  return {
    bossConfig: bossOrch.bossConfig,
    bossTaunt: bossOrch.bossTaunt,
    showBossIntro: bossOrch.showBossIntro,
    handleBossIntroStart: bossOrch.handleBossIntroStart,
    handleBossIntroSkip: bossOrch.handleBossIntroSkip,
    bossHealthState: bossOrch.bossHealthState,
    bossEffectCallbacks: bossOrch.bossEffectCallbacks,
    bossComboCount: gameState.comboCount,
    onBossCombatDamage: bossOrch.dealBossDamage,
    isBossLevel: p.isBossLevel,
    isBossActive: bossOrch.isBossActive,
    showBossFireworks: bossOrch.showBossFireworks,
    defeatedBossTier: bossOrch.defeatedBossTier,
    showEdgeVignette: bossOrch.showEdgeVignette,
    playerHealthState: bossOrch.playerHealthState,
    showLevelComplete: p.showLevelComplete,
    gameStars: gameState.stars,
    gameScore: gameState.score,
    wordsFound: gameState.wordsFound,
    gameState,
    handleContinue: p.handleContinue,
    handleRetry: p.handleRetry,
    onExit: p.onExit,
    handleCinematicComplete: p.handleCinematicComplete,
    handlePauseToggle: p.handlePauseToggle,
    handleEntryPhaseComplete: p.handleEntryPhaseComplete,
    handleStoryBeatContinue: p.handleStoryBeatContinue,
    handleLootChestComplete: p.handleLootChestComplete,
    handlePopupComplete: p.handlePopupComplete,
    activeChallenge: flashChallenge.activeChallenge,
    isChallengeComplete: flashChallenge.isChallengeComplete,
    isChallengeFailed: flashChallenge.isChallengeFailed,
    dismissChallenge: flashChallenge.dismiss,
    challengeTimeLeft: flashChallenge.challengeTimeLeft,
    isPaused: p.isPaused,
    entryPhase: p.entryPhase,
    levelNumber: levelConfig.level,
    worldNumber: levelConfig.world,
    showVictoryCinematic: cinematics.showVictoryCinematic,
    showDefeatCinematic: cinematics.showDefeatCinematic,
    showWorldUnlockCinematic: cinematics.showWorldUnlockCinematic,
    worldUnlockProps: cinematics.worldUnlockProps,
    timeRemaining: p.timeRemaining,
    t: p.t,
    showLootChest: p.showLootChest,
    lootDrops: levelCompletion.lootDrops,
    objectives: p.objectives,
    totalStars: p.totalStars,
    bestAttempt: p.bestAttempt,
    previousBestStars: p.previousBestStars,
    earnedXp: levelCompletion.earnedXp,
    earnedGold: levelCompletion.earnedGold,
    isLastLevelOfWorld: p.isLastLevelOfWorld ?? levelConfig.level === LEVELS_PER_WORLD,
    onNextWorld: p.onNextWorld,
    saveFailed,
    onRetrySave,
    retriesUsed: p.retriesUsed,
    freeRetriesPerWorld: init.upgradeEffects.freeRetriesPerWorld ?? 0,
    storyBeat: p.storyBeat,
    showStoryBeat: p.showStoryBeat,
    currentPopup: effects.currentPopup,
    scoreDisplayRef: effects.scoreDisplayRef,
    reaction: effects.reaction,
    dismissReaction: effects.dismissReaction,
    chainBurstConfig: effects.chainBurstConfig,
    setChainBurstConfig: effects.setChainBurstConfig,
    particleConfig: effects.particleConfig,
    setParticleConfig: effects.setParticleConfig,
    pendingExplosions: effects.pendingExplosions,
    removeExplosion: effects.removeExplosion,
    levelUpData: levelCompletion.levelUpData,
    handleLevelUpClose: levelCompletion.handleLevelUpClose,
    currentMilestone: init.currentMilestone,
    streakMilestone: p.streakMilestone,
    modeStats,
  };
}
