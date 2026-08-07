import { describe, expect, it } from 'vitest';

import { craneBeamTilePx } from '../craneBeamDisplay';
import {
  CRANE_CHROME_H_PX,
  CRANE_SHADOW_Y_PX,
  CRANE_CARRIAGE_H_PX,
  CRANE_HOOK_H_PX,
  CRANE_OUTER_GAP_PX,
  CRANE_TROLLEY_TOP_PX,
  CRANE_SHADOW_VISUAL_NUDGE_PX,
  craneCableLenPx,
  craneBeamBottomPx,
  craneFallPx,
  craneArmPx,
  craneShadowOffsetFromOuterTop,
} from '../craneGeometry';

/** Beam pixel heights for realistic word lengths (3..10 letters). The girder is
 *  ONE ROW of bricks (the floor it becomes), so its height is a single brick —
 *  it used to be a vertical column, i.e. `tile * len`. */
const beamHeights = Array.from({ length: 8 }, (_, i) => craneBeamTilePx(i + 3));

describe('craneGeometry', () => {
  it('lands the girder exactly on the shadow for every word length', () => {
    for (const h of beamHeights) {
      expect(craneBeamBottomPx(h) + craneFallPx(h)).toBe(CRANE_SHADOW_Y_PX);
    }
  });

  it('always leaves a readable fall (≥44px) between girder and shadow', () => {
    for (const h of beamHeights) {
      expect(craneFallPx(h)).toBeGreaterThanOrEqual(44);
    }
  });

  it('keeps the shadow inside the chrome', () => {
    expect(CRANE_SHADOW_Y_PX).toBeLessThan(CRANE_CHROME_H_PX);
  });

  it('clamps the cable to a sane range and shortens it for taller girders', () => {
    let prev = Infinity;
    for (const h of [...beamHeights].sort((a, b) => a - b)) {
      const c = craneCableLenPx(h);
      expect(c).toBeGreaterThanOrEqual(18);
      expect(c).toBeLessThanOrEqual(64);
      expect(c).toBeLessThanOrEqual(prev);
      prev = c;
    }
  });

  it('beam bottom = carriage + cable + hook + beam height', () => {
    for (const h of beamHeights) {
      expect(craneBeamBottomPx(h)).toBe(CRANE_CARRIAGE_H_PX + craneCableLenPx(h) + CRANE_HOOK_H_PX + h);
    }
  });

  it('arm reaches from the swing joint to the beam centre', () => {
    for (const h of beamHeights) {
      expect(craneArmPx(h)).toBeCloseTo(craneCableLenPx(h) + CRANE_HOOK_H_PX + h / 2, 5);
    }
  });

  it('guards degenerate beam heights', () => {
    expect(craneCableLenPx(0)).toBeLessThanOrEqual(64);
    expect(craneFallPx(0)).toBeGreaterThanOrEqual(44);
    expect(craneBeamBottomPx(-5)).toBe(CRANE_CARRIAGE_H_PX + craneCableLenPx(-5) + CRANE_HOOK_H_PX);
  });

  it('craneShadowOffsetFromOuterTop encodes the WordTowerCrane DOM path', () => {
    // outer → meter → gap-3 → trolley top-[20] → shadow (CRANE_SHADOW_Y_PX - 4)
    const meter = 32;
    expect(craneShadowOffsetFromOuterTop(meter)).toBe(
      meter + CRANE_OUTER_GAP_PX + CRANE_TROLLEY_TOP_PX + CRANE_SHADOW_Y_PX - CRANE_SHADOW_VISUAL_NUDGE_PX,
    );
    // The extras beyond a naive meter+shadow model are DERIVED, not a literal.
    // They were pinned at 28 (gap 12 + trolley 20 − nudge 4) until the stability
    // meter above the crane was removed and its flex gap went to 0 — a hardcoded
    // number here just made a deliberate layout change look like a regression.
    const extras = CRANE_OUTER_GAP_PX + CRANE_TROLLEY_TOP_PX - CRANE_SHADOW_VISUAL_NUDGE_PX;
    expect(craneShadowOffsetFromOuterTop(meter)).toBe(meter + CRANE_SHADOW_Y_PX + extras);
  });
});
