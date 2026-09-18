import { Container, Graphics, Text, TextStyle } from 'pixi.js';

/**
 * Pixi drawing for Word Tower v2. Every stroke width is divided by the scene
 * scale so borders and shadows stay a constant number of SCREEN pixels — the
 * neo-brutalist look breaks the moment a 3px border renders at 1.8px or 6px.
 */

export const BG = 0x1a1a2e;
const DOT = 0x2a2f52;
const INK = 0x0b0e1c;
const CREAM = 0xfffef0;
const LIME = 0xbfff00;

/** Fill + darker extrusion side, per block. Lime / pink / cyan / purple. */
const PALETTE: Array<[number, number]> = [
  [0xbfff00, 0x6f9400],
  [0xff4d9d, 0xa3155a],
  [0x37e0ff, 0x117f99],
  [0xb06cff, 0x5e2ea8],
];

export interface BlockView {
  container: Container;
  body: Graphics;
  label: Text;
  colour: [number, number];
  builtScale: number;
  w: number;
  h: number;
}

const labelStyle = new TextStyle({
  fontFamily: 'Fredoka, system-ui, sans-serif',
  fontSize: 20,
  fontWeight: '700',
  fill: INK,
  letterSpacing: 2,
});

export function createBlockView(index: number, w: number, h: number, word: string, scale: number): BlockView {
  const container = new Container();
  const body = new Graphics();
  const label = new Text({ text: word.toUpperCase(), style: labelStyle });
  label.anchor.set(0.5);
  // Long words must not overflow their own slab.
  const fit = (w - 14) / Math.max(1, label.width);
  if (fit < 1) label.scale.set(fit);
  container.addChild(body, label);

  const view: BlockView = { container, body, label, colour: PALETTE[index % PALETTE.length], builtScale: 0, w, h };
  paintBlock(view, scale);
  return view;
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
  const depth = px(6);

  body.clear();
  // Extrusion: the darker side peeking out bottom-right reads as a chunky slab.
  body.rect(x + depth, y + depth, w, h).fill(side).stroke({ width: px(3), color: INK, alignment: 1 });
  body.rect(x, y, w, h).fill(fill).stroke({ width: px(3), color: INK, alignment: 1 });
  // Top highlight strip.
  body.rect(x + px(3), y + px(3), w - px(6), px(4)).fill({ color: 0xffffff, alpha: 0.45 });
}

/** Halftone dot field, screen space. Scrolled by the caller for parallax. */
export function paintDots(g: Graphics, w: number, h: number, spacing: number): void {
  g.clear();
  for (let yy = -spacing; yy < h + spacing; yy += spacing) {
    const offset = (Math.round(yy / spacing) % 2) * (spacing / 2);
    for (let xx = -spacing; xx < w + spacing; xx += spacing) g.circle(xx + offset, yy, 1.6);
  }
  g.fill(DOT);
}

/** Ground slab: cream lip, ink body, hazard hatching. Scene space. */
export function paintGround(g: Graphics, halfW: number, scale: number): void {
  const px = (n: number) => n / scale;
  g.clear();
  g.rect(-halfW, 0, halfW * 2, px(600)).fill(0x10101f);
  for (let x = -halfW; x < halfW; x += px(28)) {
    g.poly([x, px(10), x + px(14), px(10), x + px(4), px(28), x - px(10), px(28)]).fill(0x24243d);
  }
  g.rect(-halfW, 0, halfW * 2, px(5)).fill(CREAM);
}

/**
 * Metre ruler on the left edge plus a lime line at the current tower top.
 * Labels are pooled by metre so nothing is allocated per frame.
 */
export function paintRuler(
  g: Graphics,
  labels: Map<number, Text>,
  parent: Container,
  opts: { leftX: number; halfW: number; scale: number; pxPerM: number; fromM: number; toM: number; topM: number },
): void {
  const { leftX, halfW, scale, pxPerM, fromM, toM, topM } = opts;
  const px = (n: number) => n / scale;
  g.clear();

  for (let m = Math.max(1, Math.floor(fromM)); m <= Math.ceil(toM); m += 1) {
    const major = m % 5 === 0;
    g.rect(leftX, -m * pxPerM - px(1), px(major ? 18 : 9), px(2)).fill({ color: CREAM, alpha: major ? 0.7 : 0.3 });
    if (major && !labels.has(m)) {
      const t = new Text({ text: `${m}m`, style: { fontFamily: 'Fredoka, system-ui, sans-serif', fontSize: 13, fontWeight: '700', fill: CREAM } });
      t.alpha = 0.7;
      t.anchor.set(0, 0.5);
      parent.addChild(t);
      labels.set(m, t);
    }
  }
  for (const [m, t] of labels) {
    t.visible = m >= fromM - 1 && m <= toM + 1;
    t.scale.set(1 / scale);
    t.position.set(leftX + px(22), -m * pxPerM);
  }

  if (topM > 0.2) {
    const y = -topM * pxPerM;
    for (let x = -halfW; x < halfW; x += px(16)) g.rect(x, y - px(1), px(8), px(2));
    g.fill({ color: LIME, alpha: 0.55 });
  }
}

/** Crane rope + hook to the hanging block, and a faint drop guide below it. */
export function paintCrane(
  g: Graphics,
  scale: number,
  hanging: { x: number; y: number; h: number } | null,
  pivotY: number,
  groundGuideY: number,
): void {
  const px = (n: number) => n / scale;
  g.clear();
  if (!hanging) return;

  const topY = hanging.y - hanging.h / 2;
  g.moveTo(0, pivotY).lineTo(hanging.x, topY - px(10)).stroke({ width: px(3), color: CREAM });
  g.rect(hanging.x - px(10), topY - px(12), px(20), px(8)).fill(CREAM).stroke({ width: px(2), color: INK });
  g.circle(0, pivotY, px(7)).fill(CREAM).stroke({ width: px(2), color: INK });

  // Dashed drop guide — where the block falls if released right now.
  for (let y = hanging.y + hanging.h / 2 + px(8); y < groundGuideY; y += px(14)) {
    g.rect(hanging.x - px(1), y, px(2), px(7));
  }
  g.fill({ color: CREAM, alpha: 0.25 });
}
