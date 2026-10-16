import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useBlastServerSync, BLAST_RESYNC_AFTER_MS } from '../useBlastServerSync';
import { BLAST_RESYNC_CLEARED_BY } from '@/shared/utils/blastServerSync';

describe('useBlastServerSync', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('asks the server for the board when a sent word is never acked (rejected, paused, rate-limited)', () => {
    const onRequestBoard = vi.fn();
    const { result } = renderHook(() => useBlastServerSync({ enabled: true, username: 'ana', onRequestBoard }));

    act(() => result.current.noteSubmit());
    act(() => { vi.advanceTimersByTime(BLAST_RESYNC_AFTER_MS + 1); });

    expect(onRequestBoard).toHaveBeenCalledTimes(1);
    expect(result.current.receive(BLAST_RESYNC_CLEARED_BY)).toBe(true);
  });

  it('does not ask when the word is acked in time', () => {
    const onRequestBoard = vi.fn();
    const { result } = renderHook(() => useBlastServerSync({ enabled: true, username: 'ana', onRequestBoard }));

    act(() => result.current.noteSubmit());
    expect(result.current.receive('ana')).toBe(true);
    act(() => { vi.advanceTimersByTime(BLAST_RESYNC_AFTER_MS * 2); });

    expect(onRequestBoard).not.toHaveBeenCalled();
  });

  it('applies every snapshot unchanged when disabled (solo / quick-play)', () => {
    const onRequestBoard = vi.fn();
    const { result } = renderHook(() => useBlastServerSync({ enabled: false, username: 'ana', onRequestBoard }));

    act(() => { result.current.noteSubmit(); result.current.noteSubmit(); });
    expect(result.current.receive('ana')).toBe(true);
    act(() => { vi.advanceTimersByTime(BLAST_RESYNC_AFTER_MS * 2); });
    expect(onRequestBoard).not.toHaveBeenCalled();
  });
});
