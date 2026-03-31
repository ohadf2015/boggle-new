/**
 * TDD: useWordHuntDangerAlerts hook tests
 */

import { renderHook, act } from '@testing-library/react';
import { useWordHuntDangerAlerts } from '../useWordHuntDangerAlerts';

// Mutable state containers -- vi.mock returns these refs each call
let _playerLives: Record<string, number> = {};
let _eliminatedPlayers: string[] = [];

vi.mock('@/hooks/gameState/store', () => ({
  useWordHuntPlayerLives: () => _playerLives,
  useWordHuntEliminatedPlayers: () => _eliminatedPlayers,
}));

describe('useWordHuntDangerAlerts', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    _playerLives = {};
    _eliminatedPlayers = [];
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns empty toasts when all players healthy', () => {
    _playerLives = { alice: 100, bob: 100 };
    const { result } = renderHook(() => useWordHuntDangerAlerts());
    expect(result.current.toasts).toEqual([]);
  });

  it('triggers danger toast when player below 30 HP on mount', () => {
    _playerLives = { alice: 100, bob: 25 };
    const { result } = renderHook(() => useWordHuntDangerAlerts());
    expect(result.current.toasts.length).toBe(1);
    expect(result.current.toasts[0].type).toBe('danger');
    expect(result.current.toasts[0].playerName).toBe('bob');
  });

  it('does not repeat danger toast for same player on rerender', () => {
    _playerLives = { alice: 100, bob: 25 };
    const { result, rerender } = renderHook(() => useWordHuntDangerAlerts());
    expect(result.current.toasts.length).toBe(1);

    // Rerender with bob still low -- no new toast
    _playerLives = { alice: 100, bob: 20 };
    rerender();
    const dangerBob = result.current.toasts.filter(t => t.type === 'danger' && t.playerName === 'bob');
    expect(dangerBob.length).toBe(1);
  });

  it('triggers eliminated toast', () => {
    _playerLives = { alice: 100, bob: 0 };
    _eliminatedPlayers = ['bob'];
    const { result } = renderHook(() => useWordHuntDangerAlerts());
    // Should have danger (bob < 30) + eliminated
    const eliminated = result.current.toasts.filter(t => t.type === 'eliminated');
    expect(eliminated.length).toBeGreaterThanOrEqual(1);
    expect(eliminated[0].playerName).toBe('bob');
  });

  it('triggers lastStanding when only 2 alive', () => {
    _playerLives = { alice: 100, bob: 0, charlie: 0, dave: 50 };
    _eliminatedPlayers = ['bob', 'charlie'];
    const { result } = renderHook(() => useWordHuntDangerAlerts());
    const lastStanding = result.current.toasts.filter(t => t.type === 'lastStanding');
    expect(lastStanding.length).toBe(1);
    expect(lastStanding[0].count).toBe(2);
  });

  it('dismissToast removes toast by id', () => {
    _playerLives = { alice: 100, bob: 25 };
    const { result } = renderHook(() => useWordHuntDangerAlerts());
    expect(result.current.toasts.length).toBeGreaterThan(0);
    const id = result.current.toasts[0].id;
    act(() => { result.current.dismissToast(id); });
    expect(result.current.toasts.find(t => t.id === id)).toBeUndefined();
  });
});
