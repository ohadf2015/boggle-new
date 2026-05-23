import { describe, it, expect } from 'vitest';
import { WORD_TOWER_LANDMARKS, visibleLandmarks } from '../landmarks';

describe('WORD_TOWER_LANDMARKS', () => {
  it('rises monotonically with a label key + icon each', () => {
    for (let i = 1; i < WORD_TOWER_LANDMARKS.length; i++) {
      expect(WORD_TOWER_LANDMARKS[i]!.m).toBeGreaterThan(WORD_TOWER_LANDMARKS[i - 1]!.m);
    }
    for (const l of WORD_TOWER_LANDMARKS) {
      expect(l.icon.length).toBeGreaterThan(0);
      expect(l.key).toMatch(/^wordTower\.landmark\./);
    }
  });
});

describe('visibleLandmarks', () => {
  const buildLineY = 200; // 0.28 * ~700px viewport
  const pxPerM = 5.2;
  const viewportH = 700;

  it('places a landmark at the build line when the viewer is at its altitude', () => {
    const lm = WORD_TOWER_LANDMARKS[1]!; // some mid landmark
    const vis = visibleLandmarks(lm.m, buildLineY, viewportH, pxPerM);
    const me = vis.find((v) => v.id === lm.id);
    expect(me).toBeTruthy();
    expect(Math.abs(me!.screenY - buildLineY)).toBeLessThan(1);
  });

  it('shows a landmark just above the climber (higher altitude → smaller screenY)', () => {
    const vis = visibleLandmarks(0, buildLineY, viewportH, pxPerM);
    // the first landmark is above the ground → renders above the build line
    const first = vis.find((v) => v.id === WORD_TOWER_LANDMARKS[0]!.id);
    if (first) expect(first.screenY).toBeLessThan(buildLineY);
  });

  it('culls landmarks far off-screen', () => {
    // way up high → ground landmarks are far below the viewport
    const vis = visibleLandmarks(5000, buildLineY, viewportH, pxPerM);
    expect(vis.every((v) => v.screenY >= -60 && v.screenY <= viewportH + 60)).toBe(true);
  });
});
