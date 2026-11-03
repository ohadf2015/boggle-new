export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const ZERO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

interface Options {
  insets?: Insets;
  /** Nothing may sit above this y (the HUD's bottom edge), on top of the inset. */
  topFloor?: number;
  margin?: number;
  /** Peak scale the chip reaches (its overshoot), so the biggest frame still fits. */
  scale?: number;
}

/**
 * Moves a chip's CENTRE so the whole chip, at its peak scale, stays inside the
 * viewport minus safe-area insets and the HUD. A chip wider than the safe box
 * is centred in it.
 */
export function clampToSafeBox(
  p: { x: number; y: number },
  size: { w: number; h: number },
  viewport: { w: number; h: number },
  { insets = ZERO_INSETS, topFloor = 0, margin = 0, scale = 1 }: Options = {},
): { x: number; y: number } {
  if (viewport.w <= 0 || viewport.h <= 0) return { x: p.x, y: p.y };
  const hw = (size.w * scale) / 2 + margin;
  const hh = (size.h * scale) / 2 + margin;
  const clamp = (v: number, lo: number, hi: number) => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));
  const left = insets.left;
  const right = viewport.w - insets.right;
  const top = Math.max(insets.top, topFloor);
  const bottom = viewport.h - insets.bottom;
  return {
    x: clamp(p.x, left + hw, right - hw),
    y: clamp(p.y, top + hh, bottom - hh),
  };
}

/** Reads the safe-area insets off an element whose padding is `env(safe-area-inset-*)`. */
export function readInsets(el: HTMLElement | null): Insets {
  if (!el || typeof window === 'undefined') return ZERO_INSETS;
  const s = window.getComputedStyle(el);
  const n = (v: string) => Number.parseFloat(v) || 0;
  return { top: n(s.paddingTop), right: n(s.paddingRight), bottom: n(s.paddingBottom), left: n(s.paddingLeft) };
}
