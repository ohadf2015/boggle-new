import { describe, it, expect } from 'vitest';
import {
  freshRun, makeOffer, applyPick, advanceRun, signRun, verifyRun, publicRun, goldForScore, type RunPayload, enterNode,
} from '../runToken';
import { BASE_HP, RELIC_IDS } from '../relics';

const SECRET = 'run-secret';

describe('freshRun', () => {
  it('given a world, when a run starts, then it is step 1 at full HP with a starter potion and no offer', () => {
    const run = freshRun(2, 'u1', 'seed-a');
    expect(run).toMatchObject({ u: 'u1', w: 2, step: 1, hp: BASE_HP, maxHp: BASE_HP, relics: [], gold: 0, seed: 'seed-a' });
    expect(run.potions.heal).toBe(1);
    expect(run.offer).toBeUndefined();
  });
});

describe('signRun / verifyRun', () => {
  it('round-trips and rejects tampering', () => {
    const run = freshRun(1, 'u1', 's');
    const tok = signRun(run, SECRET);
    expect(verifyRun(tok, SECRET)).toEqual(run);
    const [, sig] = tok.split('.');
    const forged = Buffer.from(JSON.stringify({ ...run, relics: ['magnet'] })).toString('base64url');
    expect(verifyRun(`${forged}.${sig}`, SECRET)).toBeNull();
    expect(verifyRun(tok, 'other')).toBeNull();
    expect(verifyRun('junk', SECRET)).toBeNull();
  });

  it('given an attempt-shaped token signed with the same secret, when verified as a run, then it is refused', async () => {
    const { signAttempt } = await import('../attemptToken');
    const attempt = signAttempt({ u: 'u1', w: 1, l: 1, g: [['a']], lang: 'en', t: 1 }, SECRET);
    expect(verifyRun(attempt, SECRET)).toBeNull();
  });
});

describe('makeOffer', () => {
  it('given the same seed + step, when offered twice, then the offer is identical (no Math.random)', () => {
    expect(makeOffer('s1', 2, [], 3)).toEqual(makeOffer('s1', 2, [], 3));
  });

  it('given different steps, when offered, then offers differ somewhere across the run', () => {
    const offers = [2, 3, 4, 5, 6, 7].map((s) => JSON.stringify(makeOffer('s1', s, [], 3)));
    expect(new Set(offers).size).toBeGreaterThan(1);
  });

  it('given a draft size, when offered, then it returns that many distinct items incl. at least one relic', () => {
    for (const seed of ['a', 'b', 'c', 'd', 'e']) {
      const offer = makeOffer(seed, 3, [], 4);
      expect(offer).toHaveLength(4);
      expect(new Set(offer.map((o) => `${o.type}:${'id' in o ? o.id : ''}`)).size).toBe(4);
      expect(offer.some((o) => o.type === 'relic')).toBe(true);
    }
  });

  it('given owned relics, when offered, then owned relics are never offered again', () => {
    const owned = RELIC_IDS.slice(0, RELIC_IDS.length - 1);
    for (const seed of ['a', 'b', 'c', 'd']) {
      const relics = makeOffer(seed, 2, owned, 3).filter((o) => o.type === 'relic');
      for (const r of relics) expect(owned).not.toContain(r.id);
    }
  });
});

describe('applyPick', () => {
  const withOffer = (offer: RunPayload['offer']): RunPayload => ({ ...freshRun(1, 'u', 's'), step: 2, hp: 2, offer });

  it('given a relic pick, when applied, then the relic joins the run and the offer clears', () => {
    const run = applyPick(withOffer([{ type: 'relic', id: 'magnet' }, { type: 'gold', amount: 20 }]), 0);
    expect(run?.relics).toEqual(['magnet']);
    expect(run?.offer).toBeUndefined();
  });

  it('given heart-locket, when picked, then max HP and HP both rise', () => {
    const run = applyPick(withOffer([{ type: 'relic', id: 'heart-locket' }]), 0);
    expect(run?.maxHp).toBe(BASE_HP + 1);
    expect(run?.hp).toBe(3);
  });

  it('given potion / heal / gold picks, when applied, then the matching stat changes', () => {
    expect(applyPick(withOffer([{ type: 'potion', id: 'time' }]), 0)?.potions.time).toBe(1);
    expect(applyPick(withOffer([{ type: 'heal', amount: 10 }]), 0)?.hp).toBe(BASE_HP);
    expect(applyPick(withOffer([{ type: 'gold', amount: 25 }]), 0)?.gold).toBe(25);
  });

  it('given an index outside the offer, when applied, then it is refused', () => {
    expect(applyPick(withOffer([{ type: 'gold', amount: 1 }]), 3)).toBeNull();
    expect(applyPick(withOffer([{ type: 'gold', amount: 1 }]), -1)).toBeNull();
    expect(applyPick(withOffer(undefined), 0)).toBeNull();
  });
});

describe('advanceRun', () => {
  const base = (): RunPayload => ({ ...freshRun(1, 'u', 'seed'), potions: { heal: 1, time: 1, cleanse: 0, insight: 0 } });

  it('given a cleared node, when advanced, then hp is clamped, gold earned and the next offer dealt at this depth', () => {
    const start = enterNode(base(), 'r0l0');
    const next = advanceRun(start, { hpLeft: 99, potionsUsed: { heal: 1 }, score: 120 });
    // v2: the map position is NOT advanced here — the player picks the next node.
    expect(next.node).toBe('r0l0');
    expect(next.hp).toBe(BASE_HP);
    expect(next.gold).toBe(goldForScore(120));
    expect(next.potions.heal).toBe(0);
    expect(next.offer).toEqual(makeOffer('seed', 1, [], 3));
  });

  it('given lies about hp / potions, when advanced, then hp >= 0 and potions never go negative', () => {
    const next = advanceRun(base(), { hpLeft: -5, potionsUsed: { heal: 7, time: -3, bogus: 2 } as never, score: 0 });
    expect(next.hp).toBe(0);
    expect(next.potions.heal).toBe(0);
    expect(next.potions.time).toBe(1);
  });

  it('given gold-tooth, when advanced, then gold is multiplied', () => {
    const run = { ...base(), relics: ['gold-tooth' as const] };
    expect(advanceRun(run, { hpLeft: 3, potionsUsed: {}, score: 200 }).gold).toBe(Math.floor(goldForScore(200) * 1.5));
  });

  it('given a used phoenix revive, when advanced, then the feather is spent', () => {
    const run = { ...base(), relics: ['phoenix-feather' as const, 'magnet' as const] };
    expect(advanceRun(run, { hpLeft: 1, potionsUsed: {}, score: 10, reviveUsed: true }).relics).toEqual(['magnet']);
  });

  it('given lucky-clover, when advanced, then the next offer has 4 items', () => {
    const run = { ...base(), relics: ['lucky-clover' as const] };
    expect(advanceRun(run, { hpLeft: 3, potionsUsed: {}, score: 10 }).offer).toHaveLength(4);
  });
});

describe('publicRun', () => {
  it('strips the user id and seed', () => {
    const pub = publicRun(freshRun(1, 'u1', 'secret-seed'));
    expect(pub).not.toHaveProperty('u');
    expect(pub).not.toHaveProperty('seed');
    expect(pub.step).toBe(1);
    expect(pub.path).toEqual([]);
  });
});
