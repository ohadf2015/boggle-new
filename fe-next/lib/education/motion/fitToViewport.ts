'use client';

import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';

/** A screen pinned to the dynamic viewport that clips rather than scrolls. */
export const EDU_FIT_SCREEN = 'h-[100dvh] max-h-[100dvh] overflow-hidden';

/** Below this, text on a phone stops being readable; clip instead of shrinking further. */
const MIN_SCALE = 0.75;

export function fitScale({ content, available, min = MIN_SCALE }: { content: number; available: number; min?: number }): number {
  if (content <= 0 || available <= 0 || content <= available) return 1;
  return Math.max(min, Math.round((available / content) * 1000) / 1000);
}

/**
 * Shrinks a block to fit the height its parent gives it. Zoom (not a transform)
 * so layout, hit-boxes and focus rings follow the visual size.
 */
export function useFitToViewport<T extends HTMLElement>({ min = MIN_SCALE }: { min?: number } = {}) {
  const ref = useRef<T | null>(null);
  const [scale, setScale] = useState(1);
  const scaleRef = useRef(1);

  useLayoutEffect(() => {
    const measure = () => {
      const el = ref.current;
      if (!el) return;
      const available = el.parentElement?.clientHeight || window.innerHeight;
      const natural = el.getBoundingClientRect().height / scaleRef.current;
      const next = fitScale({ content: natural, available, min });
      if (Math.abs(next - scaleRef.current) < 0.005) return;
      scaleRef.current = next;
      setScale(next);
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (ref.current) ro?.observe(ref.current);
    if (ref.current?.parentElement) ro?.observe(ref.current.parentElement);
    window.addEventListener('resize', measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [min]);

  const style: CSSProperties | undefined = scale !== 1 ? { zoom: scale } : undefined;
  return { ref, scale, style };
}
