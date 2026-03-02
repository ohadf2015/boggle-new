/**
 * AdventureScene — rainbow timer cleanup tests.
 *
 * Verifies that rainbow glow timers are cleaned up when:
 * - The grid is rebuilt (new grid:update)
 * - The scene is destroyed
 *
 * Without cleanup, dangling timers try to setTint on destroyed tile objects.
 */

import { GameBridge } from '@/lib/phaser/bridge/GameBridge';
import { AdventureScene } from '../AdventureScene';
import { ComboRing } from '../../objects/ComboRing';

// Mock ComboRing.play to prevent tween crashes in test environment
jest.spyOn(ComboRing.prototype, 'play').mockImplementation(() => {});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createScene(): AdventureScene {
  const scene = new AdventureScene();
  (scene.game.canvas as Record<string, unknown>).addEventListener = jest.fn();
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
});

afterEach(() => {
  GameBridge.reset();
});

describe('AdventureScene rainbow timer cleanup', () => {
  it('should track rainbow timer events when created', () => {
    const scene = createScene();

    GameBridge.emit('grid:update', {
      grid: GRID_4x4,
      comboLevel: 0,
      fireRoundActive: false,
      tileStates: { '0,0': 'rainbow', '1,1': 'rainbow' },
    });

    // scene.time.addEvent should have been called for rainbow tiles
    const addEventCalls = (scene.time.addEvent as jest.Mock).mock.calls;
    const rainbowTimers = addEventCalls.filter(
      (call: Array<Record<string, unknown>>) => call[0]?.repeat === -1
    );
    expect(rainbowTimers.length).toBeGreaterThanOrEqual(2);

    void scene;
  });

  it('should clean up rainbow timers when grid is rebuilt', () => {
    const scene = createScene();

    // First grid with rainbow tiles
    GameBridge.emit('grid:update', {
      grid: GRID_4x4,
      comboLevel: 0,
      fireRoundActive: false,
      tileStates: { '0,0': 'rainbow' },
    });

    // Track that removeEvent is called when rebuilding
    const removeEventSpy = scene.time.removeEvent as jest.Mock;
    removeEventSpy.mockClear();

    // Rebuild grid (new update)
    GameBridge.emit('grid:update', {
      grid: GRID_4x4,
      comboLevel: 0,
      fireRoundActive: false,
      tileStates: {},
    });

    // Rainbow timers from first grid should be cleaned up
    expect(removeEventSpy).toHaveBeenCalled();

    void scene;
  });

  it('should clean up rainbow timers on scene destroy', () => {
    const scene = createScene();

    // Grid with rainbow tiles
    GameBridge.emit('grid:update', {
      grid: GRID_4x4,
      comboLevel: 0,
      fireRoundActive: false,
      tileStates: { '0,0': 'rainbow', '2,2': 'rainbow' },
    });

    const removeEventSpy = scene.time.removeEvent as jest.Mock;
    removeEventSpy.mockClear();

    // Destroy scene
    GameBridge.emit('scene:destroy', undefined);

    expect(removeEventSpy).toHaveBeenCalled();
  });
});
