/**
 * A socket opened while signed out must pick up a session minted LATER in the
 * same page life (the classroom guest's `signInAnonymously`). The server reads
 * the handshake once, so without a re-handshake the student plays as an
 * unverified guest and their quiz/board results are dropped at persistence.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const listeners: Array<(event: string, session: { access_token?: string } | null) => void> = [];
const unsubscribe = vi.fn();
vi.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    auth: {
      onAuthStateChange: (fn: (event: string, session: { access_token?: string } | null) => void) => {
        listeners.push(fn);
        return { data: { subscription: { unsubscribe } } };
      },
    },
  }),
}));

import { shouldUpgradeSocketAuth, watchSocketAuthUpgrade } from '../socketAuthUpgrade';

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('shouldUpgradeSocketAuth', () => {
  it('re-handshakes a tokenless connected socket when a session is signed in', () => {
    expect(
      shouldUpgradeSocketAuth({ event: 'SIGNED_IN', token: 'jwt', socketConnected: true, handshakeHadToken: false })
    ).toBe(true);
  });

  it('leaves a socket alone that already carried a token (token refreshes, refocus)', () => {
    expect(
      shouldUpgradeSocketAuth({ event: 'SIGNED_IN', token: 'jwt', socketConnected: true, handshakeHadToken: true })
    ).toBe(false);
  });

  it('ignores events without a token and non sign-in events', () => {
    expect(
      shouldUpgradeSocketAuth({ event: 'SIGNED_IN', token: null, socketConnected: true, handshakeHadToken: false })
    ).toBe(false);
    expect(
      shouldUpgradeSocketAuth({ event: 'TOKEN_REFRESHED', token: 'jwt', socketConnected: true, handshakeHadToken: false })
    ).toBe(false);
  });

  it('does nothing for a socket that is not connected (its next handshake reads the token itself)', () => {
    expect(
      shouldUpgradeSocketAuth({ event: 'SIGNED_IN', token: 'jwt', socketConnected: false, handshakeHadToken: false })
    ).toBe(false);
  });
});

describe('watchSocketAuthUpgrade', () => {
  beforeEach(() => {
    listeners.length = 0;
    unsubscribe.mockClear();
  });

  it('given a guest socket, when the anonymous sign-in lands, then it reconnects so the server re-reads the handshake', async () => {
    const socket = { connected: true, disconnect: vi.fn(), connect: vi.fn() };
    watchSocketAuthUpgrade(socket, () => false);
    await flush();
    listeners[0]('SIGNED_IN', { access_token: 'anon-jwt' });
    expect(socket.disconnect).toHaveBeenCalledTimes(1);
    expect(socket.connect).toHaveBeenCalledTimes(1);
  });

  it('does not bounce a socket that already verified', async () => {
    const socket = { connected: true, disconnect: vi.fn(), connect: vi.fn() };
    watchSocketAuthUpgrade(socket, () => true);
    await flush();
    listeners[0]('SIGNED_IN', { access_token: 'jwt' });
    expect(socket.disconnect).not.toHaveBeenCalled();
  });

  it('stop() unsubscribes, even when called before the subscription resolved', async () => {
    const socket = { connected: true, disconnect: vi.fn(), connect: vi.fn() };
    const stop = watchSocketAuthUpgrade(socket, () => false);
    stop();
    await flush();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
