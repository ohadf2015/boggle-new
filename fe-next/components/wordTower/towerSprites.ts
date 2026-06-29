/**
 * Word Tower — imperative Pixi tile factory + drop/slide/recolor physics.
 *
 * Kept out of the React scene component so the orchestrator stays lean (<300
 * lines). Every tween is rAF-driven and cancellable: each tile carries an
 * `anim` token, bumped whenever a new tween starts, so a stale frame loop bails
 * the instant a fresh one supersedes it (re-renders fire constantly while a
 * word is being built).
 */
import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { textColorOn } from '@/lib/wordTower/towerColumn';
import type { BlockSurface } from '@/lib/wordTower/blockGrade';
import { swivelBrickFrame, SWIVEL_DESCENT_PX, SWIVEL_DESCENT_STAGGER } from '@/lib/wordTower/swivelDrop';
import { tileVariation, type TileVariation } from './tileVariation';
import { pickGreeble, type Greeble } from '@/lib/wordTower/greebles';

const FONT = 'Fredoka, Rubik, sans-serif';

/** A column tile: square face + hard shadow + (optional) glyph. Extra fields
 *  track the live colour/pending state and the cancellation token. */
export type TileSprite = Container & {
  face: Graphics;
  shadow: Graphics;
  /** Static per-zone surface decoration (windows / panels / facets). Built once
   *  at {@link makeTile}; never redrawn (a tile's altitude — hence biome — is
   *  fixed the moment it is placed), so colour tweens skip it. */
  detail: Graphics | null;
  glyph: Text | null;
  size: number;
  color: number;
  pending: boolean;
  anim: number;
  /** Deterministic per-position visual jitter (set at build) so the stack reads
   *  as a hand-built tower, not stamped blocks. Persists across recolours. */
  variation?: TileVariation;
};

const easeOutCubic = (k: number) => 1 - Math.pow(1 - k, 3);
const easeOutBack = (k: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
};

const lerpHex = (a: number, b: number, t: number): number => {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
};

/** Cancellable rAF tween bound to a tile's `anim` token. */
function run(tile: TileSprite, dur: number, delay: number, step: (k: number) => void, done?: () => void): void {
  const token = ++tile.anim;
  const t0 = performance.now() + delay;
  const tick = () => {
    if (tile.destroyed || tile.anim !== token) return;
    const now = performance.now();
    if (now < t0) { requestAnimationFrame(tick); return; }
    const k = Math.min(1, (now - t0) / dur);
    step(k);
    if (k < 1) requestAnimationFrame(tick);
    else done?.();
  };
  requestAnimationFrame(tick);
}

/** Darken (f<1, multiply) or lighten (f>1, mix toward white) a packed RGB int. */
function shade(hex: number, f: number): number {
  const r = (hex >> 16) & 0xff, g = (hex >> 8) & 0xff, b = hex & 0xff;
  if (f <= 1) return (Math.round(r * f) << 16) | (Math.round(g * f) << 8) | Math.round(b * f);
  const t = Math.min(1, f - 1);
  const mix = (c: number) => Math.round(c + (255 - c) * t);
  return (mix(r) << 16) | (mix(g) << 8) | mix(b);
}

/**
 * (Re)draw a tile as a chunky neo-brutalist building block: solid fill, a lit
 * top edge + shaded base band (flat two-tone → 3D weight without gradients),
 * hard black border, hard drop shadow. `shared` connectors wear a bright ring.
 */
export function paintTile(tile: TileSprite, color: number, pending: boolean, shared = false): void {
  // A queued tween or its `done()` callback can fire after the tile was
  // destroyed mid-build (rapid re-renders retire tiles while a word is typed),
  // leaving `face`/`shadow` torn down. Bail instead of `.clear()` on a null —
  // Sentry JAVASCRIPT-NEXTJS-1CK.
  if (tile.destroyed || !tile.face || !tile.shadow) return;

  const s = tile.size;
  const half = s / 2;
  const r = Math.max(7, s * 0.2);
  const inset = Math.ceil(r * 0.7);
  const a = pending ? 0.5 : 1;
  tile.color = color;
  tile.pending = pending;

  // Per-tile variation: a faint tonal shift on the face + a varied highlight
  // strip, so a tall stack of same-coloured tiles reads as individually placed
  // bricks rather than one stamped column.
  const v = tile.variation;
  const faceColor = v ? shade(color, 1 + v.tone) : color;

  tile.shadow.clear().roundRect(-half + 4, -half + 5, s, s, r).fill({ color: 0x000000, alpha: pending ? 0.2 : 0.5 });

  const g = tile.face;
  g.clear();
  g.roundRect(-half, -half, s, s, r).fill({ color: faceColor, alpha: a });
  // Isometric block shading: light reads from the top-LEFT, so a lit top strip +
  // lit left edge meet at a bright corner, and a dark base band + dark right edge
  // meet at a shadowed corner — giving each tile real extruded weight (a chunky
  // building block) instead of a flat coloured chiclet. Inset so the bands never
  // collide with the rounded corners.
  const edge = Math.ceil(r * 0.5);
  const topH = Math.round(s * 0.15 * (v?.highlight ?? 1));
  const baseH = Math.round(s * 0.22);
  const sideW = Math.round(s * 0.13);
  const innerH = s - inset * 2;
  g.rect(-half + inset, -half + edge, s - inset * 2, topH).fill({ color: shade(faceColor, 1.32), alpha: a * 0.9 });
  g.rect(-half + edge, -half + inset, sideW, innerH).fill({ color: shade(faceColor, 1.18), alpha: a * 0.7 });
  g.rect(half - edge - sideW, -half + inset, sideW, innerH).fill({ color: shade(faceColor, 0.72), alpha: a * 0.85 });
  g.rect(-half + inset, half - edge - baseH, s - inset * 2, baseH).fill({ color: shade(faceColor, 0.6), alpha: a });
  g.roundRect(-half, -half, s, s, r).stroke({ color: 0x000000, width: Math.max(4, s * 0.06), alignment: 1, alpha: pending ? 0.85 : 1 });

  if (shared && !pending) {
    g.roundRect(-half + 4, -half + 4, s - 8, s - 8, Math.max(4, r - 3)).stroke({ color: 0xfffef0, width: 2, alpha: 0.75 });
  }
  if (pending) {
    g.roundRect(-half + 4, -half + 4, s - 8, s - 8, Math.max(4, r - 3)).stroke({ color: 0xffffff, width: 1.5, alpha: 0.55 });
  }

  if (tile.glyph) {
    tile.glyph.style.fill = textColorOn(color);
    tile.glyph.alpha = pending ? 0.92 : 1;
  }
}

/**
 * Static per-zone surface decoration, drawn ONCE onto a tile's detail layer, so
 * each altitude milestone has its own STRUCTURE: a lit window grid in the city, a
 * glass curtain wall in the sky, riveted hull panels in the stratosphere, sci-fi
 * greebles in orbit, crystalline facets in the nebula, and a star-field energy
 * skin in the deep-space galaxy ("spacy" up high). Tile coords are centred
 * (−half..half), matching the face. Neo-brutalist: hard pixels, NO blur, drawn in
 * near-black / near-white / one neon accent with low alpha so it reads on any
 * graded fill (and any ghost). */
/** Per-biome neon accent for surface decoration + greebles. 1:1 with the
 *  {@link BlockSurface} decoration kind (which is 1:1 with the biome), so a
 *  city window-grid glows lime, an orbit hull glows ice-cyan, a nebula facet
 *  glows pink — instead of every zone wearing the same gold. Pinned to
 *  `BIOME_THEME[*].greebleAccent` by a test so the two never drift. */
export const SURFACE_ACCENT: Record<BlockSurface, number> = {
  windows: 0xbfff00,
  glass: 0x00ffff,
  panels: 0xb98cff,
  greebles: 0x6fe6ff,
  facets: 0xff79c6,
  energy: 0xffe135,
};
const DEFAULT_ACCENT = 0xffe135;

export function drawBlockSurface(g: Graphics | null, size: number, surface: BlockSurface, accent: number = DEFAULT_ACCENT): void {
  if (!g) return;
  const half = size / 2;
  const dark = 0x05060a;
  const lite = 0xfffef0;
  const neon = accent; // per-biome neon edge accent
  const line = Math.max(1, size * 0.03);
  if (surface === 'windows') {
    // 2 columns × 3 rows of small recessed windows, a couple "lit".
    const cols = 2, rows = 3;
    const pad = size * 0.2;
    const gw = (size - pad * 2) / (cols * 2 - 1);
    const gh = (size - pad * 2) / (rows * 2 - 1);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = -half + pad + c * gw * 2;
        const y = -half + pad + r * gh * 2;
        const lit = (r + c) % 3 === 0;
        g.rect(x, y, gw, gh).fill({ color: lit ? 0xffe27a : dark, alpha: lit ? 0.5 : 0.3 });
      }
    }
  } else if (surface === 'glass') {
    // Curtain wall: three tall mullions split by a horizontal floor band, plus a
    // single hard diagonal glint — a sleek glazed sky-tower face.
    const pad = size * 0.18;
    const usable = size - pad * 2;
    for (let c = 0; c < 3; c++) {
      g.rect(-half + pad + (c + 0.5) * (usable / 3) - line / 2, -half + pad, line, usable).fill({ color: dark, alpha: 0.28 });
    }
    g.rect(-half + pad, -line / 2, usable, line).fill({ color: dark, alpha: 0.24 });
    g.rect(-half + size * 0.2, -half + size * 0.22, size * 0.26, line * 1.5).fill({ color: lite, alpha: 0.4 });
  } else if (surface === 'panels') {
    // Two horizontal hull seams + four corner rivets.
    const inset = size * 0.2;
    const seamW = Math.max(1, size * 0.04);
    g.rect(-half + inset, -size * 0.06, size - inset * 2, seamW).fill({ color: dark, alpha: 0.32 });
    g.rect(-half + inset, size * 0.14, size - inset * 2, seamW).fill({ color: dark, alpha: 0.32 });
    const rv = size * 0.05;
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      g.circle(sx * (half - inset * 1.1), sy * (half - inset * 1.1), rv).fill({ color: lite, alpha: 0.4 });
    }
  } else if (surface === 'greebles') {
    // Orbital hull greebles: an L-shaped circuit trace + two indicator ports (one
    // lit neon) + a vent slot — reads as machined sci-fi panelling.
    const x0 = -half + size * 0.2;
    const y0 = half - size * 0.22;
    g.rect(x0, y0, size * 0.42, line).fill({ color: dark, alpha: 0.34 }); // trace, horizontal
    g.rect(x0 + size * 0.42 - line, y0 - size * 0.3, line, size * 0.3).fill({ color: dark, alpha: 0.34 }); // trace, up
    g.circle(-half + size * 0.26, -half + size * 0.26, size * 0.055).fill({ color: neon, alpha: 0.6 }); // lit port
    g.circle(half - size * 0.26, -half + size * 0.26, size * 0.045).fill({ color: lite, alpha: 0.4 }); // cold port
    g.rect(half - size * 0.36, half - size * 0.34, size * 0.2, line).fill({ color: lite, alpha: 0.3 }); // vent slot
  } else if (surface === 'facets') {
    // facets: a bright glint + two thin crystalline lines.
    g.circle(-size * 0.12, -size * 0.12, size * 0.08).fill({ color: lite, alpha: 0.5 });
    g.rect(-half + size * 0.22, half - size * 0.34, size * 0.5, line).fill({ color: lite, alpha: 0.22 });
    g.rect(half - size * 0.34, -half + size * 0.24, line, size * 0.42).fill({ color: lite, alpha: 0.22 });
  } else {
    // energy (deep-space galaxy): scattered hard-pixel stars + a diagonal neon
    // seam — the tile looks lit from within the void, the "spacy" extreme.
    const stars: Array<[number, number, number]> = [
      [-0.28, -0.22, 0.06], [0.18, -0.3, 0.045], [0.3, 0.12, 0.055],
      [-0.16, 0.26, 0.04], [0.02, -0.04, 0.05], [-0.32, 0.06, 0.038],
    ];
    for (const [sx, sy, sr] of stars) {
      const r = size * sr;
      g.rect(sx * size - r / 2, sy * size - r / 2, r, r).fill({ color: lite, alpha: 0.7 });
    }
    g.rect(-half + size * 0.16, half - size * 0.3, size * 0.6, line).fill({ color: neon, alpha: 0.45 });
  }
}

/**
 * A small INDUSTRIAL bolt-on (antenna / strut / panel / beacon / fin) jutting
 * from one edge, so a minority of tiles break the stamped-column silhouette.
 * Hard pixels, near-black + one neon accent, drawn ONCE onto the detail layer.
 * Deliberately not cute — structure, not decoration. Coords centred (−half..half);
 * the greeble juts slightly OUTSIDE the face (no clipping on a Pixi child).
 */
export function drawGreeble(g: Graphics | null, size: number, greeble: Greeble, accent: number = DEFAULT_ACCENT): void {
  if (!g) return;
  const half = size / 2;
  const dark = 0x05060a;
  const lite = 0xfffef0;
  const neon = accent;
  const w = Math.max(2, size * 0.05);
  const len = size * greeble.sizeFrac;
  const dir = greeble.side === 'left' ? -1 : 1;
  const edgeX = dir * half; // the tile's left/right edge
  switch (greeble.kind) {
    case 'antenna': {
      // a thin mast rising above the top edge near the chosen side, capped by a node
      const x = dir * half * 0.55;
      g.rect(x - w / 2, -half - len, w, len).fill({ color: dark, alpha: 0.8 });
      g.circle(x, -half - len, w * 0.9).fill({ color: neon, alpha: 0.85 });
      break;
    }
    case 'strut': {
      // a short diagonal brace off the side edge, mid-height
      const x0 = edgeX, y0 = -half * 0.2;
      g.moveTo(x0, y0).lineTo(x0 + dir * len, y0 + len * 0.5).stroke({ color: dark, width: w, alpha: 0.8 });
      break;
    }
    case 'panel': {
      // a rectangular plate jutting from the side (cladding / solar array)
      const pw = len, ph = size * 0.34;
      const x = edgeX + (dir > 0 ? 0 : -pw);
      g.rect(x, -ph / 2, pw, ph).fill({ color: lite, alpha: 0.18 }).stroke({ color: dark, width: w * 0.7, alpha: 0.75 });
      break;
    }
    case 'beacon': {
      // a small box clamped to the top corner + a lit dot
      const bx = dir * half * 0.62;
      g.rect(bx - size * 0.07, -half - size * 0.1, size * 0.14, size * 0.1).fill({ color: dark, alpha: 0.85 });
      g.circle(bx, -half - size * 0.05, w).fill({ color: neon, alpha: 0.9 });
      break;
    }
    case 'fin': {
      // a triangular fin off the side edge
      const y = 0;
      g.moveTo(edgeX, y - size * 0.18)
        .lineTo(edgeX + dir * len, y)
        .lineTo(edgeX, y + size * 0.18)
        .fill({ color: dark, alpha: 0.55 });
      break;
    }
  }
}

/** Build a tile. `char === null` → a label-less brick (versus spoiler-free row).
 *  `pos` (position from the base) seeds the deterministic per-tile variation.
 *  `surface` paints the zone decoration once (skipped for bricks). */
export function makeTile(char: string | null, size: number, color: number, pending: boolean, shared = false, pos?: number, surface?: BlockSurface): TileSprite {
  const tile = new Container() as TileSprite;
  tile.size = size;
  tile.color = color;
  tile.pending = pending;
  tile.anim = 0;
  if (pos != null) tile.variation = tileVariation(pos);
  tile.shadow = new Graphics();
  tile.face = new Graphics();
  tile.detail = surface ? new Graphics() : null;
  tile.glyph = char != null
    ? new Text({ text: char, style: new TextStyle({ fontFamily: FONT, fontSize: Math.min(size * 0.62, 40), fontWeight: '700', fill: 0x000000 }) })
    : null;
  tile.addChild(tile.shadow, tile.face);
  if (tile.detail) {
    const accent = SURFACE_ACCENT[surface!] ?? DEFAULT_ACCENT;
    drawBlockSurface(tile.detail, size, surface!, accent);
    // A sparse, deterministic industrial bolt-on breaks the stamped-column read.
    // Only real letter tiles (pos given) accrete greebles — bricks stay clean.
    if (pos != null) {
      const greeble = pickGreeble(pos, surface!);
      if (greeble) drawGreeble(tile.detail, size, greeble, accent);
    }
    // Pending ghosts kept fainter than committed so the live top reads strongest.
    tile.detail.alpha = pending ? 0.28 : 0.85;
    tile.addChild(tile.detail);
  }
  if (tile.glyph) {
    tile.glyph.anchor.set(0.5);
    tile.glyph.y = -Math.round(size * 0.02); // optical-centre against the base band
    tile.addChild(tile.glyph);
  }
  paintTile(tile, color, pending, shared);
  return tile;
}

/** Snap a tile to its slot with no animation (resume / reduced-motion / scroll-in).
 *  Resets `angle` too so a tile interrupted mid-swivel never stays tilted. */
export function placeInstant(tile: TileSprite, y: number): void {
  tile.anim++; // cancel any in-flight tween
  tile.y = y;
  tile.alpha = 1;
  tile.scale.set(1);
  tile.angle = 0;
}

/** Gravity drop entrance: falls a SHORT distance into its slot with a monotonic
 *  ease (no overshoot) so it lands flush against its neighbours — overshoot read
 *  as a gap/jitter in the stacked column. The landing weight comes from
 *  {@link squashLand}, not from the fall easing. */
export function dropIn(tile: TileSprite, toY: number, delay: number, onLand?: () => void): void {
  const fromY = toY - Math.max(36, tile.size * 0.7);
  tile.y = fromY;
  tile.alpha = 0;
  tile.scale.set(1);
  run(tile, 300, delay, (k) => {
    tile.y = fromY + (toY - fromY) * easeOutCubic(k);
    tile.alpha = Math.min(1, k * 2.6);
  }, () => { tile.y = toY; tile.alpha = 1; onLand?.(); });
}

/** Swivel a whole word's vertical brick-run into place as ONE rigid piece —
 *  hinged at the base joint, tipping to upright with a damped settle while the
 *  group lowers in. Replaces the per-letter snap with a satisfying, weighty
 *  placement. Each tile stays a child of its container (NO reparenting); we just
 *  drive its local (x, y, angle) from the shared rotation each frame, so the
 *  registry stays consistent and the lean/sway on the container composes on top.
 *  `tiles` are given base→top with their rest (restX, restY). */
export function swivelWordIn(
  tiles: { tile: TileSprite; restX: number; restY: number }[],
  pivotX: number,
  pivotY: number,
  startDeg: number,
  durMs: number,
  onSettle?: (i: number) => void,
): void {
  if (tiles.length === 0) return;
  // Bump every tile's anim token up front: stops any in-flight tween on them, and
  // lets a later placeInstant (which also bumps the token) cleanly cancel us.
  const tokens = tiles.map(({ tile }) => ++tile.anim);
  const t0 = performance.now();
  const tick = () => {
    const now = performance.now();
    const k = Math.min(1, (now - t0) / durMs);
    let alive = false;
    tiles.forEach(({ tile, restX, restY }, i) => {
      if (tile.destroyed || tile.anim !== tokens[i]) return; // cancelled / torn down
      alive = true;
      const f = swivelBrickFrame(
        { x: restX, y: restY },
        pivotX,
        pivotY,
        startDeg,
        SWIVEL_DESCENT_PX,
        k,
        i,
        tiles.length,
        SWIVEL_DESCENT_STAGGER,
      );
      tile.x = f.x;
      tile.y = f.y;
      tile.angle = f.angleDeg;
      tile.alpha = 1;
    });
    if (!alive) return;
    if (k < 1) { requestAnimationFrame(tick); return; }
    tiles.forEach(({ tile, restX, restY }, i) => {
      if (tile.destroyed || tile.anim !== tokens[i]) return;
      tile.x = restX; tile.y = restY; tile.angle = 0;
      onSettle?.(i);
    });
  };
  requestAnimationFrame(tick);
}

/** Ease a settled tile to a new slot (the stack sliding down/up by a row). */
export function moveTo(tile: TileSprite, toY: number): void {
  if (Math.abs(tile.y - toY) < 0.5) { tile.y = toY; return; }
  const fromY = tile.y;
  run(tile, 300, 0, (k) => { tile.y = fromY + (toY - fromY) * easeOutCubic(k); }, () => { tile.y = toY; });
}

/** Pop a tile out (backspace): floats up, shrinks, fades, then `onDone`. */
export function popOut(tile: TileSprite, onDone: () => void): void {
  const fromY = tile.y;
  run(tile, 220, 0, (k) => {
    tile.y = fromY - 44 * k;
    tile.alpha = 1 - k;
    tile.scale.set(1 - 0.4 * k);
  }, onDone);
}

/** Lerp a tile's fill to a new colour (connector blend / ghost→solid lock-in). */
export function recolor(tile: TileSprite, toColor: number, toPending: boolean, toShared = false): void {
  if (tile.detail) tile.detail.alpha = toPending ? 0.4 : 0.85; // ghost→solid brightens the decoration too
  const from = tile.color;
  if (from === toColor && tile.pending === toPending) { paintTile(tile, toColor, toPending, toShared); return; }
  run(tile, 340, 0, (k) => paintTile(tile, lerpHex(from, toColor, easeOutCubic(k)), toPending, toShared), () => paintTile(tile, toColor, toPending, toShared));
}

/** Quick scale pop — landing/lock-in juice. */
export function bumpScale(tile: TileSprite, amount = 0.16): void {
  run(tile, 260, 0, (k) => tile.scale.set(1 + amount * Math.sin(k * Math.PI)), () => tile.scale.set(1));
}

/** Squash-and-recover on impact — gives a landing tile real weight (wide+short
 *  then a soft tall rebound). Heavier feel than {@link bumpScale}. */
export function squashLand(tile: TileSprite): void {
  run(tile, 240, 0, (k) => {
    const e = easeOutBack(k); // overshoots >1 mid-way → brief stretch on the rebound
    tile.scale.set(1 + 0.22 * (1 - e), 1 - 0.22 * (1 - e));
  }, () => tile.scale.set(1));
}

/** Expanding shockwave ring at an impact point. Self-cleaning (destroys itself
 *  when the tween ends). `scaleMul` lets deeper letters punch a bigger ring. */
export function impactRing(parent: Container, x: number, y: number, baseRadius: number, color: number, scaleMul = 1): void {
  const ring = new Graphics();
  ring.x = x;
  ring.y = y;
  ring.zIndex = 1_000_000; // above every tile (parent sorts by zIndex) so the shockwave isn't occluded
  parent.addChild(ring);
  const dur = 380;
  const t0 = performance.now();
  const from = baseRadius * 0.35;
  const to = baseRadius * 1.6 * scaleMul;
  const tick = () => {
    // `ring.destroyed` alone is order-dependent: a parent.destroy({children:true})
    // during the rAF window can null the ring's context while its destroyed flag
    // still lags. Bail on either; catch the residual gap where context is nulled
    // before the flag propagates (Sentry 1CW / 1KM).
    if (ring.destroyed || parent.destroyed) return;
    const k = Math.min(1, (performance.now() - t0) / dur);
    const r = from + (to - from) * easeOutCubic(k);
    try {
      ring.clear().circle(0, 0, r).stroke({ color, width: Math.max(2, 4 * (1 - k)), alpha: 0.7 * (1 - k) });
    } catch {
      return; // PixiJS context nulled in destroy gap before destroyed flag propagates
    }
    if (k < 1) requestAnimationFrame(tick);
    else { try { ring.destroy(); } catch { /* */ } }
  };
  requestAnimationFrame(tick);
}

/** Brief horizontal shake of a container (rejected word). Fire-and-forget. */
export function shakeX(c: Container, mag = 9, dur = 320): void {
  const x0 = c.x;
  const t0 = performance.now();
  const tick = () => {
    if (c.destroyed) return;
    const k = (performance.now() - t0) / dur;
    if (k >= 1) { c.x = x0; return; }
    c.x = x0 + Math.sin(k * Math.PI * 6) * mag * (1 - k);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
