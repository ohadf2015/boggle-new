import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePlayerJoinLeaveNotifications } from '../usePlayerJoinLeaveNotifications';
import { neoInfoToast, neoWarningToast } from '@/components/NeoToast';
import { midRoundEventQueueStore } from '../useMidRoundEventQueue';

vi.mock('@/components/NeoToast', async () => {
  const actual = await vi.importActual<typeof import('@/components/NeoToast')>('@/components/NeoToast');
  return {
    ...actual,
    neoInfoToast: vi.fn(),
    neoWarningToast: vi.fn(),
  };
});

const mockT = (key: string, params?: Record<string, string | number>) => {
  const translations: Record<string, string> = {
    'multiplayer.playerJoined': 'joined the game!',
    'multiplayer.playerLeft': 'left the game',
    'multiplayer.botsJoined': `No humans? ${params?.count ?? 0} bots jumped in!`,
  };
  return translations[key] || key;
};

type Player = { username: string; score?: number; isBot?: boolean };

describe('usePlayerJoinLeaveNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    act(() => midRoundEventQueueStore.getState().clear());
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

  it('should handle multiple joins at once with ONE consolidated toast', () => {
    const { rerender } = renderHook(
      ({ players }: { players: Player[] }) =>
        usePlayerJoinLeaveNotifications({ players, currentUsername: 'Alice', t: mockT }),
      { initialProps: { players: [{ username: 'Alice' }] } }
    );

    rerender({ players: [{ username: 'Alice' }, { username: 'Bob' }, { username: 'Charlie' }] });

    expect(neoInfoToast).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple leaves at once with ONE consolidated toast', () => {
    const { rerender } = renderHook(
      ({ players }: { players: Player[] }) =>
        usePlayerJoinLeaveNotifications({ players, currentUsername: 'Alice', t: mockT }),
      { initialProps: { players: [{ username: 'Alice' }, { username: 'Bob' }, { username: 'Charlie' }] } }
    );

    rerender({ players: [{ username: 'Alice' }] });

    expect(neoWarningToast).toHaveBeenCalledTimes(1);
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

  it('should show a single consolidated toast when multiple bots join', () => {
    const initialPlayers: Player[] = [{ username: 'Alice' }];
    const { rerender } = renderHook(
      ({ players }: { players: Player[] }) =>
        usePlayerJoinLeaveNotifications({ players, currentUsername: 'Alice', t: mockT }),
      { initialProps: { players: initialPlayers } }
    );

    rerender({
      players: [
        { username: 'Alice' },
        { username: 'Bot-1', isBot: true },
        { username: 'Bot-2', isBot: true },
        { username: 'Bot-3', isBot: true },
      ],
    });

    // Should show exactly 1 toast for all bots, not 3 individual ones
    expect(neoInfoToast).toHaveBeenCalledTimes(1);
    expect(neoInfoToast).toHaveBeenCalledWith(
      expect.stringContaining('3 bots'),
      expect.objectContaining({ icon: expect.anything() })
    );
  });

  describe('deferToQueue (mid-round suppression)', () => {
    it('does not toast when deferToQueue=true and instead enqueues join event', () => {
      const { rerender } = renderHook(
        ({ players }: { players: Player[] }) =>
          usePlayerJoinLeaveNotifications({
            players,
            currentUsername: 'Alice',
            t: mockT,
            deferToQueue: true,
          }),
        { initialProps: { players: [{ username: 'Alice' }] } }
      );

      rerender({ players: [{ username: 'Alice' }, { username: 'Bob' }] });

      expect(neoInfoToast).not.toHaveBeenCalled();
      const events = midRoundEventQueueStore.getState().events;
      expect(events).toEqual([
        { kind: 'playerJoined', payload: { username: 'Bob', isBot: false } },
      ]);
    });

    it('enqueues leaves as well when deferToQueue=true', () => {
      const { rerender } = renderHook(
        ({ players }: { players: Player[] }) =>
          usePlayerJoinLeaveNotifications({
            players,
            currentUsername: 'Alice',
            t: mockT,
            deferToQueue: true,
          }),
        { initialProps: { players: [{ username: 'Alice' }, { username: 'Bob' }] } }
      );

      rerender({ players: [{ username: 'Alice' }] });

      expect(neoWarningToast).not.toHaveBeenCalled();
      expect(midRoundEventQueueStore.getState().events).toEqual([
        { kind: 'playerLeft', payload: { username: 'Bob' } },
      ]);
    });

    it('enqueues each bot individually (no consolidation in deferred mode)', () => {
      const { rerender } = renderHook(
        ({ players }: { players: Player[] }) =>
          usePlayerJoinLeaveNotifications({
            players,
            currentUsername: 'Alice',
            t: mockT,
            deferToQueue: true,
          }),
        { initialProps: { players: [{ username: 'Alice' }] as Player[] } }
      );

      rerender({
        players: [
          { username: 'Alice' },
          { username: 'Bot-1', isBot: true },
          { username: 'Bot-2', isBot: true },
        ],
      });

      expect(neoInfoToast).not.toHaveBeenCalled();
      const events = midRoundEventQueueStore.getState().events;
      expect(events.length).toBe(2);
      expect(events[0]).toEqual({ kind: 'playerJoined', payload: { username: 'Bot-1', isBot: true } });
      expect(events[1]).toEqual({ kind: 'playerJoined', payload: { username: 'Bot-2', isBot: true } });
    });

    it('toasts as before when deferToQueue=false (default)', () => {
      const { rerender } = renderHook(
        ({ players }: { players: Player[] }) =>
          usePlayerJoinLeaveNotifications({
            players,
            currentUsername: 'Alice',
            t: mockT,
          }),
        { initialProps: { players: [{ username: 'Alice' }] } }
      );

      rerender({ players: [{ username: 'Alice' }, { username: 'Bob' }] });

      expect(neoInfoToast).toHaveBeenCalledTimes(1);
      expect(midRoundEventQueueStore.getState().events).toEqual([]);
    });
  });

  describe('lobby consolidation (cap to one toast per batch)', () => {
    it('fires only ONE toast when multiple humans join at once', () => {
      const { rerender } = renderHook(
        ({ players }: { players: Player[] }) =>
          usePlayerJoinLeaveNotifications({ players, currentUsername: 'Alice', t: mockT }),
        { initialProps: { players: [{ username: 'Alice' }] as Player[] } }
      );

      rerender({
        players: [
          { username: 'Alice' },
          { username: 'Bob' },
          { username: 'Carol' },
          { username: 'Dave' },
        ],
      });

      expect(neoInfoToast).toHaveBeenCalledTimes(1);
    });

    it('fires only ONE toast when humans + bots arrive in same batch', () => {
      const { rerender } = renderHook(
        ({ players }: { players: Player[] }) =>
          usePlayerJoinLeaveNotifications({ players, currentUsername: 'Alice', t: mockT }),
        { initialProps: { players: [{ username: 'Alice' }] as Player[] } }
      );

      rerender({
        players: [
          { username: 'Alice' },
          { username: 'Bob' },
          { username: 'Bot-1', isBot: true },
          { username: 'Bot-2', isBot: true },
        ],
      });

      expect(neoInfoToast).toHaveBeenCalledTimes(1);
    });

    it('fires only ONE leave toast when many leave at once', () => {
      const { rerender } = renderHook(
        ({ players }: { players: Player[] }) =>
          usePlayerJoinLeaveNotifications({ players, currentUsername: 'Alice', t: mockT }),
        {
          initialProps: {
            players: [
              { username: 'Alice' },
              { username: 'Bob' },
              { username: 'Carol' },
              { username: 'Dave' },
            ] as Player[],
          },
        }
      );

      rerender({ players: [{ username: 'Alice' }] });

      expect(neoWarningToast).toHaveBeenCalledTimes(1);
    });

    it('fires at most TWO total toasts (1 join + 1 leave) when both happen', () => {
      const { rerender } = renderHook(
        ({ players }: { players: Player[] }) =>
          usePlayerJoinLeaveNotifications({ players, currentUsername: 'Alice', t: mockT }),
        {
          initialProps: {
            players: [{ username: 'Alice' }, { username: 'Bob' }] as Player[],
          },
        }
      );

      rerender({
        players: [
          { username: 'Alice' },
          { username: 'Carol' },
          { username: 'Dave' },
        ],
      });

      expect(neoInfoToast).toHaveBeenCalledTimes(1);
      expect(neoWarningToast).toHaveBeenCalledTimes(1);
    });
  });

  it('should show separate toasts for humans and one consolidated toast for bots', () => {
    const initialPlayers: Player[] = [{ username: 'Alice' }];
    const { rerender } = renderHook(
      ({ players }: { players: Player[] }) =>
        usePlayerJoinLeaveNotifications({ players, currentUsername: 'Alice', t: mockT }),
      { initialProps: { players: initialPlayers } }
    );

    rerender({
      players: [
        { username: 'Alice' },
        { username: 'Bob' },
        { username: 'Bot-1', isBot: true },
        { username: 'Bot-2', isBot: true },
      ],
    });

    // ONE consolidated toast for the whole batch (humans + bots)
    expect(neoInfoToast).toHaveBeenCalledTimes(1);
  });
});
