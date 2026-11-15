import { Container, Graphics } from 'pixi.js';
import type { Weather } from '@/lib/wordTowerV2/biomes';

/**
 * Each sky's own moving air: confetti over downtown, fireflies at sunset, wind
 * wisps in the clouds, jet-stream streaks, snow under the aurora, twinkling
 * stars in orbit and a meteor shower at the top. The skies were colour bands
 * with a few props (player report, Nov 2026: "the biomes also a bit flat and
 * there aren't enough motion design on the way").
 *
 * Every particle is painted ONCE; per frame only position, rotation and alpha
 * move. The field also slides with the camera, so a climb visibly rushes past.
 */

const COUNT: Record<Weather, number> = { confetti: 22, fireflies: 18, wisps: 9, wind: 14, snow: 34, twinkle: 26, meteors: 5 };
/** How much of the camera's climb the field slides by: depth. */
const LIFT: Record<Weather, number> = { confetti: 0.55, fireflies: 0.4, wisps: 0.9, wind: 0.75, snow: 0.5, twinkle: 0.12, meteors: 0.2 };
const CONFETTI = [0xbfff00, 0xff4d9d, 0x37e0ff, 0xffe135, 0xb06cff];
const CREAM = 0xfffef0;
const INK = 0x0b0e1c;

function seeded(i: number, salt: number): number {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function paint(g: Graphics, kind: Weather, i: number): void {
  switch (kind) {
    case 'confetti':
      g.rect(-4, -2, 8, 4).fill(CONFETTI[i % CONFETTI.length]).stroke({ width: 1, color: INK, alpha: 0.6 });
      return;
    case 'fireflies':
      g.circle(0, 0, 7).fill({ color: 0xffe135, alpha: 0.25 });
      g.circle(0, 0, 2.6).fill(0xfff6c2);
      return;
    case 'wisps': {
      const w = 50 + seeded(i, 3) * 70;
      g.roundRect(-w / 2, -3, w, 6, 3).fill({ color: CREAM, alpha: 0.55 });
      return;
    }
    case 'wind': {
      const w = 30 + seeded(i, 4) * 50;
      g.rect(-w / 2, -1, w, 2).fill({ color: CREAM, alpha: 0.7 });
      return;
    }
    case 'snow':
      g.circle(0, 0, 1.6 + seeded(i, 5) * 1.8).fill(CREAM);
      return;
    case 'twinkle':
      g.rect(-1, -5, 2, 10).rect(-5, -1, 10, 2).fill(CREAM);
      return;
    case 'meteors':
      g.poly([0, -2, 0, 2, 72, -27]).fill({ color: CREAM, alpha: 0.55 });
      g.circle(0, 0, 3).fill(0xffe135).stroke({ width: 1.5, color: INK });
  }
}

const wrap = (v: number, span: number) => ((v % span) + span) % span;

export class WeatherView {
  readonly container = new Container();
  private kind: Weather | null = null;
  private parts: Graphics[] = [];

  private build(kind: Weather): void {
    this.kind = kind;
    for (const p of this.parts) p.destroy();
    this.parts = [];
    for (let i = 0; i < COUNT[kind]; i += 1) {
      const g = new Graphics();
      paint(g, kind, i);
      this.parts.push(g);
      this.container.addChild(g);
    }
  }

  /** `lift`: how far the camera has climbed, in screen px. */
  update(kind: Weather, w: number, h: number, ts: number, lift: number, alpha: number, reducedMotion: boolean): void {
    this.container.visible = alpha > 0.01 && !reducedMotion;
    if (!this.container.visible) return;
    if (kind !== this.kind) this.build(kind);
    this.container.alpha = alpha;
    const t = ts / 1000;
    const span = h + 80;
    const slide = lift * LIFT[kind];
    this.parts.forEach((g, i) => {
      const a = seeded(i, 1);
      const b = seeded(i, 2);
      const baseX = a * w;
      const baseY = b * span;
      let x = baseX;
      let y = baseY + slide;
      switch (kind) {
        case 'confetti':
          y += t * (28 + b * 30);
          x += Math.sin(t * 1.7 + i) * 18;
          g.rotation = t * (2 + a * 3) + i;
          g.scale.y = Math.cos(t * 4 + i);
          break;
        case 'fireflies':
          y -= t * (8 + b * 10);
          x += Math.sin(t * 0.9 + i * 2) * 22;
          g.alpha = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.6 + i * 1.3));
          break;
        case 'wisps':
          x = wrap(baseX + t * (70 + b * 90), w + 200) - 100;
          break;
        case 'wind':
          x = wrap(baseX - t * (260 + b * 260), w + 160) - 80;
          y += Math.sin(t * 2 + i) * 4;
          break;
        case 'snow':
          y += t * (22 + b * 26);
          x += Math.sin(t * 1.1 + i * 3) * 14;
          break;
        case 'twinkle': {
          const s = 0.4 + 0.6 * Math.abs(Math.sin(t * (0.8 + a) + i));
          g.scale.set(s);
          g.alpha = s;
          break;
        }
        case 'meteors': {
          // One fall every few seconds each, from the top right, then a rest.
          const cycle = 4 + b * 5;
          const p = wrap(t + i * 1.9, cycle) / 1.1;
          g.visible = p < 1;
          x = baseX + 120 - p * 260;
          y = (b * h) / 2 + p * 96 - 40;
          g.position.set(x, y);
          return;
        }
      }
      g.position.set(x, wrap(y, span) - 40);
    });
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
