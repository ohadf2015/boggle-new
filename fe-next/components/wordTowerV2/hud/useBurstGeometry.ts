'use client';

import { useLayoutEffect, useState, type RefObject } from 'react';
import { clampToSafeBox, readInsets } from './clampToSafeBox';

/** The chip's top edge sits this far above the contact point: it overlaps the slab, reading as ON the block. */
const CHIP_OFFSET = -26;
/** Peak of the pop-in overshoot; the clamp keeps even that frame on screen. */
export const CHIP_PEAK_SCALE = 1.35;
const CHIP_MARGIN = 6;

export interface BurstGeometry {
  /** The contact point, in viewport px. */
  impact: { x: number; y: number };
  /** The chip's unscaled top-left, in viewport px. */
  box: { left: number; top: number };
  /** Flight vector from the chip's centre to the coin counter's centre. */
  to: { dx: number; dy: number };
}

/**
 * Resolves, once and before paint, where a landing's chip may live: canvas px
 * become viewport px via the play-column host, then the measured chip is
 * clamped inside viewport minus safe-area insets and below the HUD.
 */
export function useBurstGeometry(
  point: { x: number; y: number },
  host: HTMLElement,
  layer: HTMLElement | null,
  chipRef: RefObject<HTMLElement | null>,
  counterRef: RefObject<HTMLElement | null>,
): BurstGeometry | null {
  const [geo, setGeo] = useState<BurstGeometry | null>(null);

  useLayoutEffect(() => {
    if (geo || typeof window === 'undefined') return;
    const hostRect = host.getBoundingClientRect();
    const impact = { x: hostRect.left + point.x, y: hostRect.top + point.y };
    const chip = chipRef.current;
    const size = { w: chip?.offsetWidth ?? 0, h: chip?.offsetHeight ?? 0 };
    const hud = Number.parseFloat(window.getComputedStyle(host).getPropertyValue('--wt2-hud')) || 0;
    const centre = clampToSafeBox(
      { x: impact.x, y: impact.y + CHIP_OFFSET + size.h / 2 },
      size,
      { w: window.innerWidth, h: window.innerHeight },
      { insets: readInsets(layer), topFloor: hud, margin: CHIP_MARGIN, scale: CHIP_PEAK_SCALE },
    );
    const target = counterRef.current?.getBoundingClientRect();
    const to = target?.width
      ? { dx: target.left + target.width / 2 - centre.x, dy: target.top + target.height / 2 - centre.y }
      : { dx: 0, dy: -140 };
    setGeo({ impact, box: { left: centre.x - size.w / 2, top: centre.y - size.h / 2 }, to });
  }, [geo, host, layer, point.x, point.y, chipRef, counterRef]);

  return geo;
}
