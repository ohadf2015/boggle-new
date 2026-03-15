/**
 * useAdventureGameInit Hook
 *
 * Consolidates hook initialization for adventure mode:
 * adaptive difficulty, AI director, XP, currency, skills, achievements, combo.
 * Extracted from AdventureGame.tsx to reduce orchestrator size.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProgression } from '@/contexts/ProgressionContext';
import { useAdaptiveDifficulty } from '@/hooks/useAdaptiveDifficulty';
import { useAIDirector } from '@/hooks/useAIDirector';
import { useAdventureXp } from '@/hooks/useAdventureXp';
import { useAdventureCurrency } from '@/hooks/useAdventureCurrency';
import { useSkillPoints } from '@/hooks/useSkillPoints';
import { useSkillEffects } from '@/hooks/useSkillEffects';
import { useUpgradeEffects } from '@/hooks/useUpgradeEffects';
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
  const { user } = useAuth();
  const { progression } = useProgression();
  const userId = user?.id ?? 'anonymous';

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
  } = useAdventureXp({
    userId,
    initialXp: progression?.xp ?? 0,
  });

  // Currency system
  const {
    gold,
    upgrades,
    addGold,
    purchase,
    getUpgradeEffect,
  } = useAdventureCurrency({
    userId,
    initialGold: progression?.gold ?? 0,
    initialUpgrades: progression?.upgrades ?? {},
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

  // Word Forge upgrade effects
  const upgradeEffects = useUpgradeEffects(upgrades);

  // Backwards-compatible upgrade bonuses (consumed by level completion + word submit)
  const upgradeBonuses = useMemo(() => ({
    timeBonus: 1, // handled via bonusTimeSeconds below
    scoreBonus: upgradeEffects.comboScoreMultiplier,
    xpBonus: 1, // XP bonus removed from upgrade system
  }), [upgradeEffects.comboScoreMultiplier]);

  // Adjusted level config with Fuel Tank time bonus
  const adjustedLevelConfig = useMemo(() => ({
    ...adjustedConfig,
    timerSeconds: adjustedConfig.timerSeconds + upgradeEffects.bonusTimeSeconds,
  }), [adjustedConfig, upgradeEffects.bonusTimeSeconds]);

  // Adjusted inactivity threshold from AI director + Word Radar upgrade
  const adjustedInactivityThresholdMs = useMemo(() => {
    const baseThreshold = 15000;
    const aiAdjusted = baseThreshold / intensityAdjustments.hintEscalationRate;
    // Word Radar upgrade: hintRechargeMultiplier > 1 means faster hint recharge (shorter threshold)
    return Math.floor(aiAdjusted / upgradeEffects.hintRechargeMultiplier);
  }, [intensityAdjustments.hintEscalationRate, upgradeEffects.hintRechargeMultiplier]);

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

    // Currency & Upgrades
    gold,
    upgrades,
    addGold,
    purchase,
    getUpgradeEffect,
    upgradeBonuses,
    upgradeEffects,

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
