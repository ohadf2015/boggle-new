/**
 * ComboTracker — tracks combo level and provides hex colours for Phaser rendering.
 * Pure functions only — no Tailwind class strings (those don't work in canvas).
 *
 * RED phase: these tests must fail before the implementation exists.
 */

import {
  createComboTracker,
  incrementCombo,
  resetCombo,
  getComboLevel,
  getComboHexColors,
  type ComboTracker,
  type ComboHexColors,
} from '../ComboTracker';

// ─── createComboTracker ───────────────────────────────────────────────────────

describe('createComboTracker', () => {
  it('starts at level 0', () => {
    const tracker = createComboTracker();
    expect(getComboLevel(tracker)).toBe(0);
  });
});

// ─── incrementCombo ───────────────────────────────────────────────────────────

describe('incrementCombo', () => {
  it('increases level by 1', () => {
    const t0 = createComboTracker();
    const t1 = incrementCombo(t0);
    expect(getComboLevel(t1)).toBe(1);
  });

  it('is immutable — original tracker unchanged', () => {
    const t0 = createComboTracker();
    incrementCombo(t0);
    expect(getComboLevel(t0)).toBe(0);
  });

  it('increments multiple times correctly', () => {
    let tracker = createComboTracker();
    for (let i = 0; i < 5; i++) {
      tracker = incrementCombo(tracker);
    }
    expect(getComboLevel(tracker)).toBe(5);
  });

  it('does not cap at any arbitrary level (combo can go high)', () => {
    let tracker = createComboTracker();
    for (let i = 0; i < 15; i++) {
      tracker = incrementCombo(tracker);
    }
    expect(getComboLevel(tracker)).toBe(15);
  });
});

// ─── resetCombo ──────────────────────────────────────────────────────────────

describe('resetCombo', () => {
  it('resets level to 0', () => {
    let tracker = createComboTracker();
    tracker = incrementCombo(tracker);
    tracker = incrementCombo(tracker);
    tracker = resetCombo(tracker);
    expect(getComboLevel(tracker)).toBe(0);
  });
});

// ─── getComboHexColors ────────────────────────────────────────────────────────

describe('getComboHexColors', () => {
  it('returns an object with fillColor for every level 0‥9', () => {
    for (let level = 0; level <= 9; level++) {
      const colors: ComboHexColors = getComboHexColors(level);
      expect(typeof colors.fillColor).toBe('number');
      expect(typeof colors.borderColor).toBe('number');
    }
  });

  it('fillColor is a valid 24-bit integer (0x000000 ‥ 0xFFFFFF)', () => {
    for (let level = 0; level <= 9; level++) {
      const { fillColor } = getComboHexColors(level);
      expect(fillColor).toBeGreaterThanOrEqual(0);
      expect(fillColor).toBeLessThanOrEqual(0xffffff);
    }
  });

  it('higher levels return different fill colors than level 0', () => {
    const level0 = getComboHexColors(0);
    const level5 = getComboHexColors(5);
    expect(level0.fillColor).not.toBe(level5.fillColor);
  });

  it('returns a textColor hex number', () => {
    const colors = getComboHexColors(3);
    expect(typeof colors.textColor).toBe('number');
    expect(colors.textColor).toBeGreaterThanOrEqual(0);
    expect(colors.textColor).toBeLessThanOrEqual(0xffffff);
  });
});
