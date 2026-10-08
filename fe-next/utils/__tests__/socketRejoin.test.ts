/**
 * Rejoin-intent carrier — the durable "who should I rejoin as" descriptor that
 * survives a Socket.IO reconnect (incl. a server-restart/deploy where the socket
 * id changes). Set when a player joins a multiplayer game; cleared when they
 * legitimately leave. SocketContext re-emits `join` with it on reconnect so the
 * server can rebuild the in-memory socket→game mapping it lost on restart.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  setRejoinIntent,
  getRejoinIntent,
  clearRejoinIntent,
  planReconnectRejoin,
  planNotSeatedRejoin,
  type RejoinIntent,
} from '../socketRejoin';

const sampleIntent: RejoinIntent = {
  gameCode: 'ABC123',
  username: 'Paca',
  authUserId: null,
  guestTokenHash: 'hash-1',
  guestSessionId: 'guest-1',
  avatar: { color: '#fff' },
};

describe('socketRejoin carrier', () => {
  beforeEach(() => {
    clearRejoinIntent();
  });

  it('returns null when no intent has been set', () => {
    expect(getRejoinIntent()).toBeNull();
  });

  it('stores and returns the intent that was set', () => {
    setRejoinIntent(sampleIntent);
    expect(getRejoinIntent()).toEqual(sampleIntent);
  });

  it('overwrites a previous intent when a new game is joined', () => {
    setRejoinIntent(sampleIntent);
    const next: RejoinIntent = { ...sampleIntent, gameCode: 'XYZ789', username: 'Other' };
    setRejoinIntent(next);
    expect(getRejoinIntent()).toEqual(next);
  });

  it('clears the intent (leaving the game)', () => {
    setRejoinIntent(sampleIntent);
    clearRejoinIntent();
    expect(getRejoinIntent()).toBeNull();
  });
});

describe('planReconnectRejoin — what to re-emit on a socket connect', () => {
  it('does NOT rejoin on the very first connect (lobby join covers it)', () => {
    expect(planReconnectRejoin({ isReconnect: false, intent: sampleIntent })).toBeNull();
  });

  it('rejoins on a reconnect when an intent exists', () => {
    expect(planReconnectRejoin({ isReconnect: true, intent: sampleIntent })).toEqual(sampleIntent);
  });

  it('does NOT rejoin on a reconnect when the player has left (no intent)', () => {
    expect(planReconnectRejoin({ isReconnect: true, intent: null })).toBeNull();
  });
});

describe('planNotSeatedRejoin — server says this socket is not seated', () => {
  it('re-emits the remembered join when the server answers PLAYER_NOT_IN_GAME', () => {
    expect(planNotSeatedRejoin({ errorCode: 'PLAYER_NOT_IN_GAME', intent: sampleIntent, lastAttemptAt: 0, now: 10_000 })).toEqual(sampleIntent);
  });

  it('ignores other error codes', () => {
    expect(planNotSeatedRejoin({ errorCode: 'GAME_NOT_FOUND', intent: sampleIntent, lastAttemptAt: 0, now: 10_000 })).toBeNull();
  });

  it('does nothing without an intent (player left)', () => {
    expect(planNotSeatedRejoin({ errorCode: 'PLAYER_NOT_IN_GAME', intent: null, lastAttemptAt: 0, now: 10_000 })).toBeNull();
  });

  it('throttles repeat attempts within 5s so a failing join cannot loop', () => {
    expect(planNotSeatedRejoin({ errorCode: 'PLAYER_NOT_IN_GAME', intent: sampleIntent, lastAttemptAt: 8_000, now: 10_000 })).toBeNull();
  });
});
