/**
 * BlastScene living background — ambient particles, gradient, vignette, reactive pulses.
 *
 * Tests that background atmosphere elements are created and cleaned up correctly.
 */

import { GameBridge } from '@/lib/phaser/bridge/GameBridge';
import { BlastScene } from '../BlastScene';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createScene(a11yOverrides?: Partial<{ reduceMotion: boolean; isLowEnd: boolean }>): BlastScene {
  const scene = new BlastScene();
  (scene.game.canvas as unknown as Record<string, unknown>).addEventListener = jest.fn();

  // Apply a11y overrides before create() so background creation respects them
  if (a11yOverrides) {
    const a11y = (scene as unknown as { a11y: Record<string, unknown> }).a11y;
    Object.assign(a11y, a11yOverrides);
  }

  scene.create();
  return scene;
}

// ─── Part A: Background Gradient ────────────────────────────────────────────

describe('BlastScene background gradient', () => {
  afterEach(() => GameBridge.reset());

  it('creates a background gradient graphics object', () => {
    const scene = createScene();
    const bg = (scene as unknown as { backgroundGradient: unknown }).backgroundGradient;
    expect(bg).toBeDefined();
    expect(bg).not.toBeNull();
  });

  it('sets background gradient at depth -2', () => {
    const scene = createScene();
    const bg = (scene as unknown as { backgroundGradient: { setDepth: jest.Mock } }).backgroundGradient;
    if (bg) {
      expect(bg.setDepth).toHaveBeenCalledWith(-2);
    }
  });

  it('draws concentric circles for the radial gradient effect', () => {
    const scene = createScene();
    const bg = (scene as unknown as { backgroundGradient: { fillCircle: jest.Mock } }).backgroundGradient;
    if (bg) {
      // 8-10 concentric circles for gradient
      expect(bg.fillCircle.mock.calls.length).toBeGreaterThanOrEqual(6);
    }
  });
});

// ─── Part B: Ambient Particles ──────────────────────────────────────────────

describe('BlastScene ambient particles', () => {
  afterEach(() => GameBridge.reset());

  it('creates an ambient particle emitter', () => {
    const scene = createScene();
    // add.particles should be called for ambient particles
    expect(scene.add.particles).toHaveBeenCalled();
  });

  it('does not create ambient particles when reduceMotion is true', () => {
    const scene = createScene({ reduceMotion: true });
    // Ambient particles should be skipped (field stays null/undefined)
    const ambientEmitter = (scene as unknown as { ambientEmitter: unknown }).ambientEmitter;
    expect(ambientEmitter).toBeFalsy();
  });

  it('does not create ambient particles when isLowEnd is true', () => {
    const scene = createScene({ isLowEnd: true });
    const ambientEmitter = (scene as unknown as { ambientEmitter: unknown }).ambientEmitter;
    expect(ambientEmitter).toBeFalsy();
  });
});

// ─── Part C: Vignette ───────────────────────────────────────────────────────

describe('BlastScene vignette', () => {
  afterEach(() => GameBridge.reset());

  it('creates a vignette overlay', () => {
    const scene = createScene();
    const vignette = (scene as unknown as { vignetteOverlay: unknown }).vignetteOverlay;
    expect(vignette).toBeDefined();
    expect(vignette).not.toBeNull();
  });

  it('sets vignette at high depth (above tiles)', () => {
    const scene = createScene();
    const vignette = (scene as unknown as { vignetteOverlay: { setDepth: jest.Mock } }).vignetteOverlay;
    if (vignette) {
      expect(vignette.setDepth).toHaveBeenCalledWith(100);
    }
  });

  it('does not create vignette when reduceMotion is true', () => {
    const scene = createScene({ reduceMotion: true });
    const vignette = (scene as unknown as { vignetteOverlay: unknown }).vignetteOverlay;
    expect(vignette).toBeFalsy();
  });
});

// ─── Part D: updateBackgroundState ──────────────────────────────────────────

describe('BlastScene background reactive state', () => {
  afterEach(() => GameBridge.reset());

  it('exposes updateBackgroundState method', () => {
    const scene = createScene();
    expect(typeof (scene as unknown as { updateBackgroundState: unknown }).updateBackgroundState).toBe('function');
  });
});

// ─── Cleanup ────────────────────────────────────────────────────────────────

describe('BlastScene background cleanup', () => {
  afterEach(() => GameBridge.reset());

  it('cleans up background gradient on destroy', () => {
    const scene = createScene();
    const bg = (scene as unknown as { backgroundGradient: { destroy: jest.Mock } }).backgroundGradient;

    scene.destroy();

    if (bg) expect(bg.destroy).toHaveBeenCalled();
  });

  it('cleans up vignette on destroy', () => {
    const scene = createScene();
    const vignette = (scene as unknown as { vignetteOverlay: { destroy: jest.Mock } }).vignetteOverlay;

    scene.destroy();

    if (vignette) expect(vignette.destroy).toHaveBeenCalled();
  });

  it('nulls out background references after destroy', () => {
    const scene = createScene();
    scene.destroy();

    const bg = (scene as unknown as { backgroundGradient: unknown }).backgroundGradient;
    const vignette = (scene as unknown as { vignetteOverlay: unknown }).vignetteOverlay;
    expect(bg).toBeNull();
    expect(vignette).toBeNull();
  });
});
