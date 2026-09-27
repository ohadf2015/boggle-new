import { describe, it, expect } from 'vitest';
import { XP_WEIGHT_PER_GAME, XP_WEIGHT_PER_SCORE } from './xpByMode';
import { XP_CONFIG } from '../../backend/modules/xpManager';

// Guard: the read-time attribution weights must mirror the real XP system,
// so a future tweak to XP_CONFIG can't silently skew the breakdown.
describe('xpByMode weights mirror XP_CONFIG', () => {
  it('per-game weight equals GAME_COMPLETION', () => {
    expect(XP_WEIGHT_PER_GAME).toBe(XP_CONFIG.GAME_COMPLETION);
  });

  it('per-score weight equals SCORE_MULTIPLIER', () => {
    expect(XP_WEIGHT_PER_SCORE).toBe(XP_CONFIG.SCORE_MULTIPLIER);
  });
});
