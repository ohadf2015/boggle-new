import type { Graphics } from 'pixi.js';
import { type TowerGear, braceColour } from '@/lib/wordTowerV2/gear';

/**
 * The workshop's upgrades, painted ON the tower in the run (lib gear.ts says
 * what is built; this says how it looks). World units, one Graphics repainted
 * per frame — a handful of quads, and it has to follow floors that rock.
 *
 *  foundation -> stepped plinth sunk into the street under the ground floor
 *  vault      -> gold cornices along floor tops (every floor at level 5)
 *  insurance  -> steel brace columns up both sides of the lowest floors
 *  landmark   -> the rooftop on the top floor: antenna, flag, dome, spire, crown
 *
 * ponytail: the crane's paint lives in craneArt (it repaints on its own key).
 */

const INK = 0x0b0e1c;
const GOLD = 0xffc629;
const BEACON = 0xff3366;

export interface GearFloor {
  x: number;
  y: number;
  widthPx: number;
  heightPx: number;
  angleRad: number;
}

type Pt = { x: number; y: number };

/** A point on floor `b` at local offset (u along its width, v along its height; -v is up). */
function along(b: GearFloor, u: number, v: number): Pt {
  const c = Math.cos(b.angleRad);
  const s = Math.sin(b.angleRad);
  return { x: b.x + u * c - v * s, y: b.y + u * s + v * c };
}

/** A rectangle glued to floor `b`, centred at local (u, v). */
function quad(b: GearFloor, u: number, v: number, w: number, h: number): number[] {
  const pts = [along(b, u - w / 2, v - h / 2), along(b, u + w / 2, v - h / 2), along(b, u + w / 2, v + h / 2), along(b, u - w / 2, v + h / 2)];
  return pts.flatMap((p) => [p.x, p.y]);
}

function poly(b: GearFloor, local: Array<[number, number]>): number[] {
  return local.flatMap(([u, v]) => {
    const p = along(b, u, v);
    return [p.x, p.y];
  });
}

/**
 * `floors`: the standing tower, ground floor first. `view` (world y range on
 * screen) culls the per-floor trim: a 40-floor run would otherwise redraw 40
 * cornices a frame for floors nobody sees (same lesson as paintTowerShaft).
 */
export function paintGear(g: Graphics, gear: TowerGear, floors: GearFloor[], scale: number, ts: number, view?: { top: number; bottom: number }): void {
  g.clear();
  if (!floors.length) return;
  const onScreen = (b: GearFloor) => !view || (b.y + b.heightPx > view.top && b.y - b.heightPx < view.bottom);
  const line = { width: 2 / scale, color: INK };
  const base = floors[0];

  const f = gear.foundation;
  if (f.level > 0) {
    const stepH = 7;
    for (let i = 0; i < f.level; i += 1) {
      const w = base.widthPx + 20 + i * 16;
      g.rect(base.x - w / 2, i * stepH, w, stepH).fill(i % 2 ? f.material.trim : f.material.main).stroke(line);
    }
    if (f.level >= 3) {
      for (const k of [-1, 1]) g.rect(base.x + (k * base.widthPx) / 2 - 5, f.level * stepH, 10, 26).fill(f.material.trim).stroke(line);
    }
    if (f.level >= 5) g.rect(base.x - base.widthPx / 2 - 10, -3, base.widthPx + 20, 3).fill({ color: f.material.glow, alpha: 0.9 });
  }

  const br = gear.insurance;
  if (br.level > 0) {
    const reach = Math.min(floors.length, br.level * 2);
    for (let i = 0; i < reach; i += 1) {
      const b = floors[i];
      if (!onScreen(b)) continue;
      for (const k of [-1, 1]) {
        g.poly(quad(b, k * (b.widthPx / 2 + 4), 0, 7, b.heightPx + 2)).fill(braceColour(br.material)).stroke(line);
        // Rivets at the seam, so it reads as steel and not a coloured edge.
        const r = along(b, k * (b.widthPx / 2 + 4), b.heightPx / 2 - 3);
        g.circle(r.x, r.y, 2).fill(br.level >= 5 ? br.material.glow : INK);
      }
    }
  }

  const v = gear.vault;
  if (v.level > 0) {
    const every = Math.max(1, 6 - v.level);
    floors.forEach((b, i) => {
      if (i % every !== 0 || !onScreen(b)) return;
      g.poly(quad(b, 0, -b.heightPx / 2 - 2, b.widthPx + 6, 5)).fill(GOLD).stroke(line);
      if (v.level >= 3) {
        for (const k of [-1, 1]) {
          const c = along(b, k * (b.widthPx / 2 - 8), -b.heightPx / 2 - 2);
          g.circle(c.x, c.y, 3.5).fill(v.material.glow).stroke(line);
        }
      }
    });
  }

  const cr = gear.landmark;
  if (cr.level > 0) {
    const top = floors[floors.length - 1];
    const roof = -top.heightPx / 2;
    const m = cr.material;
    if (cr.level >= 3) {
      // Dome: a half-disc of 8 segments sitting on the roof.
      const dome: Array<[number, number]> = [];
      for (let i = 0; i <= 8; i += 1) {
        const a = Math.PI + (i / 8) * Math.PI;
        dome.push([Math.cos(a) * 20, roof + Math.sin(a) * 18]);
      }
      g.poly(poly(top, dome)).fill(m.main).stroke(line);
    }
    if (cr.level >= 5) {
      const crown: Array<[number, number]> = [
        [-22, roof - 16], [-22, roof - 40], [-11, roof - 28], [0, roof - 46], [11, roof - 28], [22, roof - 40], [22, roof - 16],
      ];
      g.poly(poly(top, crown)).fill(GOLD).stroke(line);
      for (const u of [-11, 0, 11]) {
        const gem = along(top, u, roof - 22);
        g.circle(gem.x, gem.y, 3).fill(m.glow);
      }
    } else if (cr.level >= 4) {
      g.poly(poly(top, [[-7, roof - 14], [0, roof - 64], [7, roof - 14]])).fill(m.main).stroke(line);
    } else {
      const from = along(top, 0, roof);
      const tip = along(top, 0, roof - 46);
      g.moveTo(from.x, from.y).lineTo(tip.x, tip.y).stroke({ width: 3 / scale + 1, color: INK });
      if (cr.level >= 2) g.poly(poly(top, [[0, roof - 46], [18, roof - 40], [0, roof - 34]])).fill(m.main).stroke(line);
      // Aircraft beacon: blinks, so the roof reads as alive from the couch.
      if (Math.sin(ts / 300) > 0) g.circle(tip.x, tip.y, 3.5).fill(BEACON);
    }
  }
}
