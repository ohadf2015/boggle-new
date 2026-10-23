import { describe, it, expect } from 'vitest';
import { EDU_PRESETS, resolvePreset, type EduPresetName } from '../presets';
import { EDU_EASE, EDU_DUR } from '../tokens';

const names = Object.keys(EDU_PRESETS) as EduPresetName[];

describe('EDU_PRESETS', () => {
  it('covers the sheet, pop, pulse, hero, pull-back, chip and ignite beats', () => {
    expect(names.sort()).toEqual(['chipIn', 'heroIn', 'ignite', 'popIn', 'pullBack', 'pulse', 'sheetUp']);
  });

  it.each(names)('%s animates transform properties only', (name) => {
    const { initial, animate } = EDU_PRESETS[name];
    const keys = [...Object.keys(initial ?? {}), ...Object.keys(animate)];
    for (const k of keys) expect(['x', 'y', 'scale', 'rotate']).toContain(k);
  });

  it('sheetUp rises from translateY(100%) on the overshoot curve within the 130ms bar', () => {
    const p = EDU_PRESETS.sheetUp;
    expect(p.initial).toEqual({ y: '100%' });
    expect(p.animate).toEqual({ y: 0 });
    expect(p.transition).toMatchObject({ duration: EDU_DUR.sheet, ease: EDU_EASE.overshoot });
    expect(EDU_DUR.sheet).toBeLessThanOrEqual(0.13);
  });

  it('popIn scales 0 to 1 over 300ms', () => {
    expect(EDU_PRESETS.popIn.initial).toEqual({ scale: 0 });
    expect(EDU_PRESETS.popIn.animate).toEqual({ scale: 1 });
    expect(EDU_PRESETS.popIn.transition.duration).toBe(0.3);
  });

  it('pulse goes 1 to 1.2, holds, and returns to 1', () => {
    expect(EDU_PRESETS.pulse.animate).toEqual({ scale: [1, 1.2, 1.2, 1] });
    expect(EDU_PRESETS.pulse.transition.times).toEqual([0, 0.45, 0.75, 1]);
  });
});

describe('resolvePreset', () => {
  it('returns the preset untouched when motion is allowed', () => {
    expect(resolvePreset('popIn', false)).toBe(EDU_PRESETS.popIn);
  });

  it.each(names)('%s collapses to a static end state under reduced motion', (name) => {
    const r = resolvePreset(name, true);
    expect(r.initial).toBe(false);
    expect(r.transition).toEqual({ duration: 0 });
    for (const v of Object.values(r.animate)) expect(Array.isArray(v)).toBe(false);
  });

  it('a keyframe preset settles on its last frame when reduced', () => {
    expect(resolvePreset('pulse', true).animate).toEqual({ scale: 1 });
  });
});
