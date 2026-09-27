// ─── ScoreFly Tests ───────────────────────────────────────────────────
// Covers the per-tier TextStyle cache (avoid re-allocating a TextStyle on
// every score popup) and the fly lifecycle / concurrency cap.

import { ScoreFlyManager, getScoreFlyStyle } from '../ScoreFly';
import { Container } from 'pixi.js';

vi.mock('pixi.js', () => {
  class MockContainer {
    children: unknown[] = [];
    addChild = vi.fn((c: unknown) => {
      this.children.push(c);
    });
    removeChild = vi.fn((c: unknown) => {
      const i = this.children.indexOf(c);
      if (i >= 0) this.children.splice(i, 1);
    });
    destroy = vi.fn();
  }
  class MockText {
    text: string;
    style: unknown;
    x = 0;
    y = 0;
    alpha = 1;
    anchor = { set: vi.fn() };
    scale = { set: vi.fn() };
    destroy = vi.fn();
    constructor(opts: { text: string; style: unknown }) {
      this.text = opts.text;
      this.style = opts.style;
    }
  }
  class MockTextStyle {
    fill: unknown;
    fontSize: unknown;
    constructor(opts: Record<string, unknown>) {
      Object.assign(this, opts);
    }
  }
  return { Container: MockContainer, Text: MockText, TextStyle: MockTextStyle };
});

describe('getScoreFlyStyle (per-tier cache)', () => {
  it('returns the SAME TextStyle instance for the same tier (cached, not re-allocated)', () => {
    expect(getScoreFlyStyle(2)).toBe(getScoreFlyStyle(2));
    expect(getScoreFlyStyle(5)).toBe(getScoreFlyStyle(5));
  });

  it('returns DIFFERENT styles for different tiers', () => {
    expect(getScoreFlyStyle(1)).not.toBe(getScoreFlyStyle(3));
  });

  it('encodes tier color and fontSize (16 + tier*4)', () => {
    const s3 = getScoreFlyStyle(3) as unknown as { fill: number; fontSize: number };
    expect(s3.fill).toBe(0x88ff44); // tier-3 color
    expect(s3.fontSize).toBe(16 + 3 * 4);
  });

  it('clamps tier above 5 to the tier-5 style', () => {
    expect(getScoreFlyStyle(9)).toBe(getScoreFlyStyle(5));
  });
});

describe('ScoreFlyManager', () => {
  let parent: Container;
  beforeEach(() => {
    parent = new Container();
  });

  it('reuses the cached style instance across flies of the same tier', () => {
    const mgr = new ScoreFlyManager(parent);
    mgr.fly({ score: 10, from: { x: 0, y: 0 }, to: { x: 5, y: 5 }, tier: 2 });
    mgr.fly({ score: 20, from: { x: 1, y: 1 }, to: { x: 6, y: 6 }, tier: 2 });
    const container = (mgr as unknown as { container: { children: { style: unknown }[] } })
      .container;
    expect(container.children).toHaveLength(2);
    expect(container.children[0].style).toBe(container.children[1].style);
  });

  it('caps concurrent flies', () => {
    const mgr = new ScoreFlyManager(parent);
    for (let i = 0; i < 8; i++) {
      mgr.fly({ score: i, from: { x: 0, y: 0 }, to: { x: 1, y: 1 } });
    }
    const container = (mgr as unknown as { container: { children: unknown[] } }).container;
    expect(container.children.length).toBeLessThanOrEqual(5);
  });

  it('removes a fly once its animation completes', () => {
    const mgr = new ScoreFlyManager(parent);
    mgr.fly({ score: 10, from: { x: 0, y: 0 }, to: { x: 5, y: 5 }, duration: 0.5 });
    const container = (mgr as unknown as { container: { children: unknown[] } }).container;
    expect(container.children).toHaveLength(1);
    mgr.update(0.6); // past duration
    expect(container.children).toHaveLength(0);
  });
});
