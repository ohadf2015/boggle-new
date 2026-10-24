import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const pro = vi.hoisted(() => ({ value: { hasPro: true, loading: false } }));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => pro.value }));

import { useRotatingBoss } from '../useRotatingBoss';

beforeEach(() => {
  localStorage.clear();
  pro.value = { hasPro: true, loading: false };
});

describe('useRotatingBoss', () => {
  it('gives a Pro teacher the boss after the last one, and remembers it', () => {
    localStorage.setItem('lc_last_classroom_boss', 'lexiconDragon');
    const { result } = renderHook(() => useRotatingBoss());
    expect(result.current[0]).toBe('msGrammar');
    expect(localStorage.getItem('lc_last_classroom_boss')).toBe('msGrammar');
  });

  it('keeps a free teacher on the Lexicon Dragon and never rotates the stored boss', () => {
    pro.value = { hasPro: false, loading: false };
    localStorage.setItem('lc_last_classroom_boss', 'lexiconDragon');
    const { result } = renderHook(() => useRotatingBoss());
    expect(result.current[0]).toBe('lexiconDragon');
    expect(localStorage.getItem('lc_last_classroom_boss')).toBe('lexiconDragon');
  });

  it('waits for the entitlement before choosing, then rotates once', () => {
    pro.value = { hasPro: false, loading: true };
    const { result, rerender } = renderHook(() => useRotatingBoss());
    expect(result.current[0]).toBe('lexiconDragon');
    pro.value = { hasPro: true, loading: false };
    rerender();
    const first = result.current[0];
    rerender();
    expect(result.current[0]).toBe(first);
  });

  it('lets an explicit pick stand', () => {
    const { result } = renderHook(() => useRotatingBoss());
    act(() => result.current[1]('spellingBee'));
    expect(result.current[0]).toBe('spellingBee');
  });
});
