import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useObservedHeight } from '../useObservedHeight';

const makeRect = (height: number): DOMRect => ({
  height,
  width: 0,
  top: 0,
  bottom: height,
  left: 0,
  right: 0,
  x: 0,
  y: 0,
  toJSON: () => ({}),
}) as DOMRect;

describe('useObservedHeight', () => {
  let lastCallback: ResizeObserverCallback | null = null;
  let observed: Element[] = [];
  let disconnectSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    lastCallback = null;
    observed = [];
    disconnectSpy = vi.fn();
    const fireDisconnect = () => { disconnectSpy(); };
    (global as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
      constructor(cb: ResizeObserverCallback) { lastCallback = cb; }
      observe(node: Element) { observed.push(node); }
      unobserve() {}
      disconnect() { fireDisconnect(); }
    };
  });

  it('starts at 0 before any ref attaches', () => {
    const { result } = renderHook(() => useObservedHeight<HTMLDivElement>());
    expect(result.current[1]).toBe(0);
  });

  it('reports initial bounding height when ref attaches', () => {
    const { result } = renderHook(() => useObservedHeight<HTMLDivElement>());
    const node = document.createElement('div');
    node.getBoundingClientRect = () => makeRect(137);

    act(() => { result.current[0](node); });

    expect(result.current[1]).toBe(137);
    expect(observed).toContain(node);
  });

  it('updates height when ResizeObserver fires', () => {
    const { result } = renderHook(() => useObservedHeight<HTMLDivElement>());
    const node = document.createElement('div');
    node.getBoundingClientRect = () => makeRect(100);

    act(() => { result.current[0](node); });
    expect(result.current[1]).toBe(100);

    act(() => {
      lastCallback?.(
        [{ contentRect: { height: 220 } } as ResizeObserverEntry],
        {} as ResizeObserver,
      );
    });

    expect(result.current[1]).toBe(220);
  });

  it('disconnects observer when ref detaches (null)', () => {
    const { result } = renderHook(() => useObservedHeight<HTMLDivElement>());
    const node = document.createElement('div');
    node.getBoundingClientRect = () => makeRect(50);

    act(() => { result.current[0](node); });
    act(() => { result.current[0](null); });

    expect(disconnectSpy).toHaveBeenCalled();
  });

  it('rounds up fractional heights to avoid jitter', () => {
    const { result } = renderHook(() => useObservedHeight<HTMLDivElement>());
    const node = document.createElement('div');
    node.getBoundingClientRect = () => makeRect(123.4);

    act(() => { result.current[0](node); });

    expect(result.current[1]).toBe(124);
  });
});
