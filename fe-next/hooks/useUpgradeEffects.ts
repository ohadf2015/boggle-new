/**
 * useUpgradeEffects Hook
 *
 * Translates Word Forge upgrade tiers into concrete gameplay modifiers.
 * This is the bridge between upgradeConfig (what's purchased) and
 * gameplay hooks (what the upgrades DO).
 */

'use client';

import { useMemo } from 'react';
import { getUpgradeTier, type UpgradeState } from '@/lib/adventure/upgradeConfig';

export interface UpgradeEffects {
  /** Extra timer seconds (Fuel Tank) */
  bonusTimeSeconds: number;
  /** Boss damage reduction multiplier, e.g. 0.8 = 20% less damage (Armor Plating) */
  bossDamageMultiplier: number;
  /** Block first boss attack? (Armor Plating T3) */
  blockFirstAttack: boolean;
  /** HP regen per word in boss fights (Armor Plating T4) */
  bossHealPerWord: number;
  /** Gold earning multiplier (Lucky Pickaxe) */
  goldMultiplier: number;
  /** Bonus gold per 6+ letter word (Lucky Pickaxe T3+) */
  longWordGoldBonus: number;
  /** Double gold on first completion? (Lucky Pickaxe T4) */
  doubleFirstCompletionGold: boolean;
  /** Combo decay speed multiplier, e.g. 0.7 = 30% slower (Cargo Bay) */
  comboDecayMultiplier: number;
  /** Combo score bonus multiplier (Cargo Bay T3) */
  comboScoreMultiplier: number;
  /** Gold earned on 0-star attempt (Salvage Claw T1) */
  failureGold: number;
  /** Score retention on retry, 0-1 (Salvage Claw T2) */
  retryScoreRetention: number;
  /** Free retries per world (Salvage Claw T3) */
  freeRetriesPerWorld: number;
  /** Hint recharge speed multiplier (Word Radar) */
  hintRechargeMultiplier: number;
  /** Hints per level (Word Radar T3+) */
  hintsPerLevel: number;
  /** Free hint on level start? (Word Radar T5) */
  freeStartHint: boolean;
  /** Special tile spawn boost, e.g. 0.2 = +20% (Gem Detector) */
  specialTileBoost: number;
  /** Guaranteed gold tile per cascade? (Gem Detector T3) */
  guaranteedGoldTile: boolean;
  /** Ice tiles take fewer hits? (Blast Shield T1) */
  iceTileReduction: boolean;
  /** Bomb tiles give time instead of taking? (Blast Shield T2) */
  bombTimerInvert: boolean;
  /** Immune to scramble attacks? (Blast Shield T3) */
  scrambleImmunity: boolean;
  /** Shuffle uses per level (Word Dynamite) */
  shuffleUsesPerLevel: number;
  /** Can detonate words? (Word Dynamite T3) */
  canDetonateWords: boolean;
  /** Bonus hints per level from Deep Drill upgrade */
  bonusHintsPerLevel: number;
  /** Time freeze seconds per level (Time Freeze) */
  timeFreezeSeconds: number;
  /** Highlight longest word during freeze? (Time Freeze T2) */
  freezeHighlightsWord: boolean;
}

const DEFAULT_EFFECTS: UpgradeEffects = {
  bonusTimeSeconds: 0,
  bossDamageMultiplier: 1,
  blockFirstAttack: false,
  bossHealPerWord: 0,
  goldMultiplier: 1,
  longWordGoldBonus: 0,
  doubleFirstCompletionGold: false,
  comboDecayMultiplier: 1,
  comboScoreMultiplier: 1,
  failureGold: 0,
  retryScoreRetention: 0,
  freeRetriesPerWorld: 0,
  hintRechargeMultiplier: 1,
  hintsPerLevel: 1,
  freeStartHint: false,
  specialTileBoost: 0,
  guaranteedGoldTile: false,
  iceTileReduction: false,
  bombTimerInvert: false,
  scrambleImmunity: false,
  shuffleUsesPerLevel: 0,
  canDetonateWords: false,
  bonusHintsPerLevel: 0,
  timeFreezeSeconds: 0,
  freezeHighlightsWord: false,
};

export function computeUpgradeEffects(upgrades: UpgradeState): UpgradeEffects {
  const effects = { ...DEFAULT_EFFECTS };

  // ── Fuel Tank ──
  const fuelTank = getUpgradeTier(upgrades, 'fuelTank');
  // Mirrors upgradeConfig.ts fuelTank tier values (player sees these in the shop).
  if (fuelTank >= 1) effects.bonusTimeSeconds = [0, 8, 15, 20, 25][fuelTank];

  // ── Armor Plating ──
  const armor = getUpgradeTier(upgrades, 'armorPlating');
  if (armor >= 1) effects.bossDamageMultiplier = [1, 0.9, 0.8, 0.65, 0.5][armor];
  if (armor >= 3) effects.blockFirstAttack = true;
  if (armor >= 4) effects.bossHealPerWord = 5;

  // ── Lucky Pickaxe ──
  const lucky = getUpgradeTier(upgrades, 'luckyPickaxe');
  if (lucky >= 1) effects.goldMultiplier = [1, 1.1, 1.25, 1.5, 1.75][lucky];
  if (lucky >= 3) effects.longWordGoldBonus = 5;
  if (lucky >= 4) effects.doubleFirstCompletionGold = true;

  // ── Cargo Bay ──
  const cargo = getUpgradeTier(upgrades, 'cargoBay');
  if (cargo >= 1) effects.comboDecayMultiplier = [1, 0.7, 0.5, 0.5][cargo];
  if (cargo >= 3) effects.comboScoreMultiplier = 1.5;

  // ── Salvage Claw ──
  const salvage = getUpgradeTier(upgrades, 'salvageClaw');
  if (salvage >= 1) effects.failureGold = 5;
  if (salvage >= 2) effects.retryScoreRetention = 0.5;
  if (salvage >= 3) effects.freeRetriesPerWorld = 1;

  // ── Word Radar ──
  const radar = getUpgradeTier(upgrades, 'wordRadar');
  if (radar >= 1) effects.hintRechargeMultiplier = [1, 1.3, 1.5, 1.5, 1.5, 1.5][radar];
  if (radar >= 3) effects.hintsPerLevel = [1, 1, 1, 2, 3, 3][radar];
  if (radar >= 5) effects.freeStartHint = true;

  // ── Deep Drill ──
  const drill = getUpgradeTier(upgrades, 'deepDrill');
  if (drill >= 1) effects.bonusHintsPerLevel = [0, 2, 3, 4, 5][drill];

  // ── Gem Detector ──
  const gem = getUpgradeTier(upgrades, 'gemDetector');
  if (gem >= 1) effects.specialTileBoost = [0, 0.2, 0.3, 0.3][gem];
  if (gem >= 3) effects.guaranteedGoldTile = true;

  // ── Blast Shield ──
  const blast = getUpgradeTier(upgrades, 'blastShield');
  if (blast >= 1) effects.iceTileReduction = true;
  if (blast >= 2) effects.bombTimerInvert = true;
  if (blast >= 3) effects.scrambleImmunity = true;

  // ── Word Dynamite ──
  const dynamite = getUpgradeTier(upgrades, 'wordDynamite');
  if (dynamite >= 1) effects.shuffleUsesPerLevel = [0, 1, 2, 2][dynamite];
  if (dynamite >= 3) effects.canDetonateWords = true;

  // ── Time Freeze ──
  const freeze = getUpgradeTier(upgrades, 'timeFreeze');
  if (freeze >= 1) effects.timeFreezeSeconds = [0, 5, 10][freeze];
  if (freeze >= 2) effects.freezeHighlightsWord = true;

  return effects;
}

export function useUpgradeEffects(upgrades: UpgradeState): UpgradeEffects {
  return useMemo(() => computeUpgradeEffects(upgrades), [upgrades]);
}
