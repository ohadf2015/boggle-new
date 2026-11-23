import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useSelectionStore,
  useFrozenWhileSelecting,
  resetSelection,
} from '../useSelectionStore';

describe('useFrozenWhileSelecting', () => {
  beforeEach(() => {
    resetSelection();
  });

  it('returns the latest value when no selection is in progress', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: number }) => useFrozenWhileSelecting(value),
      { initialProps: { value: 1 } },
    );

    expect(result.current).toBe(1);

    rerender({ value: 2 });
    expect(result.current).toBe(2);

    rerender({ value: 3 });
    expect(result.current).toBe(3);
  });

  it('holds the previous value while a selection is in progress', () => {
    const v1 = [{ username: 'a', score: 10 }];
    const v2 = [{ username: 'a', score: 20 }];
    const v3 = [{ username: 'a', score: 30 }];

    const { result, rerender } = renderHook(
      ({ value }: { value: typeof v1 }) => useFrozenWhileSelecting(value),
      { initialProps: { value: v1 } },
    );

    expect(result.current).toBe(v1);

    // Player starts a drag
    act(() => {
      useSelectionStore.getState().setSelection('C', 1);
    });

    // Socket update arrives — value changes, but frozen result must NOT.
    rerender({ value: v2 });
    expect(result.current).toBe(v1);

    // Another socket update — still frozen.
    rerender({ value: v3 });
    expect(result.current).toBe(v1);
  });

  it('commits the latest value as soon as the selection clears', () => {
    const v1 = { score: 10 };
    const v2 = { score: 99 };

    const { result, rerender } = renderHook(
      ({ value }: { value: typeof v1 }) => useFrozenWhileSelecting(value),
      { initialProps: { value: v1 } },
    );

    // Start selection, value changes while frozen
    act(() => {
      useSelectionStore.getState().setSelection('CA', 2);
    });
    rerender({ value: v2 });
    expect(result.current).toBe(v1);

    // Selection ends — should immediately reveal the latest value
    act(() => {
      resetSelection();
    });
    expect(result.current).toBe(v2);
  });

  it('does not re-render the consumer when a selection starts, grows or ends with the value unchanged', () => {
    let renderCount = 0;
    renderHook(
      ({ value }: { value: number }) => {
        renderCount++;
        return useFrozenWhileSelecting(value);
      },
      { initialProps: { value: 1 } },
    );
    const initialRenderCount = renderCount;

    act(() => {
      useSelectionStore.getState().setSelection('A', 1);
    });
    act(() => {
      useSelectionStore.getState().setSelection('AB', 2);
    });
    act(() => {
      resetSelection();
    });

    expect(renderCount).toBe(initialRenderCount);
  });
});
