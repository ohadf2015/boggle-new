import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { Socket } from 'socket.io-client';
import { useEndRoundNow } from '../useEndRoundNow';

describe('useEndRoundNow', () => {
  it('Given a teacher mid-round, When ending the round, Then it sends the same endRoundNow the live controls send and nothing that leaves the room', () => {
    const emit = vi.fn();
    const socket = { emit } as unknown as Socket;
    const { result } = renderHook(() => useEndRoundNow(socket));
    result.current();
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith('endRoundNow');
  });

  it('Given no socket yet, When ending the round, Then nothing throws', () => {
    const { result } = renderHook(() => useEndRoundNow(null));
    expect(() => result.current()).not.toThrow();
  });
});
