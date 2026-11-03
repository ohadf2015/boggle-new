import { describe, expect, it } from 'vitest';
import { clampToSafeBox, ZERO_INSETS } from '../clampToSafeBox';

const phone = { w: 360, h: 640 };
const chip = { w: 220, h: 56 };

describe('clampToSafeBox', () => {
  it('given a point well inside the viewport, when clamped, then it is unchanged', () => {
    expect(clampToSafeBox({ x: 180, y: 320 }, chip, phone)).toEqual({ x: 180, y: 320 });
  });

  it('given a landing at the left edge, when clamped, then the whole chip stays on screen', () => {
    const p = clampToSafeBox({ x: 10, y: 320 }, chip, phone, { margin: 8 });
    expect(p.x - chip.w / 2).toBeGreaterThanOrEqual(8);
  });

  it('given a landing at the right edge, when clamped, then the chip does not run past it', () => {
    const p = clampToSafeBox({ x: 355, y: 320 }, chip, phone, { margin: 8 });
    expect(p.x + chip.w / 2).toBeLessThanOrEqual(phone.w - 8);
  });

  it('given a peak overshoot scale, when clamped, then the scaled chip still fits', () => {
    const p = clampToSafeBox({ x: 0, y: 320 }, chip, phone, { scale: 1.35 });
    expect(p.x - (chip.w * 1.35) / 2).toBeGreaterThanOrEqual(0);
  });

  it('given a notch inset, when a landing is near the top, then the chip clears the inset', () => {
    const insets = { ...ZERO_INSETS, top: 47 };
    const p = clampToSafeBox({ x: 180, y: 5 }, chip, phone, { insets });
    expect(p.y - chip.h / 2).toBeGreaterThanOrEqual(47);
  });

  it('given a HUD floor below the notch, when a landing is under the HUD, then the chip sits below the HUD', () => {
    const insets = { ...ZERO_INSETS, top: 20 };
    const p = clampToSafeBox({ x: 180, y: 60 }, chip, phone, { insets, topFloor: 110 });
    expect(p.y - chip.h / 2).toBeGreaterThanOrEqual(110);
  });

  it('given a home-indicator inset, when a landing is at the bottom, then the chip clears it', () => {
    const insets = { ...ZERO_INSETS, bottom: 34 };
    const p = clampToSafeBox({ x: 180, y: 640 }, chip, phone, { insets });
    expect(p.y + chip.h / 2).toBeLessThanOrEqual(640 - 34);
  });

  it('given side insets in landscape, when a landing hugs a side, then the chip clears that inset', () => {
    const insets = { ...ZERO_INSETS, left: 44, right: 44 };
    const left = clampToSafeBox({ x: 0, y: 200 }, chip, { w: 844, h: 390 }, { insets });
    const right = clampToSafeBox({ x: 844, y: 200 }, chip, { w: 844, h: 390 }, { insets });
    expect(left.x - chip.w / 2).toBeGreaterThanOrEqual(44);
    expect(right.x + chip.w / 2).toBeLessThanOrEqual(844 - 44);
  });

  it('given a chip wider than the safe box, when clamped, then it is centred rather than thrown off one side', () => {
    const p = clampToSafeBox({ x: 0, y: 320 }, { w: 500, h: 56 }, phone);
    expect(p.x).toBe(180);
  });

  it('given an unmeasured viewport, when clamped, then the point passes through', () => {
    expect(clampToSafeBox({ x: 12, y: 34 }, chip, { w: 0, h: 0 })).toEqual({ x: 12, y: 34 });
  });
});
