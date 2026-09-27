import type { SOUND_EFFECTS } from '@/lib/audio/soundEffectsConfig';
import { Body } from 'matter-js';
import { PX_PER_M, type TowerWorld, getTowerHeightM, snapshotWorld, spawnBlock, stepWorld } from '@/lib/wordTowerV2/engine';
import { BLOCK_HEIGHT_PX, blockWidthForWord } from '@/lib/wordTowerV2/scoring';
import type { CraneSwing } from '@/lib/wordTowerV2/crane';
import type { LandingQuality, SupportTop } from '@/lib/wordTowerV2/landing';
import type { RunState } from '@/lib/wordTowerV2/run';
import type { RunStats } from '@/lib/wordTowerV2/achievements';
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

/**
 * Foundation perk: bleed off the settled tower's rocking. Pure damping — it can
 * only make an existing wobble smaller, never add motion — and at swayMult 1
 * the loop is skipped entirely.
 */
export function dampSway(world: TowerWorld, swayMult: number): void {
  if (swayMult >= 1) return;
  const damp = 1 - (1 - swayMult) * 0.25;
  for (const [id, body] of world.blocks) {
    if (body.isStatic || !world.landed.has(id)) continue;
    Body.setAngularVelocity(body, body.angularVelocity * damp);
  }
}

/** `?demo=1` review tower: drops `words` as settled floors, stepping physics between each. */
const DEMO_WORDS = ['tower', 'slab', 'anchor', 'crane', 'brick', 'ledge', 'beam', 'stack'];

export function seedDemoTower(world: TowerWorld, labels: Map<string, string>, words: string[] = DEMO_WORDS): number {
  words.forEach((word, index) => {
    const id = `r0-b${index}`;
    labels.set(id, word);
    spawnBlock(world, {
      id,
      // Lean cycles instead of growing: `index * 2.6` leant further every
      // floor, so a 20-floor review tower always toppled before you could see
      // the skies it was seeded to reach.
      x: (index % 2 === 0 ? 1 : -1) * (index % 4) * 2.6,
      y: -(getTowerHeightM(world) * PX_PER_M + BLOCK_HEIGHT_PX + 20),
      widthPx: blockWidthForWord(word),
      heightPx: BLOCK_HEIGHT_PX,
      vx: 0,
    });
    for (let t = 0; t < 900; t += 16.667) stepWorld(world, 16.667);
  });
  return words.length;
}

export interface Hanging {
  id: string;
  startedAt: number;
  wordLen: number;
  swing: CraneSwing;
  plumb: boolean;
  /** Crane line: the top floor's x at hoist, so the swing is centred over the tower. */
  pivotX: number;
}

export interface PendingLanding {
  id: string;
  wordLen: number;
  support: SupportTop | null;
  releasedAt: number;
}

/** Landing sound per verdict; a perfect inside a combo plays the combo sound instead (caller). */
export const LANDING_SOUND: Record<LandingQuality, keyof typeof SOUND_EFFECTS> = {
  perfect: 'perfectWord',
  good: 'pathConnect',
  sloppy: 'tileAppear',
  miss: 'comboBreak',
};

/** Fold one judged landing into the badge stats. */
export function recordLanding(s: RunStats, run: RunState, quality: LandingQuality): void {
  s.floors = run.floors;
  s.bestCombo = run.bestCombo;
  s.perfects += quality === 'perfect' ? 1 : 0;
  s.tenants = run.tenants;
  s.crates = run.crates;
}
