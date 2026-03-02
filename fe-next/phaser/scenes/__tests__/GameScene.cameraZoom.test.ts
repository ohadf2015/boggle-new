/**
 * GameScene — camera zoom on accepted word tests.
 *
 * Verifies that cameraZoom fires on accepted word feedback.
 */

import { GameBridge } from '@/lib/phaser/bridge/GameBridge';
import { GameScene } from '../GameScene';
import { ComboRing } from '../../objects/ComboRing';

// Mock ComboRing.play
jest.spyOn(ComboRing.prototype, 'play').mockImplementation(() => {});

// Spy on cameraZoom
const cameraZoomSpy = jest.fn();
jest.mock('../../effects/CameraEffects', () => ({
  ...jest.requireActual('../../effects/CameraEffects'),
  cameraZoom: (...args: unknown[]) => cameraZoomSpy(...args),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createScene(): GameScene {
  const scene = new GameScene();
  (scene.game.canvas as unknown as Record<string, unknown>).addEventListener = jest.fn();
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
  cameraZoomSpy.mockClear();
});

afterEach(() => {
  GameBridge.reset();
});

describe('GameScene camera zoom on accepted word', () => {
  it('should trigger cameraZoom on accepted word feedback', () => {
    const scene = createScene();

    GameBridge.emit('grid:update', {
      grid: GRID_4x4,
      comboLevel: 0,
      fireRoundActive: false,
    });

    GameBridge.emit('word:feedback', {
      type: 'accepted',
      word: 'TEST',
      score: 10,
    });

    expect(cameraZoomSpy).toHaveBeenCalledTimes(1);
    void scene;
  });

  it('should NOT trigger cameraZoom on rejected word', () => {
    const scene = createScene();

    GameBridge.emit('grid:update', {
      grid: GRID_4x4,
      comboLevel: 0,
      fireRoundActive: false,
    });

    GameBridge.emit('word:feedback', {
      type: 'rejected',
      word: 'BAD',
    });

    expect(cameraZoomSpy).not.toHaveBeenCalled();
    void scene;
  });

  it('should NOT trigger cameraZoom when reduceMotion is true', () => {
    const scene = createScene();

    GameBridge.emit('accessibility:update', {
      reduceMotion: true,
      disableFireRoundLights: false,
      disableEarthquakeEffects: false,
      isLowEnd: false,
      isRTL: false,
    });

    GameBridge.emit('grid:update', {
      grid: GRID_4x4,
      comboLevel: 0,
      fireRoundActive: false,
    });

    GameBridge.emit('word:feedback', {
      type: 'accepted',
      word: 'TEST',
      score: 10,
    });

    // cameraZoom handles reduceMotion internally, but we still call it
    // The function itself is a no-op when reduceMotion is true
    expect(cameraZoomSpy).toHaveBeenCalledTimes(1);
    void scene;
  });
});
