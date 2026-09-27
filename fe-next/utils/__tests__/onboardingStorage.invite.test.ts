import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  savePendingRoomInvite,
  consumePendingRoomInvite,
  hasPendingRoomInvite,
  getPendingRoomInvite,
} from '@/utils/onboardingStorage';

describe('Pending room invite', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useRealTimers();
  });

  it('round-trips code only', () => {
    savePendingRoomInvite('ABC123');
    expect(hasPendingRoomInvite()).toBe(true);
    expect(getPendingRoomInvite()?.code).toBe('ABC123');
    expect(getPendingRoomInvite()?.hostName).toBeUndefined();
  });

  it('round-trips code + hostName', () => {
    savePendingRoomInvite('ABC123', 'Alice');
    expect(getPendingRoomInvite()).toEqual(
      expect.objectContaining({ code: 'ABC123', hostName: 'Alice' }),
    );
  });

  it('consume returns code string and clears storage', () => {
    savePendingRoomInvite('ABC123', 'Alice');
    expect(consumePendingRoomInvite()).toBe('ABC123');
    expect(hasPendingRoomInvite()).toBe(false);
    expect(getPendingRoomInvite()).toBeNull();
  });

  it('returns null when older than 24h', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    savePendingRoomInvite('ABC123', 'Alice');
    vi.setSystemTime(new Date('2026-01-02T00:01:00Z'));
    expect(hasPendingRoomInvite()).toBe(false);
    expect(getPendingRoomInvite()).toBeNull();
  });

  it('emits invite-changed event on save and consume', () => {
    const handler = vi.fn();
    window.addEventListener('invite-changed', handler);
    savePendingRoomInvite('ABC123', 'Alice');
    expect(handler).toHaveBeenCalledTimes(1);
    consumePendingRoomInvite();
    expect(handler).toHaveBeenCalledTimes(2);
    window.removeEventListener('invite-changed', handler);
  });

  it('back-compat: legacy string payloads return code', () => {
    sessionStorage.setItem('lexiclash_pending_room_invite', 'LEGACY');
    expect(hasPendingRoomInvite()).toBe(true);
    expect(getPendingRoomInvite()?.code).toBe('LEGACY');
  });
});
