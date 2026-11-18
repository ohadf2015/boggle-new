import { afterEach, describe, expect, it, vi } from 'vitest';
import { emitLiveNotice, LIVE_NOTICE_EVENT, userHasLiveSocket } from '../liveNotice';

function installIo(size: number) {
  const emit = vi.fn();
  const rooms = new Map<string, Set<string>>();
  if (size > 0) rooms.set('user:abc', new Set(Array.from({ length: size }, (_, i) => `s${i}`)));
  (globalThis as { __lcIo?: unknown }).__lcIo = {
    to: vi.fn(() => ({ emit })),
    sockets: { adapter: { rooms } },
  };
  return emit;
}

afterEach(() => {
  delete (globalThis as { __lcIo?: unknown }).__lcIo;
});

describe('live in-app notice delivery', () => {
  it('emits notify:inApp to the user room and reports when they are connected', () => {
    const emit = installIo(1);
    expect(userHasLiveSocket('abc')).toBe(true);
    expect(emitLiveNotice('abc', { type: 'gift_received', title: 'Gift', body: 'Hi', deepLink: '/friends' })).toBe(true);
    expect(emit).toHaveBeenCalledWith(LIVE_NOTICE_EVENT, expect.objectContaining({
      type: 'gift_received',
      title: 'Gift',
      body: 'Hi',
      deepLink: '/friends',
    }));
  });

  it('returns false and still no-ops the emit when the socket server is down', () => {
    expect(userHasLiveSocket('abc')).toBe(false);
    expect(emitLiveNotice('abc', { type: 'gift_received', title: 'Gift', body: 'Hi' })).toBe(false);
  });

  it('returns false when the user room is empty (they will get push instead)', () => {
    installIo(0);
    expect(userHasLiveSocket('abc')).toBe(false);
  });
});
