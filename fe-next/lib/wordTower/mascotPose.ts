import type { WordTowerBiomeId } from '@/shared/constants/wordTowerConstants';
import type { ApplyResult } from './wordTowerManager';

/**
 * Brand mascot pose selection for the Word Tower climb companion. Pure +
 * renderer-agnostic so the mapping is unit-testable. Every pose here MUST be a
 * transparent (`*Nobg` / `-nobg`) mascot variant — the companion floats over the
 * sky with no background box. Replaces the old construction crane (which read as
 * generic builder-game IP) with LexiClash personality that climbs alongside you.
 */
export type TowerMascotPose =
  | 'explorerNobg'
  | 'powerup'
  | 'onfire'
  | 'mindblown'
  | 'trophyNobg'
  | 'cryingNobg'
  | 'bored';

/** Transparent-only guarantee — used by tests to keep new poses safe over the sky. */
export const TRANSPARENT_TOWER_POSES: readonly TowerMascotPose[] = [
  'explorerNobg', 'powerup', 'onfire', 'mindblown', 'trophyNobg', 'cryingNobg', 'bored',
];

/** Resting pose by altitude band: eager explorer on the ground → cosmic awe up high. */
export function idleMascotPose(biomeId: WordTowerBiomeId): TowerMascotPose {
  switch (biomeId) {
    case 'city':
    case 'sky':
      return 'explorerNobg';
    case 'stratosphere':
    case 'orbit':
      return 'powerup';
    case 'nebula':
      return 'onfire';
    case 'galaxy':
      return 'mindblown';
    default:
      return 'explorerNobg';
  }
}

/** Transient cheer when a word is accepted — scales with how big the gain was. */
export function reactionMascotPose(tier: ApplyResult['tier']): TowerMascotPose {
  switch (tier) {
    case 'skyscraper':
      return 'mindblown';
    case 'tall':
    case 'highRise':
      return 'trophyNobg';
    default:
      return 'powerup';
  }
}

/** Brief kawaii sulk when a word is rejected. */
export const ERROR_MASCOT_POSE: TowerMascotPose = 'cryingNobg';
