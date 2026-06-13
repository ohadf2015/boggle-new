/**
 * Session-clear is the codebase's canonical "don't auto-rejoin me" signal
 * (see clearSession's own comment). The Socket.IO reconnect rejoin intent must
 * be dropped in lockstep, so a player who legitimately leaves can never be
 * pulled back into the game on a later reconnect.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { clearSession, clearSessionPreservingUsername } from '../session';
import { setRejoinIntent, getRejoinIntent, clearRejoinIntent } from '../socketRejoin';

describe('session clear drops the rejoin intent', () => {
  beforeEach(() => clearRejoinIntent());

  it('clearSession forgets the rejoin intent', () => {
    setRejoinIntent({ gameCode: 'G1', username: 'U' });
    clearSession();
    expect(getRejoinIntent()).toBeNull();
  });

  it('clearSessionPreservingUsername forgets the rejoin intent', () => {
    setRejoinIntent({ gameCode: 'G1', username: 'U' });
    clearSessionPreservingUsername('U');
    expect(getRejoinIntent()).toBeNull();
  });
});
