import { beforeEach, describe, expect, it, vi } from 'vitest';
import { markRoomPlayed, roomPlayed } from '../roomPlayed';

describe('roomPlayed', () => {
  beforeEach(() => sessionStorage.clear());

  it('Given a fresh room, When the lobby mounts, Then no round has been played', () => {
    expect(roomPlayed('ABC123')).toBe(false);
  });

  it('Given a round started, When the lobby comes back, Then that room (only) reads as played', () => {
    markRoomPlayed('ABC123');
    expect(roomPlayed('ABC123')).toBe(true);
    expect(roomPlayed('ZZZ999')).toBe(false);
  });

  it('Given storage throws, Then it reads as not played and marking does not throw', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(roomPlayed('ABC123')).toBe(false);
    expect(() => markRoomPlayed('ABC123')).not.toThrow();
    spy.mockRestore();
    set.mockRestore();
  });
});
