/**
 * GameScene — earthquake visual effects integration tests.
 *
 * Verifies:
 * - effect:earthquake with each intensity calls the corresponding EarthquakeEffect function
 * - All intensities still call cameraShake
 * - No-op when disableEarthquakeEffects is true
 */

import { GameBridge } from '@/lib/phaser/bridge/GameBridge';
import { GameScene } from '../GameScene';
import { ComboRing } from '../../objects/ComboRing';

// Silence ComboRing
jest.spyOn(ComboRing.prototype, 'play').mockImplementation(() => {});

// Mock EarthquakeEffect
const playEarthquakeWarningSpy = jest.fn();
const playEarthquakeShakeSpy = jest.fn();
const playFireRoundTransitionSpy = jest.fn();
jest.mock('../../effects/EarthquakeEffect', () => ({
  playEarthquakeWarning: (...args: unknown[]) => playEarthquakeWarningSpy(...args),
  playEarthquakeShake: (...args: unknown[]) => playEarthquakeShakeSpy(...args),
  playFireRoundTransition: (...args: unknown[]) => playFireRoundTransitionSpy(...args),
}));

// Mock CameraEffects (keep cameraShake observable)
const cameraShakeSpy = jest.fn();
jest.mock('../../effects/CameraEffects', () => ({
  ...jest.requireActual('../../effects/CameraEffects'),
  cameraShake: (...args: unknown[]) => cameraShakeSpy(...args),
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
  // Build grid so tiles + layout exist for earthquake effects
  GameBridge.emit('grid:update', { grid: GRID_4x4, comboLevel: 0, fireRoundActive: false });
  return scene;
}

beforeEach(() => {
  GameBridge.reset();
  playEarthquakeWarningSpy.mockClear();
  playEarthquakeShakeSpy.mockClear();
  playFireRoundTransitionSpy.mockClear();
  cameraShakeSpy.mockClear();
});

afterEach(() => {
  GameBridge.reset();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GameScene earthquake effects', () => {
  it('should call playEarthquakeWarning for warning intensity', () => {
    const scene = createScene();

    GameBridge.emit('effect:earthquake', { intensity: 'warning' });

    expect(playEarthquakeWarningSpy).toHaveBeenCalledTimes(1);
    expect(cameraShakeSpy).toHaveBeenCalledTimes(1);
    void scene;
  });

  it('should call playEarthquakeShake for shaking intensity', () => {
    const scene = createScene();

    GameBridge.emit('effect:earthquake', { intensity: 'shaking' });

    expect(playEarthquakeShakeSpy).toHaveBeenCalledTimes(1);
    expect(cameraShakeSpy).toHaveBeenCalledTimes(1);
    void scene;
  });

  it('should call playFireRoundTransition for fire-round intensity', () => {
    const scene = createScene();

    GameBridge.emit('effect:earthquake', { intensity: 'fire-round' });

    expect(playFireRoundTransitionSpy).toHaveBeenCalledTimes(1);
    expect(cameraShakeSpy).toHaveBeenCalledTimes(1);
    void scene;
  });

  it('should not call any earthquake effect when disableEarthquakeEffects is true', () => {
    const scene = createScene();

    // Disable earthquake effects
    GameBridge.emit('accessibility:update', {
      reduceMotion: false,
      disableFireRoundLights: false,
      disableEarthquakeEffects: true,
      isLowEnd: false,
      isRTL: false,
    });

    GameBridge.emit('effect:earthquake', { intensity: 'shaking' });

    expect(playEarthquakeShakeSpy).not.toHaveBeenCalled();
    expect(cameraShakeSpy).not.toHaveBeenCalled();
    void scene;
  });

  it('should not call earthquake effects when layout is not yet built', () => {
    // Create scene without emitting grid:update
    const scene = new GameScene();
    (scene.game.canvas as unknown as Record<string, unknown>).addEventListener = jest.fn();
    scene.create();

    GameBridge.emit('effect:earthquake', { intensity: 'warning' });

    // Camera shake still fires but earthquake visual effects need layout
    expect(playEarthquakeWarningSpy).not.toHaveBeenCalled();
    void scene;
  });
});
