import { describe, it, expect } from 'vitest';
import { applyCalmBotPacing, CALM_BOT_PACING_MULTIPLIER, shouldPlayCountdownBeep } from '../cosyGameplay';

describe('cosyGameplay — applyCalmBotPacing', () => {
  it('returns the interval unchanged when calm is false', () => {
    expect(applyCalmBotPacing(3000, false)).toBe(3000);
    expect(applyCalmBotPacing(1800, false)).toBe(1800);
  });

  it('stretches the interval by the calm multiplier (rounded) when calm is true', () => {
    expect(applyCalmBotPacing(1800, true)).toBe(Math.round(1800 * CALM_BOT_PACING_MULTIPLIER));
    expect(applyCalmBotPacing(5000, true)).toBe(Math.round(5000 * CALM_BOT_PACING_MULTIPLIER));
  });

  it('pins the multiplier so the calm pacing cannot silently drift', () => {
    expect(CALM_BOT_PACING_MULTIPLIER).toBe(1.6);
  });

  it('makes calm bots strictly slower than racing bots for positive intervals', () => {
    expect(applyCalmBotPacing(2500, true)).toBeGreaterThan(applyCalmBotPacing(2500, false));
  });

  it('returns a finite, non-zero result for a positive interval under calm', () => {
    const out = applyCalmBotPacing(800, true);
    expect(Number.isFinite(out)).toBe(true);
    expect(out).toBeGreaterThan(0);
  });
});

describe('cosyGameplay — shouldPlayCountdownBeep', () => {
  const active = { gameActive: true, remainingTime: 5 };

  it('beeps in the last 10s of an active game when urgency is not suppressed', () => {
    expect(shouldPlayCountdownBeep({ ...active, suppressUrgency: false })).toBe(true);
  });

  it('NEVER beeps when urgency is suppressed (cosy) — the calm contract', () => {
    expect(shouldPlayCountdownBeep({ ...active, suppressUrgency: true })).toBe(false);
  });

  it('does not beep when the game is not active', () => {
    expect(shouldPlayCountdownBeep({ gameActive: false, remainingTime: 5, suppressUrgency: false })).toBe(false);
  });

  it('does not beep outside the last 10 seconds', () => {
    expect(shouldPlayCountdownBeep({ gameActive: true, remainingTime: 11, suppressUrgency: false })).toBe(false);
  });

  it('does not beep at or below zero', () => {
    expect(shouldPlayCountdownBeep({ gameActive: true, remainingTime: 0, suppressUrgency: false })).toBe(false);
  });
});
