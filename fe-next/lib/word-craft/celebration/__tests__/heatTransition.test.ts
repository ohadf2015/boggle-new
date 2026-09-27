import { describe, it, expect } from 'vitest';
import { detectHeatTransition, classifyHeat } from '../heatTransition';

describe('classifyHeat', () => {
  it('reads heat 0-39 as cold', () => {
    expect(classifyHeat({ heat: 0, overdrive: false, burnout: false })).toBe('cold');
    expect(classifyHeat({ heat: 39, overdrive: false, burnout: false })).toBe('cold');
  });

  it('reads heat 40-99 as warm', () => {
    expect(classifyHeat({ heat: 40, overdrive: false, burnout: false })).toBe('warm');
    expect(classifyHeat({ heat: 99, overdrive: false, burnout: false })).toBe('warm');
  });

  it('reads overdrive flag as overdrive regardless of heat', () => {
    expect(classifyHeat({ heat: 100, overdrive: true, burnout: false })).toBe('overdrive');
  });

  it('reads burnout flag as burnout (wins over overdrive)', () => {
    expect(classifyHeat({ heat: 100, overdrive: true, burnout: true })).toBe('burnout');
  });
});

describe('detectHeatTransition', () => {
  it('cold → warm returns null beat (silent escalation)', () => {
    expect(detectHeatTransition('cold', 'warm')).toBe(null);
  });

  it('warm → overdrive returns enter-overdrive', () => {
    expect(detectHeatTransition('warm', 'overdrive')).toBe('enter-overdrive');
  });

  it('overdrive → warm returns exit-overdrive', () => {
    expect(detectHeatTransition('overdrive', 'warm')).toBe('exit-overdrive');
  });

  it('overdrive → burnout returns enter-burnout', () => {
    expect(detectHeatTransition('overdrive', 'burnout')).toBe('enter-burnout');
  });

  it('burnout → warm or cold returns recover', () => {
    expect(detectHeatTransition('burnout', 'warm')).toBe('recover');
    expect(detectHeatTransition('burnout', 'cold')).toBe('recover');
  });

  it('same state returns null', () => {
    expect(detectHeatTransition('warm', 'warm')).toBe(null);
    expect(detectHeatTransition('overdrive', 'overdrive')).toBe(null);
  });
});
