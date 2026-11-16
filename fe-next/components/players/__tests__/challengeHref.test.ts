import { describe, it, expect } from 'vitest';
import { playerChallengeHref } from '../challengeHref';

describe('playerChallengeHref', () => {
  it('invites a friend straight into a new room, so they get the challenge', () => {
    expect(playerChallengeHref('he', 'u-1', true)).toBe('/he/multiplayer?invite=u-1');
  });

  it('opens the create-room sheet for a non-friend, whom the server will not notify', () => {
    expect(playerChallengeHref('en', 'u 2', false)).toBe('/en/multiplayer?autoCreate=true');
  });
});
