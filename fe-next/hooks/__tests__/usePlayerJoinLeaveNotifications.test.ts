import { renderHook, act } from '@testing-library/react';
import { usePlayerJoinLeaveNotifications } from '../usePlayerJoinLeaveNotifications';
import { neoInfoToast, neoWarningToast } from '@/components/NeoToast';

jest.mock('@/components/NeoToast', () => ({
  neoInfoToast: jest.fn(),
  neoWarningToast: jest.fn(),
}));

const mockT = (key: string) => {
  const translations: Record<string, string> = {
    'multiplayer.playerJoined': 'joined the game!',
    'multiplayer.playerLeft': 'left the game',
  };
  return translations[key] || key;
};

type Player = { username: string; score?: number; isBot?: boolean };

describe('usePlayerJoinLeaveNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not show notifications on initial render', () => {
    const players: Player[] = [
      { username: 'Alice' },
      { username: 'Bob' },
    ];

    renderHook(() =>
      usePlayerJoinLeaveNotifications({ players, currentUsername: 'Alice', t: mockT })
    );

    expect(neoInfoToast).not.toHaveBeenCalled();
    expect(neoWarningToast).not.toHaveBeenCalled();
  });

  it('should show join notification when a new player joins', () => {
    const { rerender } = renderHook(
      ({ players }: { players: Player[] }) =>
        usePlayerJoinLeaveNotifications({ players, currentUsername: 'Alice', t: mockT }),
      { initialProps: { players: [{ username: 'Alice' }] } }
    );

    rerender({ players: [{ username: 'Alice' }, { username: 'Bob' }] });

    expect(neoInfoToast).toHaveBeenCalledWith(
      'Bob joined the game!',
      expect.objectContaining({ icon: expect.any(String), duration: expect.any(Number) })
    );
  });

  it('should show leave notification when a player leaves', () => {
    const { rerender } = renderHook(
      ({ players }: { players: Player[] }) =>
        usePlayerJoinLeaveNotifications({ players, currentUsername: 'Alice', t: mockT }),
      { initialProps: { players: [{ username: 'Alice' }, { username: 'Bob' }] } }
    );

    rerender({ players: [{ username: 'Alice' }] });

    expect(neoWarningToast).toHaveBeenCalledWith(
      'Bob left the game',
      expect.objectContaining({ icon: expect.any(String), duration: expect.any(Number) })
    );
  });

  it('should not notify when current user joins', () => {
    const { rerender } = renderHook(
      ({ players }: { players: Player[] }) =>
        usePlayerJoinLeaveNotifications({ players, currentUsername: 'Alice', t: mockT }),
      { initialProps: { players: [] as Player[] } }
    );

    rerender({ players: [{ username: 'Alice' }] });

    expect(neoInfoToast).not.toHaveBeenCalled();
  });

  it('should handle multiple joins at once', () => {
    const { rerender } = renderHook(
      ({ players }: { players: Player[] }) =>
        usePlayerJoinLeaveNotifications({ players, currentUsername: 'Alice', t: mockT }),
      { initialProps: { players: [{ username: 'Alice' }] } }
    );

    rerender({ players: [{ username: 'Alice' }, { username: 'Bob' }, { username: 'Charlie' }] });

    expect(neoInfoToast).toHaveBeenCalledTimes(2);
  });

  it('should handle multiple leaves at once', () => {
    const { rerender } = renderHook(
      ({ players }: { players: Player[] }) =>
        usePlayerJoinLeaveNotifications({ players, currentUsername: 'Alice', t: mockT }),
      { initialProps: { players: [{ username: 'Alice' }, { username: 'Bob' }, { username: 'Charlie' }] } }
    );

    rerender({ players: [{ username: 'Alice' }] });

    expect(neoWarningToast).toHaveBeenCalledTimes(2);
  });

  it('should not notify when disabled', () => {
    const { rerender } = renderHook(
      ({ players }: { players: Player[] }) =>
        usePlayerJoinLeaveNotifications({ players, currentUsername: 'Alice', t: mockT, enabled: false }),
      { initialProps: { players: [{ username: 'Alice' }] } }
    );

    rerender({ players: [{ username: 'Alice' }, { username: 'Bob' }] });

    expect(neoInfoToast).not.toHaveBeenCalled();
  });

  it('should handle simultaneous join and leave', () => {
    const { rerender } = renderHook(
      ({ players }: { players: Player[] }) =>
        usePlayerJoinLeaveNotifications({ players, currentUsername: 'Alice', t: mockT }),
      { initialProps: { players: [{ username: 'Alice' }, { username: 'Bob' }] } }
    );

    rerender({ players: [{ username: 'Alice' }, { username: 'Charlie' }] });

    expect(neoWarningToast).toHaveBeenCalledWith(
      'Bob left the game',
      expect.any(Object)
    );
    expect(neoInfoToast).toHaveBeenCalledWith(
      'Charlie joined the game!',
      expect.any(Object)
    );
  });
});
