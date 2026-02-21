import { renderHook, act } from '@testing-library/react';
import { useBlastHint } from '../hooks/useBlastHint';

const mockGrid = [
  ['c', 'a', 't'],
  ['o', 'g', 'd'],
  ['d', 'e', 'f'],
];

const checkWord = (w: string) => ['cat', 'dog', 'god', 'cog'].includes(w);

describe('useBlastHint', () => {
  it('hintPath is null initially', () => {
    const { result } = renderHook(() =>
      useBlastHint(mockGrid, 'en', checkWord, new Set(), 3)
    );
    expect(result.current.hintPath).toBeNull();
  });

  it('requestHint sets hintPath to valid path', () => {
    const { result } = renderHook(() =>
      useBlastHint(mockGrid, 'en', checkWord, new Set(), 3)
    );
    act(() => { result.current.requestHint(); });
    expect(result.current.hintPath).not.toBeNull();
    expect(result.current.hintPath!.length).toBeGreaterThanOrEqual(3);
  });

  it('clearHint resets hintPath to null', () => {
    const { result } = renderHook(() =>
      useBlastHint(mockGrid, 'en', checkWord, new Set(), 3)
    );
    act(() => { result.current.requestHint(); });
    expect(result.current.hintPath).not.toBeNull();
    act(() => { result.current.clearHint(); });
    expect(result.current.hintPath).toBeNull();
  });

  it('hasHintAvailable is false when no words remain', () => {
    const emptyGrid = [['', ''], ['', '']];
    const { result } = renderHook(() =>
      useBlastHint(emptyGrid, 'en', checkWord, new Set(), 3)
    );
    expect(result.current.hasHintAvailable).toBe(false);
  });

  it('hasHintAvailable is true when valid words exist', () => {
    const { result } = renderHook(() =>
      useBlastHint(mockGrid, 'en', checkWord, new Set(), 3)
    );
    expect(result.current.hasHintAvailable).toBe(true);
  });
});
