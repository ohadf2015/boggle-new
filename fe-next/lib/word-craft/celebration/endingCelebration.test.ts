import { describe, expect, it } from 'vitest';
import { shouldCelebrateEnding } from './endingCelebration';

describe('shouldCelebrateEnding', () => {
  const base = { playerScore: 100, botScore: 50, hotseat: false, cosyMode: false, reducedMotion: false };

  it('celebrates when the player wins', () => {
    expect(shouldCelebrateEnding(base)).toBe(true);
  });

  it('does NOT celebrate a loss (no confetti for losing)', () => {
    expect(shouldCelebrateEnding({ ...base, playerScore: 40, botScore: 90 })).toBe(false);
  });

  it('does NOT celebrate a tie', () => {
    expect(shouldCelebrateEnding({ ...base, playerScore: 70, botScore: 70 })).toBe(false);
  });

  it('always celebrates the end of a hot-seat game (someone won)', () => {
    expect(shouldCelebrateEnding({ ...base, hotseat: true, playerScore: 10, botScore: 99 })).toBe(true);
  });

  it('suppresses the burst under cosy mode (calm)', () => {
    expect(shouldCelebrateEnding({ ...base, cosyMode: true })).toBe(false);
  });

  it('suppresses the burst under prefers-reduced-motion', () => {
    expect(shouldCelebrateEnding({ ...base, reducedMotion: true })).toBe(false);
  });
});
