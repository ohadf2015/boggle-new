import { describe, it, expect } from 'vitest';
import { initWordTowerState, type WordTowerPlayerState } from '../wordTowerManager';
import {
  bombDamage,
  bankedBombs,
  checkBombSend,
  applyBomb,
  belowMedian,
  scrambleRegenMultiplier,
  type ReceiverVersusState,
} from '../versus';
import {
  WORD_TOWER_BOMB_RECV_CAP_FLOORS_PER_MIN,
  WORD_TOWER_REBUILD_SHIELD_S,
} from '@/shared/constants/wordTowerConstants';

function gameWithFloors(n: number, metersEach = 3): WordTowerPlayerState {
  const base = initWordTowerState({ gameCode: 'G', playerId: 'p', language: 'en' });
  const floors = Array.from({ length: n }, (_, i) => ({ word: `W${i}`, len: 2, meters: metersEach }));
  return { ...base, floors, heightM: n * metersEach, combo: 5, anchorLetter: 'X' };
}
const freshVersus = (): ReceiverVersusState => ({ shieldUntilMs: 0, damageLog: [] });

describe('versus — bomb damage scaling', () => {
  it('scales with lead, floored, clamped 1..5', () => {
    expect(bombDamage(15)).toBe(1);
    expect(bombDamage(44)).toBe(2);
    expect(bombDamage(75)).toBe(5);
    expect(bombDamage(500)).toBe(5); // capped
    expect(bombDamage(0)).toBe(1); // min
  });
});

describe('versus — banked bombs from charge ticks', () => {
  it('converts ticks to bars (4/bar), capped at max banked (2)', () => {
    expect(bankedBombs(0)).toBe(0);
    expect(bankedBombs(3)).toBe(0);
    expect(bankedBombs(4)).toBe(1);
    expect(bankedBombs(8)).toBe(2);
    expect(bankedBombs(99)).toBe(2); // capped
  });
});

describe('versus — checkBombSend gating', () => {
  const ok = { senderHeightM: 100, targetHeightM: 80, bankedBombs: 1, cooldownRemainingMs: 0, senderScrambles: 2 };

  it('allows when lead >= gate, has charge, off cooldown, has scramble', () => {
    const r = checkBombSend(ok);
    expect(r.allowed).toBe(true);
    expect(r.damage).toBe(1); // lead 20 -> 1
  });

  it('blocks when lead below gate', () => {
    expect(checkBombSend({ ...ok, targetHeightM: 90 })).toMatchObject({ allowed: false, reason: 'no_lead' });
  });

  it('blocks with no banked bomb', () => {
    expect(checkBombSend({ ...ok, bankedBombs: 0 })).toMatchObject({ allowed: false, reason: 'no_charge' });
  });

  it('blocks while on cooldown', () => {
    expect(checkBombSend({ ...ok, cooldownRemainingMs: 5000 })).toMatchObject({ allowed: false, reason: 'cooldown' });
  });

  it('blocks with no scramble to spend', () => {
    expect(checkBombSend({ ...ok, senderScrambles: 0 })).toMatchObject({ allowed: false, reason: 'no_scramble' });
  });
});

describe('versus — applyBomb to receiver', () => {
  it('removes top floors, drops height, resets combo, grants shield + scramble', () => {
    const g = gameWithFloors(10, 3); // height 30
    const v = freshVersus();
    const before = g.scramblesLeft;
    const res = applyBomb(g, v, 3, 1_000_000);
    expect(res.removed).toBe(3);
    expect(res.game.floors).toHaveLength(7);
    expect(res.game.heightM).toBeCloseTo(21);
    expect(res.game.combo).toBe(0);
    expect(res.game.scramblesLeft).toBe(before + 1); // comeback fuel
    expect(res.versus.shieldUntilMs).toBe(1_000_000 + WORD_TOWER_REBUILD_SHIELD_S * 1000);
  });

  it('is a no-op while the rebuild shield is active', () => {
    const g = gameWithFloors(10, 3);
    const v: ReceiverVersusState = { shieldUntilMs: 2_000_000, damageLog: [] };
    const res = applyBomb(g, v, 3, 1_000_000); // now < shieldUntil
    expect(res.removed).toBe(0);
    expect(res.game.floors).toHaveLength(10);
  });

  it('respects the per-minute damage cap', () => {
    const g = gameWithFloors(20, 3);
    const now = 1_000_000;
    // 7 floors already removed in the last minute -> only 1 more allowed (cap 8).
    const v: ReceiverVersusState = { shieldUntilMs: 0, damageLog: [{ ts: now - 10_000, floors: 7 }] };
    const res = applyBomb(g, v, 5, now);
    expect(res.removed).toBe(WORD_TOWER_RECV_CAP_REMAINING());
  });

  it('never removes more floors than exist', () => {
    const g = gameWithFloors(2, 3);
    const res = applyBomb(g, freshVersus(), 5, 1_000_000);
    expect(res.removed).toBe(2);
    expect(res.game.floors).toHaveLength(0);
  });
});

// helper: remaining cap when 7 already used = 1
function WORD_TOWER_RECV_CAP_REMAINING() {
  return WORD_TOWER_BOMB_RECV_CAP_FLOORS_PER_MIN - 7;
}

describe('versus — anti-snowball', () => {
  it('flags players below the field median', () => {
    expect(belowMedian(10, [10, 50, 90])).toBe(true);
    expect(belowMedian(90, [10, 50, 90])).toBe(false);
  });

  it('doubles scramble regen for trailing players', () => {
    expect(scrambleRegenMultiplier(true)).toBe(2);
    expect(scrambleRegenMultiplier(false)).toBe(1);
  });
});
