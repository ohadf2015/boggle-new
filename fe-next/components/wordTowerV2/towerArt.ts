import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { blockLabel, labelTracking } from '@/lib/wordTowerV2/label';
import { squashScale } from '@/lib/wordTowerV2/juice';

/**
 * Pixi drawing for Word Tower v2. Every stroke width is divided by the scene
 * scale so borders and shadows stay a constant number of SCREEN pixels — the
 * neo-brutalist look breaks the moment a 3px border renders at 1.8px or 6px.
 *
 * Style follows v1's tile art: hard stepped bevel (light top band, dark bottom
 * band), black outline, hard offset shadow. No soft gradients anywhere.
 */

const INK = 0x0b0e1c;
const CREAM = 0xfffef0;
const LIME = 0xbfff00;
const GOLD = 0xffe135;
const GOLD_SIDE = 0xb8860b;
const CRANE_YELLOW = 0xffc629;

/** Fill + darker extrusion side, per block. Lime / pink / cyan / purple. */
const PALETTE: Array<[number, number]> = [
  [0xbfff00, 0x6f9400],
  [0xff4d9d, 0xa3155a],
  [0x37e0ff, 0x117f99],
  [0xb06cff, 0x5e2ea8],
];

export interface BlockView {
  container: Container;
  /** Everything visible; squashes about the block's BOTTOM edge on landing. */
  inner: Container;
  body: Graphics;
  /** White overlay whose alpha is the landing flash (tint can only darken). */
  glow: Graphics;
  label: Text;
  colour: [number, number];
  builtScale: number;
  w: number;
  h: number;
  gold: boolean;
  /** 0..1 white landing flash, decays in `tickBlock`. */
  flash: number;
  /** 0..1 landing squash, decays in `tickBlock`. */
  squash: number;
  /** Tenants living here — one lit window each along the bottom band. */
  tenants: number;
}

const labelStyle = new TextStyle({
  fontFamily: 'Fredoka, system-ui, sans-serif',
  // ~58% of BLOCK_HEIGHT_PX (76); fitLabel shrinks long words.
  fontSize: 44,
  fontWeight: '700',
  fill: INK,
});

function fitLabel(label: Text, w: number): void {
  label.scale.set(1);
  const fit = (w - 16) / Math.max(1, label.width);
  if (fit < 1) label.scale.set(fit);
}

export function createBlockView(index: number, w: number, h: number, word: string, scale: number): BlockView {
  const container = new Container();
  const body = new Graphics();
  const glow = new Graphics();
  glow.alpha = 0;
  const text = blockLabel(word);
  const label = new Text({ text, style: labelStyle.clone() });
  label.style.letterSpacing = labelTracking(text);
  label.anchor.set(0.5);
  fitLabel(label, w);
  const inner = new Container();
  inner.addChild(body, glow, label);
  container.addChild(inner);

  const view: BlockView = {
    container, inner, body, glow, label, colour: PALETTE[index % PALETTE.length], builtScale: 0, w, h, gold: false, flash: 0, squash: 0, tenants: 0,
  };
  paintBlock(view, scale);
  return view;
}

/** Turn a block gold — a surprise's payout stays visible IN the tower. */
export function setBlockGold(view: BlockView): void {
  view.gold = true;
  view.colour = [GOLD, GOLD_SIDE];
  view.builtScale = 0;
}

/** Repaint only when the scale moved enough for stroke widths to visibly drift. */
export function paintBlock(view: BlockView, scale: number): void {
  if (Math.abs(view.builtScale - scale) < 0.05) return;
  view.builtScale = scale;

  const { body, w, h } = view;
  const [fill, side] = view.colour;
  const px = (n: number) => n / scale;
  const x = -w / 2;
  const y = -h / 2;
  const depth = px(5);

  body.clear();
  // Hard offset shadow / extrusion.
  body.rect(x + depth, y + depth, w, h).fill(INK);
  body.rect(x, y, w, h).fill(fill);
  // Stepped bevel: light top band, dark bottom band.
  body.rect(x, y, w, px(5)).fill({ color: 0xffffff, alpha: 0.42 });
  body.rect(x, y + h - px(6), w, px(6)).fill(side);
  // Bolts at the ends read as a built slab rather than a flat label.
  for (const bx of [x + px(8), x + w - px(8)]) {
    body.circle(bx, 0, px(2.6)).fill({ color: INK, alpha: 0.55 });
  }
  // Lit windows: one per tenant, centred along the bottom band.
  if (view.tenants > 0) {
    const pip = px(4);
    const gap = px(3);
    const fits = Math.max(1, Math.floor((w - px(28)) / (pip + gap)));
    const n = Math.min(view.tenants, fits);
    const startX = -((n * (pip + gap) - gap) / 2);
    for (let i = 0; i < n; i += 1) body.rect(startX + i * (pip + gap), y + h - px(5.5), pip, pip);
    body.fill(0xffe135);
  }
  body.rect(x, y, w, h).stroke({ width: px(3), color: INK, alignment: 1 });
  view.glow.clear().rect(x, y, w, h).fill(0xffffff);

  if (view.gold) {
    // Diagonal glints.
    body.poly([x + w * 0.62, y, x + w * 0.7, y, x + w * 0.58, y + h, x + w * 0.5, y + h]).fill({ color: 0xffffff, alpha: 0.5 });
    body.poly([x + w * 0.76, y, x + w * 0.79, y, x + w * 0.67, y + h, x + w * 0.64, y + h]).fill({ color: 0xffffff, alpha: 0.4 });
  }
}

/** One more tenant moved in: light a window and give the slab a little pop. */
export function addTenant(view: BlockView): void {
  view.tenants += 1;
  view.builtScale = 0;
  view.squash = Math.max(view.squash, 0.35);
}

/** Per-frame decay of transient block effects. */
export function tickBlock(view: BlockView, dt: number): void {
  if (view.flash > 0) {
    view.flash = Math.max(0, view.flash - dt * 3.5);
    view.glow.alpha = view.flash * 0.85;
  }
  if (view.squash > 0) {
    view.squash = Math.max(0, view.squash - dt * 6);
    // Ease-out bounce: squash, then a small overshoot as it springs back.
    const t = view.squash;
    const { sx, sy } = squashScale(Math.sin(t * Math.PI * 1.5) * t);
    view.inner.scale.set(sx, sy);
    view.inner.y = (view.h / 2) * (1 - sy);
  }
}

/**
 * Ground: a street strip (GROUND_STRIP_PX tall on screen) that sits visibly above
 * the dock — lime curb the tower and the city both stand on, asphalt with lane
 * dashes and a hazard-striped footing under the tower — then dark earth that
 * slides behind the dock as the camera climbs.
 */
export function paintGround(g: Graphics, halfW: number, scale: number): void {
  const px = (n: number) => n / scale;
  g.clear();
  g.rect(-halfW, 0, halfW * 2, px(900)).fill(0x141424);
  g.rect(-halfW, px(6), halfW * 2, px(24)).fill(0x262640);
  for (let x = -halfW; x < halfW; x += px(34)) g.rect(x, px(17), px(16), px(3));
  g.fill({ color: CREAM, alpha: 0.35 });
  // Footing under the tower: hazard stripes, so the base reads as a build site.
  // World units: the footing matches a slab's width at every zoom.
  const footW = 130;
  g.rect(-footW, px(9), footW * 2, px(21)).fill(0x1b1b2c);
  for (let x = -footW; x < footW; x += px(20)) {
    g.poly([x, px(9), x + px(10), px(9), x + px(1), px(30), x - px(9), px(30)]).fill({ color: GOLD, alpha: 0.55 });
  }
  g.rect(-footW, px(9), footW * 2, px(21)).stroke({ width: px(2), color: INK, alignment: 1 });
  g.rect(-halfW, 0, halfW * 2, px(6)).fill(LIME);
  g.rect(-halfW, px(6), halfW * 2, px(3)).fill(INK);
  g.rect(-halfW, px(30), halfW * 2, px(4)).fill(INK);
}

/**
 * Altitude ruler down the free screen edge: a tick per metre, a numbered notch
 * every 5. Lives in world space, so it scrolls with the tower exactly.
 * `labels` is a pool the caller owns (Text is costly to recreate per frame).
 */
export function paintRuler(
  g: Graphics,
  labels: Map<number, Text>,
  layer: Container,
  scale: number,
  edgeX: number,
  side: 'left' | 'right',
  ticks: Array<{ m: number; major: boolean }>,
  pxPerM: number,
): void {
  const px = (n: number) => n / scale;
  const dir = side === 'left' ? 1 : -1;
  g.clear();
  g.rect(side === 'left' ? edgeX : edgeX - px(3), -ticks.length * pxPerM - px(4000), px(3), px(8000)).fill({ color: CREAM, alpha: 0.18 });
  const seen = new Set<number>();
  for (const { m, major } of ticks) {
    const y = -m * pxPerM;
    const len = px(major ? 16 : 8);
    g.rect(side === 'left' ? edgeX : edgeX - len, y - px(1.5), len, px(3)).fill({ color: CREAM, alpha: major ? 0.8 : 0.4 });
    if (!major || m === 0) continue;
    seen.add(m);
    let label = labels.get(m);
    if (!label) {
      label = new Text({
        text: String(m),
        style: { fontFamily: 'Fredoka, system-ui, sans-serif', fontSize: 13, fontWeight: '700', fill: CREAM },
      });
      label.anchor.set(side === 'left' ? 0 : 1, 0.5);
      label.alpha = 0.8;
      labels.set(m, label);
      layer.addChild(label);
    }
    label.visible = true;
    label.scale.set(1 / scale);
    label.position.set(edgeX + dir * px(20), y);
  }
  for (const [m, label] of labels) if (!seen.has(m)) label.visible = false;
}

/** Dashed gold line + flag at the player's best height — the thing to beat. */
export function paintBestLine(g: Graphics, label: Container, halfW: number, scale: number, y: number | null): void {
  g.clear();
  label.visible = y !== null;
  if (y === null) return;
  const px = (n: number) => n / scale;
  for (let x = -halfW; x < halfW; x += px(18)) g.rect(x, y - px(1.5), px(10), px(3));
  g.fill({ color: GOLD, alpha: 0.85 });
  label.scale.set(1 / scale);
  label.position.set(halfW - px(10), y - px(4));
}

/** Gold pill label, anchored bottom-right. Pixi v8 leaf nodes take no children, hence the wrapper. */
export function createBestLabel(text: string): Container {
  const t = new Text({
    text,
    style: { fontFamily: 'Fredoka, system-ui, sans-serif', fontSize: 13, fontWeight: '700', fill: INK, letterSpacing: 1 },
  });
  t.anchor.set(1, 1);
  const pill = new Graphics();
  pill.roundRect(-t.width - 8, -t.height - 2, t.width + 14, t.height + 4, 4).fill(GOLD).stroke({ width: 2, color: INK });
  const wrap = new Container();
  wrap.addChild(pill, t);
  return wrap;
}

/**
 * Dotted throw arc from the hanging block — the first part of its real path.
 * Dots shrink and fade along the arc so it reads as a hint, not a ruler.
 */
export function paintThrowArc(g: Graphics, scale: number, pts: Array<{ x: number; y: number }>): void {
  const px = (n: number) => n / scale;
  g.clear();
  pts.forEach((p, i) => {
    const k = 1 - i / Math.max(1, pts.length);
    g.circle(p.x, p.y, px(1.5 + 2.2 * k)).fill({ color: CREAM, alpha: 0.2 + 0.6 * k });
  });
}

/**
 * Where the hanging block will touch down, drawn ON the tower top: its footprint
 * as a hard bracket. Goes lime while a release now would land perfect, so the
 * player times a visible target instead of guessing physics.
 */
export function paintLandingMark(
  g: Graphics,
  scale: number,
  x: number,
  y: number,
  w: number,
  hot: boolean,
  zone: { x: number; halfW: number; pulse: number },
): void {
  const px = (n: number) => n / scale;
  const colour = hot ? LIME : CREAM;
  const l = x - w / 2;
  const tick = px(10);
  const t = px(4);
  g.clear();
  // The PERFECT zone, fixed on the support: the moving footprint's centre notch
  // has to meet it. Without it the target only appeared once you were already
  // in it, so there was nothing to time against.
  const zl = zone.x - zone.halfW;
  const zw = zone.halfW * 2;
  g.rect(zl, y - px(5), zw, px(5)).fill({ color: LIME, alpha: hot ? 0.9 : 0.35 + 0.25 * zone.pulse });
  g.rect(zl - px(2), y - px(16), px(4), px(16)).rect(zl + zw - px(2), y - px(16), px(4), px(16));
  g.fill({ color: LIME, alpha: 0.9 });
  g.rect(l, y - px(7), w, px(7)).fill({ color: colour, alpha: hot ? 0.55 : 0.25 });
  // Corner brackets rising from the surface.
  g.rect(l, y - tick, t, tick).rect(l, y - px(3), tick, px(3));
  g.rect(l + w - t, y - tick, t, tick).rect(l + w - tick, y - px(3), tick, px(3));
  g.fill({ color: colour, alpha: 0.95 });
  // Centre notch.
  g.rect(x - px(1.5), y - px(14), px(3), px(14)).fill({ color: colour, alpha: 0.9 });
}

export interface GhostView {
  container: Container;
  body: Graphics;
  label: Text;
  key: string;
}

export function createGhost(): GhostView {
  const container = new Container();
  const body = new Graphics();
  // Own style: the ghost recolours its text, which must not leak into blocks.
  const label = new Text({ text: '', style: labelStyle.clone() });
  label.anchor.set(0.5);
  container.addChild(body, label);
  return { container, body, label, key: '' };
}

/**
 * The slab the player is spelling, hanging on the hook BEFORE it is hoisted.
 * It widens letter by letter — the word's reward (width) is visible while it is
 * still being typed — and snaps solid lime once the word is valid.
 */
export function paintGhost(ghost: GhostView, scale: number, word: string, w: number, h: number, valid: boolean): void {
  const key = `${word}|${w}|${valid}|${scale.toFixed(2)}`;
  if (ghost.key === key) return;
  ghost.key = key;

  const px = (n: number) => n / scale;
  const { body, label } = ghost;
  const x = -w / 2;
  const y = -h / 2;
  body.clear();
  if (valid) {
    body.rect(x + px(5), y + px(5), w, h).fill(INK);
    body.rect(x, y, w, h).fill(LIME).stroke({ width: px(3), color: INK, alignment: 1 });
  } else {
    body.rect(x, y, w, h).fill({ color: CREAM, alpha: 0.16 });
    for (let dx = 0; dx < w; dx += px(12)) {
      body.rect(x + dx, y, px(6), px(3));
      body.rect(x + dx, y + h - px(3), px(6), px(3));
    }
    body.rect(x, y, px(3), h);
    body.rect(x + w - px(3), y, px(3), h);
    body.fill({ color: CREAM, alpha: 0.85 });
  }
  label.text = blockLabel(word);
  label.style.letterSpacing = labelTracking(label.text);
  label.style.fill = valid ? INK : CREAM;
  fitLabel(label, w);
}

/**
 * Wrecking rig: a stub jib out to the pivot, a link chain down to the ball
 * (only while attached), and the ball itself — iron with a hard offset shadow,
 * a cream glint and a hazard band so it reads at a glance on any sky.
 */
export function paintWreckRig(
  g: Graphics,
  scale: number,
  pivot: { x: number; y: number },
  ball: { x: number; y: number; r: number; angle: number } | null,
  attached: boolean,
): void {
  const px = (n: number) => n / scale;
  g.clear();
  // Jib stub from off-screen left to the pivot, trolley at the pivot.
  const jibH = px(16);
  g.rect(pivot.x - px(900), pivot.y - jibH - px(6), px(900) + px(40), jibH).fill(CRANE_YELLOW).stroke({ width: px(3), color: INK, alignment: 1 });
  g.roundRect(pivot.x - px(16), pivot.y - px(6), px(32), px(10), px(2)).fill(INK);
  if (!ball) return;

  if (attached) {
    const dx = ball.x - pivot.x;
    const dy = ball.y - pivot.y;
    const len = Math.hypot(dx, dy);
    const links = Math.max(2, Math.floor(len / px(14)));
    for (let i = 0; i < links; i += 1) {
      const t = (i + 0.5) / links;
      const lx = pivot.x + dx * t;
      const ly = pivot.y + dy * t;
      g.roundRect(lx - px(4), ly - px(6), px(8), px(12), px(4)).stroke({ width: px(3), color: i % 2 ? 0xcfd6e6 : INK });
    }
  }

  const { x, y, r, angle } = ball;
  g.circle(x + px(5), y + px(5), r).fill(INK);
  g.circle(x, y, r).fill(0x2b2f45).stroke({ width: px(3), color: INK, alignment: 1 });
  // Hazard band rotates with the ball so the spin is visible in flight.
  const bx = Math.cos(angle) * r;
  const by = Math.sin(angle) * r;
  g.moveTo(x - bx, y - by).lineTo(x + bx, y + by).stroke({ width: r * 0.34, color: GOLD });
  g.moveTo(x - bx * 0.5, y - by * 0.5).lineTo(x + bx * 0.5, y + by * 0.5).stroke({ width: r * 0.12, color: INK });
  g.circle(x, y, r).stroke({ width: px(3), color: INK });
  g.circle(x - r * 0.38, y - r * 0.38, r * 0.2).fill({ color: CREAM, alpha: 0.85 });
}
