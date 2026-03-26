import {
  savePendingRoomInvite,
  consumePendingRoomInvite,
  hasPendingRoomInvite,
} from '../onboardingStorage';

describe('pending room invite helpers', () => {
  // Use a real sessionStorage-like implementation for these tests
  let store: Record<string, string> = {};
  beforeEach(() => {
    store = {};
    (sessionStorage.getItem as ReturnType<typeof vi.fn>).mockImplementation((key: string) => store[key] ?? null);
    (sessionStorage.setItem as ReturnType<typeof vi.fn>).mockImplementation((key: string, value: string) => { store[key] = value; });
    (sessionStorage.removeItem as ReturnType<typeof vi.fn>).mockImplementation((key: string) => { delete store[key]; });
    (sessionStorage.clear as ReturnType<typeof vi.fn>).mockImplementation(() => { store = {}; });
  });

  it('returns null when no pending invite exists', () => {
    expect(consumePendingRoomInvite()).toBeNull();
  });

  it('returns false for hasPendingRoomInvite when empty', () => {
    expect(hasPendingRoomInvite()).toBe(false);
  });

  it('saves and retrieves a room code', () => {
    savePendingRoomInvite('ABC123');
    expect(hasPendingRoomInvite()).toBe(true);
  });

  it('consumes the room code (read + delete)', () => {
    savePendingRoomInvite('ROOM42');
    const code = consumePendingRoomInvite();
    expect(code).toBe('ROOM42');
    // Should be cleared after consuming
    expect(hasPendingRoomInvite()).toBe(false);
    expect(consumePendingRoomInvite()).toBeNull();
  });

  it('overwrites previous room code with new one', () => {
    savePendingRoomInvite('OLD');
    savePendingRoomInvite('NEW');
    expect(consumePendingRoomInvite()).toBe('NEW');
  });
});
