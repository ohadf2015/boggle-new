import { describe, it, expect } from 'vitest';
import { createBoss, applyWord, tick, type BossState } from '../engine';
import { BOSS_RULES as R } from '../rules';

const T0 = 1_000_000;

function fighting(over: Partial<BossState> = {}): BossState {
  const boss = createBoss({ seed: 'ABCD:1', bossId: 'lexiconDragon', students: 30, roundSeconds: 120, rows: 4, cols: 4, now: T0 });
  return { ...tick(boss, T0 + R.introMs).state, ...over };
}

const NOW = T0 + R.introMs + 1000;
const word = (over: Partial<Parameters<typeof applyWord>[1]> = {}) =>
  ({ username: 'noa', word: 'cell', score: 10, now: NOW, ...over });

describe('lesson words crack the boss', () => {
  it('Given the boss is exposed, When a short lesson word lands, Then it is a critical lesson hit', () => {
    const r = applyWord(fighting({ exposedUntil: NOW + 1000 }), word({ fromLesson: true }));
    expect(r.hit?.crit).toBe(true);
    expect(r.hit?.lesson).toBe(true);
    expect(r.state.lastHits[0]).toMatchObject({ crit: true, lesson: true, exposed: true });
  });

  it('Given the boss is not exposed, When a short lesson word lands, Then it is an ordinary hit with no lesson tag', () => {
    const r = applyWord(fighting(), word({ fromLesson: true }));
    expect(r.hit?.crit).toBe(false);
    expect(r.state.lastHits[0]).not.toHaveProperty('lesson');
  });

  it('Given the boss is exposed, When a short non-lesson word lands, Then it is not critical', () => {
    const r = applyWord(fighting({ exposedUntil: NOW + 1000 }), word());
    expect(r.hit?.crit).toBe(false);
    expect(r.state.lastHits[0]).not.toHaveProperty('lesson');
  });

  it('Given a long word, When it lands, Then it is critical whether or not it is a lesson word', () => {
    const r = applyWord(fighting(), word({ word: 'photonic', fromLesson: false }));
    expect(r.hit?.crit).toBe(true);
    expect(r.state.lastHits[0]).not.toHaveProperty('lesson');
  });
});
