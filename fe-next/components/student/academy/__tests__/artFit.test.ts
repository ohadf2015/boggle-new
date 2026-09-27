import { describe, it, expect } from 'vitest';
import { fitArt, type FitPoint, type Insets } from '../artFit';
import { ISLANDS, CASTLE, MAP_ASPECT } from '../academyNodes';

/**
 * fitArt places the map art (a px rect) so every island — and the chrome-free
 * box its art, pointer and plaque need — lands inside the visible safe area,
 * at ANY viewport. Cover when that is possible; shrink (letterbox over a blurred
 * backdrop) when cover would crop an island off-screen.
 */

type Art = 'portrait' | 'landscape';

/** A normal island: art above the point, plaque below. */
const island = (p: { x: number; y: number }, extra: Partial<FitPoint> = {}): FitPoint => ({ ...p, up: 70, down: 30, half: 60, ...extra });

function mapPoints(art: Art): FitPoint[] {
  return [
    ...ISLANDS[art].map((p) => island(p)),
    { ...CASTLE[art], up: 45, down: 55, half: 70 },
  ];
}

/** Every point box (point ± extents, in px) against the safe rect. */
function boxesInside(fit: ReturnType<typeof fitArt>, pts: FitPoint[], view: { width: number; height: number }, ins: Insets) {
  const bad: string[] = [];
  for (const p of pts) {
    const px = fit.left + (p.x / 100) * fit.width;
    const py = fit.top + (p.y / 100) * fit.height;
    if (px - p.half < ins.left - 1) bad.push(`${p.x},${p.y} left`);
    if (px + p.half > view.width - ins.right + 1) bad.push(`${p.x},${p.y} right`);
    if (py - p.up < ins.top - 1) bad.push(`${p.x},${p.y} top`);
    if (py + p.down > view.height - ins.bottom + 1) bad.push(`${p.x},${p.y} bottom`);
  }
  return bad;
}

const VIEWPORTS: Array<[number, number, Insets]> = [
  [375, 667, { top: 84, bottom: 164, left: 8, right: 8 }],
  [360, 740, { top: 84, bottom: 164, left: 8, right: 8 }],
  [390, 844, { top: 90, bottom: 170, left: 8, right: 8 }],
  [430, 932, { top: 90, bottom: 170, left: 8, right: 8 }],
  [844, 390, { top: 56, bottom: 70, left: 8, right: 8 }],
  [667, 375, { top: 56, bottom: 70, left: 8, right: 8 }],
  [768, 1024, { top: 110, bottom: 190, left: 12, right: 12 }],
  [1024, 768, { top: 100, bottom: 180, left: 12, right: 12 }],
  [1280, 720, { top: 110, bottom: 120, left: 16, right: 16 }],
  [1366, 768, { top: 110, bottom: 120, left: 16, right: 16 }],
  [1920, 1080, { top: 110, bottom: 160, left: 24, right: 24 }],
  [2560, 1440, { top: 150, bottom: 210, left: 32, right: 32 }],
  [3440, 1440, { top: 150, bottom: 210, left: 32, right: 32 }],
];

describe('fitArt', () => {
  it('with no islands, covers the view, centred', () => {
    const fit = fitArt({ view: { width: 1000, height: 500 }, aspect: 1, points: [], insets: { top: 0, bottom: 0, left: 0, right: 0 } });
    expect(fit).toMatchObject({ width: 1000, height: 1000, left: 0, top: -250, covers: true, crowded: false });
  });

  it.each(VIEWPORTS)('at %ix%i every island box stays inside the safe area', (width, height, insets) => {
    const art: Art = width >= height ? 'landscape' : 'portrait';
    const pts = mapPoints(art);
    const fit = fitArt({ view: { width, height }, aspect: MAP_ASPECT[art], points: pts, insets });
    expect(boxesInside(fit, pts, { width, height }, insets)).toEqual([]);
    expect(fit.height).toBeCloseTo(fit.width / MAP_ASPECT[art], 3);
  });

  it('covers a 16:9 desktop edge to edge (nothing letterboxed)', () => {
    const pts = mapPoints('landscape');
    const fit = fitArt({ view: { width: 1920, height: 1080 }, aspect: MAP_ASPECT.landscape, points: pts, insets: VIEWPORTS[10][2] });
    expect(fit.covers).toBe(true);
    expect(fit.left).toBeLessThanOrEqual(0);
    expect(fit.left + fit.width).toBeGreaterThanOrEqual(1920);
  });

  it('shrinks below cover on a 4:3 tablet instead of cropping the castle off the left edge', () => {
    const pts = mapPoints('landscape');
    const coverW = 768 * MAP_ASPECT.landscape;
    const fit = fitArt({ view: { width: 1024, height: 768 }, aspect: MAP_ASPECT.landscape, points: pts, insets: VIEWPORTS[7][2] });
    expect(fit.width).toBeLessThan(coverW);
    expect(fit.covers).toBe(false);
  });

  it('keeps two stacked islands from overlapping when there is room to', () => {
    // Boss plaque below A would collide with B's pointer above it.
    const pts: FitPoint[] = [
      { x: 50, y: 20, up: 40, down: 60, half: 80 },
      { x: 60, y: 40, up: 140, down: 30, half: 60 },
    ];
    const view = { width: 400, height: 900 };
    const insets = { top: 0, bottom: 0, left: 0, right: 0 };
    const fit = fitArt({ view, aspect: 0.5, points: pts, insets });
    expect(fit.crowded).toBe(false);
    const aBottom = fit.top + 0.2 * fit.height + 60;
    const bTop = fit.top + 0.4 * fit.height - 140;
    expect(bTop).toBeGreaterThanOrEqual(aBottom - 0.5);
  });

  it('reports crowded when the view cannot both fit and separate the islands', () => {
    const pts: FitPoint[] = [
      { x: 50, y: 20, up: 40, down: 60, half: 80 },
      { x: 55, y: 30, up: 200, down: 30, half: 60 },
    ];
    const fit = fitArt({ view: { width: 300, height: 300 }, aspect: 0.5, points: pts, insets: { top: 0, bottom: 0, left: 0, right: 0 } });
    expect(fit.crowded).toBe(true);
  });

  it('leans toward the focus island, but never past the safe area', () => {
    const pts = mapPoints('landscape');
    const insets = VIEWPORTS[10][2];
    const base = fitArt({ view: { width: 1920, height: 1080 }, aspect: MAP_ASPECT.landscape, points: pts, insets });
    const leaned = fitArt({ view: { width: 1920, height: 1080 }, aspect: MAP_ASPECT.landscape, points: pts, insets, focus: { x: 91.2, y: 51 } });
    expect(leaned.left).toBeLessThanOrEqual(base.left);
    expect(boxesInside(leaned, pts, { width: 1920, height: 1080 }, insets)).toEqual([]);
  });

  it('zooms in on a short path (few islands), capped', () => {
    const pts = [island({ x: 45, y: 50 }), island({ x: 55, y: 52 })];
    const fit = fitArt({ view: { width: 1920, height: 1080 }, aspect: MAP_ASPECT.landscape, points: pts, insets: VIEWPORTS[10][2], maxZoom: 1.3 });
    expect(fit.width).toBeGreaterThan(1920);
    expect(fit.width).toBeLessThanOrEqual(1920 * 1.3 + 1);
  });
});
