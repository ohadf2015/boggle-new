import { describe, it, expect } from 'vitest';
import {
  GAG_BOX_PX,
  GAG_ENVELOPE,
  GAG_TARGET_PX,
  MIN_STAGE_PX,
  STAGE_TARGET_PX,
  boardFloorPx,
  gagStageScale,
  pickStage,
} from '../stage';

const box = (width: number, height: number) => ({ width, height });
const gagPx = (h: number) => gagStageScale(h) * GAG_BOX_PX;

describe('mascot gag stage', () => {
  it('Given the phone band is hidden and the desktop rail is shown, picks the rail', () => {
    expect(pickStage([box(0, 0), box(300, 190)])).toBe(1);
  });

  it('Given every candidate is shorter than a readable mascot, picks none so the host falls back to the edge strip', () => {
    expect(pickStage([box(366, MIN_STAGE_PX - 1), box(0, 0)])).toBe(-1);
  });

  it('Given a band too short for the target and a taller band-plus-word-line after it, picks the taller one', () => {
    expect(pickStage([box(0, 0), box(366, 80), box(366, 176)])).toBe(2);
  });

  it('Given a band that already fits the target, keeps it over the band-plus-word-line', () => {
    expect(pickStage([box(0, 0), box(366, STAGE_TARGET_PX), box(366, STAGE_TARGET_PX + 96)])).toBe(1);
  });

  it('Given no candidate fits the target, picks the tallest readable one', () => {
    expect(pickStage([box(366, 60), box(366, 100), box(366, 90)])).toBe(1);
  });

  it('Given a roomy band, sizes the mascot to 96-120px', () => {
    expect(gagPx(200)).toBeGreaterThanOrEqual(96);
    expect(gagPx(200)).toBeLessThanOrEqual(120);
  });

  it('Given a stage of the target height, the mascot is at least the target size', () => {
    expect(gagPx(STAGE_TARGET_PX)).toBeGreaterThanOrEqual(GAG_TARGET_PX);
  });

  it.each([66, 80, 97, 109, 122, 140])('Given a %ipx stage, the tallest gag (stamp overhead) still fits inside it', (h) => {
    expect(gagPx(h) * GAG_ENVELOPE).toBeLessThanOrEqual(h);
    expect(gagPx(h)).toBeGreaterThanOrEqual(48);
  });
});

describe('board floor for a stage reserve', () => {
  const TILE_MIN = 44;
  it.each([4, 5, 6])('Given a %i-column board, the floor keeps every tile a 44px touch target', (cols) => {
    const floor = boardFloorPx(cols);
    // Measured solo board: ~19px inset each side and ~6px gaps between tiles.
    expect((floor - 2 * 19 - (cols - 1) * 6) / cols).toBeGreaterThanOrEqual(TILE_MIN);
  });

  it('Given a 6-column board, the floor gives back at most what 44px tiles allow (366px → ~334px)', () => {
    expect(boardFloorPx(6)).toBeLessThanOrEqual(336);
  });
});
