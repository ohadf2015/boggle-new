import { describe, it, expect } from 'vitest';
import { pickHubLayout } from '../hubLayout';

/**
 * The hub's layout is picked from aspect AND height, never width alone:
 *  - art: portrait map on a tall view, landscape map on a wide one;
 *  - chrome: 'rail' for a short landscape view (a phone on its side), 'wide'
 *    (side card · hero · dock) only when there is real room, else 'stack';
 *  - scale: the UI grows on big screens (TV) and tablets, never below 1.
 */
describe('pickHubLayout', () => {
  it.each([
    [375, 667, 'portrait', 'stack'],
    [360, 740, 'portrait', 'stack'],
    [390, 844, 'portrait', 'stack'],
    [430, 932, 'portrait', 'stack'],
    [768, 1024, 'portrait', 'stack'],
    [844, 390, 'landscape', 'rail'],
    [667, 375, 'landscape', 'rail'],
    [932, 430, 'landscape', 'rail'],
    [1024, 768, 'landscape', 'stack'],
    [1280, 720, 'landscape', 'wide'],
    [1366, 768, 'landscape', 'wide'],
    [1920, 1080, 'landscape', 'wide'],
    [2560, 1440, 'landscape', 'wide'],
  ] as const)('%ix%i → %s art, %s chrome', (width, height, art, chrome) => {
    const l = pickHubLayout({ width, height });
    expect(l.art).toBe(art);
    expect(l.chrome).toBe(chrome);
  });

  it('keeps the 1080p look at scale 1 and scales a 1440p TV up proportionally', () => {
    expect(pickHubLayout({ width: 1920, height: 1080 }).scale).toBe(1);
    expect(pickHubLayout({ width: 2560, height: 1440 }).scale).toBeCloseTo(4 / 3, 2);
    expect(pickHubLayout({ width: 3840, height: 2160 }).scale).toBeCloseTo(2, 2);
  });

  it('never shrinks the UI below 1, and scales a tablet up a little', () => {
    for (const [w, h] of [[375, 667], [844, 390], [1280, 720], [1024, 768]]) {
      expect(pickHubLayout({ width: w, height: h }).scale).toBe(1);
    }
    const tab = pickHubLayout({ width: 768, height: 1024 }).scale;
    expect(tab).toBeGreaterThan(1.05);
    expect(tab).toBeLessThan(1.3);
  });

  it('shows the desktop side card only when the scaled width leaves it room', () => {
    expect(pickHubLayout({ width: 1280, height: 720 }).sideCard).toBe(false);
    expect(pickHubLayout({ width: 1366, height: 768 }).sideCard).toBe(false);
    expect(pickHubLayout({ width: 1920, height: 1080 }).sideCard).toBe(true);
    expect(pickHubLayout({ width: 2560, height: 1440 }).sideCard).toBe(true);
  });
});
