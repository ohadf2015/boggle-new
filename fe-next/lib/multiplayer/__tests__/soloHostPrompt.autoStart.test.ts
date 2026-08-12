import { describe, it, expect } from 'vitest';
import {
  shouldAutoStartAfterBotFill,
  PUBLIC_ROOM_BOT_START_GRACE_SECONDS,
} from '../soloHostPrompt';

const base = {
  isQuickPlay: false,
  isPrivate: false,
  humanGuestCount: 0,
  gameState: 'waiting',
};

describe('shouldAutoStartAfterBotFill', () => {
  it('starts a public room that has sat silent through the whole bot-fill sequence', () => {
    // Measured: 247 of 328 abandoners are on /multiplayer, and 35% of lobbies
    // that auto-filled with bots never started anything. Filling a lobby with
    // bots and then waiting for a Start the host does not know is theirs is the
    // incoherent half — if we already decided to add bots, play the game.
    expect(shouldAutoStartAfterBotFill(base)).toBe(true);
  });

  it('leaves private invite/classroom rooms alone', () => {
    // A teacher gathering a class is waiting on SPECIFIC humans; starting a bot
    // game under them is worse than the dead air.
    expect(shouldAutoStartAfterBotFill({ ...base, isPrivate: true })).toBe(false);
  });

  it('does not double-fire for Quick Play, which already auto-starts immediately', () => {
    expect(shouldAutoStartAfterBotFill({ ...base, isQuickPlay: true })).toBe(false);
  });

  it('stands down the moment a real human is in the room', () => {
    expect(shouldAutoStartAfterBotFill({ ...base, humanGuestCount: 1 })).toBe(false);
  });

  it('never starts a game that is already running', () => {
    expect(shouldAutoStartAfterBotFill({ ...base, gameState: 'playing' })).toBe(false);
  });

  it('gives the host a real window to invite someone before it fires', () => {
    // Total silent time before auto-start is 15s alone + 20s countdown + this
    // grace. Short enough to rescue the session, long enough that a host who is
    // mid-share is not yanked into a bot game.
    expect(PUBLIC_ROOM_BOT_START_GRACE_SECONDS).toBeGreaterThanOrEqual(15);
  });
});
