/**
 * useAdventureGameInit Hook
 *
 * Consolidates hook initialization for adventure mode:
 * adaptive difficulty, AI director, XP, currency, skills, achievements, combo.
 * Extracted from AdventureGame.tsx to reduce orchestrator size.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProgressionData } from '@/contexts/ProgressionContext';
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
import { getStreakMultiplier } from '@/lib/adventure/adventureStreak';
import { getWeeklyModifiers, applyModifiers } from '@/lib/adventure/weeklyModifiers';
import { applyMasteryBonuses, calculateArchetypeMastery } from '@/lib/adventure/archetypeMastery';
import { computeRuneEffects } from '@/lib/adventure/runeCatalog';

export interface UseAdventureGameInitProps {
  world: number;
  level: number;
  timerSeconds: number;
}

export function useAdventureGameInit({ world, level, timerSeconds }: UseAdventureGameInitProps) {
  const { user } = useAuth();
  const { progression } = useProgressionData();
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
    onLevelUp: () => {
      // Skill points are tracked internally by useSkillPoints
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

  // Rune effects — computed from player's equipped runes
  const playerRunes = progression?.runes;
  const runeEffects = useMemo(
    () => computeRuneEffects(playerRunes ?? []),
    [playerRunes]
  );

  // Streak multiplier — scales gold/XP based on consecutive play days
  const streakMultiplier = useMemo(
    () => getStreakMultiplier(progression?.streak?.currentStreak ?? 0),
    [progression?.streak?.currentStreak]
  );

  // Weekly modifiers — 3 rotating gameplay mutators per week (same for all players)
  const weeklyModifiers = useMemo(() => {
    const now = new Date();
    const jan1 = new Date(now.getFullYear(), 0, 1);
    const week = Math.ceil(((now.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
    return getWeeklyModifiers(now.getFullYear(), week);
  }, []);

  // Backwards-compatible upgrade bonuses (consumed by level completion + word submit)
  // Stacks: upgrade scoreBonus × rune scoreMultiplier × weekly scoreMultiplier
  const weeklyApplied = useMemo(
    () => applyModifiers({ timerSeconds: 0, scoreMultiplier: 1, minWordLength: 2 }, weeklyModifiers),
    [weeklyModifiers]
  );
  const upgradeBonuses = useMemo(() => ({
    timeBonus: 1, // handled via bonusTimeSeconds below
    scoreBonus: upgradeEffects.comboScoreMultiplier * runeEffects.scoreMultiplier * weeklyApplied.scoreMultiplier,
    xpBonus: streakMultiplier, // streak boosts XP
  }), [upgradeEffects.comboScoreMultiplier, runeEffects.scoreMultiplier, weeklyApplied.scoreMultiplier, streakMultiplier]);

  // Archetype mastery — derived from completion history
  const completions = progression?.completions;
  const archetypeMastery = useMemo(
    () => completions ? calculateArchetypeMastery(completions) : undefined,
    [completions]
  );

  // Adjusted level config with Fuel Tank + rune time bonuses + weekly timer modifier + mastery bonuses
  const adjustedLevelConfig = useMemo(() => {
    const baseTimer = adjustedConfig.timerSeconds + upgradeEffects.bonusTimeSeconds + runeEffects.timeBonus;
    const weeklyTimerMod = weeklyModifiers.reduce((m, mod) => m * (mod.effects.timerMultiplier ?? 1), 1);
    // Floor at 45s — even with aggressive modifiers, levels must remain playable
    const effectiveTimer = Math.max(Math.round(baseTimer * weeklyTimerMod), 45);
    const baseConfig = {
      ...adjustedConfig,
      timerSeconds: effectiveTimer,
      minWordLength: Math.max(adjustedConfig.minWordLength ?? 2, weeklyApplied.minWordLength) as 2 | 3,
    };
    // Apply archetype mastery bonuses (timer bonuses applied here, score/tiles at runtime)
    return applyMasteryBonuses(baseConfig, archetypeMastery);
  }, [adjustedConfig, upgradeEffects.bonusTimeSeconds, runeEffects.timeBonus, weeklyModifiers, weeklyApplied.minWordLength, archetypeMastery]);

  // Adjusted inactivity threshold from AI director + Word Radar upgrade + rune hint bonus
  const adjustedInactivityThresholdMs = useMemo(() => {
    const baseThreshold = 15000;
    const aiAdjusted = baseThreshold / intensityAdjustments.hintEscalationRate;
    // Word Radar upgrade + rune insight hint bonus
    const hintMultiplier = upgradeEffects.hintRechargeMultiplier + (runeEffects.hintBonus > 0 ? 0.3 : 0);
    return Math.floor(aiAdjusted / hintMultiplier);
  }, [intensityAdjustments.hintEscalationRate, upgradeEffects.hintRechargeMultiplier, runeEffects.hintBonus]);

  return useMemo(() => ({
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

    // Rune, streak & weekly modifier systems
    runeEffects,
    streakMultiplier,
    weeklyModifiers,
  }), [
    tier, hintData, powerUpCooldownMultiplier, recordCompletion, adjustedLevelConfig,
    intensityAdjustments, flowState, startAIDirector, endAIDirector, recordAIWord,
    handleAITransition, isAIBossBattle,
    totalXp, currentLevel, xpProgress, awardXp,
    gold, upgrades, addGold, purchase, getUpgradeEffect, upgradeBonuses, upgradeEffects,
    skillEffects, handleEarnAchievement,
    currentMilestone, checkMilestone,
    adjustedInactivityThresholdMs,
    runeEffects, streakMultiplier, weeklyModifiers,
  ]);
}
