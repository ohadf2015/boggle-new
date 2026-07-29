import { describe, it, expect, vi } from 'vitest';
import { tvModeLabel } from '../modeLabel';

describe('tvModeLabel', () => {
  it('returns the translated label for known modes', () => {
    const t = vi.fn((k: string) => `T:${k}`);
    expect(tvModeLabel('classic', t)).toBe('T:tvBroadcast.modeClassic');
    expect(tvModeLabel('blast', t)).toBe('T:tvBroadcast.modeBlast');
    expect(tvModeLabel('word-hunt', t)).toBe('T:tvBroadcast.modeWordHunt');
  });

  it('humanizes unknown modes WITHOUT calling t() with a missing key', () => {
    const t = vi.fn((k: string) => `T:${k}`);
    // Regression: Sentry JAVASCRIPT-NEXTJS-1K7 — `tvBroadcast.mode.random`
    // never existed, so t() logged "Translation missing".
    expect(tvModeLabel('random', t)).toBe('RANDOM');
    expect(tvModeLabel('wheel-rush', t)).toBe('WHEEL RUSH');
    expect(t).not.toHaveBeenCalledWith('tvBroadcast.mode.random');
    expect(t).not.toHaveBeenCalled();
  });

  it('returns empty string for missing gameMode', () => {
    const t = vi.fn((k: string) => k);
    expect(tvModeLabel(undefined, t)).toBe('');
    expect(tvModeLabel(null, t)).toBe('');
    expect(tvModeLabel('', t)).toBe('');
  });
});
