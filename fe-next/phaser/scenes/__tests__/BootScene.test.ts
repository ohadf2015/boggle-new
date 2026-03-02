/**
 * BootScene — dynamic scene key resolution.
 *
 * Verifies:
 * - Starts GameScene when it is registered alongside BootScene
 * - Starts BlastScene when it is the only non-Boot scene
 * - Falls back to 'GameScene' when no other scene is registered
 */

import { BootScene } from '../BootScene';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createBootScene(sceneKeys: string[]): BootScene {
  const scene = new BootScene();

  // Build a fake scene manager keys map
  const keys: Record<string, unknown> = {};
  for (const k of sceneKeys) {
    keys[k] = {}; // value doesn't matter — only keys are inspected
  }

  // Patch the scene.scene.manager.keys and scene.scene.start
  (scene as unknown as { scene: Record<string, unknown> }).scene = {
    manager: { keys },
    start: jest.fn(),
  };

  // Patch make.graphics for preload()
  const fakeGraphics = {
    fillStyle: jest.fn(),
    fillRect: jest.fn(),
    generateTexture: jest.fn(),
    destroy: jest.fn(),
  };
  (scene as unknown as { make: Record<string, unknown> }).make = {
    graphics: jest.fn(() => fakeGraphics),
  };

  return scene;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('BootScene.create — dynamic scene resolution', () => {
  it('starts GameScene when registered alongside BootScene', () => {
    const scene = createBootScene(['BootScene', 'GameScene']);
    scene.create();

    expect(
      (scene as unknown as { scene: { start: jest.Mock } }).scene.start
    ).toHaveBeenCalledWith('GameScene');
  });

  it('starts BlastScene when it is the only non-Boot scene', () => {
    const scene = createBootScene(['BootScene', 'BlastScene']);
    scene.create();

    expect(
      (scene as unknown as { scene: { start: jest.Mock } }).scene.start
    ).toHaveBeenCalledWith('BlastScene');
  });

  it('falls back to GameScene when no other scene is registered', () => {
    const scene = createBootScene(['BootScene']);
    scene.create();

    expect(
      (scene as unknown as { scene: { start: jest.Mock } }).scene.start
    ).toHaveBeenCalledWith('GameScene');
  });
});
