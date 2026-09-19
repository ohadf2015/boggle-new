import { Container, Graphics } from 'pixi.js';

/**
 * Tenants moving in: after a floor lands well, little neon people leap in from
 * the nearest screen edge in a hopping arc, one after another, and pop into the
 * slab — each arrival lights one window on it (see paintBlock).
 *
 * Figures live in the scaled scene (world coords) and counter-scale themselves,
 * so they stay the same size on screen at any zoom.
 */

const INK = 0x0b0e1c;
const CREAM = 0xfffef0;
const SHIRTS = [0xbfff00, 0xff4d9d, 0x37e0ff, 0xb06cff, 0xffe135];
/** Flight time, and the gap between consecutive tenants, ms. */
const FLIGHT_MS = 900;
const STAGGER_MS = 140;
const HOPS = 3;

interface Flight {
  g: Graphics;
  blockId: string;
  fromX: number;
  delayMs: number;
  ageMs: number;
  /** Where on the slab this tenant ends up, as a fraction of its half-width. */
  slot: number;
}

export interface TenantTarget {
  x: number;
  y: number;
  halfW: number;
}

function drawTenant(g: Graphics, shirt: number): void {
  // Screen-pixel figure: legs, shirt, head, black outline — the brand sticker look.
  g.rect(-4, 2, 3, 6).rect(1, 2, 3, 6).fill(INK);
  g.roundRect(-6, -7, 12, 11, 3).fill(shirt).stroke({ width: 2, color: INK });
  g.circle(0, -12, 5).fill(CREAM).stroke({ width: 2, color: INK });
  g.circle(-1.8, -12.5, 0.9).circle(1.8, -12.5, 0.9).fill(INK);
}

export class TenantCrowd {
  readonly layer = new Container();
  private flights: Flight[] = [];
  private seq = 0;

  /** Queue `count` tenants for a block; they leave from the edge nearest to it. */
  moveIn(blockId: string, count: number, blockX: number, halfScreenW: number): void {
    const side = blockX < 0 ? -1 : 1;
    for (let i = 0; i < count; i += 1) {
      const g = new Graphics();
      drawTenant(g, SHIRTS[this.seq++ % SHIRTS.length]);
      g.visible = false;
      this.layer.addChild(g);
      this.flights.push({
        g,
        blockId,
        fromX: side * (halfScreenW + 30),
        delayMs: i * STAGGER_MS,
        ageMs: 0,
        slot: count === 1 ? 0 : (i / (count - 1)) * 1.4 - 0.7,
      });
    }
  }

  /**
   * Advance every flight. `target` resolves a block's current pose (it may have
   * rocked since); `onArrive` fires once per tenant as it pops into the floor.
   */
  update(
    dtMs: number,
    scale: number,
    target: (blockId: string) => TenantTarget | null,
    onArrive: (blockId: string) => void,
  ): void {
    const keep: Flight[] = [];
    for (const f of this.flights) {
      f.ageMs += dtMs;
      const t = (f.ageMs - f.delayMs) / FLIGHT_MS;
      const to = target(f.blockId);
      if (t < 0) {
        keep.push(f);
        continue;
      }
      if (t >= 1 || !to) {
        // Every queued tenant is always delivered, even if its floor fell off:
        // the counter must end where the run says it does.
        onArrive(f.blockId);
        f.g.destroy();
        continue;
      }
      const endX = to.x + f.slot * to.halfW;
      const x = f.fromX + (endX - f.fromX) * t;
      // Bouncy hops on a line that climbs to the floor, shrinking into it.
      const hop = Math.abs(Math.sin(t * Math.PI * HOPS)) * (1 - t) * 60;
      const y = to.y - hop / scale;
      const shrink = t > 0.85 ? 1 - (t - 0.85) / 0.15 : 1;
      f.g.visible = true;
      f.g.position.set(x, y);
      f.g.scale.set((1.35 * shrink) / scale);
      f.g.rotation = Math.sin(t * Math.PI * HOPS * 2) * 0.25;
      keep.push(f);
    }
    this.flights = keep;
  }
}
