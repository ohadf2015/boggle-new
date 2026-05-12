import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBlastV2 } from '../useBlastV2';
import { cellId } from '../engine/cell-id';
import type { BlastLevel } from '../types';

const mockLevel: BlastLevel = {
  id: 'useBlastV2-test',
  levelNumber: 1,
  locale: 'en',
  theme: 'onboarding',
  columns: [
    { index: 0, tiles: ['C', 'A', 'T'] },
    { index: 1, tiles: ['S', 'U', 'N'] },
    { index: 2, tiles: ['E', 'G', 'G'] },
  ],
  words: ['CAT', 'SUN', 'EGG'],
  resolvableOrder: ['CAT', 'SUN', 'EGG'],
  tileFlags: {},
  gravityMode: 'standard',
  difficulty: 1,
};

describe('useBlastV2 hook', () => {
  it('drag-select CAT: foundWords includes CAT, cascades triggered', () => {
    const { result } = renderHook(() => useBlastV2(mockLevel));

    act(() => {
      result.current.handlers.onPointerDown(cellId(0, 0));
      result.current.handlers.onPointerMove(cellId(0, 1));
      result.current.handlers.onPointerMove(cellId(0, 2));
      result.current.handlers.onPointerUp();
    });

    expect(result.current.state.foundWords.has('CAT')).toBe(true);
    expect(result.current.state.coins).toBe(150); // 30 (CAT) + 60 (SUN cascade) + 60 (EGG cascade)
    expect(result.current.state.cascadeCount).toBe(2);
  });

  it('invalid selection triggers invalidShakeKey increment', () => {
    const { result } = renderHook(() => useBlastV2(mockLevel));
    const initialShakeKey = result.current.state.invalidShakeKey;

    act(() => {
      result.current.handlers.onPointerDown(cellId(0, 0));
      result.current.handlers.onPointerMove(cellId(1, 0));
      result.current.handlers.onPointerUp();
    });

    expect(result.current.state.invalidShakeKey).toBe(initialShakeKey + 1);
  });

  it('completing all words sets status to levelComplete', () => {
    const { result } = renderHook(() => useBlastV2(mockLevel));

    act(() => {
      result.current.handlers.onPointerDown(cellId(0, 0));
      result.current.handlers.onPointerMove(cellId(0, 1));
      result.current.handlers.onPointerMove(cellId(0, 2));
      result.current.handlers.onPointerUp();
    });

    act(() => {
      result.current.handlers.onPointerDown(cellId(1, 0));
      result.current.handlers.onPointerMove(cellId(1, 1));
      result.current.handlers.onPointerMove(cellId(1, 2));
      result.current.handlers.onPointerUp();
    });

    act(() => {
      result.current.handlers.onPointerDown(cellId(2, 0));
      result.current.handlers.onPointerMove(cellId(2, 1));
      result.current.handlers.onPointerMove(cellId(2, 2));
      result.current.handlers.onPointerUp();
    });

    expect(result.current.state.status).toBe('levelComplete');
  });
});
