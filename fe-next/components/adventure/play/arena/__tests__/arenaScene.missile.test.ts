/**
 * The word-in-flight object, exercised for real against Pixi.
 *
 * The arc maths is pinned in `arenaBeats.test.ts`; this pins the DRAWING — that
 * a word chip can actually be built and stepped without throwing, and that it
 * leaves the hero and arrives on the foe. `ArenaCanvas` spawns the missile in
 * the same `drain()` branch that lands the punch, so a throw in here would take
 * the whole impact beat down with it and the fight would silently stop reacting.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createWordMissile, stepMissile } from '../arenaScene';

// jsdom ships no 2D context, and Pixi measures every Text through one. A tiny
// monospace-ish stub is enough: we assert geometry, not glyph metrics.
beforeAll(() => {
  const ctx = {
    font: '', measureText: (s: string) => ({ width: s.length * 10, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 }),
    fillText() {}, strokeText() {}, clearRect() {}, save() {}, restore() {}, scale() {}, translate() {},
    getImageData: () => ({ data: new Uint8ClampedArray(4) }), fillRect() {}, drawImage() {}, setTransform() {},
    createLinearGradient: () => ({ addColorStop() {} }), beginPath() {}, closePath() {}, fill() {}, stroke() {},
    canvas: null as unknown as HTMLCanvasElement,
  };
  HTMLCanvasElement.prototype.getContext = ((kind: string) => (kind === '2d' ? ctx : null)) as typeof HTMLCanvasElement.prototype.getContext;
  // Pixi feature-detects letter-spacing off the constructor's prototype.
  (globalThis as Record<string, unknown>).CanvasRenderingContext2D = function CanvasRenderingContext2D() {} as unknown;
  ((globalThis as Record<string, unknown>).CanvasRenderingContext2D as { prototype: Record<string, unknown> }).prototype = ctx;
});

const from = { x: 40, y: 150 };
const to = { x: 300, y: 90 };

describe('createWordMissile', () => {
  it('starts on the launcher, with the word on it', () => {
    const m = createWordMissile('NADIR', 22, from, to, 40, 320);
    expect(m.view.x).toBe(from.x);
    expect(m.view.y).toBe(from.y);
    expect(m.view.width).toBeGreaterThan(0);
  });

  it('flies an arc that lifts off the straight line and lands on the target', () => {
    const m = createWordMissile('NADIR', 22, from, to, 40, 320);
    stepMissile(m, 160);
    const midLine = (from.y + to.y) / 2;
    expect(m.view.y).toBeLessThan(midLine);
    expect(m.view.x).toBeGreaterThan(from.x);
    expect(m.view.x).toBeLessThan(to.x);

    expect(stepMissile(m, 160)).toBe(false);
    expect(Math.round(m.view.x)).toBe(to.x);
    expect(Math.round(m.view.y)).toBe(to.y);
  });

  it('survives a Hebrew word and a single letter without throwing', () => {
    for (const w of ['שלום', 'A', 'ありがとう']) {
      const m = createWordMissile(w, 18, from, to, 30, 200);
      expect(() => stepMissile(m, 100)).not.toThrow();
      m.view.destroy({ children: true });
    }
  });
});
