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

  it('resumes from the wave AFTER the highest cleared so progress advances', () => {
    const { result } = renderHook(() => useBlastCheckpoint());
    act(() => result.current.recordWaveReached(4));
    // Cleared wave 4 → next session continues at wave 5, not a replay of 4.
    expect(result.current.resumeFromWave).toBe(5);
  });

  it('offers a resume after clearing only wave 1 (the "did not lose anything" case)', () => {
    // Mirrors the user report: clear wave 1, quit, reopen — progress must persist.
    const { result } = renderHook(() => useBlastCheckpoint());
    act(() => result.current.recordWaveReached(1));
    // resumeFromWave > 1 is what makes BlastView render the Resume button at all.
    expect(result.current.resumeFromWave).toBe(2);
  });

  it('keeps resumeFromWave at 1 with no checkpoint (fresh start)', () => {
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
    // Resume continues past the highest cleared wave.
    expect(result.current.resumeFromWave).toBe(8);
  });

  it('ignores corrupt storage entries without throwing', () => {
    localStorage.setItem(BLAST_CHECKPOINT_KEY, 'not-json{');
    const { result } = renderHook(() => useBlastCheckpoint());
    expect(result.current.checkpoint).toBeNull();
  });
});
