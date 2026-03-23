import { renderHook } from '@testing-library/react';
import { usePreviousValue } from '../usePreviousValue';

describe('usePreviousValue', () => {
  it('returns undefined on first render', () => {
    const { result } = renderHook(() => usePreviousValue(42));
    expect(result.current).toBeUndefined();
  });

  it('returns the previous value after rerender', () => {
    const { result, rerender } = renderHook(
      ({ value }) => usePreviousValue(value),
      { initialProps: { value: 1 } }
    );

    expect(result.current).toBeUndefined();

    rerender({ value: 2 });
    expect(result.current).toBe(1);

    rerender({ value: 3 });
    expect(result.current).toBe(2);
  });

  it('works with strings', () => {
    const { result, rerender } = renderHook(
      ({ value }) => usePreviousValue(value),
      { initialProps: { value: 'hello' } }
    );

    rerender({ value: 'world' });
    expect(result.current).toBe('hello');
  });

  it('tracks object references', () => {
    const obj1 = { a: 1 };
    const obj2 = { a: 2 };

    const { result, rerender } = renderHook(
      ({ value }) => usePreviousValue(value),
      { initialProps: { value: obj1 } }
    );

    rerender({ value: obj2 });
    expect(result.current).toBe(obj1);
  });
});
