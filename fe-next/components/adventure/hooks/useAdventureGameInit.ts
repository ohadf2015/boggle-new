/**
 * useAdventureGameInit Hook
 *
 * Consolidates hook initialization for adventure mode:
 * adaptive difficulty, AI director, XP, currency, skills, achievements, combo.
 * Extracted from AdventureGame.tsx to reduce orchestrator size.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAdaptiveDifficulty } from '@/hooks/useAdaptiveDifficulty';
import { useAIDirector } from '@/hooks/useAIDirector';
import { useAdventureXp } from '@/hooks/useAdventureXp';
import { useAdventureCurrency } from '@/hooks/useAdventureCurrency';
import { useSkillPoints } from '@/hooks/useSkillPoints';
import { useSkillEffects } from '@/hooks/useSkillEffects';
import { useAdventureAchievements } from '@/hooks/useAdventureAchievements';
import { useComboMilestone } from '@/hooks/useComboMilestone';
import { registerAllAbilities } from '@/lib/adventure/abilities';
import { showAchievementToast } from '@/components/achievements/AchievementToast';
import { ADVENTURE_ACHIEVEMENTS } from '@/utils/adventureAchievementUtils';

export interface UseAdventureGameInitProps {
  world: number;
  level: number;
  timerSeconds: number;
}

export function useAdventureGameInit({ world, level, timerSeconds }: UseAdventureGameInitProps) {
  // Register abilities once on mount
  useEffect(() => {
    registerAllAbilities();
  }, []);

  // Adaptive difficulty
  const {
    tier,
    adjustedConfig,
    hintData,
    powerUpCooldownMultiplier,
    recordCompletion,
  } = useAdaptiveDifficulty({ world, level });

  // AI Director
  const [aiDirectorSessionId] = useState(() => {
    const randomPart = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
    return `session-${world}-${level}-${randomPart}`;
  });

  const {
    intensityAdjustments,
    flowState,
    startSession: startAIDirector,
    endSession: endAIDirector,
    recordWord: recordAIWord,
    handleTransition: handleAITransition,
    isBossBattle: isAIBossBattle,
  } = useAIDirector({
    world,
    level,
    sessionId: aiDirectorSessionId,
    enableAnalytics: true,
  });

  // XP system
  const {
    totalXp,
    currentLevel,
    xpProgress,
    awardXp,
    pendingUpdate: xpPendingUpdate,
    acknowledgePersistence: acknowledgeXpPersistence,
  } = useAdventureXp({
    userId: 'temp-user-id',
    initialXp: 0,
  });

  // Currency system
  const {
    gold,
    upgrades,
    addGold,
    purchase,
    getUpgradeEffect,
    pendingUpdate: currencyPendingUpdate,
    acknowledgePersistence: acknowledgeCurrencyPersistence,
  } = useAdventureCurrency({
    userId: 'temp-user-id',
    initialGold: 0,
    initialUpgrades: { timeBonus: 0, scoreBonus: 0, xpBonus: 0 },
  });

  // Skill points (side-effect only)
  useSkillPoints({
    currentLevel,
    onLevelUp: ({ pointsAwarded }) => {
      console.log(`Earned ${pointsAwarded} skill point(s)!`);
    },
  });

  const skillEffects = useSkillEffects();

  // Achievements
  const { earnAchievement, getCount } = useAdventureAchievements();

  const handleEarnAchievement = useCallback(
    (achievementId: keyof typeof ADVENTURE_ACHIEVEMENTS) => {
      const isNewOrUpgraded = earnAchievement(achievementId);
      if (isNewOrUpgraded) {
        const achievement = ADVENTURE_ACHIEVEMENTS[achievementId];
        const count = getCount(achievementId) + 1;
        showAchievementToast({
          achievement,
          count,
          isNew: count === 1,
        });
      }
      return isNewOrUpgraded;
    },
    [earnAchievement, getCount]
  );

  // Combo milestone
  const { currentMilestone, checkMilestone } = useComboMilestone();

  // Upgrade bonuses
  const upgradeBonuses = useMemo(() => ({
    timeBonus: getUpgradeEffect('timeBonus').multiplier,
    scoreBonus: getUpgradeEffect('scoreBonus').multiplier,
    xpBonus: getUpgradeEffect('xpBonus').multiplier,
  }), [getUpgradeEffect]);

  // Adjusted level config with time bonus
  const adjustedLevelConfig = useMemo(() => {
    const bonusTime = Math.floor(adjustedConfig.timerSeconds * (upgradeBonuses.timeBonus - 1));
    return {
      ...adjustedConfig,
      timerSeconds: adjustedConfig.timerSeconds + bonusTime,
    };
  }, [adjustedConfig, upgradeBonuses.timeBonus]);

  // Adjusted inactivity threshold from AI director
  const adjustedInactivityThresholdMs = useMemo(() => {
    const baseThreshold = 15000;
    return Math.floor(baseThreshold / intensityAdjustments.hintEscalationRate);
  }, [intensityAdjustments.hintEscalationRate]);

  return {
    // Adaptive difficulty
    tier,
    hintData,
    powerUpCooldownMultiplier,
    recordCompletion,
    adjustedLevelConfig,

    // AI Director
    intensityAdjustments,
    flowState,
    startAIDirector,
    endAIDirector,
    recordAIWord,
    handleAITransition,
    isAIBossBattle,

    // XP
    totalXp,
    currentLevel,
    xpProgress,
    awardXp,

    // Currency
    gold,
    upgrades,
    addGold,
    purchase,
    getUpgradeEffect,
    upgradeBonuses,

    // Skills
    skillEffects,

    // Achievements
    handleEarnAchievement,

    // Combo
    currentMilestone,
    checkMilestone,

    // Hints
    adjustedInactivityThresholdMs,
  };
}
