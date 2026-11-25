// @vitest-environment happy-dom
/**
 * Session-clear is the codebase's canonical "don't auto-rejoin me" signal
 * (see clearSession's own comment). The Socket.IO reconnect rejoin intent must
 * be dropped in lockstep, so a player who legitimately leaves can never be
 * pulled back into the game on a later reconnect.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { clearSession, clearSessionPreservingUsername, forgetStoredRoom, saveSession, getSession } from '../session';
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

describe('forgetStoredRoom', () => {
  beforeEach(() => { clearSession(); });

  it('drops a stored room that the server says is gone, and keeps the live rejoin intent', () => {
    saveSession({ gameCode: 'OLD999', username: 'U', isHost: false });
    setRejoinIntent({ gameCode: 'NEW111', username: 'U' });
    forgetStoredRoom('OLD999');
    expect(getSession()).toBeNull();
    expect(getRejoinIntent()?.gameCode).toBe('NEW111');
  });

  it('leaves a stored room with a different code alone', () => {
    saveSession({ gameCode: 'NEW111', username: 'U', isHost: false });
    forgetStoredRoom('OLD999');
    expect(getSession()?.gameCode).toBe('NEW111');
  });
});
