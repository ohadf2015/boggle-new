import { describe, expect, it } from 'vitest';
import { CRANE_ARM_PX, CRANE_CLEARANCE_PX, SWING } from '../crane';
import { PX_PER_M } from '../engine';
import { BLOCK_HEIGHT_PX, blockWidthForWord } from '../scoring';
import { COMFORT_PLAY_HEIGHT_PX, GROUND_STRIP_PX, HUD_TOP_PX, ZOOM, frameCamera, towerSkirts } from '../camera';

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
    expect(f.scale).toBeGreaterThanOrEqual(0.6);
  });

  it('pulls the bottom-dock frame back so more of the tower is on screen', () => {
    // Round 7 reversed the "make it bigger" pass. Pinned as a ratio so a later
    // tweak to the width/height/comfort limits cannot silently undo it.
    const f = frameCamera({ viewportW: 390, viewportH: 844, dockPx: 260, towerTopM: 0 });
    const playH = 844 - 260 - GROUND_STRIP_PX;
    expect(f.scale).toBeCloseTo(ZOOM * (playH / COMFORT_PLAY_HEIGHT_PX), 3);
  });

  it('leaves the side-panel frame un-zoomed — it already targets floors on screen', () => {
    const inline = frameCamera({ viewportW: 1520, viewportH: 1080, dockPx: 0, towerTopM: 0, dockSide: 'inline' });
    const zoomed = frameCamera({ viewportW: 1520, viewportH: 1080, dockPx: 0, towerTopM: 0 });
    expect(inline.scale).toBeGreaterThan(zoomed.scale);
  });
});

describe('frameCamera — side dock (desktop / TV)', () => {
  // The play column is the canvas: the wheel moves to a side panel, so the
  // canvas is `viewportW - panel` wide and owns the full height.
  const TV = { viewportW: 1520, viewportH: 1080, dockPx: 0, towerTopM: 0, dockSide: 'inline' as const };
  const LAPTOP = { viewportW: 880, viewportH: 800, dockPx: 0, towerTopM: 0, dockSide: 'inline' as const };

  for (const [name, vp] of [['tv', TV], ['laptop', LAPTOP]] as const) {
    it(`shows at least two whole floors under the hanging slab — ${name}`, () => {
      // Given a play column with no dock across the bottom
      const f = frameCamera(vp);

      // When the camera frames a tower mid-run
      const tall = frameCamera({ ...vp, towerTopM: 30 });
      const playTop = HUD_TOP_PX;
      const towerTopScreenY = toScreenY(-30 * PX_PER_M, tall);

      // Then at least two whole floors of finished tower are still on screen
      // under that top — the player sees the building, not empty sky.
      const hangingBottom = toScreenY(-(30 * PX_PER_M + CRANE_CLEARANCE_PX), tall) + (BLOCK_HEIGHT_PX / 2) * tall.scale;
      expect(vp.viewportH - vp.dockPx - towerTopScreenY).toBeGreaterThanOrEqual(2 * BLOCK_HEIGHT_PX * tall.scale);
      expect(hangingBottom).toBeGreaterThanOrEqual(playTop - 0.5);
      expect(f.scale).toBeLessThanOrEqual(2);
    });
  }

  it('keeps blocks big enough to read from a couch', () => {
    const { scale } = frameCamera(TV);
    expect(BLOCK_HEIGHT_PX * scale).toBeGreaterThanOrEqual(180);
    // ...and uses a good slice of the play column's width.
    expect(blockWidthForWord('tower') * scale).toBeGreaterThanOrEqual(1520 * 0.22);
  });

  it('leaves the phone framing alone', () => {
    const bottom = frameCamera({ viewportW: 390, viewportH: 844, dockPx: 260, towerTopM: 4 });
    const explicit = frameCamera({ viewportW: 390, viewportH: 844, dockPx: 260, towerTopM: 4, dockSide: 'bottom' });
    expect(explicit).toEqual(bottom);
    expect(bottom.scale).toBeGreaterThanOrEqual(0.6);
  });
});

describe('towerSkirts — the tower never floats over the dock', () => {
  const floor = (x: number, y: number, widthPx: number) => ({ x, y, widthPx, heightPx: BLOCK_HEIGHT_PX });
  /** Screen bottom, world units: the camera has panned, so it is above ground. */
  const BOTTOM_Y = -600;

  it('given a wide floor over a narrow offset one, then the notch beside it is filled', () => {
    // Given floor 6 hanging over the right edge of floor 5
    const wide = floor(0, -700, 300);
    const narrow = floor(-90, -580, 140);

    // When skirts are computed
    const skirts = towerSkirts([wide, narrow], BOTTOM_Y);

    // Then the wide floor has structure under it, across its whole width
    const under = skirts.find((s) => s.w >= 300);
    expect(under).toBeDefined();
    expect(under!.x).toBeCloseTo(-150, 3);
    expect(under!.y).toBeGreaterThanOrEqual(-700 + BLOCK_HEIGHT_PX / 2 - 3);
    expect(under!.h).toBeGreaterThan(BLOCK_HEIGHT_PX);
  });

  it('given the lowest floor near the dock edge, then its skirt runs past the screen bottom', () => {
    const lowest = floor(20, BOTTOM_Y - 40, 200);
    const [skirt] = towerSkirts([lowest], BOTTOM_Y);
    expect(skirt.y + skirt.h).toBeGreaterThan(BOTTOM_Y);
  });

  it('given a floor far above the screen bottom, then its skirt stays a short shadow', () => {
    const high = floor(0, -3000, 200);
    const [skirt] = towerSkirts([high], BOTTOM_Y);
    expect(skirt.h).toBeLessThanOrEqual(BLOCK_HEIGHT_PX * 2);
  });

  it('given no floors, then there is nothing to draw', () => {
    expect(towerSkirts([], BOTTOM_Y)).toEqual([]);
  });
});
