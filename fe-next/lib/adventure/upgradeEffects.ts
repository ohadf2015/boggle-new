/**
 * Upgrade Visual Effects Configuration
 *
 * Defines how each upgrade manifests visually during gameplay.
 * Used by the adventure HUD, toast system, and tile renderer.
 */

export interface UpgradeVisualEffect {
  /** Upgrade ID from upgradeConfig */
  upgradeId: string;
  /** Icon emoji for HUD display */
  hudIcon: string;
  /** Translation key for trigger toast message */
  triggerToastKey: string;
  /** CSS animation class to apply when triggered */
  triggerAnimation: string;
  /** Sound effect ID to play on trigger */
  triggerSound: string;
  /** Whether this upgrade has a persistent visual on the board */
  hasBoardVisual: boolean;
  /** Board visual type (if hasBoardVisual) */
  boardVisualType?: 'glow' | 'pulse' | 'orbit' | 'overlay' | 'particle';
  /** Duration of trigger effect in ms */
  effectDurationMs: number;
  /** Per-tier visual intensity (1-based index) */
  tierIntensity: number[];
}

export const UPGRADE_VISUAL_EFFECTS: Record<string, UpgradeVisualEffect> = {
  wordRadar: {
    upgradeId: 'wordRadar',
    hudIcon: '📡',
    triggerToastKey: 'adventure.upgrades.toast.wordRadar',
    triggerAnimation: 'animate-radar-pulse',
    triggerSound: 'radar-ping',
    hasBoardVisual: true,
    boardVisualType: 'pulse',
    effectDurationMs: 3000,
    tierIntensity: [0.3, 0.5, 0.7, 0.85, 1.0],
  },
  deepDrill: {
    upgradeId: 'deepDrill',
    hudIcon: '⛏️',
    triggerToastKey: 'adventure.upgrades.toast.deepDrill',
    triggerAnimation: 'animate-drill-strike',
    triggerSound: 'drill-break',
    hasBoardVisual: true,
    boardVisualType: 'particle',
    effectDurationMs: 1500,
    tierIntensity: [0.5, 0.7, 0.85, 1.0],
  },
  gemDetector: {
    upgradeId: 'gemDetector',
    hudIcon: '💎',
    triggerToastKey: 'adventure.upgrades.toast.gemDetector',
    triggerAnimation: 'animate-gem-ping',
    triggerSound: 'gem-detect',
    hasBoardVisual: true,
    boardVisualType: 'glow',
    effectDurationMs: 2000,
    tierIntensity: [0.4, 0.7, 1.0],
  },
  fuelTank: {
    upgradeId: 'fuelTank',
    hudIcon: '⛽',
    triggerToastKey: 'adventure.upgrades.toast.fuelTank',
    triggerAnimation: 'animate-fuel-pour',
    triggerSound: 'fuel-fill',
    hasBoardVisual: false,
    effectDurationMs: 2000,
    tierIntensity: [0.4, 0.6, 0.8, 1.0],
  },
  armorPlating: {
    upgradeId: 'armorPlating',
    hudIcon: '🛡️',
    triggerToastKey: 'adventure.upgrades.toast.armorPlating',
    triggerAnimation: 'animate-shield-flash',
    triggerSound: 'shield-block',
    hasBoardVisual: true,
    boardVisualType: 'orbit',
    effectDurationMs: 1000,
    tierIntensity: [0.4, 0.6, 0.8, 1.0],
  },
  blastShield: {
    upgradeId: 'blastShield',
    hudIcon: '🔰',
    triggerToastKey: 'adventure.upgrades.toast.blastShield',
    triggerAnimation: 'animate-shield-absorb',
    triggerSound: 'shield-absorb',
    hasBoardVisual: true,
    boardVisualType: 'overlay',
    effectDurationMs: 1500,
    tierIntensity: [0.5, 0.75, 1.0],
  },
  luckyPickaxe: {
    upgradeId: 'luckyPickaxe',
    hudIcon: '⛏️',
    triggerToastKey: 'adventure.upgrades.toast.luckyPickaxe',
    triggerAnimation: 'animate-pickaxe-strike',
    triggerSound: 'gold-clink',
    hasBoardVisual: true,
    boardVisualType: 'particle',
    effectDurationMs: 1500,
    tierIntensity: [0.3, 0.5, 0.7, 1.0],
  },
  cargoBay: {
    upgradeId: 'cargoBay',
    hudIcon: '📦',
    triggerToastKey: 'adventure.upgrades.toast.cargoBay',
    triggerAnimation: 'animate-cargo-collect',
    triggerSound: 'cargo-store',
    hasBoardVisual: false,
    effectDurationMs: 1500,
    tierIntensity: [0.5, 0.75, 1.0],
  },
  salvageClaw: {
    upgradeId: 'salvageClaw',
    hudIcon: '🦀',
    triggerToastKey: 'adventure.upgrades.toast.salvageClaw',
    triggerAnimation: 'animate-claw-grab',
    triggerSound: 'claw-grab',
    hasBoardVisual: true,
    boardVisualType: 'particle',
    effectDurationMs: 1200,
    tierIntensity: [0.5, 0.75, 1.0],
  },
  wordDynamite: {
    upgradeId: 'wordDynamite',
    hudIcon: '🧨',
    triggerToastKey: 'adventure.upgrades.toast.wordDynamite',
    triggerAnimation: 'animate-dynamite-explode',
    triggerSound: 'dynamite-boom',
    hasBoardVisual: true,
    boardVisualType: 'particle',
    effectDurationMs: 2000,
    tierIntensity: [0.5, 0.75, 1.0],
  },
  timeFreeze: {
    upgradeId: 'timeFreeze',
    hudIcon: '❄️',
    triggerToastKey: 'adventure.upgrades.toast.timeFreeze',
    triggerAnimation: 'animate-freeze-shatter',
    triggerSound: 'ice-freeze',
    hasBoardVisual: true,
    boardVisualType: 'overlay',
    effectDurationMs: 5000,
    tierIntensity: [0.6, 1.0],
  },
};

/** Get visual effect config for an upgrade */
export function getUpgradeVisualEffect(upgradeId: string): UpgradeVisualEffect | undefined {
  return UPGRADE_VISUAL_EFFECTS[upgradeId];
}

/** Get all upgrades that have board visuals (for the tile renderer) */
export function getBoardVisualUpgrades(): UpgradeVisualEffect[] {
  return Object.values(UPGRADE_VISUAL_EFFECTS).filter(e => e.hasBoardVisual);
}

/** Get the visual intensity for an upgrade at a given tier */
export function getUpgradeIntensity(upgradeId: string, tier: number): number {
  const effect = UPGRADE_VISUAL_EFFECTS[upgradeId];
  if (!effect || tier < 1) return 0;
  const idx = Math.min(tier - 1, effect.tierIntensity.length - 1);
  return effect.tierIntensity[idx];
}

/**
 * Build the active upgrade indicators for the HUD.
 * Returns only upgrades the player has purchased (tier > 0).
 */
export function getActiveUpgradeIndicators(
  upgradeState: Record<string, number>
): { upgradeId: string; hudIcon: string; tier: number; intensity: number }[] {
  return Object.entries(upgradeState)
    .filter(([, tier]) => tier > 0)
    .map(([id, tier]) => {
      const effect = UPGRADE_VISUAL_EFFECTS[id];
      return {
        upgradeId: id,
        hudIcon: effect?.hudIcon ?? '⚙️',
        tier,
        intensity: getUpgradeIntensity(id, tier),
      };
    })
    .filter(ind => ind.intensity > 0);
}
