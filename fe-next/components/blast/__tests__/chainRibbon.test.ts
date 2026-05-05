// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Stub Pixi v8 — happy-dom has no WebGL; the controller must work without
// a real renderer (DOM-side only: stage child management + point updates).
vi.mock('pixi.js', () => {
  class FakePoint { x = 0; y = 0; constructor(x = 0, y = 0) { this.x = x; this.y = y; } set(x: number, y: number) { this.x = x; this.y = y; } }
  class FakeMeshRope {
    visible = true;
    destroyed = false;
    points: FakePoint[];
    constructor({ points }: { texture: unknown; points: FakePoint[] }) { this.points = points; }
    destroy() { this.destroyed = true; }
  }
  return {
    Point: FakePoint,
    MeshRope: FakeMeshRope,
    Texture: { from: () => ({}) },
  };
});

import { createChainRibbonController } from '../hooks/useBlastPixiOverlays';

interface FakeStage { addChild: ReturnType<typeof vi.fn>; removeChild: ReturnType<typeof vi.fn> }

function makeStage(): FakeStage {
  return { addChild: vi.fn(), removeChild: vi.fn() };
}

describe('createChainRibbonController', () => {
  beforeEach(() => {
    // jsdom canvas getContext stub for createCanvas() in texture cache
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      createLinearGradient: () => ({ addColorStop: () => {} }),
      fillRect: () => {},
      set fillStyle(_v: unknown) {},
    }) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  });

  afterEach(() => { vi.restoreAllMocks(); });

  it('hides rope until selection has 2+ points', () => {
    const stage = makeStage();
    const ctrl = createChainRibbonController(stage as unknown as Parameters<typeof createChainRibbonController>[0]);
    expect(ctrl.rope.visible).toBe(false);
    ctrl.update([{ x: 10, y: 10 }]);
    expect(ctrl.rope.visible).toBe(false);
  });

  it('shows rope and updates points to match selection sequence', () => {
    const stage = makeStage();
    const ctrl = createChainRibbonController(stage as unknown as Parameters<typeof createChainRibbonController>[0]);
    ctrl.update([{ x: 10, y: 10 }, { x: 30, y: 10 }, { x: 30, y: 30 }]);
    expect(ctrl.rope.visible).toBe(true);
    expect(ctrl.points.length).toBe(3);
    expect(ctrl.points[0]).toMatchObject({ x: 10, y: 10 });
    expect(ctrl.points[2]).toMatchObject({ x: 30, y: 30 });
  });

  it('shrinks point array when selection contracts', () => {
    const stage = makeStage();
    const ctrl = createChainRibbonController(stage as unknown as Parameters<typeof createChainRibbonController>[0]);
    ctrl.update([{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }]);
    expect(ctrl.points.length).toBe(4);
    ctrl.update([{ x: 0, y: 0 }, { x: 1, y: 1 }]);
    expect(ctrl.points.length).toBe(2);
  });

  it('dispose removes rope from stage and destroys it', () => {
    const stage = makeStage();
    const ctrl = createChainRibbonController(stage as unknown as Parameters<typeof createChainRibbonController>[0]);
    ctrl.dispose();
    expect(stage.removeChild).toHaveBeenCalledWith(ctrl.rope);
    expect((ctrl.rope as unknown as { destroyed: boolean }).destroyed).toBe(true);
  });
});
