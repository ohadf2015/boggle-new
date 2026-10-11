import { coinFlightPoints, jackpotStampAt, type Rect } from '../coinFlightPath';

type Pt = { x: number; y: number };

const coinHitsRect = (p: Pt, r: Rect, px: number) =>
  p.x + px / 2 > r.left && p.x - px / 2 < r.right && p.y + px / 2 > r.top && p.y - px / 2 < r.bottom;

const SCENES = [
  {
    name: 'phone, word on the top row under the banner',
    viewport: { w: 390, h: 844 },
    banner: { left: 60, top: 222, right: 330, bottom: 292 },
    target: { x: 290, y: 33 },
    sources: [{ x: 110, y: 300 }, { x: 250, y: 312 }, { x: 195, y: 280 }, { x: 80, y: 520 }],
    px: 30,
  },
  {
    name: 'desktop, word beside the banner',
    viewport: { w: 1440, h: 900 },
    banner: { left: 600, top: 262, right: 842, bottom: 330 },
    target: { x: 955, y: 40 },
    sources: [{ x: 555, y: 300 }, { x: 720, y: 360 }, { x: 900, y: 290 }],
    px: 44,
  },
  {
    name: 'phone RTL, wallet on the left',
    viewport: { w: 390, h: 844 },
    banner: { left: 60, top: 222, right: 330, bottom: 292 },
    target: { x: 90, y: 33 },
    sources: [{ x: 300, y: 300 }, { x: 150, y: 450 }],
    px: 30,
  },
];

describe('coinFlightPoints', () => {
  for (const scene of SCENES) {
    for (const big of [false, true]) {
      it(`${scene.name}${big ? ' (big word)' : ''}: no coin crosses the praise banner after take-off`, () => {
        const n = 12;
        for (const source of scene.sources) {
          for (let i = 0; i < n; i++) {
            const pts = coinFlightPoints({ source, target: scene.target, i, n, px: scene.px, avoid: [scene.banner], viewport: scene.viewport, big });
            expect(pts[0]).toEqual(source);
            expect(pts[pts.length - 1]).toEqual(scene.target);
            pts.slice(1).forEach((p) => {
              expect(coinHitsRect(p, scene.banner, scene.px), `coin ${i} from ${source.x},${source.y} at ${Math.round(p.x)},${Math.round(p.y)}`).toBe(false);
            });
          }
        }
      });
    }
  }

  it('keeps every coin on screen', () => {
    const viewport = { w: 390, h: 844 };
    for (let i = 0; i < 12; i++) {
      const pts = coinFlightPoints({ source: { x: 370, y: 300 }, target: { x: 290, y: 33 }, i, n: 12, px: 30, avoid: [{ left: 60, top: 222, right: 330, bottom: 292 }], viewport, big: true });
      pts.forEach((p) => {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(viewport.w);
        expect(p.y).toBeGreaterThanOrEqual(0);
      });
    }
  });

  it('big words spray their coins wider than small ones', () => {
    const base = { source: { x: 195, y: 500 }, target: { x: 290, y: 33 }, n: 12, px: 30, avoid: [], viewport: { w: 390, h: 844 } };
    const reach = (big: boolean) =>
      Array.from({ length: 12 }, (_, i) => {
        const fan = coinFlightPoints({ ...base, i, big })[1];
        return Math.hypot(fan.x - base.source.x, fan.y - base.source.y);
      }).reduce((a, b) => a + b, 0);
    expect(reach(true)).toBeGreaterThan(reach(false) * 1.3);
  });
});

describe('jackpotStampAt', () => {
  it('puts the +N stamp beside the word, clear of the banner and on screen', () => {
    const banner = { left: 60, top: 222, right: 330, bottom: 292 };
    const box = { w: 120, h: 52 };
    for (const source of [{ x: 110, y: 300 }, { x: 195, y: 700 }, { x: 370, y: 820 }]) {
      const p = jackpotStampAt(source, [banner], { w: 390, h: 844 }, box);
      const r = { left: p.x - box.w / 2, right: p.x + box.w / 2, top: p.y - box.h / 2, bottom: p.y + box.h / 2 };
      const overlaps = r.left < banner.right && r.right > banner.left && r.top < banner.bottom && r.bottom > banner.top;
      expect(overlaps).toBe(false);
      expect(r.left).toBeGreaterThanOrEqual(0);
      expect(r.right).toBeLessThanOrEqual(390);
      expect(r.bottom).toBeLessThanOrEqual(844);
      expect(Math.abs(p.y - source.y)).toBeLessThan(140);
    }
  });
});
