/**
 * useAdventureLevelCompletion Hook
 *
 * Manages level completion logic including:
 * - XP/gold awarding on completion
 * - Victory/defeat detection and cinematic triggering
 * - Achievement recording and progress tracking
 * Extracted from AdventureGame.tsx to reduce orchestrator size.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { calculateAdventureXp } from '@/shared/utils/adventureXpUtils';
import { generateLevelLoot } from '@/lib/adventure/lootGenerator';
import type { LootDrop } from '@/types/adventure';
import type { LevelUpPayload } from '@/components/education/LevelUpCelebration';
import type { BossTauntEvent } from '@/types/boss';
import type { AdventureAchievementId } from '@/utils/adventureAchievementUtils';

interface GameStateSlice {
  isComplete: boolean;
  stars: number;
  score: number;
  wordsFound: string[];
  comboCount: number;
}

interface ObjectiveSlice {
  type: string;
  current?: number;
  target?: number;
}

export interface UseAdventureLevelCompletionProps {
  gameState: GameStateSlice;
  timeRemaining: number;
  timerSeconds: number;
  levelConfig: { world: number; level: number };
  objectives: ObjectiveSlice[];
  currentLevel: number;
  upgradeBonuses: { xpBonus: number; timeBonus: number; scoreBonus: number };
  upgradeEffects?: { goldMultiplier: number; doubleFirstCompletionGold: boolean; failureGold: number; longWordGoldBonus: number };
  /** Combined gold multiplier from rune + streak + weekly (stacks with upgradeEffects.goldMultiplier) */
  bonusGoldMultiplier?: number;
  awardXp: (xp: number) => { leveledUp: boolean; newLevel?: number };
  addGold: (amount: number) => void;
  recordAttempt: (
    world: number,
    level: number,
    words: number,
    score: number,
    timeRemaining: number,
    objectiveProgress: Record<string, number>,
    isCompletion: boolean
  ) => void;
  recordCompletion: (data: any) => void;
  /** Eagerly save completion to DB (ProgressionContext.completeLevel) — called as soon as level ends */
  saveCompletion: (
    world: number,
    level: number,
    stars: 0 | 1 | 2 | 3,
    score: number,
    words: number,
    goldEarned?: number,
    longWords?: number,
    wordsFound?: string[],
    flashChallengeGold?: number
  ) => Promise<boolean>;
  /** Gold earned from completed flash challenge (persisted server-side) */
  flashChallengeGold?: number;
  /** Update word album with words found this level */
  updateWordAlbum?: (words: string[]) => void;
  endAIDirector: () => void;
  handleEarnAchievement: (id: AdventureAchievementId) => boolean;
  pauseGame: () => void;
  /** Dispatch COMPLETE_LEVEL to the game reducer (sets isComplete + calculates stars) */
  completeLevel: () => void;
  showVictory: () => void;
  showDefeat: () => void;
  showLevelComplete: boolean;
  showVictoryCinematic: boolean;
  showDefeatCinematic: boolean;
  isBossLevel: boolean;
  isBossActive: boolean;
  bossHealthPhase: string;
  playerIsDead: boolean;
  endBossBattle: (isVictory: boolean) => void;
  triggerBossTaunt: (event: BossTauntEvent) => void;
  isFirstCompletion?: boolean;
  /** Player health percentage (0-100) for boss no-damage achievement */
  playerHealthPercent?: number;
  /** Score retained from a previous retry (Salvage Claw upgrade) */
  retainedScore?: number;
}

export function useAdventureLevelCompletion(props: UseAdventureLevelCompletionProps) {
  const {
    gameState, timeRemaining, timerSeconds, levelConfig, objectives,
    currentLevel, upgradeBonuses, awardXp,
    recordAttempt, recordCompletion, endAIDirector, handleEarnAchievement,
    pauseGame, completeLevel, showVictory, showDefeat,
    showLevelComplete, showVictoryCinematic, showDefeatCinematic,
    isBossLevel, isBossActive, bossHealthPhase, playerIsDead,
    endBossBattle, triggerBossTaunt,
  } = props;

  const [levelUpData, setLevelUpData] = useState<LevelUpPayload | null>(null);
  const [hasAwardedLevelRewards, setHasAwardedLevelRewards] = useState(false);
  const [lootDrops, setLootDrops] = useState<LootDrop[]>([]);
  const [earnedXp, setEarnedXp] = useState<number>(0);
  const [earnedGold, setEarnedGold] = useState<number>(0);
  // Ref mirror of earnedGold — used by the eager DB save effect which fires
  // in the same React commit phase as the gold-awarding effect. useState updates
  // are batched to the next render, so the save effect's closure sees stale 0.
  // The ref is written synchronously and always has the correct value.
  const earnedGoldRef = useRef<number>(0);
  const [nonBossCompleted, setNonBossCompleted] = useState(false);
  const completionProcessedRef = useRef(false);
  /** Tracks whether recordAttempt has been fired to prevent duplicate API calls */
  const attemptRecordedRef = useRef(false);
  /** Tracks whether the DB save has been fired to prevent double-saves */
  const completionSavedRef = useRef(false);
  /** Tracks whether the eager DB save failed (so Continue/Retry can retry) */
  const completionSaveFailedRef = useRef(false);

  // Track if player ever took damage (for BOSS_NO_DAMAGE achievement)
  const playerTookDamageRef = useRef(false);
  useEffect(() => {
    if (isBossLevel && props.playerHealthPercent !== undefined && props.playerHealthPercent < 100) {
      playerTookDamageRef.current = true;
    }
  }, [isBossLevel, props.playerHealthPercent]);

  // Store callbacks in refs for stable references
  const recordAttemptRef = useRef(recordAttempt);
  const recordCompletionRef = useRef(recordCompletion);
  const saveCompletionRef = useRef(props.saveCompletion);
  const endAIDirectorRef = useRef(endAIDirector);
  const handleEarnAchievementRef = useRef(handleEarnAchievement);
  const updateWordAlbumRef = useRef(props.updateWordAlbum);

  // Keep callback refs in sync and reset completion flag on level change
  useEffect(() => {
    recordAttemptRef.current = recordAttempt;
    recordCompletionRef.current = recordCompletion;
    saveCompletionRef.current = props.saveCompletion;
    endAIDirectorRef.current = endAIDirector;
    handleEarnAchievementRef.current = handleEarnAchievement;
    updateWordAlbumRef.current = props.updateWordAlbum;
    completionProcessedRef.current = false;
    attemptRecordedRef.current = false;
    completionSavedRef.current = false;
    completionSaveFailedRef.current = false;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- refs synced intentionally without triggering re-render
  }, [recordAttempt, recordCompletion, props.saveCompletion, endAIDirector, handleEarnAchievement, levelConfig.world, levelConfig.level]);

  // Calculate estimated XP and gold for UI display on level completion.
  // Actual state updates happen server-side via ProgressionContext.completeLevel().
  // This eliminates client/server gold+XP divergence (C1 audit fix).
  useEffect(() => {
    if ((gameState.isComplete || timeRemaining === 0) && !hasAwardedLevelRewards && gameState.stars > 0) {
      const difficultyMap: Record<number, 'easy' | 'medium' | 'hard'> = {
        1: 'easy', 2: 'easy', 3: 'medium', 4: 'medium', 5: 'hard',
      };
      const difficulty = difficultyMap[levelConfig.level] || 'medium';
      const isPerfectClear = gameState.stars === 3;
      const hasTimeBonus = timeRemaining > (timerSeconds * 0.5);

      // Estimated XP for UI display — server is the source of truth
      const baseXp = calculateAdventureXp(
        difficulty,
        Math.max(1, gameState.comboCount),
        { perfectClear: isPerfectClear, timeBonus: hasTimeBonus ? 0.1 : 0 }
      );
      const computedXp = Math.floor(baseXp * upgradeBonuses.xpBonus);
      setEarnedXp(computedXp);

      // awardXp for level-up detection only (uses functional updater to avoid stale closure)
      const oldLevel = currentLevel;
      const levelUpResult = awardXp(computedXp);
      if (levelUpResult.leveledUp && levelUpResult.newLevel !== undefined) {
        setLevelUpData({ oldLevel, newLevel: levelUpResult.newLevel, newTitles: [] });
      }

      // Estimated gold for UI display — server calculates the real value
      const baseGold = (10 + levelConfig.world * 3) * gameState.stars;
      const perfectClearGoldBonus = isPerfectClear ? 50 : 0;
      const computedGold = baseGold + perfectClearGoldBonus;
      earnedGoldRef.current = computedGold;
      setEarnedGold(computedGold);
      // NOTE: addGold() is NOT called — gold is updated from server response
      // in ProgressionContext.completeLevel() to prevent client/server divergence

      // Generate loot drops
      const drops = generateLevelLoot({
        world: levelConfig.world,
        level: levelConfig.level,
        stars: gameState.stars as 0 | 1 | 2 | 3,
        score: gameState.score,
        isFirstCompletion: props.isFirstCompletion ?? true,
        isBossLevel,
      });
      setLootDrops(drops);

      setHasAwardedLevelRewards(true);
    }
    // Failure gold (Salvage Claw) — server handles via complete endpoint
    if ((gameState.isComplete || timeRemaining === 0) && !hasAwardedLevelRewards && gameState.stars === 0) {
      setHasAwardedLevelRewards(true);
    }
  }, [gameState.isComplete, gameState.stars, gameState.comboCount, gameState.score, gameState.wordsFound, timeRemaining, hasAwardedLevelRewards, levelConfig.level, levelConfig.world, timerSeconds, awardXp, currentLevel, upgradeBonuses.xpBonus, isBossLevel, props.isFirstCompletion]);

  // Victory/Defeat Detection & Cinematic Trigger
  useEffect(() => {
    if (showLevelComplete || showVictoryCinematic || showDefeatCinematic) return;
    if (completionProcessedRef.current) return;

    const playerDied = isBossLevel && playerIsDead;

    const shouldComplete = isBossLevel
      ? bossHealthPhase === 'victory' || bossHealthPhase === 'defeat' || timeRemaining === 0 || playerDied
      : gameState.isComplete || timeRemaining === 0;

    if (!shouldComplete) return;

    completionProcessedRef.current = true;

    const isVictory = isBossLevel
      ? bossHealthPhase === 'victory' && !playerDied
      : gameState.stars > 0;

    // Boss levels get cinematic treatment; non-boss levels skip straight to results
    if (isBossLevel) {
      if (isVictory) showVictory();
      else showDefeat();

      // Boss battle completion — handled in same effect as victory/defeat detection
      // to eliminate implicit ordering dependency on completionProcessedRef (M6 fix)
      if (isBossActive) {
        if (bossHealthPhase !== 'victory' && bossHealthPhase !== 'defeat') {
          endBossBattle(isVictory);
        }

        triggerBossTaunt(isVictory ? 'onVictory' : 'onDefeat');

        if (isVictory) {
          handleEarnAchievementRef.current('BOSS_SLAYER');
          if (timeRemaining > timerSeconds * 0.5) {
            handleEarnAchievementRef.current('BOSS_SPEEDRUN');
          }
          if (!playerIsDead && !playerTookDamageRef.current) {
            handleEarnAchievementRef.current('BOSS_NO_DAMAGE');
          }
        }
      }
    }

    // Ensure reducer marks game as complete (sets isComplete=true + calculates stars).
    // For non-boss timer=0, the TICK handler already does this. For boss endings
    // (HP=0, player death, timer=0 during boss), the reducer doesn't know the game
    // ended — completeLevel() bridges that gap.
    if (isBossLevel && !gameState.isComplete) {
      completeLevel();
    }

    pauseGame();
    setNonBossCompleted(!isBossLevel);
  }, [showLevelComplete, showVictoryCinematic, showDefeatCinematic, gameState.isComplete, gameState.stars, timeRemaining, pauseGame, completeLevel, isBossLevel, isBossActive, bossHealthPhase, playerIsDead, showVictory, showDefeat, endBossBattle, triggerBossTaunt, timerSeconds]);

  // Achievement & Progress Recording + Eager DB Save
  useEffect(() => {
    if (!completionProcessedRef.current) return;
    if (!gameState.isComplete && timeRemaining > 0) return;

    if (gameState.stars === 3) {
      handleEarnAchievementRef.current('PERFECT_LEVEL');
    }

    // Guard: only record attempt once per level completion to prevent
    // duplicate API calls that cause 429 rate limits (Sentry JAVASCRIPT-NEXTJS-9K)
    if (!attemptRecordedRef.current) {
      attemptRecordedRef.current = true;

      const objectiveProgress: Record<string, number> = {};
      for (const obj of objectives) {
        objectiveProgress[obj.type] = obj.current ?? 0;
      }

      recordAttemptRef.current(
        levelConfig.world, levelConfig.level,
        gameState.wordsFound.length, gameState.score,
        timeRemaining, objectiveProgress, gameState.stars > 0
      );

      recordCompletionRef.current({
        isCompletion: gameState.stars > 0,
        timeRemaining,
        timerSeconds,
        score: gameState.score,
        words: gameState.wordsFound.length,
        lootDrops,
        retainedScore: props.retainedScore ?? 0,
      });

      // Eagerly save completion to DB — don't wait for Continue button click.
      // This ensures progress is persisted even if user navigates away (browser back, exit).
      if (gameState.stars > 0 && !completionSavedRef.current) {
        completionSavedRef.current = true;
        const longWords = gameState.wordsFound.filter(w => w.length >= 6).length;
        saveCompletionRef.current(
          levelConfig.world, levelConfig.level,
          gameState.stars as 0 | 1 | 2 | 3,
          gameState.score, gameState.wordsFound.length,
          earnedGoldRef.current, longWords, gameState.wordsFound,
          props.flashChallengeGold
        ).then((success) => {
          if (!success) completionSaveFailedRef.current = true;
        }).catch(() => {
          // Mark as failed so Continue/Retry can retry — do NOT reset
          // completionSavedRef (that would let this effect re-fire and cause 429 cascades)
          completionSaveFailedRef.current = true;
        });
      }

      endAIDirectorRef.current();

      // Update word album with words found this level
      if (gameState.wordsFound.length > 0) {
        updateWordAlbumRef.current?.(gameState.wordsFound);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- wordsFound via ref (.length sufficient); earnedGoldRef instead of earnedGold state (stale closure)
  }, [gameState.isComplete, gameState.stars, gameState.wordsFound.length, gameState.score, timeRemaining, objectives, levelConfig.world, levelConfig.level, timerSeconds, lootDrops, props.retainedScore]);

  const handleLevelUpClose = useCallback(() => {
    setLevelUpData(null);
  }, []);

  // Reset rewards flag (needed for retry)
  const resetRewards = useCallback(() => {
    setHasAwardedLevelRewards(false);
    setLootDrops([]);
    setEarnedXp(0);
    setEarnedGold(0);
    earnedGoldRef.current = 0;
    setNonBossCompleted(false);
    completionProcessedRef.current = false;
    attemptRecordedRef.current = false;
    completionSavedRef.current = false;
    completionSaveFailedRef.current = false;
  }, []);

  return {
    levelUpData,
    hasAwardedLevelRewards,
    lootDrops,
    earnedXp,
    earnedGold,
    nonBossCompleted,
    handleLevelUpClose,
    resetRewards,
    completionProcessedRef,
    /** Whether the completion has been eagerly saved to DB */
    completionSavedRef,
    /** Whether the eager save failed (for Continue/Retry to retry) */
    completionSaveFailedRef,
  };
}
