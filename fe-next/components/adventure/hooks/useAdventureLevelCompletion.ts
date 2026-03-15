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
  awardXp: (xp: number) => { leveledUp: boolean; newLevel?: number };
  addGold: (amount: number) => void;
  recordAttempt: (...args: any[]) => void;
  recordCompletion: (data: any) => void;
  endAIDirector: () => void;
  handleEarnAchievement: (id: AdventureAchievementId) => boolean;
  pauseGame: () => void;
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
}

export function useAdventureLevelCompletion(props: UseAdventureLevelCompletionProps) {
  const {
    gameState, timeRemaining, timerSeconds, levelConfig, objectives,
    currentLevel, upgradeBonuses, upgradeEffects, awardXp, addGold,
    recordAttempt, recordCompletion, endAIDirector, handleEarnAchievement,
    pauseGame, showVictory, showDefeat,
    showLevelComplete, showVictoryCinematic, showDefeatCinematic,
    isBossLevel, isBossActive, bossHealthPhase, playerIsDead,
    endBossBattle, triggerBossTaunt,
  } = props;

  const [levelUpData, setLevelUpData] = useState<LevelUpPayload | null>(null);
  const [hasAwardedLevelRewards, setHasAwardedLevelRewards] = useState(false);
  const [lootDrops, setLootDrops] = useState<LootDrop[]>([]);
  const completionProcessedRef = useRef(false);

  // Store callbacks in refs for stable references
  const recordAttemptRef = useRef(recordAttempt);
  const recordCompletionRef = useRef(recordCompletion);
  const endAIDirectorRef = useRef(endAIDirector);
  const handleEarnAchievementRef = useRef(handleEarnAchievement);

  // Keep callback refs in sync and reset completion flag on level change
  useEffect(() => {
    recordAttemptRef.current = recordAttempt;
    recordCompletionRef.current = recordCompletion;
    endAIDirectorRef.current = endAIDirector;
    handleEarnAchievementRef.current = handleEarnAchievement;
    completionProcessedRef.current = false;
  }, [recordAttempt, recordCompletion, endAIDirector, handleEarnAchievement, levelConfig.world, levelConfig.level]);

  // Award XP and gold on level completion
  useEffect(() => {
    if ((gameState.isComplete || timeRemaining === 0) && !hasAwardedLevelRewards && gameState.stars > 0) {
      const difficultyMap: Record<number, 'easy' | 'medium' | 'hard'> = {
        1: 'easy', 2: 'easy', 3: 'medium', 4: 'medium', 5: 'hard',
      };
      const difficulty = difficultyMap[levelConfig.level] || 'medium';
      const isPerfectClear = gameState.stars === 3;
      const hasTimeBonus = timeRemaining > (timerSeconds * 0.5);

      const baseXp = calculateAdventureXp(
        difficulty,
        Math.max(1, gameState.comboCount),
        { perfectClear: isPerfectClear, timeBonus: hasTimeBonus ? 0.1 : 0 }
      );
      const earnedXp = Math.floor(baseXp * upgradeBonuses.xpBonus);

      const oldLevel = currentLevel;
      const levelUpResult = awardXp(earnedXp);

      const baseGold = 10 * gameState.stars;
      const perfectClearGoldBonus = isPerfectClear ? 50 : 0;
      const longWordBonus = (upgradeEffects?.longWordGoldBonus ?? 0) * gameState.wordsFound.filter(w => w.length >= 6).length;
      const goldMultiplier = upgradeEffects?.goldMultiplier ?? 1;
      const doubleFirst = upgradeEffects?.doubleFirstCompletionGold ? 2 : 1;
      addGold(Math.floor((baseGold + perfectClearGoldBonus + longWordBonus) * goldMultiplier * doubleFirst));

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

      if (levelUpResult.leveledUp && levelUpResult.newLevel !== undefined) {
        setLevelUpData({ oldLevel, newLevel: levelUpResult.newLevel, newTitles: [] });
      }

      setHasAwardedLevelRewards(true);
    }
    // Failure gold (Salvage Claw) — award consolation gold on 0-star attempts
    if ((gameState.isComplete || timeRemaining === 0) && !hasAwardedLevelRewards && gameState.stars === 0) {
      const failureGold = upgradeEffects?.failureGold ?? 0;
      if (failureGold > 0) addGold(failureGold);
      setHasAwardedLevelRewards(true);
    }
  }, [gameState.isComplete, gameState.stars, gameState.comboCount, gameState.score, gameState.wordsFound, timeRemaining, hasAwardedLevelRewards, levelConfig.level, levelConfig.world, timerSeconds, awardXp, addGold, currentLevel, upgradeBonuses.xpBonus, upgradeEffects, isBossLevel, props.isFirstCompletion]);

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

    if (isVictory) {
      showVictory();
    } else {
      showDefeat();
    }
    pauseGame();
  }, [showLevelComplete, showVictoryCinematic, showDefeatCinematic, gameState.isComplete, gameState.stars, timeRemaining, pauseGame, isBossLevel, bossHealthPhase, playerIsDead, showVictory, showDefeat]);

  // Boss Battle Completion
  useEffect(() => {
    if (!completionProcessedRef.current) return;
    if (!isBossActive || !isBossLevel) return;

    const playerDied = playerIsDead;
    const isVictory = bossHealthPhase === 'victory' && !playerDied;

    if (bossHealthPhase !== 'victory' && bossHealthPhase !== 'defeat') {
      endBossBattle(isVictory);
    }

    triggerBossTaunt(isVictory ? 'onVictory' : 'onDefeat');

    if (isVictory) {
      handleEarnAchievementRef.current('BOSS_SLAYER');
      // Boss Speedrun: defeat boss with >50% time remaining
      if (timeRemaining > timerSeconds * 0.5) {
        handleEarnAchievementRef.current('BOSS_SPEEDRUN');
      }
      // Boss No Damage: defeat boss without taking any damage (player HP = max)
      if (!playerDied && props.playerHealthPercent === 100) {
        handleEarnAchievementRef.current('BOSS_NO_DAMAGE');
      }
    }
  }, [isBossActive, isBossLevel, bossHealthPhase, playerIsDead, endBossBattle, triggerBossTaunt, timeRemaining, timerSeconds, props.playerHealthPercent]);

  // Achievement & Progress Recording
  useEffect(() => {
    if (!completionProcessedRef.current) return;
    if (!gameState.isComplete && timeRemaining > 0) return;

    if (gameState.stars === 3) {
      handleEarnAchievementRef.current('PERFECT_LEVEL');
    }

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
    });

    endAIDirectorRef.current();
  }, [gameState.isComplete, gameState.stars, gameState.wordsFound.length, gameState.score, timeRemaining, objectives, levelConfig.world, levelConfig.level, timerSeconds]);

  const handleLevelUpClose = useCallback(() => {
    setLevelUpData(null);
  }, []);

  // Reset rewards flag (needed for retry)
  const resetRewards = useCallback(() => {
    setHasAwardedLevelRewards(false);
    setLootDrops([]);
    completionProcessedRef.current = false;
  }, []);

  return {
    levelUpData,
    hasAwardedLevelRewards,
    lootDrops,
    handleLevelUpClose,
    resetRewards,
    completionProcessedRef,
  };
}
