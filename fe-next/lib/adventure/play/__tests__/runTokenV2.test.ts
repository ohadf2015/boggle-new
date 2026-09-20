/**
 * Run token v2: the run carries the act map position (current node + visited
 * path) instead of a bare step, plus rest-site upgrades. v1 tokens are rejected.
 */
import { describe, it, expect } from 'vitest';
import {
  freshRun, enterNode, advanceRun, applyPick, signRun, verifyRun, publicRun,
  maxHpOf, hintBonusOf, restUpgrade, spendGold, RUN_VERSION, type RunPayload,
} from '../runToken';
import { signPayload } from '../attemptToken';
import { BASE_HP } from '../relics';

const SECRET = 'test-secret';

describe('freshRun v2', () => {
  it('Given a new run, When minted, Then it is version 2, standing off-map with an empty path', () => {
    const run = freshRun(3, 'u1', 'seed-a');
    expect(run.v).toBe(RUN_VERSION);
    expect(run.node).toBeNull();
    expect(run.path).toEqual([]);
    expect(run.step).toBe(1);
    expect(run.hp).toBe(BASE_HP);
  });
});

describe('verifyRun', () => {
  it('Given a v2 token, When verified, Then the run comes back', () => {
    const run = freshRun(1, 'u1', 's');
    expect(verifyRun(signRun(run, SECRET), SECRET)).toEqual(run);
  });

  it('Given a v1 token (no version), When verified, Then it is rejected', () => {
    const legacy = { u: 'u1', w: 1, step: 2, hp: 5, maxHp: 5, relics: [], potions: {}, gold: 0, seed: 's' };
    expect(verifyRun(signPayload(legacy, SECRET, 'run'), SECRET)).toBeNull();
  });

  it('Given a token signed with a future version, When verified, Then it is rejected', () => {
    const run = { ...freshRun(1, 'u1', 's'), v: 99 } as unknown as RunPayload;
    expect(verifyRun(signRun(run, SECRET), SECRET)).toBeNull();
  });
});

describe('enterNode', () => {
  it('Given a fresh run, When a node is entered, Then it becomes current and joins the path', () => {
    const run = enterNode(freshRun(1, 'u', 's'), 'r0l1');
    expect(run.node).toBe('r0l1');
    expect(run.path).toEqual(['r0l1']);
    expect(run.step).toBe(1);
  });

  it('Given a run mid-map, When the next node is entered, Then the path grows and step follows depth', () => {
    const run = enterNode(enterNode(freshRun(1, 'u', 's'), 'r0l1'), 'r1l2');
    expect(run.path).toEqual(['r0l1', 'r1l2']);
    expect(run.step).toBe(2);
  });

  it('Given purchases at a shop, When the run moves on, Then the bought list is cleared', () => {
    const shopping: RunPayload = { ...enterNode(freshRun(1, 'u', 's'), 'r0l1'), bought: [0, 2] };
    expect(enterNode(shopping, 'r1l0').bought).toBeUndefined();
  });
});

describe('advanceRun v2', () => {
  it('Given a cleared fight, When advanced, Then the map position is untouched and an offer is dealt', () => {
    const run = enterNode(freshRun(1, 'u', 'seed'), 'r0l1');
    const next = advanceRun(run, { hpLeft: 3, potionsUsed: {}, score: 100 });
    expect(next.node).toBe('r0l1');
    expect(next.path).toEqual(['r0l1']);
    expect(next.offer?.length).toBeGreaterThanOrEqual(3);
    expect(next.gold).toBeGreaterThan(0);
    expect(next.hp).toBe(3);
  });

  it('Given two different depths, When advanced, Then the offers differ somewhere', () => {
    const a = advanceRun(enterNode(freshRun(1, 'u', 'seed'), 'r0l1'), { hpLeft: 3, potionsUsed: {}, score: 10 });
    const b = advanceRun(enterNode(a, 'r1l1'), { hpLeft: 3, potionsUsed: {}, score: 10 });
    expect(JSON.stringify(a.offer)).not.toBe(JSON.stringify(b.offer));
  });
});

describe('rest upgrades', () => {
  it('Given a run with no upgrades, When max HP is read, Then it is the relic value', () => {
    expect(maxHpOf(freshRun(1, 'u', 's'))).toBe(BASE_HP);
    expect(hintBonusOf(freshRun(1, 'u', 's'))).toBe(0);
  });

  it('Given an HP upgrade, When applied, Then max HP and current HP both rise by one', () => {
    const run = { ...freshRun(1, 'u', 's'), hp: 2 };
    const up = restUpgrade(run, 'maxHp');
    expect(maxHpOf(up)).toBe(BASE_HP + 1);
    expect(up.maxHp).toBe(BASE_HP + 1);
    expect(up.hp).toBe(3);
  });

  it('Given a hint upgrade, When applied, Then the hint bonus rises and HP does not', () => {
    const up = restUpgrade({ ...freshRun(1, 'u', 's'), hp: 2 }, 'hint');
    expect(hintBonusOf(up)).toBe(1);
    expect(up.hp).toBe(2);
  });

  it('Given an HP upgrade and then a heart-locket, When the pick lands, Then both bonuses stack', () => {
    const up = restUpgrade(freshRun(1, 'u', 's'), 'maxHp');
    const withOffer: RunPayload = { ...up, offer: [{ type: 'relic', id: 'heart-locket' }] };
    const picked = applyPick(withOffer, 0)!;
    expect(picked.maxHp).toBe(BASE_HP + 2);
  });
});

describe('spendGold', () => {
  it('Given enough gold, When spent, Then it is deducted', () => {
    expect(spendGold({ ...freshRun(1, 'u', 's'), gold: 100 }, 60)?.gold).toBe(40);
  });

  it('Given too little gold, When spent, Then the purchase is refused and gold never goes negative', () => {
    expect(spendGold({ ...freshRun(1, 'u', 's'), gold: 50 }, 60)).toBeNull();
  });
});

describe('publicRun', () => {
  it('Given a run, When made public, Then the user id and seed are stripped but the map position stays', () => {
    const run = enterNode(freshRun(1, 'u', 'secret-seed'), 'r0l0');
    const pub = publicRun(run) as Record<string, unknown>;
    expect(pub.u).toBeUndefined();
    expect(pub.seed).toBeUndefined();
    expect(pub.node).toBe('r0l0');
    expect(pub.path).toEqual(['r0l0']);
  });
});
