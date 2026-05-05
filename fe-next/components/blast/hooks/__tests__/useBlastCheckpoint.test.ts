/**
 * useBlastCheckpoint — persists highest wave reached so players can resume
 * instead of grinding from wave 1 every run.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBlastCheckpoint, BLAST_CHECKPOINT_KEY } from '../useBlastCheckpoint';

describe('useBlastCheckpoint', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('returns null checkpoint on first load', () => {
    const { result } = renderHook(() => useBlastCheckpoint());
    expect(result.current.checkpoint).toBeNull();
    expect(result.current.resumeFromWave).toBe(1);
  });

  it('persists highest wave reached on recordWaveReached', () => {
    const { result } = renderHook(() => useBlastCheckpoint());
    act(() => result.current.recordWaveReached(3));
    expect(result.current.checkpoint?.highestWave).toBe(3);
    // Persisted to storage under the public key
    const stored = JSON.parse(localStorage.getItem(BLAST_CHECKPOINT_KEY)!);
    expect(stored.highestWave).toBe(3);
  });

  it('never regresses the stored highest wave', () => {
    const { result } = renderHook(() => useBlastCheckpoint());
    act(() => result.current.recordWaveReached(5));
    act(() => result.current.recordWaveReached(2));
    expect(result.current.checkpoint?.highestWave).toBe(5);
  });

  it('offers resumeFromWave = highestWave (not one back) so progress feels earned', () => {
    const { result } = renderHook(() => useBlastCheckpoint());
    act(() => result.current.recordWaveReached(4));
    expect(result.current.resumeFromWave).toBe(4);
  });

  it('clamps resumeFromWave to at least 1', () => {
    const { result } = renderHook(() => useBlastCheckpoint());
    act(() => result.current.recordWaveReached(0));
    expect(result.current.resumeFromWave).toBe(1);
  });

  it('clear() wipes the checkpoint and storage', () => {
    const { result } = renderHook(() => useBlastCheckpoint());
    act(() => result.current.recordWaveReached(6));
    act(() => result.current.clear());
    expect(result.current.checkpoint).toBeNull();
    expect(localStorage.getItem(BLAST_CHECKPOINT_KEY)).toBeNull();
  });

  it('hydrates existing checkpoint from localStorage on mount', () => {
    localStorage.setItem(
      BLAST_CHECKPOINT_KEY,
      JSON.stringify({ highestWave: 7, updatedAt: Date.now() }),
    );
    const { result } = renderHook(() => useBlastCheckpoint());
    expect(result.current.checkpoint?.highestWave).toBe(7);
    expect(result.current.resumeFromWave).toBe(7);
  });

  it('ignores corrupt storage entries without throwing', () => {
    localStorage.setItem(BLAST_CHECKPOINT_KEY, 'not-json{');
    const { result } = renderHook(() => useBlastCheckpoint());
    expect(result.current.checkpoint).toBeNull();
  });
});

describe('useBlastCheckpoint — requiresAd mode', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('recordWaveReached does NOT touch localStorage when requiresAd', () => {
    const { result } = renderHook(() => useBlastCheckpoint({ requiresAd: true }));
    act(() => result.current.recordWaveReached(4));
    expect(localStorage.getItem(BLAST_CHECKPOINT_KEY)).toBeNull();
  });

  it('hasUnpersistedProgress flips true after recordWaveReached when requiresAd', () => {
    const { result } = renderHook(() => useBlastCheckpoint({ requiresAd: true }));
    expect(result.current.hasUnpersistedProgress).toBe(false);
    act(() => result.current.recordWaveReached(4));
    expect(result.current.hasUnpersistedProgress).toBe(true);
  });

  it('persistCheckpoint writes the in-memory wave to localStorage', () => {
    const { result } = renderHook(() => useBlastCheckpoint({ requiresAd: true }));
    act(() => result.current.recordWaveReached(7));
    let persisted: number | null = -1;
    act(() => { persisted = result.current.persistCheckpoint(); });
    expect(persisted).toBe(7);
    const stored = JSON.parse(localStorage.getItem(BLAST_CHECKPOINT_KEY)!);
    expect(stored.highestWave).toBe(7);
    expect(result.current.hasUnpersistedProgress).toBe(false);
  });

  it('persistCheckpoint returns null when nothing in memory', () => {
    const { result } = renderHook(() => useBlastCheckpoint({ requiresAd: true }));
    let persisted: number | null = -1;
    act(() => { persisted = result.current.persistCheckpoint(); });
    expect(persisted).toBeNull();
    expect(localStorage.getItem(BLAST_CHECKPOINT_KEY)).toBeNull();
  });

  it('declining the ad evaporates progress next session', () => {
    const { result, unmount } = renderHook(() => useBlastCheckpoint({ requiresAd: true }));
    act(() => result.current.recordWaveReached(8));
    // No persistCheckpoint call — user "declined the ad" by quitting
    unmount();
    // Fresh session: nothing in storage, resumeFromWave should be 1
    const { result: result2 } = renderHook(() => useBlastCheckpoint({ requiresAd: true }));
    expect(result2.current.resumeFromWave).toBe(1);
  });

  it('clear() resets in-memory state too', () => {
    const { result } = renderHook(() => useBlastCheckpoint({ requiresAd: true }));
    act(() => result.current.recordWaveReached(5));
    expect(result.current.hasUnpersistedProgress).toBe(true);
    act(() => result.current.clear());
    expect(result.current.hasUnpersistedProgress).toBe(false);
    let persisted: number | null = -1;
    act(() => { persisted = result.current.persistCheckpoint(); });
    expect(persisted).toBeNull();
  });
});
