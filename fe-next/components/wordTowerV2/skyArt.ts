import { Container, Graphics } from 'pixi.js';
import { type PropKind, type Sky, type SkyFx, lerpColour } from '@/lib/wordTowerV2/biomes';
import type { SkyProp } from '@/lib/wordTowerV2/scenery';

/**
 * The v2 sky, drawn by Pixi on the tower's own camera.
 *
 * It replaced a DOM stack (v1 gradient + clouds + props + sightings + a 120vmax
 * conic sunburst) that re-rendered on every height publish and re-rasterised the
 * sunburst at every biome change — the flicker and lag on the climb. Here:
 *
 * - the sky is 14 HARD bands (brand: no soft gradients), repainted only when its
 *   colours actually move, which is 14 rects;
 * - stars are painted once, and so is each backdrop EFFECT — per frame only its
 *   alpha, rotation and offset move (repainting a full-screen poly set every
 *   frame is exactly the lag this file was written to kill);
 * - props are painted once each, lazily, the first time they come on screen.
 *
 * Everything is screen pixels: the sky does not zoom with the tower.
 */

const INK = 0x0b0e1c;
const CREAM = 0xfffef0;
const BANDS = 14;
const STAR_COUNT = 150;
/** Props scroll at this fraction of the tower's speed — depth, and a slower sky. */
const PROP_PARALLAX = 0.7;
const STAR_PARALLAX = 0.08;
const BALLOON_COLOURS = [0xff4d9d, 0xbfff00, 0x37e0ff, 0xffe135, 0xb06cff];

/** mulberry32 — star positions only; deterministic so resizes do not reshuffle. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawCloud(g: Graphics, s: number): void {
  const puffs: Array<[number, number, number]> = [
    [-34, 0, 20],
    [-8, -12, 28],
    [22, -4, 22],
    [42, 6, 14],
  ];
  // Hard offset shadow, then an ink rim, then the fill: a sticker, not a blur.
  for (const [x, y, r] of puffs) g.circle((x + 5) * s, (y + 5) * s, r * s);
  g.rect(-50 * s + 5 * s, 4 * s, 100 * s, 18 * s);
  g.fill({ color: INK, alpha: 0.35 });
  for (const [x, y, r] of puffs) g.circle(x * s, y * s, (r + 3) * s);
  g.roundRect(-53 * s, 1 * s, 106 * s, 23 * s, 8 * s);
  g.fill(INK);
  for (const [x, y, r] of puffs) g.circle(x * s, y * s, r * s);
  g.roundRect(-50 * s, 4 * s, 100 * s, 17 * s, 6 * s);
  g.fill(CREAM);
  g.rect(-44 * s, 15 * s, 88 * s, 5 * s).fill({ color: 0xc9d4ff, alpha: 0.7 });
}

function drawBird(g: Graphics, s: number): void {
  g.moveTo(-12 * s, -4 * s).lineTo(0, 3 * s).lineTo(12 * s, -4 * s).stroke({ width: 4 * s, color: INK, cap: 'round', join: 'round' });
}

function drawBalloon(g: Graphics, s: number, colour: number): void {
  g.circle(4 * s, 4 * s, 26 * s).fill({ color: INK, alpha: 0.35 });
  g.circle(0, 0, 26 * s).fill(colour).stroke({ width: 3 * s, color: INK });
  // Gores: two cream stripes read as a hot-air balloon, not a ball.
  g.ellipse(0, 0, 9 * s, 26 * s).stroke({ width: 3 * s, color: CREAM, alpha: 0.9 });
  g.moveTo(-14 * s, 22 * s).lineTo(-6 * s, 40 * s).moveTo(14 * s, 22 * s).lineTo(6 * s, 40 * s).stroke({ width: 2 * s, color: INK });
  g.rect(-8 * s, 40 * s, 16 * s, 11 * s).fill(0xc98a00).stroke({ width: 2.5 * s, color: INK });
}

function drawJet(g: Graphics, s: number): void {
  // Contrail first so the jet sits on top of it.
  g.rect(-150 * s, -2 * s, 128 * s, 5 * s).fill({ color: CREAM, alpha: 0.55 });
  g.poly([-24 * s, -6 * s, 22 * s, -6 * s, 30 * s, 0, 22 * s, 6 * s, -24 * s, 6 * s]).fill(CREAM).stroke({ width: 3 * s, color: INK });
  g.poly([-4 * s, 0, 8 * s, 0, -6 * s, 18 * s, -14 * s, 18 * s]).fill(0x37e0ff).stroke({ width: 2.5 * s, color: INK });
  g.poly([-22 * s, -4 * s, -14 * s, -4 * s, -24 * s, -16 * s, -30 * s, -16 * s]).fill(0xff4d9d).stroke({ width: 2.5 * s, color: INK });
}

function drawAurora(g: Graphics, s: number, w: number): void {
  const pts: number[] = [];
  const span = w * 1.2;
  for (let i = 0; i <= 16; i += 1) pts.push(-span / 2 + (span * i) / 16, Math.sin(i * 0.8) * 22 * s);
  for (let i = 16; i >= 0; i -= 1) pts.push(-span / 2 + (span * i) / 16, Math.sin(i * 0.8) * 22 * s + 46 * s);
  g.poly(pts).fill({ color: 0xbfff00, alpha: 0.28 });
  g.poly(pts.map((v, i) => (i % 2 ? v - 26 * s : v))).fill({ color: 0x37e0ff, alpha: 0.22 });
}

function drawSatellite(g: Graphics, s: number): void {
  g.rect(-40 * s, -8 * s, 26 * s, 16 * s).rect(14 * s, -8 * s, 26 * s, 16 * s).fill(0x37e0ff).stroke({ width: 2.5 * s, color: INK });
  g.moveTo(-27 * s, -8 * s).lineTo(-27 * s, 8 * s).moveTo(27 * s, -8 * s).lineTo(27 * s, 8 * s).stroke({ width: 2 * s, color: INK });
  g.rect(-12 * s, -11 * s, 24 * s, 22 * s).fill(0xffe135).stroke({ width: 3 * s, color: INK });
  g.moveTo(0, -11 * s).lineTo(0, -22 * s).stroke({ width: 2.5 * s, color: INK });
  g.circle(0, -23 * s, 3 * s).fill(0xff3366);
}

function drawPlanet(g: Graphics, s: number, colour: number): void {
  g.circle(6 * s, 6 * s, 38 * s).fill({ color: INK, alpha: 0.4 });
  g.circle(0, 0, 38 * s).fill(colour).stroke({ width: 3 * s, color: INK });
  // Hard terminator crescent instead of a soft shade.
  g.circle(14 * s, 10 * s, 30 * s).fill({ color: INK, alpha: 0.22 });
  g.ellipse(0, 4 * s, 62 * s, 12 * s).stroke({ width: 5 * s, color: INK });
  g.ellipse(0, 4 * s, 62 * s, 12 * s).stroke({ width: 2.5 * s, color: CREAM });
}

function drawComet(g: Graphics, s: number): void {
  g.poly([0, -9 * s, -90 * s, -2 * s, -90 * s, 2 * s, 0, 9 * s]).fill({ color: 0x37e0ff, alpha: 0.5 });
  g.circle(0, 0, 10 * s).fill(CREAM).stroke({ width: 3 * s, color: INK });
}

function drawProp(g: Graphics, prop: SkyProp, w: number): void {
  const s = prop.size;
  const colour = BALLOON_COLOURS[Math.floor(prop.phase * BALLOON_COLOURS.length)];
  const draw: Record<PropKind, () => void> = {
    cloud: () => drawCloud(g, s),
    bird: () => drawBird(g, s),
    balloon: () => drawBalloon(g, s, colour),
    jet: () => drawJet(g, s * 0.9),
    aurora: () => drawAurora(g, s, w),
    satellite: () => drawSatellite(g, s),
    planet: () => drawPlanet(g, s, colour),
    comet: () => drawComet(g, s),
  };
  draw[prop.kind]();
}


/**
 * Backdrop effects, one per sky (biomes.ts `fx`). Each is painted ONCE per
 * kind+size into a white shape that is then tinted by the sky's accent, so a
 * cross-fade between two skies is two alphas, not a repaint.
 *
 * Local origin: `rays` and `deep` are centred; `haze`, `streaks` and `curtain`
 * start at the top-left and span the screen (see `placeFx`).
 */
function drawRays(g: Graphics, w: number, h: number): void {
  const r = Math.hypot(w, h);
  for (let i = 0; i < 18; i += 1) {
    const a0 = (i / 18) * Math.PI * 2;
    const a1 = a0 + (Math.PI * 2) / 18 / 2.4;
    g.poly([0, 0, Math.cos(a0) * r, Math.sin(a0) * r, Math.cos(a1) * r, Math.sin(a1) * r]);
  }
  g.fill(0xffffff);
}

/** Sunset: flat stripes stacked toward the horizon — hard edges, brand-correct. */
function drawHaze(g: Graphics, w: number, h: number): void {
  for (let i = 0; i < 9; i += 1) {
    const y = h * 0.28 + i * (h * 0.06);
    g.rect(0, y, w, Math.max(3, h * 0.022 * (1 - i / 12))).fill({ color: 0xffffff, alpha: 1 - i / 11 });
  }
}

/** Jet stream: long diagonal speed lines. Drawn twice so the scroll can wrap. */
function drawStreaks(g: Graphics, w: number, h: number): void {
  const span = w + 400;
  const r = rng(91);
  for (let i = 0; i < 26; i += 1) {
    const y = r() * h;
    const len = 90 + r() * 220;
    const thick = 2 + r() * 3;
    for (const dx of [0, span]) g.poly([dx, y, dx + len, y - len * 0.16, dx + len, y - len * 0.16 + thick, dx, y + thick]);
  }
  g.fill(0xffffff);
}

/** Aurora: vertical curtains with a ragged foot, hanging from the top edge. */
function drawCurtain(g: Graphics, w: number, h: number): void {
  const r = rng(23);
  for (let i = 0; i < 7; i += 1) {
    const x = (i / 7) * w + r() * (w / 12);
    const cw = w * (0.05 + r() * 0.06);
    const bottom = h * (0.3 + r() * 0.45);
    const pts: number[] = [x, 0, x + cw, 0];
    for (let k = 4; k >= 0; k -= 1) pts.push(x + (cw * k) / 4, bottom - r() * h * 0.12);
    g.poly(pts).fill({ color: 0xffffff, alpha: 0.4 + r() * 0.6 });
  }
}

/** Orbit: concentric rings with a scatter of dust — the view from up there. */
function drawDeep(g: Graphics, w: number, h: number): void {
  const r = Math.min(w, h);
  for (let i = 1; i <= 4; i += 1) g.circle(0, 0, r * (0.18 + i * 0.16)).stroke({ width: 2 + i, color: 0xffffff, alpha: 0.5 / i });
  const rand = rng(53);
  for (let i = 0; i < 40; i += 1) {
    const a = rand() * Math.PI * 2;
    const d = r * (0.2 + rand() * 0.8);
    g.circle(Math.cos(a) * d, Math.sin(a) * d, 1 + rand() * 2.5);
  }
  g.fill({ color: 0xffffff, alpha: 0.7 });
}

export const FX_DRAW: Record<SkyFx, (g: Graphics, w: number, h: number) => void> = {
  rays: drawRays,
  haze: drawHaze,
  streaks: drawStreaks,
  curtain: drawCurtain,
  deep: drawDeep,
};

/** How loud each effect is allowed to be at full blend. */
const FX_ALPHA: Record<SkyFx, number> = { rays: 0.1, haze: 0.2, streaks: 0.14, curtain: 0.26, deep: 0.16 };

/** One painted effect. Repainted only when the KIND or the viewport changes. */
class FxView {
  readonly g = new Graphics();
  private key = '';

  paint(kind: SkyFx, w: number, h: number): void {
    const key = `${kind}|${Math.round(w)}|${Math.round(h)}`;
    if (key === this.key) return;
    this.key = key;
    this.g.clear();
    // A layer is reused across kinds, so drop the previous kind's transform —
    // a curtain's scale.y would otherwise stretch the rays that replace it.
    this.g.scale.set(1);
    this.g.rotation = 0;
    this.g.position.set(0, 0);
    FX_DRAW[kind](this.g, w, h);
  }
}

/** Per-frame motion. Nothing here repaints — only transform and alpha move. */
function placeFx(g: Graphics, kind: SkyFx, f: SkyFrame): void {
  const { w, h, ts, dt, reducedMotion } = f;
  const t = reducedMotion ? 0 : ts / 1000;
  if (kind === 'rays' || kind === 'deep') {
    g.position.set(w / 2, h * (kind === 'rays' ? 0.42 : 0.45));
    if (!reducedMotion) g.rotation += dt * (kind === 'rays' ? 0.05 : 0.02);
    return;
  }
  if (kind === 'streaks') {
    // Wraps across the doubled draw, so the scroll never shows a seam.
    g.position.set(-(((t * 190) % (w + 400)) + 400), 0);
    return;
  }
  if (kind === 'haze') {
    g.position.set(0, Math.sin(t * 0.35) * h * 0.03);
    return;
  }
  g.position.set(Math.sin(t * 0.22) * w * 0.04, 0);
  g.scale.y = 1 + Math.sin(t * 0.5) * 0.08;
}

interface PropView {
  prop: SkyProp;
  g: Graphics | null;
}

export interface SkyFrame {
  w: number;
  h: number;
  ts: number;
  dt: number;
  sky: Sky;
  /** Screen y of the ground line with the camera applied (scene.y). */
  groundY: number;
  /** Screen px per physics px. */
  scale: number;
  /** Physics px per floor. */
  floorPx: number;
  reducedMotion: boolean;
}

export class SkyLayer {
  readonly container = new Container();
  private readonly bands = new Graphics();
  private readonly stars = new Graphics();
  /** Two effect layers cross-faded by the sky blend — never a swap. */
  private readonly fxFrom = new FxView();
  private readonly fxTo = new FxView();
  private readonly propLayer = new Container();
  private readonly views: PropView[];
  private bandKey = '';
  private starKey = '';

  constructor(props: SkyProp[]) {
    this.container.addChild(this.bands, this.stars, this.fxFrom.g, this.fxTo.g, this.propLayer);
    this.views = props.map((prop) => ({ prop, g: null }));
  }

  update(f: SkyFrame): void {
    const { w, h, sky } = f;

    const bandKey = `${sky.top}|${sky.bottom}|${w}|${h}`;
    if (bandKey !== this.bandKey) {
      this.bandKey = bandKey;
      this.bands.clear();
      const bandH = Math.ceil(h / BANDS);
      for (let i = 0; i < BANDS; i += 1) this.bands.rect(0, i * bandH, w, bandH + 1).fill(lerpColour(sky.top, sky.bottom, i / (BANDS - 1)));
    }

    const starKey = `${w}|${h}`;
    if (starKey !== this.starKey) {
      this.starKey = starKey;
      const r = rng(17);
      this.stars.clear();
      // Two stacked copies of the field so the parallax scroll can wrap.
      for (let i = 0; i < STAR_COUNT; i += 1) {
        const x = r() * w;
        const y = r() * h;
        const big = r() < 0.12;
        this.stars.rect(x, y, big ? 3 : 2, big ? 3 : 2).rect(x, y - h, big ? 3 : 2, big ? 3 : 2);
      }
      this.stars.fill(CREAM);
    }
    const lift = f.groundY - h;
    this.stars.visible = sky.stars > 0.01;
    if (this.stars.visible) {
      this.stars.alpha = sky.stars * (f.reducedMotion ? 0.9 : 0.8 + 0.2 * Math.sin(f.ts / 900));
      this.stars.y = (((lift * STAR_PARALLAX) % h) + h) % h;
    }

    // The backdrop effect belongs to the ALTITUDE: it fades out as the next sky
    // fades in, so a climb changes what is behind you, not just its colour.
    const pairs: Array<[FxView, SkyFx, number, number]> = [
      [this.fxFrom, sky.from.fx, 1 - sky.t, sky.from.accent],
      [this.fxTo, sky.to.fx, sky.t, sky.to.accent],
    ];
    for (const [view, kind, blend, tint] of pairs) {
      view.g.visible = blend > 0.01;
      if (!view.g.visible) continue;
      view.paint(kind, w, h);
      view.g.alpha = FX_ALPHA[kind] * blend;
      view.g.tint = tint;
      placeFx(view.g, kind, f);
    }

    const floorScreen = f.floorPx * f.scale;
    for (const v of this.views) {
      const { prop } = v;
      const y = h - (h - f.groundY) * PROP_PARALLAX - prop.floor * floorScreen * PROP_PARALLAX;
      const on = y > -160 && y < h + 160;
      if (!on) {
        if (v.g) v.g.visible = false;
        continue;
      }
      if (!v.g) {
        v.g = new Graphics();
        drawProp(v.g, prop, w);
        this.propLayer.addChild(v.g);
      }
      v.g.visible = true;
      this.place(v.g, prop, f, y);
    }
  }

  private place(g: Graphics, prop: SkyProp, f: SkyFrame, y: number): void {
    const { w, ts, reducedMotion } = f;
    const t = reducedMotion ? 0 : ts / 1000;
    const span = w + 240;
    // Drifters wrap across the screen; everything else holds its x.
    const speed = prop.kind === 'jet' ? 60 : prop.kind === 'comet' ? 40 : prop.kind === 'bird' ? 26 : prop.kind === 'cloud' ? 7 : 0;
    const dir = prop.phase < 0.5 ? -1 : 1;
    const home = w / 2 + prop.x * (w / 2);
    const x = speed ? ((((home + dir * speed * t * prop.size + 120) % span) + span) % span) - 120 : home;
    g.position.set(x, y + (prop.kind === 'balloon' ? Math.sin(t * 1.3 + prop.phase * 6) * 6 : 0));
    g.scale.x = speed && dir < 0 ? -1 : 1;
    if (prop.kind === 'bird') g.scale.y = 0.6 + 0.4 * Math.abs(Math.sin(t * 7 + prop.phase * 9));
    if (prop.kind === 'satellite') g.rotation = Math.sin(t * 0.4 + prop.phase * 6) * 0.3;
    if (prop.kind === 'aurora') {
      g.x = w / 2;
      g.alpha = 0.7 + 0.3 * Math.sin(t * 0.8 + prop.phase * 6);
    }
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
