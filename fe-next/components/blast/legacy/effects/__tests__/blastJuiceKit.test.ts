import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';

// Mock pixi-filters to avoid WebGL in jsdom.
vi.mock('pixi-filters', () => {
  class MockFilter {
    public options: Record<string, unknown>;
    constructor(opts: Record<string, unknown> = {}) {
      this.options = opts;
      Object.assign(this, opts);
    }
  }
  return {
    GlowFilter: class extends MockFilter {},
    OutlineFilter: class extends MockFilter {},
    BloomFilter: class extends MockFilter {},
    ShockwaveFilter: class extends MockFilter {
      public time = 0;
      public enabled = true;
    },
    RGBSplitFilter: class extends MockFilter {
      red: [number, number] = [0, 0];
      green: [number, number] = [0, 0];
      blue: [number, number] = [0, 0];
    },
    AdjustmentFilter: class extends MockFilter {
      saturation = 1;
      brightness = 1;
      contrast = 1;
    },
    ZoomBlurFilter: class extends MockFilter {
      strength = 0;
      center: [number, number] = [0, 0];
    },
    AdvancedBloomFilter: class extends MockFilter {
      threshold = 0.35;
      bloomScale = 1;
      brightness = 1;
    },
  };
});

import { createBlastJuiceKit } from '../blastJuiceKit';

function makeFakeEngine() {
  const camera = { filters: null as any[] | null };
  const shake = { shake: vi.fn() };
  const timeDilation = { freeze: vi.fn(), slowDown: vi.fn() };
  const app = {
    ticker: { add: vi.fn(), remove: vi.fn() },
  };
  return { app, camera, shake, timeDilation };
}

describe('blastJuiceKit', () => {
  let rafSpy: any;

  beforeEach(() => {
    vi.useFakeTimers();
    let id = 0;
    rafSpy = vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb: any) => {
      const handle = ++id;
      setTimeout(() => cb(performance.now()), 16);
      return handle as any;
    });
    vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  it('exposes megaPunch, comboPulse, waveClearBurst, destroy', () => {
    const eng = makeFakeEngine();
    const kit = createBlastJuiceKit(eng as any);
    expect(typeof kit.megaPunch).toBe('function');
    expect(typeof kit.comboPulse).toBe('function');
    expect(typeof kit.waveClearBurst).toBe('function');
    expect(typeof kit.destroy).toBe('function');
    kit.destroy();
  });

  it('megaPunch stacks filters on camera and triggers screen shake + hit-stop', () => {
    const eng = makeFakeEngine();
    const kit = createBlastJuiceKit(eng as any);

    kit.megaPunch({ cx: 320, cy: 240 });

    // Camera should now have filters attached
    expect(Array.isArray(eng.camera.filters)).toBe(true);
    expect(eng.camera.filters!.length).toBeGreaterThan(0);
    // Shake triggered
    expect(eng.shake.shake).toHaveBeenCalled();
    // Hit-stop applied
    expect(eng.timeDilation.freeze).toHaveBeenCalled();

    kit.destroy();
  });

  it('comboPulse intensity scales with tier', () => {
    const eng = makeFakeEngine();
    const kit = createBlastJuiceKit(eng as any);

    kit.comboPulse(1);
    const smallShakeCall = (eng.shake.shake as any).mock.calls[0]?.[0];
    (eng.shake.shake as any).mockClear();

    kit.comboPulse(5);
    const bigShakeCall = (eng.shake.shake as any).mock.calls[0]?.[0];

    expect(bigShakeCall).toBeDefined();
    expect(smallShakeCall).toBeDefined();
    // Higher tier → stronger shake intensity
    expect(bigShakeCall.intensity).toBeGreaterThan(smallShakeCall.intensity);

    kit.destroy();
  });

  it('waveClearBurst applies filters and freezes time briefly', () => {
    const eng = makeFakeEngine();
    const kit = createBlastJuiceKit(eng as any);

    kit.waveClearBurst({ cx: 100, cy: 100 });

    expect(eng.camera.filters).not.toBeNull();
    expect(eng.camera.filters!.length).toBeGreaterThan(0);
    expect(eng.timeDilation.freeze).toHaveBeenCalled();

    kit.destroy();
  });

  it('destroy clears filters and is idempotent', () => {
    const eng = makeFakeEngine();
    const kit = createBlastJuiceKit(eng as any);

    kit.megaPunch({ cx: 0, cy: 0 });
    kit.destroy();
    expect(eng.camera.filters).toBeNull();

    // Second destroy should not throw
    expect(() => kit.destroy()).not.toThrow();
  });

  describe('prefers-reduced-motion gating', () => {
    it('megaPunch no-ops when motionOk returns false', () => {
      const eng = makeFakeEngine();
      const kit = createBlastJuiceKit({ ...eng, motionOk: () => false } as any);

      kit.megaPunch({ cx: 0, cy: 0 });

      expect(eng.camera.filters).toBeNull();
      expect(eng.shake.shake).not.toHaveBeenCalled();
      expect(eng.timeDilation.freeze).not.toHaveBeenCalled();
      kit.destroy();
    });

    it('comboPulse no-ops when motionOk returns false', () => {
      const eng = makeFakeEngine();
      const kit = createBlastJuiceKit({ ...eng, motionOk: () => false } as any);

      kit.comboPulse(5);

      expect(eng.camera.filters).toBeNull();
      expect(eng.shake.shake).not.toHaveBeenCalled();
      kit.destroy();
    });

    it('waveClearBurst no-ops when motionOk returns false', () => {
      const eng = makeFakeEngine();
      const kit = createBlastJuiceKit({ ...eng, motionOk: () => false } as any);

      kit.waveClearBurst({ cx: 0, cy: 0 });

      expect(eng.camera.filters).toBeNull();
      expect(eng.shake.shake).not.toHaveBeenCalled();
      expect(eng.timeDilation.freeze).not.toHaveBeenCalled();
      kit.destroy();
    });

    it('motionOk is checked at call time (not capture time) so live toggles work', () => {
      const eng = makeFakeEngine();
      let allowed = true;
      const kit = createBlastJuiceKit({ ...eng, motionOk: () => allowed } as any);

      kit.comboPulse(2);
      expect(eng.shake.shake).toHaveBeenCalledTimes(1);

      allowed = false;
      kit.comboPulse(2);
      expect(eng.shake.shake).toHaveBeenCalledTimes(1); // no new call

      kit.destroy();
    });

    it('defaults to motion-ok when no predicate supplied (back-compat)', () => {
      const eng = makeFakeEngine();
      const kit = createBlastJuiceKit(eng as any); // no motionOk

      kit.comboPulse(1);

      expect(eng.shake.shake).toHaveBeenCalled();
      kit.destroy();
    });
  });

  afterAll(() => {
    rafSpy?.mockRestore?.();
  });
});

