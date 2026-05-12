import { describe, it, expect } from 'vitest';
import { getWaveObjectives } from '../blastWaveConfig';
import type { BlastObjective } from '../../types';

const has = (objs: BlastObjective[], type: BlastObjective['type']) => objs.some(o => o.type === type);

describe('getWaveObjectives — cc-mechanic flags off (default)', () => {
  it('does not add clear_jelly when flag off', () => {
    for (let w = 1; w <= 30; w++) {
      const objs = getWaveObjectives(w, 'en');
      expect(has(objs, 'clear_jelly')).toBe(false);
      expect(has(objs, 'kill_cake')).toBe(false);
      expect(has(objs, 'stop_chocolate')).toBe(false);
    }
  });
});

describe('getWaveObjectives — flags on', () => {
  it('clear_jelly appears at least once across waves 3-15 when jelly flag on', () => {
    let seen = false;
    for (let w = 3; w <= 15; w++) {
      const objs = getWaveObjectives(w, 'en', { jelly: true, cake: false, chocolate: false });
      if (has(objs, 'clear_jelly')) { seen = true; break; }
    }
    expect(seen).toBe(true);
  });

  it('kill_cake appears at least once across waves 3-15 when cake flag on', () => {
    let seen = false;
    for (let w = 3; w <= 15; w++) {
      const objs = getWaveObjectives(w, 'en', { jelly: false, cake: true, chocolate: false });
      if (has(objs, 'kill_cake')) { seen = true; break; }
    }
    expect(seen).toBe(true);
  });

  it('stop_chocolate appears at least once across waves 3-15 when chocolate flag on', () => {
    let seen = false;
    for (let w = 3; w <= 15; w++) {
      const objs = getWaveObjectives(w, 'en', { jelly: false, cake: false, chocolate: true });
      if (has(objs, 'stop_chocolate')) { seen = true; break; }
    }
    expect(seen).toBe(true);
  });

  it('does not seed cc-mechanics on wave 1 or 2 (FTUE protection)', () => {
    for (const w of [1, 2]) {
      const objs = getWaveObjectives(w, 'en', { jelly: true, cake: true, chocolate: true });
      expect(has(objs, 'clear_jelly')).toBe(false);
      expect(has(objs, 'kill_cake')).toBe(false);
      expect(has(objs, 'stop_chocolate')).toBe(false);
    }
  });

  it('deterministic — same wave + flags returns same objectives', () => {
    const a = getWaveObjectives(7, 'en', { jelly: true, cake: true, chocolate: true });
    const b = getWaveObjectives(7, 'en', { jelly: true, cake: true, chocolate: true });
    expect(a.map(o => o.type)).toEqual(b.map(o => o.type));
  });
});
