import { describe, expect, it } from 'vitest';
import { CRANE_ARM_PX, CRANE_CLEARANCE_PX, SWING } from '../crane';
import { PX_PER_M } from '../engine';
import { BLOCK_HEIGHT_PX, blockWidthForWord } from '../scoring';
import { GROUND_STRIP_PX, HUD_TOP_PX, frameCamera } from '../camera';

const VIEWPORTS = [
  { name: 'phone', w: 390, h: 844, dock: 260 },
  { name: 'small phone', w: 360, h: 640, dock: 240 },
  { name: 'desktop', w: 1280, h: 800, dock: 200 },
  { name: 'tv', w: 1920, h: 1080, dock: 200 },
];

const HEIGHTS_M = [0, 3, 8.4, 40];

/** Screen y of a physics y, given a frame. */
const toScreenY = (physY: number, f: { scale: number; groundScreenY: number; cameraY: number }) =>
  f.groundScreenY + f.cameraY + physY * f.scale;

describe('frameCamera', () => {
  for (const vp of VIEWPORTS) {
    for (const heightM of HEIGHTS_M) {
      it(`keeps tower top and hanging block in the play area — ${vp.name} @ ${heightM}m`, () => {
        // Given a viewport, a measured dock and a tower height
        const f = frameCamera({ viewportW: vp.w, viewportH: vp.h, dockPx: vp.dock, towerTopM: heightM });
        const playBottom = vp.h - vp.dock;

        // When we project the tower top and the hanging block to screen space
        const towerTopPx = heightM * PX_PER_M;
        const towerTopY = toScreenY(-towerTopPx, f);
        const hangingY = toScreenY(-(towerTopPx + CRANE_CLEARANCE_PX), f);

        // Then both sit between the HUD and the dock
        expect(hangingY - (BLOCK_HEIGHT_PX / 2) * f.scale).toBeGreaterThanOrEqual(HUD_TOP_PX - 0.5);
        expect(towerTopY).toBeLessThanOrEqual(playBottom + 0.5);
        expect(towerTopY).toBeGreaterThan(hangingY);
      });
    }

    it(`fits the full crane swing horizontally — ${vp.name}`, () => {
      const f = frameCamera({ viewportW: vp.w, viewportH: vp.h, dockPx: vp.dock, towerTopM: 0 });
      // At the swing's far end a 5-letter slab keeps >=65% of itself on screen:
      // only for the instant it turns. Keeping 80% held slabs at 58% of a
      // phone's width, which read as "the game is so little" (round 6).
      const maxSwingX = CRANE_ARM_PX * Math.sin(SWING.amplitudeRad);
      const halfSpan = (maxSwingX + 0.15 * blockWidthForWord('tower')) * f.scale;
      expect(halfSpan).toBeLessThanOrEqual(vp.w / 2);
    });
  }

  it('shows the ground while the tower is short', () => {
    const f = frameCamera({ viewportW: 390, viewportH: 844, dockPx: 260, towerTopM: 0 });
    expect(f.cameraY).toBe(0);
    // The street sits ABOVE the dock, visible — it used to start exactly at the
    // dock's top edge, so the whole base hid behind the controls.
    expect(f.groundScreenY).toBe(844 - 260 - GROUND_STRIP_PX);
    expect(GROUND_STRIP_PX).toBeGreaterThanOrEqual(24);
  });

  it('never shrinks blocks below readable size on a phone', () => {
    const f = frameCamera({ viewportW: 390, viewportH: 844, dockPx: 260, towerTopM: 5 });
    expect(f.scale).toBeGreaterThanOrEqual(0.8);
  });
});
