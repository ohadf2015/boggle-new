import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';

const listeners = new Map<string, (data: unknown) => void>();
const emit = vi.fn();
vi.mock('@/utils/SocketContext', () => ({
  useSocketEmit: () => emit,
  useSocketEvent: (event: string, handler: (data: unknown) => void) => { listeners.set(event, handler); },
}));

import { useClassroomEconomy } from '../useClassroomEconomy';
import { CLASSROOM_ECONOMY_EVENTS as E, ZERO_ECONOMY_SNAPSHOT } from '@/shared/constants/classroomEconomy';

describe('useClassroomEconomy — a new round starts the streak over', () => {
  beforeEach(() => { listeners.clear(); emit.mockClear(); });

  it('GIVEN a 7-in-a-row streak WHEN the next round starts THEN the HUD shows no streak before the first word and re-reads the server', () => {
    const { result } = renderHook(() => useClassroomEconomy('AB12'));
    act(() => listeners.get(E.state)!({ ...ZERO_ECONOMY_SNAPSHOT, cash: 40, streak: 7, multiplier: 3 }));
    expect(result.current.snapshot?.streak).toBe(7);
    emit.mockClear();

    act(() => listeners.get('startGame')!({}));

    expect(result.current.snapshot).toMatchObject({ cash: 40, streak: 0, multiplier: 1, lastDelta: null });
    expect(emit).toHaveBeenCalledWith(E.requestState, { gameCode: 'AB12' });
  });
});
