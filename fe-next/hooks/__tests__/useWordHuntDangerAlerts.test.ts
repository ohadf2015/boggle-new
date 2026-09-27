/**
 * TDD: useWordHuntDangerAlerts hook tests
 */

import { renderHook, act } from '@testing-library/react';
import { useWordHuntDangerAlerts } from '../useWordHuntDangerAlerts';

// Mutable state containers -- vi.mock returns these refs each call
let _playerLives: Record<string, number> = {};
let _eliminatedPlayers: string[] = [];
let _myLife = 100;

vi.mock('@/hooks/gameState/store', () => ({
  useWordHuntPlayerLives: () => _playerLives,
  useWordHuntEliminatedPlayers: () => _eliminatedPlayers,
  useWordHuntMyLife: () => _myLife,
}));

describe('useWordHuntDangerAlerts', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    _playerLives = {};
    _eliminatedPlayers = [];
    _myLife = 100;
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

  it('fires a lowLifeSelf encouragement toast (not a generic danger toast) when own life drops low', () => {
    _myLife = 25;
    _playerLives = { me: 25, bob: 100 };
    const { result } = renderHook(() => useWordHuntDangerAlerts('me'));
    expect(result.current.toasts.filter(t => t.type === 'lowLifeSelf').length).toBe(1);
    // self must NOT also surface as a generic "X in danger" toast
    expect(result.current.toasts.filter(t => t.type === 'danger' && t.playerName === 'me').length).toBe(0);
  });

  it('still fires generic danger for opponents while self gets lowLifeSelf', () => {
    _myLife = 20;
    _playerLives = { me: 20, bob: 25 };
    const { result } = renderHook(() => useWordHuntDangerAlerts('me'));
    expect(result.current.toasts.filter(t => t.type === 'lowLifeSelf').length).toBe(1);
    expect(result.current.toasts.filter(t => t.type === 'danger' && t.playerName === 'bob').length).toBe(1);
  });

  it('does not repeat lowLifeSelf while own life stays low', () => {
    _myLife = 25;
    _playerLives = { me: 25 };
    const { result, rerender } = renderHook(() => useWordHuntDangerAlerts('me'));
    expect(result.current.toasts.filter(t => t.type === 'lowLifeSelf').length).toBe(1);
    _myLife = 15;
    _playerLives = { me: 15 };
    rerender();
    expect(result.current.toasts.filter(t => t.type === 'lowLifeSelf').length).toBe(1);
  });

  it('re-arms lowLifeSelf after healing back above the threshold then dropping again', () => {
    _myLife = 25;
    _playerLives = { me: 25 };
    const { result, rerender } = renderHook(() => useWordHuntDangerAlerts('me'));
    expect(result.current.toasts.filter(t => t.type === 'lowLifeSelf').length).toBe(1);
    _myLife = 80; // heal above threshold -> re-arm
    _playerLives = { me: 80 };
    rerender();
    _myLife = 10; // drop again -> fire again
    _playerLives = { me: 10 };
    rerender();
    expect(result.current.toasts.filter(t => t.type === 'lowLifeSelf').length).toBe(2);
  });

  it('does not fire lowLifeSelf when own life is healthy', () => {
    _myLife = 100;
    _playerLives = { me: 100, bob: 100 };
    const { result } = renderHook(() => useWordHuntDangerAlerts('me'));
    expect(result.current.toasts.filter(t => t.type === 'lowLifeSelf').length).toBe(0);
  });

  it('does not fire lowLifeSelf when own life is zero (dead, not low)', () => {
    _myLife = 0;
    _playerLives = { me: 0 };
    _eliminatedPlayers = ['me'];
    const { result } = renderHook(() => useWordHuntDangerAlerts('me'));
    expect(result.current.toasts.filter(t => t.type === 'lowLifeSelf').length).toBe(0);
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
