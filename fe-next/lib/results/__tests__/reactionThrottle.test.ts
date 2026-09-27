import { describe, it, expect } from 'vitest';
import { canSendReaction, REACTION_THROTTLE_MS } from '../reactionThrottle';

describe('canSendReaction', () => {
  it('allows the first reaction (no prior timestamp)', () => {
    expect(canSendReaction(1000, 0, REACTION_THROTTLE_MS)).toBe(true);
  });

  it('blocks a reaction fired inside the throttle window', () => {
    expect(canSendReaction(1000, 900, REACTION_THROTTLE_MS)).toBe(false);
  });

  it('allows a reaction once the window has elapsed', () => {
    expect(canSendReaction(1000 + REACTION_THROTTLE_MS, 1000, REACTION_THROTTLE_MS)).toBe(true);
  });

  it('uses a snappy party-game window (<= 1s) so heart-spamming feels responsive', () => {
    // The old 2000ms throttle felt like a broken button; keep it well under 1s.
    expect(REACTION_THROTTLE_MS).toBeLessThanOrEqual(1000);
  });
});
