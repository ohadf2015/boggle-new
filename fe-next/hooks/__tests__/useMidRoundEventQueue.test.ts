import { renderHook, act } from '@testing-library/react';
import {
  useMidRoundEventQueue,
  midRoundEventQueueStore,
  type MidRoundEvent,
} from '../useMidRoundEventQueue';

describe('useMidRoundEventQueue', () => {
  beforeEach(() => {
    act(() => {
      midRoundEventQueueStore.getState().clear();
    });
  });

  it('starts empty', () => {
    const { result } = renderHook(() => useMidRoundEventQueue());
    expect(result.current.events).toEqual([]);
  });

  it('appends events in order', () => {
    const { result } = renderHook(() => useMidRoundEventQueue());

    const a: MidRoundEvent = { kind: 'playerJoined', payload: { username: 'Bob' } };
    const b: MidRoundEvent = { kind: 'playerLeft', payload: { username: 'Carol' } };

    act(() => {
      midRoundEventQueueStore.getState().enqueue(a);
      midRoundEventQueueStore.getState().enqueue(b);
    });

    expect(result.current.events).toEqual([a, b]);
  });

  it('clear() empties the queue', () => {
    const { result } = renderHook(() => useMidRoundEventQueue());

    act(() => {
      midRoundEventQueueStore.getState().enqueue({ kind: 'playerJoined', payload: { username: 'X' } });
    });
    expect(result.current.events.length).toBe(1);

    act(() => {
      midRoundEventQueueStore.getState().clear();
    });
    expect(result.current.events).toEqual([]);
  });

  it('drain() returns + clears in one step', () => {
    const e: MidRoundEvent = { kind: 'achievementUnlocked', payload: { key: 'FIRST_BLOOD' } };

    act(() => {
      midRoundEventQueueStore.getState().enqueue(e);
    });

    let drained: MidRoundEvent[] = [];
    act(() => {
      drained = midRoundEventQueueStore.getState().drain();
    });

    expect(drained).toEqual([e]);
    expect(midRoundEventQueueStore.getState().events).toEqual([]);
  });

  it('caps queue at MAX_QUEUE (50) by dropping oldest', () => {
    act(() => {
      for (let i = 0; i < 60; i++) {
        midRoundEventQueueStore
          .getState()
          .enqueue({ kind: 'playerJoined', payload: { username: `u${i}` } });
      }
    });

    const events = midRoundEventQueueStore.getState().events;
    expect(events.length).toBe(50);
    expect(events[0]?.payload).toEqual({ username: 'u10' });
    expect(events[49]?.payload).toEqual({ username: 'u59' });
  });
});
