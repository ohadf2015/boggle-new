import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFirstRunSeen } from '../useFirstRunSeen';

beforeEach(() => {
  window.localStorage.clear();
});

describe('useFirstRunSeen', () => {
  it('reveals the card for a first-time key (seen → false after mount)', () => {
    const { result } = renderHook(() => useFirstRunSeen('forge'));
    expect(result.current.seen).toBe(false);
  });

  it('stays hidden when the key was already dismissed', () => {
    window.localStorage.setItem('lexi-howto-seen-forge', '1');
    const { result } = renderHook(() => useFirstRunSeen('forge'));
    expect(result.current.seen).toBe(true);
  });

  it('markSeen hides the card and persists the dismissal', () => {
    const { result } = renderHook(() => useFirstRunSeen('forge'));
    expect(result.current.seen).toBe(false);
    act(() => result.current.markSeen());
    expect(result.current.seen).toBe(true);
    expect(window.localStorage.getItem('lexi-howto-seen-forge')).toBe('1');
  });

  it('namespaces by key so games do not share a flag', () => {
    window.localStorage.setItem('lexi-howto-seen-forge', '1');
    const { result } = renderHook(() => useFirstRunSeen('tower'));
    expect(result.current.seen).toBe(false); // tower not dismissed
  });
});
