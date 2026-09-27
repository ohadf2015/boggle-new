/**
 * Background-disconnect gate (mobile visibilitychange → 5s → socket.disconnect).
 *
 * A fullscreen ad — AdMob's native Activity, or a web adBreak overlay — hides
 * the page WITHOUT the player leaving. Arming the 5s disconnect on that hide
 * killed the room connection mid-ad: the ad-watcher returned to a host transfer
 * and a round that had started without them ("after a player watches an ad
 * between games the game isn't waiting for him and he's disconnected").
 *
 * While an ad owns the screen the socket stays up; the server-side pingTimeout
 * (60s) remains the backstop for a client the OS genuinely killed.
 */
import { describe, it, expect } from 'vitest';
import { shouldArmBackgroundDisconnect } from '../socketBackgroundDisconnect';

describe('shouldArmBackgroundDisconnect', () => {
  it('arms on an ordinary backgrounding (no ad) — battery/data saving preserved', () => {
    expect(shouldArmBackgroundDisconnect({ fullscreenAdActive: false })).toBe(true);
  });

  it('does NOT arm while a fullscreen ad owns the screen', () => {
    expect(shouldArmBackgroundDisconnect({ fullscreenAdActive: true })).toBe(false);
  });
});
