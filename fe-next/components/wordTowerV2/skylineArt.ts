import { Container, Graphics } from 'pixi.js';
import type { SkylineBuilding } from '@/lib/wordTowerV2/scenery';

/**
 * The city the tower stands in, drawn by Pixi on the SAME camera as the ground.
 *
 * It used to be DOM SVG under the canvas, positioned by React from a dock height
 * read out of a ref at render time and eased with a 700ms CSS transition, while
 * Pixi eased the ground with its own per-frame lerp. Two cameras never agree, so
 * the buildings floated above or sank below the street. Here the near layer's
 * base IS the ground line, every frame.
 *
 * Geometry is screen pixels (the city does not scale with the tower) and is
 * painted once per viewport width — per frame only `y` and a beacon blink move.
 */

const LIT = [0xbfff00, 0xff4d9d, 0x37e0ff];

export interface CityStyle {
  fill: number;
  edge: number;
  windowAlpha: number;
}

export interface CityLayer {
  container: Container;
  body: Graphics;
  /** Antenna lights, blinked by toggling visibility. */
  beacons: Graphics;
  /** Tallest building incl. antenna — for off-screen culling. */
  topPx: number;
  key: string;
}

export function createCity(): CityLayer {
  const container = new Container();
  const body = new Graphics();
  const beacons = new Graphics();
  container.addChild(body, beacons);
  return { container, body, beacons, topPx: 0, key: '' };
}

/** Origin is the building bases: y=0 is the ground line, up is negative. */
export function paintCity(layer: CityLayer, key: string, build: () => SkylineBuilding[], style: CityStyle): void {
  if (layer.key === key) return;
  layer.key = key;
  const buildings = build();
  const { body, beacons } = layer;
  body.clear();
  beacons.clear();
  let top = 0;

  for (const b of buildings) {
    const y = -b.h;
    top = Math.max(top, b.h + (b.roof === 'antenna' ? 32 : 14));
    if (b.roof === 'antenna') {
      body.rect(b.x + b.w / 2 - 1.5, y - 26, 3, 26).fill(style.fill);
      beacons.circle(b.x + b.w / 2, y - 27, 3.5).fill(0xff3366);
    } else if (b.roof === 'tank') {
      body.rect(b.x + 8, y - 14, 20, 14).fill(style.fill).stroke({ width: 2, color: style.edge, alignment: 1 });
    }
    body.rect(b.x, y, b.w, b.h).fill(style.fill).stroke({ width: 3, color: style.edge, alignment: 1 });
  }
  // Windows batched per colour: three fills instead of one per pane.
  LIT.forEach((colour, lit) => {
    for (const b of buildings) {
      for (const w of b.windows) if (w.lit === lit) body.rect(b.x + w.x, -b.h + w.y, w.w, w.h);
    }
    body.fill({ color: colour, alpha: style.windowAlpha });
  });
  layer.topPx = top;
}

/** Place the layer's ground line at `groundY` and cull it once it is below the screen. */
export function placeCity(layer: CityLayer, x: number, groundY: number, screenH: number, ts: number): void {
  layer.container.position.set(x, groundY);
  layer.container.visible = groundY - layer.topPx < screenH;
  layer.beacons.visible = ts % 1600 < 976;
}
