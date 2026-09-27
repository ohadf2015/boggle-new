'use client';

/**
 * Sizing for the join flow when it owns the whole viewport (`<JoinFlow fit>`):
 * one column on phones/tablets/desktops, two columns on a phone on its side,
 * and a zoom that makes the content fill big screens and never overflow short
 * ones. Zoom multiplies the column's px width and its measured height, so the
 * math is: zoomed size <= viewport minus gutters, on both axes.
 */

import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

/** Below this height a landscape view is a phone on its side (the Academy hub's rule). */
export const RAIL_MAX_HEIGHT = 520;
const COLUMN = 448;
const RAIL_COLUMN = 760;
const GUTTER_X = 32;
const MAX_ZOOM = 3;
/** When growing (zoom > 1), leave air: the column takes at most this share of the height. */
const GROW_HEIGHT_SHARE = 0.8;

export interface FitStage {
  rail: boolean;
  /** Column width in CSS px, before zoom. */
  width: number;
  zoom: number;
  naturalHeight: number;
}

export function fitStage({ vw, vh, naturalHeight }: { vw: number; vh: number; naturalHeight: number }): FitStage {
  const rail = vw > vh && vh < RAIL_MAX_HEIGHT;
  const width = Math.min(rail ? RAIL_COLUMN : COLUMN, vw - GUTTER_X);
  if (naturalHeight <= 0) return { rail, width, zoom: 1, naturalHeight };
  const gutterY = rail ? 16 : 32;
  const byWidth = (vw - GUTTER_X) / width;
  const byHeight = (vh - gutterY) / naturalHeight;
  let zoom = Math.min(MAX_ZOOM, byWidth, byHeight);
  if (zoom > 1) zoom = Math.max(1, Math.min(zoom, (vh * GROW_HEIGHT_SHARE) / naturalHeight));
  zoom = Math.floor(zoom * 100) / 100;
  return { rail, width, zoom, naturalHeight };
}

/**
 * Live version: measures the column's unzoomed height (visual height / zoom)
 * and re-fits on resize or when the content changes (code step → name step).
 * Starts at the phone design so the server render and the first client render
 * match; the real fit lands in a layout effect, before paint.
 */
export function useFitStage(enabled: boolean): { ref: RefObject<HTMLElement | null>; stage: FitStage } {
  const ref = useRef<HTMLElement | null>(null);
  const [stage, setStage] = useState<FitStage>(() => fitStage({ vw: 390, vh: 844, naturalHeight: 0 }));
  const zoomRef = useRef(1);

  useLayoutEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const natural = el.getBoundingClientRect().height / (zoomRef.current || 1);
      const next = fitStage({ vw: window.innerWidth, vh: window.innerHeight, naturalHeight: natural });
      setStage((prev) =>
        prev.rail === next.rail && prev.width === next.width && Math.abs(prev.zoom - next.zoom) < 0.02 ? prev : next,
      );
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [enabled]);

  zoomRef.current = stage.zoom;
  return { ref, stage };
}
