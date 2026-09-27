import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { decodeRival, encodeRival } from '@/lib/wordTowerV2/wreck';
import { useRivalTower } from '../useRivalTower';

afterEach(() => {
  window.history.replaceState(null, '', '/');
  vi.restoreAllMocks();
});

describe('useRivalTower', () => {
  it('given a rival link, when mounted, then the rival is read from the URL', () => {
    window.history.replaceState(null, '', `/he/word-tower-v2?rival=${encodeRival({ name: 'Dana', words: ['שלום'] })}`);
    const { result } = renderHook(() => useRivalTower('he'));
    expect(result.current.rival).toEqual({ name: 'Dana', words: ['שלום'] });
  });

  it('given no share API, when sharing, then a link carrying the words is copied', async () => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const { result } = renderHook(() => useRivalTower('en'));

    await act(() => result.current.share({ name: 'Ohad', words: ['tower', 'beam'], text: 'beat me' }));

    const url = new URL(writeText.mock.calls[0][0].split(' ').pop());
    expect(url.pathname).toBe('/en/word-tower');
    expect(decodeRival(url.searchParams.get('rival')!)).toEqual({ name: 'Ohad', words: ['tower', 'beam'] });
    expect(result.current.copied).toBe(true);
  });
});
