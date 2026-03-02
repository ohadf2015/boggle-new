/**
 * GameScene — fire round ambient integration tests.
 *
 * Verifies:
 * - grid:update with fireRoundActive: true calls startFireRoundAmbient once
 * - grid:update with fireRoundActive: false after true calls stopFireRoundAmbient
 * - Multiple updates with fireRoundActive: true don't create duplicate ambients
 * - scene:destroy cleans up fire round handle
 */

import { GameBridge } from '@/lib/phaser/bridge/GameBridge';
import { GameScene } from '../GameScene';
import { ComboRing } from '../../objects/ComboRing';

// Silence ComboRing
jest.spyOn(ComboRing.prototype, 'play').mockImplementation(() => {});

// Mock FireRoundEffect
const startFireRoundAmbientSpy = jest.fn().mockReturnValue({
  emitter: { destroy: jest.fn() },
  vignette: { destroy: jest.fn() },
});
const stopFireRoundAmbientSpy = jest.fn();
jest.mock('../../effects/FireRoundEffect', () => ({
  startFireRoundAmbient: (...args: unknown[]) => startFireRoundAmbientSpy(...args),
  stopFireRoundAmbient: (...args: unknown[]) => stopFireRoundAmbientSpy(...args),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GRID_4x4: string[][] = [
  ['A', 'B', 'C', 'D'],
  ['E', 'F', 'G', 'H'],
  ['I', 'J', 'K', 'L'],
  ['M', 'N', 'O', 'P'],
];

function createScene(): GameScene {
  const scene = new GameScene();
  (scene.game.canvas as unknown as Record<string, unknown>).addEventListener = jest.fn();
  scene.create();
  return scene;
}

beforeEach(() => {
  GameBridge.reset();
  startFireRoundAmbientSpy.mockClear();
  startFireRoundAmbientSpy.mockReturnValue({
    emitter: { destroy: jest.fn() },
    vignette: { destroy: jest.fn() },
  });
  stopFireRoundAmbientSpy.mockClear();
});

afterEach(() => {
  GameBridge.reset();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GameScene fire round ambient', () => {
  it('should call startFireRoundAmbient when fireRoundActive transitions to true', () => {
    const scene = createScene();

    // First update: fire round not active
    GameBridge.emit('grid:update', { grid: GRID_4x4, comboLevel: 0, fireRoundActive: false });
    expect(startFireRoundAmbientSpy).not.toHaveBeenCalled();

    // Second update: fire round active
    GameBridge.emit('grid:update', { grid: GRID_4x4, comboLevel: 0, fireRoundActive: true });
    expect(startFireRoundAmbientSpy).toHaveBeenCalledTimes(1);

    void scene;
  });

  it('should call stopFireRoundAmbient when fireRoundActive transitions to false', () => {
    const scene = createScene();

    // Start fire round
    GameBridge.emit('grid:update', { grid: GRID_4x4, comboLevel: 0, fireRoundActive: true });

    // Stop fire round
    GameBridge.emit('grid:update', { grid: GRID_4x4, comboLevel: 0, fireRoundActive: false });

    expect(stopFireRoundAmbientSpy).toHaveBeenCalledTimes(1);
    void scene;
  });

  it('should not create duplicate ambients on repeated fireRoundActive: true', () => {
    const scene = createScene();

    GameBridge.emit('grid:update', { grid: GRID_4x4, comboLevel: 0, fireRoundActive: true });
    GameBridge.emit('grid:update', { grid: GRID_4x4, comboLevel: 0, fireRoundActive: true });
    GameBridge.emit('grid:update', { grid: GRID_4x4, comboLevel: 0, fireRoundActive: true });

    expect(startFireRoundAmbientSpy).toHaveBeenCalledTimes(1);
    void scene;
  });

  it('should clean up fire round handle on scene:destroy', () => {
    const scene = createScene();

    // Start fire round
    GameBridge.emit('grid:update', { grid: GRID_4x4, comboLevel: 0, fireRoundActive: true });

    // Destroy scene
    GameBridge.emit('scene:destroy', undefined);

    expect(stopFireRoundAmbientSpy).toHaveBeenCalledTimes(1);
    void scene;
  });

  it('should not call stopFireRoundAmbient on destroy when fire round was never started', () => {
    const scene = createScene();

    GameBridge.emit('grid:update', { grid: GRID_4x4, comboLevel: 0, fireRoundActive: false });

    // Destroy scene without ever starting fire round
    GameBridge.emit('scene:destroy', undefined);

    expect(stopFireRoundAmbientSpy).not.toHaveBeenCalled();
    void scene;
  });
});
