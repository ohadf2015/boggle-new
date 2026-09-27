/**
 * Test: resolveGameStartSafetyNetDelayMs — composition-aware launch-recovery window.
 *
 * The server arms a safety net that force-launches the round (timer + bots) when
 * the normal launch path stalls (no client `countdownComplete`, and the 8s
 * coordinator fallback also failed to start the timer — e.g. its sequence was
 * torn down when a frozen/backgrounded host disconnected). Until it fires, the
 * round runs with no clock and bots sit VISIBLY at 0.
 *
 * Solo-human games (one human + bots — the common Blast quick-start) have no
 * cross-client 3-2-1 animation to keep in sync, so they recover on a tight
 * window. Multi-human games keep the longer window so a slow second client is
 * not force-started a beat early.
 */
import { describe, it, expect } from 'vitest';
import {
  resolveGameStartSafetyNetDelayMs,
  SAFETY_NET_DELAY_SOLO_MS,
  SAFETY_NET_DELAY_MULTI_HUMAN_MS,
} from '../gameTimer';

describe('resolveGameStartSafetyNetDelayMs', () => {
  it('uses the tight solo window for a single human (one human + bots)', () => {
    expect(resolveGameStartSafetyNetDelayMs(1)).toBe(SAFETY_NET_DELAY_SOLO_MS);
  });

  it('uses the tight solo window when there are zero humans (defensive)', () => {
    expect(resolveGameStartSafetyNetDelayMs(0)).toBe(SAFETY_NET_DELAY_SOLO_MS);
  });

  it('keeps the longer multi-human window for 2+ humans', () => {
    expect(resolveGameStartSafetyNetDelayMs(2)).toBe(SAFETY_NET_DELAY_MULTI_HUMAN_MS);
    expect(resolveGameStartSafetyNetDelayMs(5)).toBe(SAFETY_NET_DELAY_MULTI_HUMAN_MS);
  });

  it('recovers solo games meaningfully faster than multi-human, but past the ~3.3s countdown', () => {
    expect(SAFETY_NET_DELAY_SOLO_MS).toBeLessThan(SAFETY_NET_DELAY_MULTI_HUMAN_MS);
    // Comfortably past the ~3.3s GO animation (3×1000ms) + fade + render + network,
    // so a HEALTHY solo launch is never force-started a beat early.
    expect(SAFETY_NET_DELAY_SOLO_MS).toBeGreaterThanOrEqual(4500);
  });
});
