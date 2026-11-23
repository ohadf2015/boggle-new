import { describe, it, expect } from 'vitest';
import { isModeCoached, rememberMode, stuckCoachKey } from '../stuckCoachMemory';

function memStorage(seed: Record<string, string> = {}) {
  const data = new Map(Object.entries(seed));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    data,
  };
}

describe('stuck coach memory', () => {
  it('coaches a mode this device has never been coached or scored in', () => {
    expect(isModeCoached('blast', memStorage())).toBe(false);
  });

  it('a shown coach or a found word in that mode suppresses it for good', () => {
    const s = memStorage();
    rememberMode('blast', 'shown', s);
    expect(isModeCoached('blast', s)).toBe(true);

    const t = memStorage();
    rememberMode('wheelRush', 'found', t);
    expect(isModeCoached('wheelRush', t)).toBe(true);
  });

  it('keeps each mode separate, so a classic veteran still gets help in a new mode', () => {
    const s = memStorage();
    rememberMode('classic', 'found', s);
    expect(isModeCoached('wheelRush', s)).toBe(false);
  });

  it('never downgrades a found marker back to shown', () => {
    const s = memStorage();
    rememberMode('blast', 'found', s);
    rememberMode('blast', 'shown', s);
    expect(s.data.get(stuckCoachKey('blast'))).toBe('found');
  });

  it('honours the flags written by the detectors it replaced', () => {
    expect(isModeCoached('classic', memStorage({ lexiclash_contextual_guidance: '{"stuckCoachShown":true}' }))).toBe(true);
    expect(isModeCoached('classic', memStorage({ lexiclash_contextual_guidance: '{"comboShown":true}' }))).toBe(false);
    expect(isModeCoached('wordHunt', memStorage({ mp_ftue_drag_v1: 'dismissed' }))).toBe(true);
    expect(isModeCoached('wheelRush', memStorage({ mp_ftue_drag_v1: 'dismissed' }))).toBe(true);
    expect(isModeCoached('dailyWheel', memStorage({ ww_ftue_drag_v1: 'dismissed' }))).toBe(true);
    expect(isModeCoached('blast', memStorage({ mp_ftue_drag_v1: 'dismissed' }))).toBe(false);
  });

  it('stays silent when storage cannot be read (never nag on a broken device)', () => {
    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => {} };
    expect(isModeCoached('blast', broken)).toBe(true);
    expect(isModeCoached('blast', null)).toBe(true);
  });
});
