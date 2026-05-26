import type { CommitTier } from './commitTier';

export interface CommitScenePlan {
  ripple: boolean;
  wave: boolean;
  pathTrace: boolean;
  wordStamp: boolean;
  edgeFlash: boolean;
  auroraSweep: boolean;
  fullscreenBurst: boolean;
  sound: 'combo' | 'comboHigh' | 'victory' | null;
}

const PLANS: Record<CommitTier, CommitScenePlan> = {
  soft: {
    ripple: true,
    // Soft commits keep the existing low-key wave so we never *remove* feel
    // from a small play — the wave is the baseline "I did a thing" beat.
    wave: true,
    pathTrace: false,
    wordStamp: false,
    edgeFlash: false,
    auroraSweep: false,
    fullscreenBurst: false,
    sound: null,
  },
  nice: {
    ripple: true,
    wave: true,
    pathTrace: false,
    wordStamp: false,
    edgeFlash: false,
    auroraSweep: false,
    fullscreenBurst: false,
    sound: 'combo',
  },
  great: {
    ripple: true,
    wave: true,
    pathTrace: true,
    wordStamp: true,
    edgeFlash: false,
    auroraSweep: false,
    fullscreenBurst: false,
    sound: 'comboHigh',
  },
  huge: {
    ripple: true,
    wave: true,
    pathTrace: true,
    wordStamp: true,
    edgeFlash: true,
    auroraSweep: false,
    fullscreenBurst: true,
    sound: 'comboHigh',
  },
  bingo: {
    ripple: true,
    wave: true,
    pathTrace: true,
    wordStamp: true,
    edgeFlash: true,
    auroraSweep: true,
    fullscreenBurst: true,
    sound: 'victory',
  },
};

export function planCommitScenes(tier: CommitTier): CommitScenePlan {
  return PLANS[tier];
}

export const TIER_TINTS: Record<CommitTier, number> = {
  soft: 0xfffef0,
  nice: 0x00ffff,
  great: 0x8b5cf6,
  huge: 0xff6b35,
  bingo: 0xffe135,
};
