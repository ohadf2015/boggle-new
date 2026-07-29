/**
 * useAdventureDerivations — bundled leaf derivations for AdventureGame.
 * All values are pure functions of inputs; no side effects, no state.
 * Generic over input shapes so spread-augmented outputs keep caller's field set.
 */
import { useCallback, useMemo } from 'react';
import { getMasteryAura } from '@/lib/adventure/powerGrowth';
import { getStreakMilestone } from '@/lib/adventure/adventureStreak';
import { getStoryBeat } from '@/lib/adventure/storyConfig';

interface InitShape {
  currentLevel: number;
  skillEffects: { bossDamageMultiplier: number };
  runeEffects: { bossDamage: number };
  upgradeBonuses: { scoreBonus: number };
}

interface Params<I extends InitShape, BA> {
  init: I;
  forgeEffects: { bossDamage: number; scoreMultiplier: number };
  levelConfig: { world: number; level: number };
  progression: { streak?: { currentStreak?: number } } | null | undefined;
  getLevelAttempt: (world: number, level: number) => BA;
  getLevelCompletion?: (world: number, level: number) => { stars?: number } | null | undefined;
  gameState: {
    wordsFound: string[]; comboCount: number; isComplete: boolean; stars: number;
  };
  timeRemaining: number;
  selectedIndices: number[];
  gridRef: { current: HTMLElement | null };
}

export function useAdventureDerivations<I extends InitShape, BA>(p: Params<I, BA>) {
  const { init, forgeEffects, levelConfig, progression, getLevelAttempt, getLevelCompletion,
    gameState, timeRemaining, selectedIndices, gridRef } = p;

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

  const masteryAura = useMemo(() => getMasteryAura(init.currentLevel), [init.currentLevel]);
  const storyBeat = useMemo(
    () => getStoryBeat(levelConfig.world, levelConfig.level),
    [levelConfig.world, levelConfig.level]
  );

  const augmentedSkillEffects = useMemo((): I['skillEffects'] => ({
    ...init.skillEffects,
    bossDamageMultiplier:
      init.skillEffects.bossDamageMultiplier * init.runeEffects.bossDamage * forgeEffects.bossDamage,
  }), [init.skillEffects, init.runeEffects.bossDamage, forgeEffects.bossDamage]);

  const forgeAugmentedBonuses = useMemo((): I['upgradeBonuses'] => ({
    ...init.upgradeBonuses,
    scoreBonus: init.upgradeBonuses.scoreBonus * forgeEffects.scoreMultiplier,
  }), [init.upgradeBonuses, forgeEffects.scoreMultiplier]);

  const coarseTimeRemaining = timeRemaining <= 10 ? timeRemaining : 11;
  const lexiGameState = useMemo(() => ({
    wordsFound: gameState.wordsFound, comboCount: gameState.comboCount,
    timeRemaining: coarseTimeRemaining,
    isComplete: gameState.isComplete, stars: gameState.stars, worldId: levelConfig.world,
  }), [gameState.wordsFound, gameState.comboCount, coarseTimeRemaining,
       gameState.isComplete, gameState.stars, levelConfig.world]);

  const getPopupStartPosition = useCallback(() => {
    if (selectedIndices.length === 0) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const el = gridRef.current?.querySelectorAll('[role="gridcell"]')[selectedIndices[selectedIndices.length - 1]];
    if (el) { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  }, [selectedIndices, gridRef]);

  return {
    bestAttempt,
    streakMilestone,
    previousBestStars,
    masteryAura,
    storyBeat,
    augmentedSkillEffects,
    forgeAugmentedBonuses,
    lexiGameState,
    getPopupStartPosition,
  };
}
