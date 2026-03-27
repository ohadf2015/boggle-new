/**
 * usePowerHour Hook Tests
 *
 * Tests for the Power Hour daily boost feature.
 * Manages 1-hour 2x XP window activated on first game of the day.
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Use a real storage backing so the hook can read what it writes
const storageBackend: Record<string, string> = {};
beforeEach(() => {
  vi.useFakeTimers();
  // Set a fixed time at noon UTC to avoid DST boundary issues
  vi.setSystemTime(new Date('2026-03-15T12:00:00Z'));
  // Clear storage backend
  Object.keys(storageBackend).forEach(k => delete storageBackend[k]);
  vi.clearAllMocks();
  // Wire up localStorage mock to actually store values
  (localStorage.getItem as any).mockImplementation((key: string) => storageBackend[key] ?? null);
  (localStorage.setItem as any).mockImplementation((key: string, value: string) => { storageBackend[key] = value; });
  (localStorage.removeItem as any).mockImplementation((key: string) => { delete storageBackend[key]; });
  (localStorage.clear as any).mockImplementation(() => { Object.keys(storageBackend).forEach(k => delete storageBackend[k]); });
});

afterEach(() => {
  vi.useRealTimers();
});

import { usePowerHour, POWER_HOUR_STORAGE_KEY } from '../usePowerHour';

describe('usePowerHour', () => {
  it('should return inactive state when no power hour stored', () => {
    const { result } = renderHook(() => usePowerHour());

    expect(result.current.active).toBe(false);
    expect(result.current.remainingMinutes).toBe(0);
    expect(result.current.remainingSeconds).toBe(0);
    expect(result.current.expired).toBe(false);
  });

  it('should activate power hour and set expiry 60 minutes from now', () => {
    const { result } = renderHook(() => usePowerHour());

    act(() => {
      result.current.activate();
    });

    expect(result.current.active).toBe(true);
    expect(result.current.remainingMinutes).toBe(60);
    expect(result.current.remainingSeconds).toBe(0);
  });

  it('should persist activation to localStorage', () => {
    const { result } = renderHook(() => usePowerHour());

    act(() => {
      result.current.activate();
    });

    const stored = JSON.parse(localStorage.getItem(POWER_HOUR_STORAGE_KEY)!);
    expect(stored).toBeTruthy();
    expect(stored.expiresAt).toBeTruthy();
    expect(stored.activatedDate).toBeTruthy();
  });

  it('should countdown every second when active', () => {
    const { result } = renderHook(() => usePowerHour());

    act(() => {
      result.current.activate();
    });

    expect(result.current.remainingMinutes).toBe(60);
    expect(result.current.remainingSeconds).toBe(0);

    // Advance 90 seconds
    act(() => {
      vi.advanceTimersByTime(90_000);
    });

    expect(result.current.active).toBe(true);
    expect(result.current.remainingMinutes).toBe(58);
    expect(result.current.remainingSeconds).toBe(30);
  });

  it('should expire after 60 minutes', () => {
    const { result } = renderHook(() => usePowerHour());

    act(() => {
      result.current.activate();
    });

    // Advance 61 minutes
    act(() => {
      vi.advanceTimersByTime(61 * 60 * 1000);
    });

    expect(result.current.active).toBe(false);
    expect(result.current.expired).toBe(true);
    expect(result.current.remainingMinutes).toBe(0);
  });

  it('should restore active power hour from localStorage', () => {
    const expiresAt = Date.now() + 30 * 60 * 1000; // 30 min from now
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem(
      POWER_HOUR_STORAGE_KEY,
      JSON.stringify({ expiresAt, activatedDate: today })
    );

    const { result } = renderHook(() => usePowerHour());

    expect(result.current.active).toBe(true);
    expect(result.current.remainingMinutes).toBe(30);
  });

  it('should reset if activation date is not today', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const expiresAt = yesterday.getTime() + 60 * 60 * 1000;
    localStorage.setItem(
      POWER_HOUR_STORAGE_KEY,
      JSON.stringify({
        expiresAt,
        activatedDate: yesterday.toISOString().split('T')[0],
      })
    );

    const { result } = renderHook(() => usePowerHour());

    expect(result.current.active).toBe(false);
    expect(result.current.expired).toBe(false);
  });

  it('should not re-activate if already activated today', () => {
    const { result } = renderHook(() => usePowerHour());

    act(() => {
      result.current.activate();
    });

    const firstExpiry = JSON.parse(
      localStorage.getItem(POWER_HOUR_STORAGE_KEY)!
    ).expiresAt;

    // Try activating again
    act(() => {
      result.current.activate();
    });

    const secondExpiry = JSON.parse(
      localStorage.getItem(POWER_HOUR_STORAGE_KEY)!
    ).expiresAt;

    expect(firstExpiry).toBe(secondExpiry);
  });

  it('should clear interval on unmount', () => {
    const { result, unmount } = renderHook(() => usePowerHour());

    act(() => {
      result.current.activate();
    });

    unmount();

    // Should not throw or update after unmount
    act(() => {
      vi.advanceTimersByTime(5000);
    });
  });
});
