/**
 * friendsSocketRequest — emit a friends:* event and resolve on the matching
 * success event, a server rejection, or a timeout (caller then falls back to
 * the direct-DB path).
 */
import { vi } from 'vitest';
import { EventEmitter } from 'events';
import { friendsSocketRequest } from '../friendsSocketRequest';

function makeSocket() {
  const bus = new EventEmitter();
  return {
    bus,
    emit: vi.fn(),
    on: (e: string, h: (...a: unknown[]) => void) => bus.on(e, h),
    off: (e: string, h: (...a: unknown[]) => void) => bus.off(e, h),
  };
}

describe('friendsSocketRequest', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('emits the event and resolves success on a matching success event', async () => {
    const socket = makeSocket();
    const p = friendsSocketRequest(socket as never, 'friends:block', { targetUserId: 'u2' }, {
      successEvent: 'friends:blocked',
      match: (d) => (d as { targetUserId: string }).targetUserId === 'u2',
    });
    expect(socket.emit).toHaveBeenCalledWith('friends:block', { targetUserId: 'u2' });
    socket.bus.emit('friends:blocked', { targetUserId: 'someone-else' }); // ignored
    socket.bus.emit('friends:blocked', { targetUserId: 'u2' });
    await expect(p).resolves.toEqual({ success: true });
  });

  it('resolves a definitive failure (no fallback) on friends:error, with the server code', async () => {
    const socket = makeSocket();
    const p = friendsSocketRequest(socket as never, 'friends:sendRequest', { targetUserId: 'u2' }, {
      successEvent: 'friends:requestSent',
    });
    socket.bus.emit('friends:error', { code: 'ALREADY_FRIENDS', message: 'Already friends with this user' });
    await expect(p).resolves.toEqual({ success: false, code: 'ALREADY_FRIENDS', error: 'Already friends with this user' });
  });

  it('treats a policy restriction on the generic error channel as a definitive failure', async () => {
    const socket = makeSocket();
    const p = friendsSocketRequest(socket as never, 'friends:sendRequest', {}, { successEvent: 'friends:requestSent' });
    socket.bus.emit('error', { code: 'SOCIAL_RESTRICTED', message: 'Adding friends is turned off for this account' });
    await expect(p).resolves.toMatchObject({ success: false, code: 'SOCIAL_RESTRICTED' });
  });

  it('asks the caller to fall back when the server never answers', async () => {
    const socket = makeSocket();
    const p = friendsSocketRequest(socket as never, 'friends:acceptRequest', { requestId: 'r' }, {
      successEvent: 'friends:requestAccepted',
      timeoutMs: 1000,
    });
    vi.advanceTimersByTime(1000);
    await expect(p).resolves.toEqual({ success: false, fallback: true });
  });

  it('asks the caller to fall back when the socket is not yet authenticated', async () => {
    const socket = makeSocket();
    const p = friendsSocketRequest(socket as never, 'friends:acceptRequest', {}, { successEvent: 'friends:requestAccepted' });
    socket.bus.emit('error', { code: 'AUTH_REQUIRED', message: 'auth' });
    await expect(p).resolves.toEqual({ success: false, fallback: true });
  });

  it('removes its listeners once settled', async () => {
    const socket = makeSocket();
    const p = friendsSocketRequest(socket as never, 'friends:unblock', {}, { successEvent: 'friends:unblocked' });
    socket.bus.emit('friends:unblocked', {});
    await p;
    expect(socket.bus.listenerCount('friends:unblocked')).toBe(0);
    expect(socket.bus.listenerCount('friends:error')).toBe(0);
    expect(socket.bus.listenerCount('error')).toBe(0);
  });
});
