// ─── TrailRenderer Tests ──────────────────────────────────────────────

import { TrailRenderer } from '../TrailRenderer';
import { Container } from 'pixi.js';

vi.mock('pixi.js', () => {
  class MockGraphics {
    clear = vi.fn().mockReturnThis();
    moveTo = vi.fn().mockReturnThis();
    lineTo = vi.fn().mockReturnThis();
    circle = vi.fn().mockReturnThis();
    stroke = vi.fn().mockReturnThis();
    fill = vi.fn().mockReturnThis();
    destroy = vi.fn();
  }
  class MockContainer {
    addChild = vi.fn();
    removeChild = vi.fn();
    destroy = vi.fn();
  }
  return {
    Container: MockContainer,
    Graphics: MockGraphics,
  };
});

describe('TrailRenderer', () => {
  let parent: Container;
  let trail: TrailRenderer;

  beforeEach(() => {
    parent = new Container();
    trail = new TrailRenderer(parent, { color: 0x00ffff, maxAge: 0.5, maxWidth: 6 });
  });

  afterEach(() => {
    trail.destroy();
  });

  it('should start with no points', () => {
    expect(trail.pointCount).toBe(0);
  });

  it('should add points', () => {
    trail.addPoint(100, 200);
    expect(trail.pointCount).toBe(1);

    trail.addPoint(150, 250);
    expect(trail.pointCount).toBe(2);
  });

  it('should expire old points after maxAge', () => {
    trail.addPoint(100, 200);
    trail.addPoint(150, 250);

    trail.update(0.6); // Past maxAge of 0.5
    expect(trail.pointCount).toBe(0);
  });

  it('should clear all points', () => {
    trail.addPoint(100, 200);
    trail.addPoint(150, 250);
    trail.clear();
    expect(trail.pointCount).toBe(0);
  });

  it('should draw when points exist', () => {
    trail.addPoint(100, 200);
    trail.addPoint(150, 250);
    trail.update(0.016);

    const gfx = (trail as unknown as { graphics: { moveTo: jest.Mock } }).graphics;
    expect(gfx.moveTo).toHaveBeenCalled();
  });

  it('should not draw with fewer than 2 points', () => {
    trail.addPoint(100, 200);
    trail.update(0.016);

    const gfx = (trail as unknown as { graphics: { clear: jest.Mock; moveTo: jest.Mock } }).graphics;
    expect(gfx.clear).toHaveBeenCalled();
    // moveTo may or may not be called for a single-point glow dot
  });

  it('should cap points at maxPoints', () => {
    const smallTrail = new TrailRenderer(parent, { color: 0xff0000, maxAge: 1, maxWidth: 4, maxPoints: 5 });
    for (let i = 0; i < 10; i++) {
      smallTrail.addPoint(i * 10, i * 10);
    }
    expect(smallTrail.pointCount).toBeLessThanOrEqual(5);
    smallTrail.destroy();
  });

  it('does not crash if Graphics was destroyed by parent (children:true)', () => {
    trail.addPoint(10, 10);
    trail.addPoint(20, 20);
    // Simulate parent.destroy({ children: true }) flipping the Graphics.destroyed flag
    // before TrailRenderer.destroy() is invoked.
    (trail as unknown as { graphics: { destroyed: boolean } }).graphics.destroyed = true;
    expect(() => trail.update(0.016)).not.toThrow();
  });

  it('clear() does not crash if Graphics was destroyed by parent (children:true)', () => {
    trail.addPoint(10, 10);
    const gfx = (trail as unknown as { graphics: { clear: jest.Mock; destroyed: boolean } }).graphics;
    // Reproduce the production null-context throw: a destroyed Graphics whose
    // internal context is null throws "Cannot read properties of null (reading 'clear')".
    gfx.clear.mockImplementationOnce(() => {
      throw new TypeError("Cannot read properties of null (reading 'clear')");
    });
    gfx.destroyed = true;
    expect(() => trail.clear()).not.toThrow();
  });
});
