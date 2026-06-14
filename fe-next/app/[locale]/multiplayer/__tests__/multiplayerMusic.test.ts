import { describe, it, expect } from 'vitest';
import { resolveMultiplayerMusicTrack } from '../multiplayerMusic';

/**
 * The multiplayer music bed has THREE phases, not two:
 *   lobby (waiting) → beforeGame (3-2-1 countdown) → inGame (actual play).
 * Before this fix the effect was binary (lobby vs beforeGame) so the game
 * soundtrack never advanced past the countdown bed — the homepage/lobby vibe
 * bled through the whole round. `showStartAnimation` (the countdown flag from
 * the gameState store) is the signal that flips beforeGame → inGame.
 */
describe('resolveMultiplayerMusicTrack', () => {
  it('plays the lobby bed while waiting (not active)', () => {
    expect(
      resolveMultiplayerMusicTrack({ isActive: false, showResults: false, showStartAnimation: false }),
    ).toBe('lobby');
  });

  it('plays the countdown bed while the start animation is on screen', () => {
    expect(
      resolveMultiplayerMusicTrack({ isActive: true, showResults: false, showStartAnimation: true }),
    ).toBe('beforeGame');
  });

  it('switches to the in-game track once the countdown is done (playing)', () => {
    expect(
      resolveMultiplayerMusicTrack({ isActive: true, showResults: false, showStartAnimation: false }),
    ).toBe('inGame');
  });

  it('leaves the current track untouched on the results screen', () => {
    expect(
      resolveMultiplayerMusicTrack({ isActive: true, showResults: true, showStartAnimation: false }),
    ).toBeNull();
    // showResults wins even if the game is technically still flagged active+countdown
    expect(
      resolveMultiplayerMusicTrack({ isActive: false, showResults: true, showStartAnimation: true }),
    ).toBeNull();
  });
});
