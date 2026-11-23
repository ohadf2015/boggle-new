// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const announceWordResult = vi.fn();
vi.mock('@/components/GameAnnouncer', () => ({ useAnnouncer: () => ({ announceWordResult }) }));
const hapticError = vi.fn();
const tap = vi.fn();
vi.mock('@/utils/haptics', () => ({ hapticError: () => hapticError(), hapticForWordScore: () => tap() }));

import { useWordVerdict } from '../useWordVerdict';

const t = (key: string, params?: Record<string, string | number>) => `${key}${params ? JSON.stringify(params) : ''}`;

describe('useWordVerdict', () => {
  beforeEach(() => { announceWordResult.mockClear(); hapticError.mockClear(); tap.mockClear(); });

  it('given a non-word, it buzzes, vibrates and announces the localized reason', () => {
    const sound = vi.fn();
    const { result } = renderHook(() => useWordVerdict({ t, playRejectedSound: sound }));
    let v!: ReturnType<typeof result.current.reject>;
    act(() => { v = result.current.reject('ANUAL', 'not-a-word'); });
    expect(v.message).toBe('wordVerdict.notAWord');
    expect(sound).toHaveBeenCalledTimes(1);
    expect(hapticError).toHaveBeenCalledTimes(1);
    expect(announceWordResult).toHaveBeenCalledWith('ANUAL', false, undefined, 'wordVerdict.notAWord');
  });

  it('given the same word rejected again, it escalates; a different word starts over', () => {
    const { result } = renderHook(() => useWordVerdict({ t }));
    const first = result.current.reject('ANUAL', 'not-a-word');
    const second = result.current.reject('anual', 'not-a-word');
    const other = result.current.reject('ZZZ', 'not-a-word');
    expect(first.repeat).toBe(false);
    expect(second).toMatchObject({ repeat: true, message: 'wordVerdict.notAWordAgain' });
    expect(other.repeat).toBe(false);
  });

  it('given an accept in between, the next miss is a first miss again', () => {
    const { result } = renderHook(() => useWordVerdict({ t }));
    result.current.reject('ANUAL', 'not-a-word');
    result.current.clearRepeat();
    expect(result.current.reject('ANUAL', 'not-a-word').repeat).toBe(false);
  });

  it('given an already-found word, it taps lightly without the buzzer', () => {
    const sound = vi.fn();
    const { result } = renderHook(() => useWordVerdict({ t, playRejectedSound: sound }));
    result.current.reject('CAT', 'already-found');
    expect(sound).not.toHaveBeenCalled();
    expect(tap).toHaveBeenCalledTimes(1);
    expect(hapticError).not.toHaveBeenCalled();
  });
});
