/**
 * BlastParticleManager enhanced effects — spectacular tile clear visuals.
 *
 * Tests enhanced methods added to BlastParticleManager:
 * - playBombShockwave: expanding ring + debris + screen flash
 * - playLightningBolt: jagged bolt + crackle particles + slow-mo
 * - playPrismBeams: rainbow beams + prismatic ripple
 * - playGemPop: scale pop + sparkle shower + gem fly-to-score
 * - playIceShards: angular shards + frost drift + crack visual
 * - playMagnetFieldPull: concentric pulse rings + trail particles + clunk scale
 * - playGoldMidasWave: golden wave ring + gold tint overlay + sparkle upward
 *
 * All effects MUST:
 * - Skip entirely when reduceMotion is true
 * - Use minimal version (fewer particles, no screen effects) when isLowEnd
 * - Create Graphics objects for shockwaves/beams via scene.make.graphics
 * - Create particles via scene.add.particles
 *
 * RED phase: tests written before implementation.
 */

import Phaser from 'phaser';
import { BlastParticleManager } from '../BlastParticleManager';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeScene(): Phaser.Scene {
  return new Phaser.Scene();
}

/** Scene with textures.exists returning true (skips texture-generation Graphics calls). */
function makeSceneWithTextures(): Phaser.Scene {
  const scene = new Phaser.Scene();
  (scene.textures.exists as jest.Mock).mockReturnValue(true);
  return scene;
}

const defaultConfig = { reduceMotion: false, isLowEnd: false };
const reduceMotionConfig = { reduceMotion: true, isLowEnd: false };
const lowEndConfig = { reduceMotion: false, isLowEnd: true };

// ─── Bomb Shockwave ──────────────────────────────────────────────────────────

describe('BlastParticleManager.playBombShockwave', () => {
  it('creates a shockwave ring via scene.make.graphics', () => {
    const scene = makeScene();
    const manager = new BlastParticleManager();
    manager.playBombShockwave(scene, 100, 200, defaultConfig);
    expect(scene.make.graphics).toHaveBeenCalled();
  });

  it('creates debris particles via scene.add.particles', () => {
    const scene = makeScene();
    const manager = new BlastParticleManager();
    manager.playBombShockwave(scene, 100, 200, defaultConfig);
    expect(scene.add.particles).toHaveBeenCalled();
  });

  it('adds shockwave graphic to scene via scene.add.existing', () => {
    const scene = makeScene();
    const manager = new BlastParticleManager();
    manager.playBombShockwave(scene, 100, 200, defaultConfig);
    expect(scene.add.existing).toHaveBeenCalled();
  });

  it('animates shockwave ring with a tween (scale + alpha)', () => {
    const scene = makeScene();
    const manager = new BlastParticleManager();
    manager.playBombShockwave(scene, 100, 200, defaultConfig);
    expect(scene.tweens.add).toHaveBeenCalled();
  });

  it('skips entirely when reduceMotion is true', () => {
    const scene = makeScene();
    const manager = new BlastParticleManager();
    manager.playBombShockwave(scene, 100, 200, reduceMotionConfig);
    expect(scene.make.graphics).not.toHaveBeenCalled();
    expect(scene.add.particles).not.toHaveBeenCalled();
  });

  it('creates fewer debris particles when isLowEnd', () => {
    const scene = makeScene();
    const manager = new BlastParticleManager();
    manager.playBombShockwave(scene, 100, 200, lowEndConfig);
    // Should still create particles, just fewer
    expect(scene.add.particles).toHaveBeenCalled();
  });

  it('skips shockwave graphics when isLowEnd (particles only)', () => {
    const scene = makeSceneWithTextures();
    const manager = new BlastParticleManager();
    manager.playBombShockwave(scene, 100, 200, lowEndConfig);
    // Low-end: skip Graphics-based shockwave ring to save draw calls
    expect(scene.make.graphics).not.toHaveBeenCalled();
  });
});

// ─── Lightning Bolt ──────────────────────────────────────────────────────────

describe('BlastParticleManager.playLightningBolt', () => {
  it('draws a bolt using scene.make.graphics', () => {
    const scene = makeScene();
    const manager = new BlastParticleManager();
    manager.playLightningBolt(scene, 150, 100, 600, defaultConfig);
    expect(scene.make.graphics).toHaveBeenCalled();
  });

  it('creates crackle particles along the bolt', () => {
    const scene = makeScene();
    const manager = new BlastParticleManager();
    manager.playLightningBolt(scene, 150, 100, 600, defaultConfig);
    expect(scene.add.particles).toHaveBeenCalled();
  });

  it('adds bolt graphic to scene', () => {
    const scene = makeScene();
    const manager = new BlastParticleManager();
    manager.playLightningBolt(scene, 150, 100, 600, defaultConfig);
    expect(scene.add.existing).toHaveBeenCalled();
  });

  it('animates bolt with tween (alpha fade)', () => {
    const scene = makeScene();
    const manager = new BlastParticleManager();
    manager.playLightningBolt(scene, 150, 100, 600, defaultConfig);
    expect(scene.tweens.add).toHaveBeenCalled();
  });

  it('skips entirely when reduceMotion is true', () => {
    const scene = makeScene();
    const manager = new BlastParticleManager();
    manager.playLightningBolt(scene, 150, 100, 600, reduceMotionConfig);
    expect(scene.make.graphics).not.toHaveBeenCalled();
    expect(scene.add.particles).not.toHaveBeenCalled();
  });

  it('skips bolt graphic when isLowEnd (particles only)', () => {
    const scene = makeSceneWithTextures();
    const manager = new BlastParticleManager();
    manager.playLightningBolt(scene, 150, 100, 600, lowEndConfig);
    expect(scene.make.graphics).not.toHaveBeenCalled();
    expect(scene.add.particles).toHaveBeenCalled();
  });
});

// ─── Prism Beams ─────────────────────────────────────────────────────────────

describe('BlastParticleManager.playPrismBeams', () => {
  it('creates beam graphics via scene.make.graphics', () => {
    const scene = makeScene();
    const manager = new BlastParticleManager();
    manager.playPrismBeams(scene, 200, 200, 400, 600, defaultConfig);
    expect(scene.make.graphics).toHaveBeenCalled();
  });

  it('creates rainbow particles along beam paths', () => {
    const scene = makeScene();
    const manager = new BlastParticleManager();
    manager.playPrismBeams(scene, 200, 200, 400, 600, defaultConfig);
    expect(scene.add.particles).toHaveBeenCalled();
  });

  it('animates beams with tween (expand + fade)', () => {
    const scene = makeScene();
    const manager = new BlastParticleManager();
    manager.playPrismBeams(scene, 200, 200, 400, 600, defaultConfig);
    expect(scene.tweens.add).toHaveBeenCalled();
  });

  it('skips entirely when reduceMotion is true', () => {
    const scene = makeScene();
    const manager = new BlastParticleManager();
    manager.playPrismBeams(scene, 200, 200, 400, 600, reduceMotionConfig);
    expect(scene.make.graphics).not.toHaveBeenCalled();
    expect(scene.add.particles).not.toHaveBeenCalled();
  });

  it('skips beam graphics when isLowEnd (particles only)', () => {
    const scene = makeSceneWithTextures();
    const manager = new BlastParticleManager();
    manager.playPrismBeams(scene, 200, 200, 400, 600, lowEndConfig);
    expect(scene.make.graphics).not.toHaveBeenCalled();
    expect(scene.add.particles).toHaveBeenCalled();
  });
});

// ─── Gem Pop ─────────────────────────────────────────────────────────────────

describe('BlastParticleManager.playGemPop', () => {
  it('creates sparkle shower particles', () => {
    const scene = makeScene();
    const manager = new BlastParticleManager();
    manager.playGemPop(scene, 100, 100, defaultConfig);
    expect(scene.add.particles).toHaveBeenCalled();
  });

  it('creates a gem fly-to-score graphic via scene.make.graphics', () => {
    const scene = makeScene();
    const manager = new BlastParticleManager();
    manager.playGemPop(scene, 100, 100, defaultConfig);
    expect(scene.make.graphics).toHaveBeenCalled();
  });

  it('animates gem flying toward top of screen with tween', () => {
    const scene = makeScene();
    const manager = new BlastParticleManager();
    manager.playGemPop(scene, 100, 100, defaultConfig);
    expect(scene.tweens.add).toHaveBeenCalled();
  });

  it('skips entirely when reduceMotion is true', () => {
    const scene = makeScene();
    const manager = new BlastParticleManager();
    manager.playGemPop(scene, 100, 100, reduceMotionConfig);
    expect(scene.make.graphics).not.toHaveBeenCalled();
    expect(scene.add.particles).not.toHaveBeenCalled();
  });

  it('skips gem fly graphic when isLowEnd (particles only)', () => {
    const scene = makeSceneWithTextures();
    const manager = new BlastParticleManager();
    manager.playGemPop(scene, 100, 100, lowEndConfig);
    expect(scene.make.graphics).not.toHaveBeenCalled();
    expect(scene.add.particles).toHaveBeenCalled();
  });
});

// ─── Ice Shards ──────────────────────────────────────────────────────────────

describe('BlastParticleManager.playIceShards', () => {
  it('creates shard particles flying outward', () => {
    const scene = makeScene();
    const manager = new BlastParticleManager();
    manager.playIceShards(scene, 100, 100, 'ice', defaultConfig);
    expect(scene.add.particles).toHaveBeenCalled();
  });

  it('creates frost drift particles drifting upward', () => {
    const scene = makeScene();
    const manager = new BlastParticleManager();
    manager.playIceShards(scene, 100, 100, 'ice', defaultConfig);
    // Should call add.particles at least twice (shards + frost)
    expect(scene.add.particles).toHaveBeenCalledTimes(2);
  });

  it('creates crack overlay graphic before shatter', () => {
    const scene = makeScene();
    const manager = new BlastParticleManager();
    manager.playIceShards(scene, 100, 100, 'ice', defaultConfig);
    expect(scene.make.graphics).toHaveBeenCalled();
  });

  it('skips entirely when reduceMotion is true', () => {
    const scene = makeScene();
    const manager = new BlastParticleManager();
    manager.playIceShards(scene, 100, 100, 'ice', reduceMotionConfig);
    expect(scene.add.particles).not.toHaveBeenCalled();
    expect(scene.make.graphics).not.toHaveBeenCalled();
  });

  it('uses deeper blue for frozen variant', () => {
    const scene = makeScene();
    const manager = new BlastParticleManager();
    manager.playIceShards(scene, 100, 100, 'frozen', defaultConfig);
    // Should still create effects (just different colors)
    expect(scene.add.particles).toHaveBeenCalled();
  });

  it('skips crack graphic when isLowEnd (particles only)', () => {
    const scene = makeSceneWithTextures();
    const manager = new BlastParticleManager();
    manager.playIceShards(scene, 100, 100, 'ice', lowEndConfig);
    expect(scene.make.graphics).not.toHaveBeenCalled();
    expect(scene.add.particles).toHaveBeenCalled();
  });
});

// ─── Magnet Field Pull ───────────────────────────────────────────────────────

describe('BlastParticleManager.playMagnetFieldPull', () => {
  const targets = [{ x: 50, y: 50 }, { x: 150, y: 150 }];

  it('creates concentric pulse ring graphics', () => {
    const scene = makeScene();
    const manager = new BlastParticleManager();
    manager.playMagnetFieldPull(scene, 100, 100, targets, defaultConfig);
    expect(scene.make.graphics).toHaveBeenCalled();
  });

  it('creates trail particles for attracted tiles', () => {
    const scene = makeScene();
    const manager = new BlastParticleManager();
    manager.playMagnetFieldPull(scene, 100, 100, targets, defaultConfig);
    expect(scene.add.particles).toHaveBeenCalled();
  });

  it('animates pulse rings with tweens', () => {
    const scene = makeScene();
    const manager = new BlastParticleManager();
    manager.playMagnetFieldPull(scene, 100, 100, targets, defaultConfig);
    expect(scene.tweens.add).toHaveBeenCalled();
  });

  it('skips entirely when reduceMotion is true', () => {
    const scene = makeScene();
    const manager = new BlastParticleManager();
    manager.playMagnetFieldPull(scene, 100, 100, targets, reduceMotionConfig);
    expect(scene.make.graphics).not.toHaveBeenCalled();
    expect(scene.add.particles).not.toHaveBeenCalled();
  });

  it('skips ring graphics when isLowEnd (particles only)', () => {
    const scene = makeSceneWithTextures();
    const manager = new BlastParticleManager();
    manager.playMagnetFieldPull(scene, 100, 100, targets, lowEndConfig);
    expect(scene.make.graphics).not.toHaveBeenCalled();
    expect(scene.add.particles).toHaveBeenCalled();
  });
});

// ─── Gold Midas Wave ─────────────────────────────────────────────────────────

describe('BlastParticleManager.playGoldMidasWave', () => {
  it('creates golden wave ring via scene.make.graphics', () => {
    const scene = makeScene();
    const manager = new BlastParticleManager();
    manager.playGoldMidasWave(scene, 200, 200, defaultConfig);
    expect(scene.make.graphics).toHaveBeenCalled();
  });

  it('creates gold sparkle particles floating upward', () => {
    const scene = makeScene();
    const manager = new BlastParticleManager();
    manager.playGoldMidasWave(scene, 200, 200, defaultConfig);
    expect(scene.add.particles).toHaveBeenCalled();
  });

  it('animates wave ring expanding + fading with tween', () => {
    const scene = makeScene();
    const manager = new BlastParticleManager();
    manager.playGoldMidasWave(scene, 200, 200, defaultConfig);
    expect(scene.tweens.add).toHaveBeenCalled();
  });

  it('adds wave ring to scene via scene.add.existing', () => {
    const scene = makeScene();
    const manager = new BlastParticleManager();
    manager.playGoldMidasWave(scene, 200, 200, defaultConfig);
    expect(scene.add.existing).toHaveBeenCalled();
  });

  it('skips entirely when reduceMotion is true', () => {
    const scene = makeScene();
    const manager = new BlastParticleManager();
    manager.playGoldMidasWave(scene, 200, 200, reduceMotionConfig);
    expect(scene.make.graphics).not.toHaveBeenCalled();
    expect(scene.add.particles).not.toHaveBeenCalled();
  });

  it('skips wave ring when isLowEnd (particles only)', () => {
    const scene = makeSceneWithTextures();
    const manager = new BlastParticleManager();
    manager.playGoldMidasWave(scene, 200, 200, lowEndConfig);
    expect(scene.make.graphics).not.toHaveBeenCalled();
    expect(scene.add.particles).toHaveBeenCalled();
  });
});
