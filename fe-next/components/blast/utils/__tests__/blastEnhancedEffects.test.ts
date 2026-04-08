import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ──────────────────────────────────────────────────────────────

const mockExplode = vi.fn().mockResolvedValue(undefined);
const mockDissolve = vi.fn().mockResolvedValue(undefined);
const mockPlay = vi.fn().mockResolvedValue(undefined);
const mockMelt = vi.fn().mockResolvedValue(undefined);
const mockGlitch = vi.fn().mockResolvedValue(undefined);
const mockPixelSort = vi.fn().mockResolvedValue(undefined);
const mockSlitScanPlay = vi.fn().mockResolvedValue(undefined);
const mockMercuryPlay = vi.fn().mockResolvedValue(undefined);
const mockAssemble = vi.fn().mockResolvedValue(undefined);
const mockShatterDestroy = vi.fn();
const mockDissolveDestroy = vi.fn();
const mockGenericDestroy = vi.fn();

vi.mock('custom-pixi-particles', () => {
  class MockShatterEffect {
    Explode = mockExplode;
    destroy = mockShatterDestroy;
  }
  class MockDissolveEffect {
    dissolve = mockDissolve;
    destroy = mockDissolveDestroy;
  }
  class MockCrystallizeEffect {
    play = mockPlay;
    destroy = mockGenericDestroy;
  }
  class MockMeltEffect {
    melt = mockMelt;
    destroy = mockGenericDestroy;
  }
  class MockGlitchEffect {
    glitch = mockGlitch;
    destroy = mockGenericDestroy;
  }
  class MockPrismRefractionEffect {
    play = mockPlay;
    destroy = mockGenericDestroy;
  }
  class MockGranularErosionEffect {
    play = mockPlay;
    destroy = mockGenericDestroy;
  }
  class MockPixelSortEffect {
    pixelSort = mockPixelSort;
    destroy = mockGenericDestroy;
  }
  class MockSlitScanEffect {
    play = mockSlitScanPlay;
    destroy = mockGenericDestroy;
  }
  class MockLiquidMercuryEffect {
    play = mockMercuryPlay;
    destroy = mockGenericDestroy;
  }
  class MockMagneticAssemblyEffect {
    assemble = mockAssemble;
    destroy = mockGenericDestroy;
  }
  return {
    ShatterEffect: MockShatterEffect,
    DissolveEffect: MockDissolveEffect,
    CrystallizeEffect: MockCrystallizeEffect,
    MeltEffect: MockMeltEffect,
    GlitchEffect: MockGlitchEffect,
    PrismRefractionEffect: MockPrismRefractionEffect,
    GranularErosionEffect: MockGranularErosionEffect,
    PixelSortEffect: MockPixelSortEffect,
    SlitScanEffect: MockSlitScanEffect,
    LiquidMercuryEffect: MockLiquidMercuryEffect,
    MagneticAssemblyEffect: MockMagneticAssemblyEffect,
  };
});

vi.mock('pixi.js', () => {
  const mockTexture = { destroy: vi.fn() };

  class MockGraphics {
    roundRect() { return this; }
    fill() { return this; }
    stroke() { return this; }
    rect() { return this; }
    destroy() {}
  }

  class MockSprite {
    anchor = { set: vi.fn() };
    x = 0;
    y = 0;
    width = 0;
    height = 0;
    texture = mockTexture;
  }

  class MockContainer {
    addChild = vi.fn();
    removeChild = vi.fn();
  }

  return {
    Container: MockContainer,
    Graphics: MockGraphics,
    Sprite: MockSprite,
    RenderTexture: { EMPTY: Symbol('EMPTY') },
  };
});

import { createEnhancedEffects } from '../blastEnhancedEffects';

// ─── Test Helpers ────────────────────────────────────────────────────────

function makeMockApp() {
  return {
    renderer: {
      generateTexture: vi.fn().mockReturnValue({ destroy: vi.fn() }),
    },
  } as any;
}

function makeMockCamera() {
  return {
    addChild: vi.fn(),
    removeChild: vi.fn(),
  } as any;
}

// ─── Tests ───────────────────────────────────────────────────────────────

describe('blastEnhancedEffects', () => {
  let app: any;
  let camera: any;

  beforeEach(() => {
    vi.clearAllMocks();
    app = makeMockApp();
    camera = makeMockCamera();
  });

  describe('createEnhancedEffects', () => {
    it('returns an object with shatterTile, dissolveTile, and destroy', () => {
      const manager = createEnhancedEffects(app, camera, 50);
      expect(manager).toHaveProperty('shatterTile');
      expect(manager).toHaveProperty('dissolveTile');
      expect(manager).toHaveProperty('destroy');
    });
  });

  describe('shatterTile', () => {
    it('creates a ShatterEffect and calls Explode', () => {
      const manager = createEnhancedEffects(app, camera, 50);
      manager.shatterTile(100, 200, 'bomb');

      expect(mockExplode).toHaveBeenCalledTimes(1);
      expect(camera.addChild).toHaveBeenCalled();
    });

    it('uses bomb config for unknown tile types (fallback)', () => {
      const manager = createEnhancedEffects(app, camera, 50);
      manager.shatterTile(100, 200, 'unknown_type');

      // Should still create a ShatterEffect (falls back to BOMB_SHATTER)
      expect(mockExplode).toHaveBeenCalledTimes(1);
    });

    it('does nothing after destroy is called', () => {
      const manager = createEnhancedEffects(app, camera, 50);
      manager.destroy();
      manager.shatterTile(100, 200, 'bomb');

      // mockExplode is not called because destroyed flag short-circuits
      expect(mockExplode).not.toHaveBeenCalled();
    });
  });

  describe('dissolveTile', () => {
    it('creates a DissolveEffect and calls dissolve', () => {
      const manager = createEnhancedEffects(app, camera, 50);
      manager.dissolveTile(100, 200, 'ice');

      expect(mockDissolve).toHaveBeenCalledTimes(1);
      expect(camera.addChild).toHaveBeenCalled();
    });

    it('uses frozen config for frozen tile type', () => {
      const manager = createEnhancedEffects(app, camera, 50);
      manager.dissolveTile(100, 200, 'frozen');

      expect(mockDissolve).toHaveBeenCalledTimes(1);
    });

    it('does nothing after destroy is called', () => {
      const manager = createEnhancedEffects(app, camera, 50);
      manager.destroy();
      manager.dissolveTile(100, 200, 'ice');

      expect(mockDissolve).not.toHaveBeenCalled();
    });
  });

  describe('crystallizeTile', () => {
    it('creates a CrystallizeEffect and calls play', () => {
      const manager = createEnhancedEffects(app, camera, 50);
      manager.crystallizeTile(100, 200, 'diamond');

      expect(mockPlay).toHaveBeenCalledTimes(1);
      expect(camera.addChild).toHaveBeenCalled();
    });

    it('does nothing after destroy is called', () => {
      const manager = createEnhancedEffects(app, camera, 50);
      manager.destroy();
      manager.crystallizeTile(100, 200, 'diamond');

      expect(mockPlay).not.toHaveBeenCalled();
    });
  });

  describe('meltTile', () => {
    it('creates a MeltEffect and calls melt', () => {
      const manager = createEnhancedEffects(app, camera, 50);
      manager.meltTile(100, 200, 'gold');

      expect(mockMelt).toHaveBeenCalledTimes(1);
      expect(camera.addChild).toHaveBeenCalled();
    });

    it('does nothing after destroy is called', () => {
      const manager = createEnhancedEffects(app, camera, 50);
      manager.destroy();
      manager.meltTile(100, 200, 'gold');

      expect(mockMelt).not.toHaveBeenCalled();
    });
  });

  describe('glitchTile', () => {
    it('creates a GlitchEffect and calls glitch', () => {
      const manager = createEnhancedEffects(app, camera, 50);
      manager.glitchTile(100, 200, 'virus');

      expect(mockGlitch).toHaveBeenCalledTimes(1);
      expect(camera.addChild).toHaveBeenCalled();
    });

    it('does nothing after destroy is called', () => {
      const manager = createEnhancedEffects(app, camera, 50);
      manager.destroy();
      manager.glitchTile(100, 200, 'virus');

      expect(mockGlitch).not.toHaveBeenCalled();
    });
  });

  describe('prismRefractTile', () => {
    it('creates a PrismRefractionEffect and calls play', () => {
      const manager = createEnhancedEffects(app, camera, 50);
      manager.prismRefractTile(100, 200, 'prism');

      expect(mockPlay).toHaveBeenCalledTimes(1);
      expect(camera.addChild).toHaveBeenCalled();
    });

    it('does nothing after destroy is called', () => {
      const manager = createEnhancedEffects(app, camera, 50);
      manager.destroy();
      manager.prismRefractTile(100, 200, 'prism');

      expect(mockPlay).not.toHaveBeenCalled();
    });
  });

  describe('erodeTile', () => {
    it('creates a GranularErosionEffect and calls play', () => {
      const manager = createEnhancedEffects(app, camera, 50);
      manager.erodeTile(100, 200, 'countdown');

      expect(mockPlay).toHaveBeenCalledTimes(1);
      expect(camera.addChild).toHaveBeenCalled();
    });

    it('does nothing after destroy is called', () => {
      const manager = createEnhancedEffects(app, camera, 50);
      manager.destroy();
      manager.erodeTile(100, 200, 'countdown');

      expect(mockPlay).not.toHaveBeenCalled();
    });
  });

  describe('pixelSortTile', () => {
    it('creates a PixelSortEffect and calls pixelSort', () => {
      const manager = createEnhancedEffects(app, camera, 50);
      manager.pixelSortTile(100, 200, 'lightning');

      expect(mockPixelSort).toHaveBeenCalledTimes(1);
      expect(camera.addChild).toHaveBeenCalled();
    });

    it('does nothing after destroy is called', () => {
      const manager = createEnhancedEffects(app, camera, 50);
      manager.destroy();
      manager.pixelSortTile(100, 200, 'lightning');

      expect(mockPixelSort).not.toHaveBeenCalled();
    });
  });

  describe('slitScanTile', () => {
    it('creates a SlitScanEffect and calls play', () => {
      const manager = createEnhancedEffects(app, camera, 50);
      manager.slitScanTile(100, 200, 'portal');

      expect(mockSlitScanPlay).toHaveBeenCalledTimes(1);
      expect(camera.addChild).toHaveBeenCalled();
    });

    it('does nothing after destroy is called', () => {
      const manager = createEnhancedEffects(app, camera, 50);
      manager.destroy();
      manager.slitScanTile(100, 200, 'portal');

      expect(mockSlitScanPlay).not.toHaveBeenCalled();
    });
  });

  describe('mercuryTile', () => {
    it('creates a LiquidMercuryEffect and calls play', () => {
      const manager = createEnhancedEffects(app, camera, 50);
      manager.mercuryTile(100, 200, 'catalyst');

      expect(mockMercuryPlay).toHaveBeenCalledTimes(1);
      expect(camera.addChild).toHaveBeenCalled();
    });

    it('does nothing after destroy is called', () => {
      const manager = createEnhancedEffects(app, camera, 50);
      manager.destroy();
      manager.mercuryTile(100, 200, 'catalyst');

      expect(mockMercuryPlay).not.toHaveBeenCalled();
    });
  });

  describe('assembleTile', () => {
    it('creates a MagneticAssemblyEffect and calls assemble', () => {
      const manager = createEnhancedEffects(app, camera, 50);
      manager.assembleTile(100, 200, 'rainbow');

      expect(mockAssemble).toHaveBeenCalledTimes(1);
      expect(camera.addChild).toHaveBeenCalled();
    });

    it('does nothing after destroy is called', () => {
      const manager = createEnhancedEffects(app, camera, 50);
      manager.destroy();
      manager.assembleTile(100, 200, 'rainbow');

      expect(mockAssemble).not.toHaveBeenCalled();
    });
  });

  describe('mirrorCrystallizeTile', () => {
    it('creates a CrystallizeEffect and calls play for mirror', () => {
      const manager = createEnhancedEffects(app, camera, 50);
      manager.mirrorCrystallizeTile(100, 200, 'mirror');

      expect(mockPlay).toHaveBeenCalledTimes(1);
      expect(camera.addChild).toHaveBeenCalled();
    });

    it('does nothing after destroy is called', () => {
      const manager = createEnhancedEffects(app, camera, 50);
      manager.destroy();
      manager.mirrorCrystallizeTile(100, 200, 'mirror');

      expect(mockPlay).not.toHaveBeenCalled();
    });
  });

  describe('silverShatterTile', () => {
    it('creates a ShatterEffect and calls Explode for silver', () => {
      const manager = createEnhancedEffects(app, camera, 50);
      manager.silverShatterTile(100, 200, 'silver');

      expect(mockExplode).toHaveBeenCalledTimes(1);
      expect(camera.addChild).toHaveBeenCalled();
    });

    it('does nothing after destroy is called', () => {
      const manager = createEnhancedEffects(app, camera, 50);
      manager.destroy();
      manager.silverShatterTile(100, 200, 'silver');

      expect(mockExplode).not.toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('cleans up all active effects', async () => {
      // Make Explode/dissolve hang (never resolve) so effects stay active
      const neverResolve = new Promise<void>(() => {});
      mockExplode.mockReturnValue(neverResolve);
      mockDissolve.mockReturnValue(neverResolve);

      const manager = createEnhancedEffects(app, camera, 50);
      manager.shatterTile(50, 50, 'bomb');
      manager.dissolveTile(80, 80, 'ice');

      // Both effects are active — destroy should clean them
      manager.destroy();

      // The effect containers themselves get destroy() called
      // (ShatterEffect and DissolveEffect mock instances)
      expect(mockShatterDestroy).toHaveBeenCalled();
      expect(mockDissolveDestroy).toHaveBeenCalled();
    });

    it('is idempotent — calling destroy twice does not throw', () => {
      const manager = createEnhancedEffects(app, camera, 50);
      manager.shatterTile(50, 50, 'gem');
      manager.destroy();
      expect(() => manager.destroy()).not.toThrow();
    });
  });
});
