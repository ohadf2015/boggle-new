import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { apartmentLayout, litWindows, type Rect } from '@/lib/wordTowerV2/apartment';
import { blockLabel, labelTracking } from '@/lib/wordTowerV2/label';
import { squashScale } from '@/lib/wordTowerV2/juice';

/**
 * A Word Tower v2 block, drawn as an apartment floor: facade with brick coursing,
 * cornice, the word on a sign plaque, a row of windows that light up as tenants
 * move in, and a concrete floor slab. The run's first floor is the lobby (door).
 *
 * Strokes are divided by the scene scale so borders stay a constant number of
 * SCREEN pixels — the neo-brutalist look breaks when a 3px border renders at 1.8.
 * The body repaints only when scale drifts or a tenant arrives (`builtScale`).
 */

const INK = 0x0b0e1c;
const CREAM = 0xfffef0;
const LIME = 0xbfff00;
const GOLD = 0xffe135;
const GOLD_SIDE = 0xb8860b;
const GLASS = 0x1b2a4a;
const LIT = 0xffe135;
const CONCRETE = 0x3a3f58;

/** Facade + darker trim per floor, cycling. Brand accents, dialled to facade. */
const FACADES: Array<[number, number]> = [
  [0xff6b8b, 0xb3365a],
  [0x37e0ff, 0x117f99],
  [0xb58cff, 0x6d45b8],
  [0xbfff00, 0x6f9400],
  [0xff9f43, 0xb3621a],
  [0x4fe3b0, 0x1f8f6a],
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
  index: number;
  lobby: boolean;
  builtScale: number;
  w: number;
  h: number;
  gold: boolean;
  /** 0..1 white landing flash, decays in `tickBlock`. */
  flash: number;
  /** 0..1 landing squash, decays in `tickBlock`. */
  squash: number;
  /** Tenants living here — one lit window each. */
  tenants: number;
  /** Welded by a rebar crate: steel columns bolted on, and it no longer moves. */
  rebar: boolean;
}

const labelStyle = new TextStyle({
  fontFamily: 'Fredoka, system-ui, sans-serif',
  fontSize: 34,
  fontWeight: '700',
  fill: INK,
});

function fitLabel(label: Text, maxW: number): void {
  label.scale.set(1);
  const fit = maxW / Math.max(1, label.width);
  if (fit < 1) label.scale.set(fit);
}

function makeLabel(word: string): Text {
  const text = blockLabel(word);
  const label = new Text({ text, style: labelStyle.clone() });
  // RTL words must get 0 tracking or Pixi draws them backwards (label.ts).
  label.style.letterSpacing = labelTracking(text);
  label.anchor.set(0.5);
  return label;
}

export function createBlockView(index: number, w: number, h: number, word: string, scale: number): BlockView {
  const container = new Container();
  const body = new Graphics();
  const glow = new Graphics();
  glow.alpha = 0;
  const label = makeLabel(word);
  const inner = new Container();
  inner.addChild(body, glow, label);
  container.addChild(inner);

  const view: BlockView = {
    container,
    inner,
    body,
    glow,
    label,
    colour: FACADES[index % FACADES.length],
    index,
    lobby: index === 0,
    builtScale: 0,
    w,
    h,
    gold: false,
    flash: 0,
    squash: 0,
    tenants: 0,
    rebar: false,
  };
  paintBlock(view, scale);
  return view;
}

/** Rebar crate welded this floor: bolt steel columns onto it. */
export function setBlockRebar(view: BlockView): void {
  view.rebar = true;
  view.builtScale = 0;
  view.flash = Math.max(view.flash, 0.6);
}

/** Turn a block gold — a reward's payout stays visible IN the tower. */
export function setBlockGold(view: BlockView): void {
  view.gold = true;
  view.colour = [GOLD, GOLD_SIDE];
  view.builtScale = 0;
}

function paintWindow(g: Graphics, r: Rect, lit: boolean, px: (n: number) => number): void {
  g.rect(r.x - px(3), r.y - px(3), r.w + px(6), r.h + px(6)).fill(INK);
  g.rect(r.x, r.y, r.w, r.h).fill(lit ? LIT : GLASS);
  if (lit) {
    // A tenant's silhouette in the lit pane.
    g.circle(r.x + r.w / 2, r.y + r.h * 0.42, r.w * 0.2).fill({ color: INK, alpha: 0.75 });
    g.roundRect(r.x + r.w * 0.22, r.y + r.h * 0.62, r.w * 0.56, r.h * 0.38, r.w * 0.2).fill({ color: INK, alpha: 0.75 });
  } else {
    g.poly([r.x + r.w * 0.55, r.y, r.x + r.w * 0.8, r.y, r.x + r.w * 0.25, r.y + r.h, r.x, r.y + r.h]).fill({ color: CREAM, alpha: 0.16 });
  }
  // Mullion + sill.
  g.rect(r.x + r.w / 2 - px(1), r.y, px(2), r.h).fill({ color: INK, alpha: 0.55 });
  g.rect(r.x - px(4), r.y + r.h + px(2), r.w + px(8), px(4)).fill(CREAM);
}

/** Repaint only when the scale moved enough for stroke widths to visibly drift. */
export function paintBlock(view: BlockView, scale: number): void {
  if (Math.abs(view.builtScale - scale) < 0.05) return;
  view.builtScale = scale;

  const { body, w, h } = view;
  const [fill, trim] = view.colour;
  const px = (n: number) => n / scale;
  const x = -w / 2;
  const y = -h / 2;
  const layout = apartmentLayout(w, h, view.lobby);

  body.clear();
  // Hard offset shadow, facade, brick coursing (one batched fill).
  body.rect(x + px(6), y + px(6), w, h).fill(INK);
  body.rect(x, y, w, h).fill(fill);
  for (let cy = y + 16; cy < y + h - 14; cy += 12) body.rect(x, cy, w, px(2));
  body.fill({ color: INK, alpha: 0.1 });
  // Cornice: trim band with a cream lip.
  const { cornice, sign, slab, door } = layout;
  body.rect(cornice.x, cornice.y, cornice.w, cornice.h).fill(trim);
  body.rect(cornice.x, cornice.y + cornice.h - px(3), cornice.w, px(3)).fill({ color: CREAM, alpha: 0.6 });

  const lit = view.gold ? layout.windows.map(() => true) : litWindows(layout.windows.length, view.tenants, view.index + 1);
  layout.windows.forEach((win, i) => paintWindow(body, win, lit[i], px));

  if (door) {
    body.rect(door.x - px(3), door.y - px(3), door.w + px(6), door.h + px(3)).fill(INK);
    body.rect(door.x, door.y, door.w, door.h).fill(0x9fe7ff);
    body.rect(door.x + door.w / 2 - px(1), door.y, px(2), door.h).fill(INK);
    // Awning over the lobby door.
    body.poly([door.x - px(10), door.y - px(2), door.x + door.w + px(10), door.y - px(2), door.x + door.w + px(4), door.y - px(10), door.x - px(4), door.y - px(10)])
      .fill(0xff4d9d)
      .stroke({ width: px(2), color: INK });
  }

  // Sign plaque carrying the word.
  body.rect(sign.x + px(4), sign.y + px(4), sign.w, sign.h).fill(INK);
  body.rect(sign.x, sign.y, sign.w, sign.h).fill(view.gold ? 0xfff6c2 : CREAM).stroke({ width: px(3), color: INK, alignment: 1 });
  for (const bx of [sign.x + px(7), sign.x + sign.w - px(7)]) body.circle(bx, sign.y + sign.h / 2, px(2.4)).fill({ color: INK, alpha: 0.6 });

  // Floor slab.
  body.rect(slab.x, slab.y, slab.w, slab.h).fill(CONCRETE);
  body.rect(slab.x, slab.y, slab.w, px(3)).fill(INK);

  if (view.gold) {
    body.poly([x + w * 0.62, y, x + w * 0.7, y, x + w * 0.58, y + h, x + w * 0.5, y + h]).fill({ color: 0xffffff, alpha: 0.45 });
  }
  if (view.rebar) {
    // Steel I-beam columns at both ends, riveted: reads as "this is welded".
    for (const cx of [x + px(4), x + w - px(18)]) {
      body.rect(cx, y, px(14), h).fill(0x9aa3bd).stroke({ width: px(2), color: INK });
      for (let ry = y + px(12); ry < y + h - px(6); ry += px(22)) body.circle(cx + px(7), ry, px(2.2)).fill(INK);
    }
  }
  body.rect(x, y, w, h).stroke({ width: px(3), color: INK, alignment: 1 });
  view.glow.clear().rect(x, y, w, h).fill(0xffffff);

  view.label.position.set(0, sign.y + sign.h / 2);
  fitLabel(view.label, sign.w - px(24));
}

/** One more tenant moved in: light a window and give the floor a little pop. */
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
 * The floor being spelled, hanging on the hook BEFORE it is hoisted: a cyan
 * BLUEPRINT that widens letter by letter, then "builds" into a lime floor the
 * moment the word is real.
 */
export function paintGhost(ghost: GhostView, scale: number, word: string, w: number, h: number, valid: boolean): void {
  const key = `${word}|${w}|${valid}|${scale.toFixed(2)}`;
  if (ghost.key === key) return;
  ghost.key = key;

  const px = (n: number) => n / scale;
  const { body, label } = ghost;
  const x = -w / 2;
  const y = -h / 2;
  const layout = apartmentLayout(w, h, false);
  body.clear();
  if (valid) {
    body.rect(x + px(6), y + px(6), w, h).fill(INK);
    body.rect(x, y, w, h).fill(LIME).stroke({ width: px(3), color: INK, alignment: 1 });
    for (const win of layout.windows) body.rect(win.x, win.y, win.w, win.h);
    body.fill({ color: INK, alpha: 0.3 });
    body.rect(layout.sign.x, layout.sign.y, layout.sign.w, layout.sign.h).fill(CREAM).stroke({ width: px(3), color: INK, alignment: 1 });
  } else {
    body.rect(x, y, w, h).fill({ color: 0x37e0ff, alpha: 0.14 });
    // Dashed blueprint outline + window outlines.
    for (let dx = 0; dx < w; dx += px(14)) body.rect(x + dx, y, px(7), px(3)).rect(x + dx, y + h - px(3), px(7), px(3));
    for (let dy = 0; dy < h; dy += px(14)) body.rect(x, y + dy, px(3), px(7)).rect(x + w - px(3), y + dy, px(3), px(7));
    body.fill({ color: 0x37e0ff, alpha: 0.95 });
    for (const win of layout.windows) body.rect(win.x, win.y, win.w, win.h).stroke({ width: px(2), color: 0x37e0ff, alpha: 0.6 });
  }
  label.text = blockLabel(word);
  label.style.letterSpacing = labelTracking(label.text);
  label.style.fill = valid ? INK : CREAM;
  label.position.set(0, layout.sign.y + layout.sign.h / 2);
  fitLabel(label, layout.sign.w - px(24));
}
