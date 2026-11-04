import { describe, it, expect } from 'vitest';
import { KEY_MOMENTS, KEY_MOMENT_MAX_MS, resolveKeyMoment, type KeyMoment } from '../keyMoments';

const names = Object.keys(KEY_MOMENTS) as KeyMoment[];
const TRANSFORM = ['x', 'y', 'scale', 'rotate'];
const last = (v: unknown) => (Array.isArray(v) ? v[v.length - 1] : v);

describe('KEY_MOMENTS', () => {
  it('covers join, correct answer, level up, round end and chest', () => {
    expect(names.sort()).toEqual(['chest', 'correct', 'join', 'levelUp', 'roundEnd']);
  });

  it.each(names)('%s moves transform only, so the play surface never reflows', (name) => {
    const { initial, animate } = KEY_MOMENTS[name];
    for (const k of [...Object.keys(initial || {}), ...Object.keys(animate)]) expect(TRANSFORM).toContain(k);
  });

  it.each(names)('%s is short: done within the key-moment budget', (name) => {
    expect(KEY_MOMENTS[name].transition.duration * 1000).toBeLessThanOrEqual(KEY_MOMENT_MAX_MS);
    expect(KEY_MOMENT_MAX_MS).toBeLessThanOrEqual(500);
  });

  it.each(names)('%s comes to rest at the identity transform', (name) => {
    const { animate } = KEY_MOMENTS[name];
    for (const [k, v] of Object.entries(animate)) expect(last(v)).toBe(k === 'scale' ? 1 : 0);
  });

  it.each(names)('%s keyframe times line up with its keyframes', (name) => {
    const { animate, transition } = KEY_MOMENTS[name];
    const lengths = Object.values(animate).filter(Array.isArray).map((v) => (v as unknown[]).length);
    if (transition.times) for (const n of lengths) expect(n).toBe(transition.times.length);
  });
});

describe('resolveKeyMoment', () => {
  it.each(names)('%s plays in full when motion is allowed', (name) => {
    expect(resolveKeyMoment(name, false)).toBe(KEY_MOMENTS[name]);
  });

  it.each(names)('%s snaps to its resting frame with no tween under reduced motion', (name) => {
    const r = resolveKeyMoment(name, true);
    expect(r.initial).toBe(false);
    expect(r.transition.duration).toBe(0);
    for (const v of Object.values(r.animate)) expect(Array.isArray(v)).toBe(false);
  });
});
