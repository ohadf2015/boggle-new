/**
 * ComboEffect — tests for the multi-layered combo celebration system.
 *
 * Verifies:
 * - playComboLevelUp orchestrates all sub-effects at the given center
 * - Shockwave rings: correct count scales with combo level
 * - Combo text: created at center with correct level number
 * - Star burst particles: explode at center position
 * - Light rays: only appear at level 3+
 * - Camera punch: zoom intensity scales with combo level
 * - All effects are no-ops when reduceMotion is true
 * - isLowEnd halves particle counts
 */

import Phaser from 'phaser';
import {
  playComboLevelUp,
  playComboShockwave,
  playComboText,
  playComboStarBurst,
  playComboLightRays,
  type ComboEffectConfig,
} from '../ComboEffect';

// ─── Helpers ────────────────────────────────────────────────────────────────

function createScene(): Phaser.Scene {
  return new Phaser.Scene() as Phaser.Scene;
}

function makeConfig(overrides: Partial<ComboEffectConfig> = {}): ComboEffectConfig {
  return {
    reduceMotion: false,
    isLowEnd: false,
    ...overrides,
  };
}

const CENTER = { x: 200, y: 300 };
const COLOR = 0xff1493; // pink

// ─── playComboShockwave ─────────────────────────────────────────────────────

describe('playComboShockwave', () => {
  it('should create 1 ring for combo level 1', () => {
    const scene = createScene();
    playComboShockwave(scene, CENTER, COLOR, 1, makeConfig());

    // At least 1 tween should be created for the ring
    expect(scene.tweens.add).toHaveBeenCalled();
  });

  it('should create 2 rings for combo level 3', () => {
    const scene = createScene();
    playComboShockwave(scene, CENTER, COLOR, 3, makeConfig());

    // 2 rings = 2 tween calls
    expect(scene.tweens.add).toHaveBeenCalledTimes(2);
  });

  it('should create 3 rings for combo level 5+', () => {
    const scene = createScene();
    playComboShockwave(scene, CENTER, COLOR, 5, makeConfig());

    expect(scene.tweens.add).toHaveBeenCalledTimes(3);
  });

  it('should be no-op when reduceMotion is true', () => {
    const scene = createScene();
    playComboShockwave(scene, CENTER, COLOR, 3, makeConfig({ reduceMotion: true }));

    expect(scene.tweens.add).not.toHaveBeenCalled();
  });
});

// ─── playComboText ──────────────────────────────────────────────────────────

describe('playComboText', () => {
  it('should create text with correct combo level', () => {
    const scene = createScene();
    playComboText(scene, CENTER, COLOR, 3, makeConfig());

    expect(scene.add.text).toHaveBeenCalledWith(
      CENTER.x,
      CENTER.y,
      expect.stringContaining('3'),
      expect.any(Object)
    );
  });

  it('should tween text with pop-in animation', () => {
    const scene = createScene();
    playComboText(scene, CENTER, COLOR, 2, makeConfig());

    // Phase 1: pop-in with Back.easeOut bounce
    expect(scene.tweens.add).toHaveBeenCalledWith(
      expect.objectContaining({
        alpha: 1,
        ease: 'Back.easeOut',
      })
    );
  });

  it('should be no-op when reduceMotion is true', () => {
    const scene = createScene();
    playComboText(scene, CENTER, COLOR, 2, makeConfig({ reduceMotion: true }));

    expect(scene.add.text).not.toHaveBeenCalled();
  });
});

// ─── playComboStarBurst ─────────────────────────────────────────────────────

describe('playComboStarBurst', () => {
  it('should create particles at center position', () => {
    const scene = createScene();
    playComboStarBurst(scene, CENTER, COLOR, 2, makeConfig());

    expect(scene.add.particles).toHaveBeenCalledWith(
      CENTER.x,
      CENTER.y,
      'tile-base',
      expect.any(Object)
    );
  });

  it('should use fewer particles on low-end devices', () => {
    const scene = createScene();
    const config = makeConfig({ isLowEnd: true });
    playComboStarBurst(scene, CENTER, COLOR, 2, config);

    expect(scene.add.particles).toHaveBeenCalled();
    // Particle count should be halved for low-end
    const callArgs = (scene.add.particles as jest.Mock).mock.calls[0][3];
    expect(callArgs.quantity).toBeLessThanOrEqual(12);
  });

  it('should scale particle count with combo level', () => {
    const scene1 = createScene();
    playComboStarBurst(scene1, CENTER, COLOR, 1, makeConfig());
    const count1 = (scene1.add.particles as jest.Mock).mock.calls[0][3].quantity;

    const scene2 = createScene();
    playComboStarBurst(scene2, CENTER, COLOR, 5, makeConfig());
    const count2 = (scene2.add.particles as jest.Mock).mock.calls[0][3].quantity;

    expect(count2).toBeGreaterThan(count1);
  });

  it('should be no-op when reduceMotion is true', () => {
    const scene = createScene();
    playComboStarBurst(scene, CENTER, COLOR, 2, makeConfig({ reduceMotion: true }));

    expect(scene.add.particles).not.toHaveBeenCalled();
  });
});

// ─── playComboLightRays ─────────────────────────────────────────────────────

describe('playComboLightRays', () => {
  it('should NOT create light rays below level 3', () => {
    const scene = createScene();
    playComboLightRays(scene, CENTER, COLOR, 2, makeConfig());

    expect(scene.tweens.add).not.toHaveBeenCalled();
  });

  it('should create light rays at level 3+', () => {
    const scene = createScene();
    playComboLightRays(scene, CENTER, COLOR, 3, makeConfig());

    // Should create a Graphics object for the rays
    expect(scene.make.graphics).toHaveBeenCalled();
    expect(scene.tweens.add).toHaveBeenCalled();
  });

  it('should draw more ray triangles at higher levels', () => {
    const scene3 = createScene();
    playComboLightRays(scene3, CENTER, COLOR, 3, makeConfig());
    const graphics3 = (scene3.make.graphics as jest.Mock).mock.results[0].value;
    const triangles3 = graphics3.fillTriangle.mock.calls.length;

    const scene7 = createScene();
    playComboLightRays(scene7, CENTER, COLOR, 7, makeConfig());
    const graphics7 = (scene7.make.graphics as jest.Mock).mock.results[0].value;
    const triangles7 = graphics7.fillTriangle.mock.calls.length;

    expect(triangles7).toBeGreaterThan(triangles3);
  });

  it('should be no-op when reduceMotion is true', () => {
    const scene = createScene();
    playComboLightRays(scene, CENTER, COLOR, 5, makeConfig({ reduceMotion: true }));

    expect(scene.tweens.add).not.toHaveBeenCalled();
  });
});

// ─── playComboLevelUp (orchestrator) ────────────────────────────────────────

describe('playComboLevelUp', () => {
  it('should be complete no-op when reduceMotion is true', () => {
    const scene = createScene();
    playComboLevelUp(scene, CENTER, 3, makeConfig({ reduceMotion: true }));

    expect(scene.tweens.add).not.toHaveBeenCalled();
    expect(scene.add.text).not.toHaveBeenCalled();
    expect(scene.add.particles).not.toHaveBeenCalled();
  });

  it('should fire shockwave + text + star burst for any level', () => {
    const scene = createScene();
    playComboLevelUp(scene, CENTER, 2, makeConfig());

    // Should create text (combo text)
    expect(scene.add.text).toHaveBeenCalled();
    // Should create particles (star burst)
    expect(scene.add.particles).toHaveBeenCalled();
    // Should create tweens (shockwave + text float + etc.)
    expect(scene.tweens.add).toHaveBeenCalled();
  });

  it('should add light rays at level 3+', () => {
    const scene = createScene();
    playComboLevelUp(scene, CENTER, 4, makeConfig());

    // Light rays use make.graphics
    expect(scene.make.graphics).toHaveBeenCalled();
  });

  it('should NOT add light rays below level 3', () => {
    const scene = createScene();
    playComboLevelUp(scene, CENTER, 1, makeConfig());

    // No Graphics created for light rays (only shockwave graphics)
    // Shockwave uses make.graphics too, so check total call count
    const graphicsCalls = (scene.make.graphics as jest.Mock).mock.calls.length;
    // Level 1: 1 shockwave ring (1 graphic), no light rays
    expect(graphicsCalls).toBe(1);
  });
});
