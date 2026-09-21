import type { SOUND_EFFECTS } from '@/lib/audio/soundEffectsConfig';
import { type TowerWorld, snapshotWorld } from '@/lib/wordTowerV2/engine';
import type { SupportTop } from '@/lib/wordTowerV2/landing';
import type { RewardId } from '@/lib/wordTowerV2/rewards';

/** useTowerRun's pure helpers — kept out of the hook so it stays readable. */

const BEST_KEY = 'wordTowerV2.bestM';

export const REWARD_SOUND: Record<RewardId, keyof typeof SOUND_EFFECTS> = {
  steady: 'powerUp',
  plumb: 'powerUp',
  wide: 'giftReceived',
  rebar: 'vaultUnlock',
  scramble: 'timeBonus',
  jackpot: 'coinCascade',
};

export function readBest(): number {
  try {
    return Number(window.localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

export function writeBest(m: number): void {
  try {
    window.localStorage.setItem(BEST_KEY, m.toFixed(2));
  } catch {
    // Private mode: the best line just resets next visit.
  }
}

/** Landed floors, minus the slab on the hook — what "the tower" means to every rule below. */
export function standing(world: TowerWorld, skipId: string | null) {
  return snapshotWorld(world).blocks.filter((b) => b.id !== skipId && world.landed.has(b.id));
}

/** The settled floor the next drop should land on: highest top, excluding `skipId`. */
export function supportTop(world: TowerWorld, skipId: string | null): SupportTop | null {
  let best: SupportTop | null = null;
  for (const b of snapshotWorld(world).blocks) {
    if (b.id === skipId || !world.landed.has(b.id)) continue;
    const topY = b.y - b.heightPx / 2;
    if (!best || topY < best.topY) best = { x: b.x, topY, widthPx: b.widthPx };
  }
  return best;
}
