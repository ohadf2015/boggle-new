'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Tracks the rendered height of an element via ResizeObserver.
 *
 * Returns a tuple `[refCallback, height]`. Assign the ref callback to the
 * element you want to measure; `height` updates whenever it resizes.
 *
 * Why a ref *callback* (not `useRef`): the callback fires on every mount and
 * unmount, including when the measured node toggles via conditional rendering
 * (e.g. mobile vs desktop variants). A `useRef` cannot observe those swaps.
 */
export function useObservedHeight<T extends HTMLElement = HTMLDivElement>() {
  const [height, setHeight] = useState(0);
  const observerRef = useRef<ResizeObserver | null>(null);

  const setRef = useCallback((node: T | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (!node) return;

    setHeight(Math.ceil(node.getBoundingClientRect().height));

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      const h = entry?.contentRect.height ?? node.getBoundingClientRect().height;
      setHeight(Math.ceil(h));
    });
    ro.observe(node);
    observerRef.current = ro;
  }, []);

  useEffect(() => () => {
    observerRef.current?.disconnect();
    observerRef.current = null;
  }, []);

  return [setRef, height] as const;
}
