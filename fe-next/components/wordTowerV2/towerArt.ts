import { Container, Graphics, Text } from 'pixi.js';
import { labelTracking, blockLabel } from '@/lib/wordTowerV2/label';

/**
 * Pixi drawing for Word Tower v2's world furniture: street, ruler, best line,
 * throw arc, landing mark, wrecking rig. Floors live in apartmentArt.ts.
 * Every stroke width is divided by the scene scale so borders stay a constant
 * number of SCREEN pixels. No soft gradients anywhere.
 */

const INK = 0x0b0e1c;
const CREAM = 0xfffef0;
const LIME = 0xbfff00;
const GOLD = 0xffe135;
const CRANE_YELLOW = 0xffc629;
/** Core shaft under the floors: concrete, a shade darker than any slab. */
const SHAFT = 0x2b3050;
const SHAFT_LIT = 0x3a4068;

/**
 * Ground: a street strip (GROUND_STRIP_PX tall on screen) visibly above the dock —
 * lime curb the tower and the city stand on, asphalt with lane dashes, then dark
 * earth that slides behind the dock as the camera climbs. No footing slab: the
 * round-5 hazard pad was ~2/3 of a phone wide and read as a big platform the
 * tower started on. The first floor lands on the street itself.
 */
export function paintGround(g: Graphics, halfW: number, scale: number): void {
  const px = (n: number) => n / scale;
  g.clear();
  g.rect(-halfW, 0, halfW * 2, px(900)).fill(0x141424);
  g.rect(-halfW, px(6), halfW * 2, px(24)).fill(0x262640);
  for (let x = -halfW; x < halfW; x += px(34)) g.rect(x, px(17), px(16), px(3));
  g.fill({ color: CREAM, alpha: 0.35 });
  g.rect(-halfW, 0, halfW * 2, px(6)).fill(LIME);
  g.rect(-halfW, px(6), halfW * 2, px(3)).fill(INK);
  g.rect(-halfW, px(30), halfW * 2, px(4)).fill(INK);
}

/**
 * The building's core under every floor — what stops the tower floating.
 *
 * A floor wider than the one below it used to leave a wedge of SKY under its
 * overhang, and once the camera panned up, the whole stack ended in mid-air on
 * the dock's top edge (the street is a child of the scene at y=0, so it slides
 * away behind the dock as soon as the camera climbs). Each rect from
 * `towerSkirts` is drawn as a concrete shaft with the same black outline as the
 * floors, so the building always reads as continuing down out of frame.
 */
export function paintTowerShaft(g: Graphics, skirts: Array<{ x: number; y: number; w: number; h: number }>, scale: number): void {
  const px = (n: number) => n / scale;
  g.clear();
  for (const s of skirts) {
    // Slightly narrower than the floor: the slab still reads as the wide part.
    const inset = Math.min(px(10), s.w * 0.08);
    g.rect(s.x + inset, s.y, s.w - inset * 2, s.h).fill(SHAFT);
    // Lift shaft + service ladder, so the core reads as structure, not a slab.
    g.rect(s.x + s.w / 2 - px(5), s.y, px(10), s.h).fill(SHAFT_LIT);
    for (let y = s.y + px(14); y < s.y + s.h; y += px(18)) {
      g.rect(s.x + inset + px(4), y, s.w - inset * 2 - px(8), px(2.5));
    }
    g.fill({ color: INK, alpha: 0.5 });
    g.rect(s.x + inset, s.y, s.w - inset * 2, s.h).stroke({ width: px(3), color: INK, alignment: 1 });
  }
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
export function paintBestLine(
  g: Graphics,
  label: Container,
  halfW: number,
  scale: number,
  y: number | null,
  /** World x of the screen centre — the view pans sideways, the line follows. */
  centerX = 0,
): void {
  g.clear();
  label.visible = y !== null;
  if (y === null) return;
  const px = (n: number) => n / scale;
  for (let x = centerX - halfW; x < centerX + halfW; x += px(18)) g.rect(x, y - px(1.5), px(10), px(3));
  g.fill({ color: GOLD, alpha: 0.85 });
  label.scale.set(1 / scale);
  label.position.set(centerX + halfW - px(10), y - px(4));
}

/** Gold pill label, anchored bottom-right. Pixi v8 leaf nodes take no children, hence the wrapper. */
export function createBestLabel(text: string): Container {
  const displayText = blockLabel(text.toUpperCase());
  const t = new Text({
    text: displayText,
    style: { fontFamily: 'Fredoka, system-ui, sans-serif', fontSize: 13, fontWeight: '700', fill: INK, letterSpacing: labelTracking(displayText) },
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
