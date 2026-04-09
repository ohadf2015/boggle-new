import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock pixi-filters so tests run in jsdom without WebGL ─────────────
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
      red = [0, 0];
      green = [0, 0];
      blue = [0, 0];
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
      threshold = 0.5;
      bloomScale = 1;
      brightness = 1;
    },
  };
});

import {
  createGlowFilter,
  createOutlineFilter,
  createBloomFilter,
  createShockwaveFilter,
  createRGBSplitFilter,
  createAdjustmentFilter,
  createZoomBlurFilter,
  createAdvancedBloomFilter,
  getGlowColorForTile,
} from '../pixiFilterPresets';

describe('pixiFilterPresets — existing factories', () => {
  it('createGlowFilter returns a filter with default neo-lime color', () => {
    const f = createGlowFilter() as any;
    expect(f).toBeDefined();
    expect(f.options.color).toBe(0xbfff00);
  });

  it('createOutlineFilter accepts custom thickness', () => {
    const f = createOutlineFilter(0xff1493, 4) as any;
    expect(f.options.thickness).toBe(4);
    expect(f.options.color).toBe(0xff1493);
  });

  it('createBloomFilter scales intensity', () => {
    const f = createBloomFilter(5) as any;
    expect(f.options.strength).toBe(5);
  });

  it('createShockwaveFilter returns filter + animate + stop', () => {
    const res = createShockwaveFilter({ x: 0, y: 0 });
    expect(typeof res.animate).toBe('function');
    expect(typeof res.stop).toBe('function');
    expect(res.filter).toBeDefined();
  });

  it('getGlowColorForTile returns tile-specific color', () => {
    expect(getGlowColorForTile('bomb')).toBe(0xff1493);
    expect(getGlowColorForTile('lightning')).toBe(0x00ffff);
    expect(getGlowColorForTile('unknown')).toBe(0xbfff00);
  });
});

describe('pixiFilterPresets — juice extensions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createRGBSplitFilter', () => {
    it('returns a filter with zero offset by default (no-op until animated)', () => {
      const f = createRGBSplitFilter() as any;
      expect(f).toBeDefined();
      expect(f.red).toEqual([0, 0]);
      expect(f.blue).toEqual([0, 0]);
    });

    it('applies an amount offset to red/blue channels', () => {
      const f = createRGBSplitFilter(6) as any;
      // Red pushed right, blue pushed left for classic chromatic aberration
      expect(f.red[0]).toBe(6);
      expect(f.blue[0]).toBe(-6);
    });
  });

  describe('createAdjustmentFilter', () => {
    it('creates filter with default neutral values', () => {
      const f = createAdjustmentFilter() as any;
      expect(f.options.saturation).toBe(1);
      expect(f.options.brightness).toBe(1);
      expect(f.options.contrast).toBe(1);
    });

    it('accepts saturation/brightness/contrast overrides', () => {
      const f = createAdjustmentFilter({
        saturation: 1.6,
        brightness: 1.2,
        contrast: 1.4,
      }) as any;
      expect(f.options.saturation).toBe(1.6);
      expect(f.options.brightness).toBe(1.2);
      expect(f.options.contrast).toBe(1.4);
    });
  });

  describe('createZoomBlurFilter', () => {
    it('creates a zoom blur with default center and zero strength', () => {
      const f = createZoomBlurFilter() as any;
      expect(f.options.strength).toBe(0);
    });

    it('accepts custom strength and center', () => {
      const f = createZoomBlurFilter({ strength: 0.4, center: [200, 150] }) as any;
      expect(f.options.strength).toBe(0.4);
      expect(f.options.center).toEqual([200, 150]);
    });
  });

  describe('createAdvancedBloomFilter', () => {
    it('creates a bloom with default intensity', () => {
      const f = createAdvancedBloomFilter() as any;
      expect(f).toBeDefined();
      expect(f.options.bloomScale).toBeGreaterThan(0);
    });

    it('scales bloomScale with intensity', () => {
      const lo = createAdvancedBloomFilter(1) as any;
      const hi = createAdvancedBloomFilter(4) as any;
      expect(hi.options.bloomScale).toBeGreaterThan(lo.options.bloomScale);
    });
  });
});
