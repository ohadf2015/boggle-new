import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useBlastKeyboard } from '../hooks/useBlastKeyboard';

vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { error: vi.fn() }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguageSafe: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('@/hooks/useMediaQuery', () => ({ useIsDesktop: () => true, useMediaQuery: () => true }));

const grid = [
  ['C', 'A', 'T'],
  ['X', 'Y', 'Z'],
  ['Q', 'W', 'E'],
];

const press = (key: string) => act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })); });

describe('useBlastKeyboard', () => {
  it('given a typed word on the board, when Enter is pressed, then the path of tiles is submitted', () => {
    const onPathSubmit = vi.fn();
    const { result } = renderHook(() => useBlastKeyboard({ grid, language: 'en', enabled: true, onPathSubmit }));
    press('c'); press('a'); press('t');
    expect(result.current.typedWord.toLowerCase()).toBe('cat');
    expect(result.current.isTypingMode).toBe(true);
    press('Enter');
    expect(onPathSubmit).toHaveBeenCalledWith([{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }]);
  });

  it('given the round is not interactive, then typing does nothing', () => {
    const onPathSubmit = vi.fn();
    const { result } = renderHook(() => useBlastKeyboard({ grid, language: 'en', enabled: false, onPathSubmit }));
    press('c'); press('a'); press('t'); press('Enter');
    expect(result.current.typedWord).toBe('');
    expect(onPathSubmit).not.toHaveBeenCalled();
  });
});
