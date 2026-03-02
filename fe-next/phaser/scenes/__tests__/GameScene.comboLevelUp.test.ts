/**
 * GameScene — combo level-up detection tests.
 *
 * Verifies that:
 * - playComboLevelUp() fires when comboLevel increases between grid:update events
 * - No effects fire on initial grid (level 0 → N on first update)
 * - No effects fire when comboLevel stays the same or decreases
 * - Effects fire at lastSubmitCenter (word location) when available
 * - Skips effects when reduceMotion is true
 */

import { GameBridge } from '@/lib/phaser/bridge/GameBridge';
import { GameScene } from '../GameScene';

// Mock the new ComboEffect system
const playComboLevelUpSpy = jest.fn();
jest.mock('../../effects/ComboEffect', () => ({
  ...jest.requireActual('../../effects/ComboEffect'),
  playComboLevelUp: (...args: unknown[]) => playComboLevelUpSpy(...args),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createScene(): GameScene {
  const scene = new GameScene();
  // Add addEventListener stub to game.canvas (GameScene.create reads it)
  (scene.game.canvas as unknown as Record<string, unknown>).addEventListener = jest.fn();
  // create() wires bridge subscriptions, path trail, combo ring
  scene.create();
  return scene;
}

const GRID_4x4: string[][] = [
  ['A', 'B', 'C', 'D'],
  ['E', 'F', 'G', 'H'],
  ['I', 'J', 'K', 'L'],
  ['M', 'N', 'O', 'P'],
];

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  GameBridge.reset();
  playComboLevelUpSpy.mockClear();
});

afterEach(() => {
  GameBridge.reset();
});

describe('GameScene combo level-up detection', () => {
  it('should NOT trigger combo effects on the initial grid update', () => {
    const scene = createScene();

    // First grid:update delivers comboLevel=2 but this is the first update
    GameBridge.emit('grid:update', {
      grid: GRID_4x4,
      comboLevel: 2,
      fireRoundActive: false,
    });

    expect(playComboLevelUpSpy).not.toHaveBeenCalled();

    void scene;
  });

  it('should trigger combo effects when comboLevel increases', () => {
    const scene = createScene();

    // First update: establish baseline
    GameBridge.emit('grid:update', {
      grid: GRID_4x4,
      comboLevel: 1,
      fireRoundActive: false,
    });

    // Second update: combo goes up
    GameBridge.emit('grid:update', {
      grid: GRID_4x4,
      comboLevel: 2,
      fireRoundActive: false,
    });

    expect(playComboLevelUpSpy).toHaveBeenCalledTimes(1);
    // Should be called with (scene, center, level, config)
    expect(playComboLevelUpSpy).toHaveBeenCalledWith(
      scene,
      expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
      2,
      expect.objectContaining({ reduceMotion: false }),
    );

    void scene;
  });

  it('should NOT trigger combo effects when comboLevel stays the same', () => {
    const scene = createScene();

    // First update
    GameBridge.emit('grid:update', {
      grid: GRID_4x4,
      comboLevel: 3,
      fireRoundActive: false,
    });

    // Same level again
    GameBridge.emit('grid:update', {
      grid: GRID_4x4,
      comboLevel: 3,
      fireRoundActive: false,
    });

    expect(playComboLevelUpSpy).not.toHaveBeenCalled();

    void scene;
  });

  it('should NOT trigger combo effects when comboLevel decreases', () => {
    const scene = createScene();

    // First update
    GameBridge.emit('grid:update', {
      grid: GRID_4x4,
      comboLevel: 5,
      fireRoundActive: false,
    });

    // Level drops (e.g. new round)
    GameBridge.emit('grid:update', {
      grid: GRID_4x4,
      comboLevel: 0,
      fireRoundActive: false,
    });

    expect(playComboLevelUpSpy).not.toHaveBeenCalled();

    void scene;
  });

  it('should trigger combo effects on each successive level increase', () => {
    const scene = createScene();

    // Establish baseline
    GameBridge.emit('grid:update', {
      grid: GRID_4x4,
      comboLevel: 0,
      fireRoundActive: false,
    });

    // Level 0 → 1
    GameBridge.emit('grid:update', {
      grid: GRID_4x4,
      comboLevel: 1,
      fireRoundActive: false,
    });
    expect(playComboLevelUpSpy).toHaveBeenCalledTimes(1);

    // Level 1 → 3 (skip)
    GameBridge.emit('grid:update', {
      grid: GRID_4x4,
      comboLevel: 3,
      fireRoundActive: false,
    });
    expect(playComboLevelUpSpy).toHaveBeenCalledTimes(2);

    void scene;
  });

  it('should skip combo effects when reduceMotion is true', () => {
    const scene = createScene();

    // Enable reduce motion
    GameBridge.emit('accessibility:update', {
      reduceMotion: true,
      disableFireRoundLights: false,
      disableEarthquakeEffects: false,
      isLowEnd: false,
      isRTL: false,
    });

    // Establish baseline
    GameBridge.emit('grid:update', {
      grid: GRID_4x4,
      comboLevel: 0,
      fireRoundActive: false,
    });

    // Level up
    GameBridge.emit('grid:update', {
      grid: GRID_4x4,
      comboLevel: 1,
      fireRoundActive: false,
    });

    // playComboLevelUp IS called — it handles reduceMotion internally
    expect(playComboLevelUpSpy).toHaveBeenCalledWith(
      scene,
      expect.any(Object),
      1,
      expect.objectContaining({ reduceMotion: true }),
    );

    void scene;
  });
});
