/**
 * Tests for M8: Blast persistent wave saves
 * Verifies localStorage persistence of highest wave reached.
 */
import { renderHook, act } from '@testing-library/react';
import { useBlastWaveSave } from '../hooks/useBlastWaveSave';

const STORAGE_KEY = 'lexiclash_blast_highest_wave';

describe('useBlastWaveSave', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns defaults when no saved data exists', () => {
    const { result } = renderHook(() => useBlastWaveSave());
    expect(result.current.highestWave).toBe(0);
    expect(result.current.lastPlayedAt).toBeNull();
    expect(result.current.hasSavedProgress).toBe(false);
  });

  it('loads saved data from localStorage on mount', () => {
    const saved = { highestWave: 5, lastPlayedAt: '2026-03-18T10:00:00.000Z' };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));

    const { result } = renderHook(() => useBlastWaveSave());
    expect(result.current.highestWave).toBe(5);
    expect(result.current.lastPlayedAt).toBe('2026-03-18T10:00:00.000Z');
    expect(result.current.hasSavedProgress).toBe(true);
  });

  it('recordWave updates highest wave and persists to localStorage', () => {
    const { result } = renderHook(() => useBlastWaveSave());

    act(() => {
      result.current.recordWave(3);
    });

    expect(result.current.highestWave).toBe(3);
    expect(result.current.hasSavedProgress).toBe(true);

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.highestWave).toBe(3);
    expect(stored.lastPlayedAt).toBeDefined();
  });

  it('does not downgrade wave when recording a lower wave', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ highestWave: 5, lastPlayedAt: '2026-01-01' }));

    const { result } = renderHook(() => useBlastWaveSave());

    act(() => {
      result.current.recordWave(3);
    });

    expect(result.current.highestWave).toBe(5);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.highestWave).toBe(5);
  });

  it('upgrades wave when recording a higher wave', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ highestWave: 3, lastPlayedAt: '2026-01-01' }));

    const { result } = renderHook(() => useBlastWaveSave());

    act(() => {
      result.current.recordWave(7);
    });

    expect(result.current.highestWave).toBe(7);
  });

  it('hasSavedProgress is false when highestWave is 1', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ highestWave: 1, lastPlayedAt: '2026-01-01' }));

    const { result } = renderHook(() => useBlastWaveSave());
    expect(result.current.hasSavedProgress).toBe(false);
  });

  it('handles corrupt localStorage data gracefully', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json');

    const { result } = renderHook(() => useBlastWaveSave());
    expect(result.current.highestWave).toBe(0);
    expect(result.current.hasSavedProgress).toBe(false);
  });

  it('handles missing fields in stored data gracefully', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: 'bar' }));

    const { result } = renderHook(() => useBlastWaveSave());
    expect(result.current.highestWave).toBe(0);
  });
});
