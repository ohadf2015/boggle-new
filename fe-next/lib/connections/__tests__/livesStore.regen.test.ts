/**
 * Time-based life regen — the ad-independent recovery path.
 *
 * Web players cannot watch a rewarded ad (provider gated off pending AdSense
 * approval, which is rejected), so before regen existed, 0 lives was terminal.
 * These assertions are the ones that break if regen silently stops working.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getCurrentLives,
  setCurrentLives,
  msUntilNextLife,
  resetLives,
  LIVES_REGEN_MS,
  LIVES_SINCE_KEY,
  LIVES_STORAGE_KEY,
  MAX_LIVES,
} from '../livesStore';

const T0 = 1_760_000_000_000;

describe('livesStore regen', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('grants one life per regen interval', () => {
    setCurrentLives('en', 0, T0);
    expect(getCurrentLives('en', T0)).toBe(0);
    expect(getCurrentLives('en', T0 + LIVES_REGEN_MS - 1)).toBe(0);
    expect(getCurrentLives('en', T0 + LIVES_REGEN_MS)).toBe(1);
  });

  it('caps at MAX_LIVES and drops the anchor once full', () => {
    setCurrentLives('en', 0, T0);
    expect(getCurrentLives('en', T0 + LIVES_REGEN_MS * 99)).toBe(MAX_LIVES);
    expect(localStorage.getItem(LIVES_SINCE_KEY('en'))).toBeNull();
  });

  it('carries the remainder — a reload mid-interval does not restart the clock', () => {
    setCurrentLives('en', 0, T0);
    // 1.9 intervals: one life lands, 0.9 of an interval stays banked.
    expect(getCurrentLives('en', T0 + LIVES_REGEN_MS * 1.9)).toBe(1);
    // Only 0.1 more of an interval is needed, NOT a fresh full one.
    expect(getCurrentLives('en', T0 + LIVES_REGEN_MS * 2)).toBe(2);
  });

  it('does not restamp the anchor on a non-decreasing write (else lives never return)', () => {
    setCurrentLives('en', 1, T0);
    // A later same-value write must not push the clock forward.
    setCurrentLives('en', 1, T0 + LIVES_REGEN_MS * 0.5);
    expect(getCurrentLives('en', T0 + LIVES_REGEN_MS)).toBe(2);
  });

  it('restamps when lives actually drop', () => {
    setCurrentLives('en', 2, T0);
    setCurrentLives('en', 1, T0 + LIVES_REGEN_MS * 0.9);
    // Clock restarted at the loss, so 0.9 of an interval earlier does not count.
    expect(getCurrentLives('en', T0 + LIVES_REGEN_MS * 1.5)).toBe(1);
    expect(getCurrentLives('en', T0 + LIVES_REGEN_MS * 1.9)).toBe(2);
  });

  it('a backwards clock jump never owes lives', () => {
    setCurrentLives('en', 0, T0);
    expect(getCurrentLives('en', T0 - LIVES_REGEN_MS * 5)).toBe(0);
  });

  it('legacy rows with no anchor start the clock instead of granting a windfall', () => {
    localStorage.setItem(LIVES_STORAGE_KEY('en'), '0');
    expect(getCurrentLives('en', T0)).toBe(0);
    expect(getCurrentLives('en', T0 + LIVES_REGEN_MS)).toBe(1);
  });

  it('msUntilNextLife counts down and is null at full lives', () => {
    setCurrentLives('en', 0, T0);
    expect(msUntilNextLife('en', T0)).toBe(LIVES_REGEN_MS);
    expect(msUntilNextLife('en', T0 + LIVES_REGEN_MS * 0.25)).toBe(LIVES_REGEN_MS * 0.75);
    resetLives('en');
    expect(msUntilNextLife('en', T0)).toBeNull();
  });

  it('regen is per locale', () => {
    setCurrentLives('en', 0, T0);
    setCurrentLives('he', 0, T0);
    expect(getCurrentLives('en', T0 + LIVES_REGEN_MS)).toBe(1);
    expect(getCurrentLives('he', T0)).toBe(0);
  });
});
