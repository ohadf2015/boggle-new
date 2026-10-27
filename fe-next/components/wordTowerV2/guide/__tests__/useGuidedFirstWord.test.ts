import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { findGuidePath, useGuidedFirstWord, GUIDE_STORAGE_KEY, type GuideArgs } from '../useGuidedFirstWord';
import { coachStorageKey } from '@/lib/tutorial/modeCoachStore';

const DICT = new Set(['TOP', 'POT', 'STOP', 'OPT']);
const WHEEL = ['s', 'x', 'o', 'p', 't', 'q', 'z'];

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe('findGuidePath', () => {
  it('given a wheel and a dictionary, then it returns wheel indices of a short real word', () => {
    const path = findGuidePath(WHEEL, DICT);
    expect(path).not.toBeNull();
    const word = path!.map((i) => WHEEL[i]).join('').toUpperCase();
    expect(word.length).toBe(3);
    expect(DICT.has(word)).toBe(true);
  });

  it('given no word can be made, then it returns null', () => {
    expect(findGuidePath(['x', 'q', 'z', 'j'], DICT)).toBeNull();
  });
});

const base: GuideArgs = {
  daily: true,
  dict: DICT,
  dictReady: true,
  dictError: false,
  wheel: WHEEL,
  selected: [],
  phase: 'composing',
  towerFloors: 0,
  floors: 0,
};

const run = (args: GuideArgs) => renderHook((a: GuideArgs) => useGuidedFirstWord(a), { initialProps: args });

describe('useGuidedFirstWord', () => {
  it('given endless play, then the guide is off from the first render', () => {
    const { result } = run({ ...base, daily: false });
    expect(result.current.status).toBe('off');
  });

  it('given a new daily player, when the wheel is ready, then the guide shows and is persisted as seen at show time', () => {
    const { result } = run(base);
    expect(result.current.status).toBe('spell');
    expect(window.localStorage.getItem(GUIDE_STORAGE_KEY)).toBe('1');
    // The tower coach would teach the same thing on top of it.
    expect(window.localStorage.getItem(coachStorageKey('wordTower'))).not.toBeNull();
    expect(result.current.word).toHaveLength(3);
  });

  it('given the guide was seen before, then it stays off', () => {
    window.localStorage.setItem(GUIDE_STORAGE_KEY, '1');
    const { result } = run(base);
    expect(result.current.status).toBe('off');
  });

  it('given a returning player whose tower is standing, then the guide stays off', () => {
    const { result } = run({ ...base, towerFloors: 4 });
    expect(result.current.status).toBe('off');
    expect(window.localStorage.getItem(GUIDE_STORAGE_KEY)).toBeNull();
  });

  it('given the dictionary is still loading, then the guide waits (pending) without deciding', () => {
    const { result } = run({ ...base, dictReady: false, dict: null });
    expect(result.current.status).toBe('pending');
  });

  it('given the player follows the path, then the next tile advances', () => {
    const { result, rerender } = run(base);
    const path = result.current.path!;
    expect(result.current.next).toBe(path[0]);
    rerender({ ...base, selected: [path[0]] });
    expect(result.current.next).toBe(path[1]);
  });

  it('given the word is spelled and hoisted, when it lands, then it celebrates and then fades out', () => {
    const { result, rerender } = run(base);
    const wheel2 = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    rerender({ ...base, wheel: wheel2, phase: 'swinging' });
    expect(result.current.status).toBe('drop');
    rerender({ ...base, wheel: wheel2, phase: 'composing', floors: 1 });
    expect(result.current.status).toBe('done');
    act(() => vi.advanceTimersByTime(2500));
    expect(result.current.status).toBe('off');
  });
});
