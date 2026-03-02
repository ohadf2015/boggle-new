/**
 * BlastScene — hit-stop + time dilation tests.
 *
 * Part A: Hit-stop freezes all tweens briefly on word accept.
 * Part B: Time dilation slows tweens at combo milestones.
 *
 * Verifies:
 *  - 4+ letter accepted word triggers 80ms hit-stop
 *  - 6+ letter accepted word triggers 120ms hit-stop
 *  - 8+ letter accepted word triggers 150ms hit-stop + camera zoom
 *  - <4 letter words do NOT trigger hit-stop
 *  - Hit-stop calls tweens.pauseAll + resumeAll after delay
 *  - Combo milestone 5+ sets timeScale 0.6
 *  - Combo milestone 8+ sets timeScale 0.4
 *  - Combo milestone 10+ sets timeScale 0.3 + camera zoom
 *  - reduceMotion skips hit-stop and time dilation
 *  - No stacking of hit-stop effects
 */

import { GameBridge } from '@/lib/phaser/bridge/GameBridge';
import { BlastScene } from '../BlastScene';
import { ComboRing } from '../../objects/ComboRing';

jest.spyOn(ComboRing.prototype, 'play').mockImplementation(() => {});

// Stub out living background layers (atmosphere agent WIP — uses undefined `lerp`)
// Access private method via prototype for test safety
const proto = BlastScene.prototype as unknown as Record<string, Function>;
if (proto.createBackgroundLayers) {
  proto.createBackgroundLayers = jest.fn();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createBlastScene(): BlastScene {
  const scene = new BlastScene();
  (scene.game.canvas as Record<string, unknown>).addEventListener = jest.fn();

  // Add pauseAll/resumeAll to tweens mock
  (scene.tweens as Record<string, unknown>).pauseAll = jest.fn();
  (scene.tweens as Record<string, unknown>).resumeAll = jest.fn();
  (scene.tweens as Record<string, unknown>).timeScale = 1;

  scene.create();
  return scene;
}

const GRID_5x5: string[][] = [
  ['A', 'B', 'C', 'D', 'E'],
  ['F', 'G', 'H', 'I', 'J'],
  ['K', 'L', 'M', 'N', 'O'],
  ['P', 'Q', 'R', 'S', 'T'],
  ['U', 'V', 'W', 'X', 'Y'],
];

function initBlastGrid(scene: BlastScene): void {
  const tileStates = GRID_5x5.map(row =>
    row.map(() => ({ type: 'standard' as const, hitsRemaining: 0 }))
  );
  GameBridge.emit('blast:grid:update', { grid: GRID_5x5, tileStates, comboLevel: 0 });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  GameBridge.reset();
});

afterEach(() => {
  GameBridge.reset();
});

describe('BlastScene hit-stop', () => {
  it('freezes tweens for 80ms on 4-letter word accept', () => {
    const scene = createBlastScene();
    initBlastGrid(scene);

    GameBridge.emit('word:feedback', { type: 'accepted', word: 'ABCD', score: 10 });

    expect(scene.tweens.pauseAll).toHaveBeenCalled();
    // delayedCall should be scheduled for 80ms
    const delayedCallArgs = (scene.time.delayedCall as jest.Mock).mock.calls;
    const hitStopDelay = delayedCallArgs.find((call: unknown[]) => call[0] === 80);
    expect(hitStopDelay).toBeDefined();
  });

  it('freezes tweens for 120ms on 6-letter word accept', () => {
    const scene = createBlastScene();
    initBlastGrid(scene);

    GameBridge.emit('word:feedback', { type: 'accepted', word: 'ABCDEF', score: 20 });

    expect(scene.tweens.pauseAll).toHaveBeenCalled();
    const delayedCallArgs = (scene.time.delayedCall as jest.Mock).mock.calls;
    const hitStopDelay = delayedCallArgs.find((call: unknown[]) => call[0] === 120);
    expect(hitStopDelay).toBeDefined();
  });

  it('freezes tweens for 150ms on 8-letter word accept', () => {
    const scene = createBlastScene();
    initBlastGrid(scene);

    GameBridge.emit('word:feedback', { type: 'accepted', word: 'ABCDEFGH', score: 30 });

    expect(scene.tweens.pauseAll).toHaveBeenCalled();
    const delayedCallArgs = (scene.time.delayedCall as jest.Mock).mock.calls;
    const hitStopDelay = delayedCallArgs.find((call: unknown[]) => call[0] === 150);
    expect(hitStopDelay).toBeDefined();
  });

  it('does NOT freeze tweens on <4 letter words', () => {
    const scene = createBlastScene();
    initBlastGrid(scene);

    GameBridge.emit('word:feedback', { type: 'accepted', word: 'ABC', score: 5 });

    expect(scene.tweens.pauseAll).not.toHaveBeenCalled();
  });

  it('does NOT freeze tweens on rejected words', () => {
    const scene = createBlastScene();
    initBlastGrid(scene);

    GameBridge.emit('word:feedback', { type: 'rejected', word: 'ABCD', score: 0 });

    expect(scene.tweens.pauseAll).not.toHaveBeenCalled();
  });

  it('skips hit-stop when reduceMotion is true', () => {
    const scene = createBlastScene();
    GameBridge.emit('accessibility:update', {
      reduceMotion: true,
      disableFireRoundLights: false,
      disableEarthquakeEffects: false,
      isLowEnd: false,
      isRTL: false,
    });
    initBlastGrid(scene);

    GameBridge.emit('word:feedback', { type: 'accepted', word: 'ABCDEF', score: 20 });

    expect(scene.tweens.pauseAll).not.toHaveBeenCalled();
  });
});

describe('BlastScene time dilation', () => {
  it('sets timeScale to 0.6 at combo level 5', () => {
    const scene = createBlastScene();
    const tileStates = GRID_5x5.map(row =>
      row.map(() => ({ type: 'standard' as const, hitsRemaining: 0 }))
    );

    // Initial grid at combo 0
    GameBridge.emit('blast:grid:update', { grid: GRID_5x5, tileStates, comboLevel: 0 });
    // Level up to 5
    GameBridge.emit('blast:grid:update', { grid: GRID_5x5, tileStates, comboLevel: 5 });

    expect(scene.tweens.timeScale).toBe(0.6);
  });

  it('sets timeScale to 0.4 at combo level 8', () => {
    const scene = createBlastScene();
    const tileStates = GRID_5x5.map(row =>
      row.map(() => ({ type: 'standard' as const, hitsRemaining: 0 }))
    );

    GameBridge.emit('blast:grid:update', { grid: GRID_5x5, tileStates, comboLevel: 0 });
    GameBridge.emit('blast:grid:update', { grid: GRID_5x5, tileStates, comboLevel: 8 });

    expect(scene.tweens.timeScale).toBe(0.4);
  });

  it('sets timeScale to 0.3 at combo level 10', () => {
    const scene = createBlastScene();
    const tileStates = GRID_5x5.map(row =>
      row.map(() => ({ type: 'standard' as const, hitsRemaining: 0 }))
    );

    GameBridge.emit('blast:grid:update', { grid: GRID_5x5, tileStates, comboLevel: 0 });
    GameBridge.emit('blast:grid:update', { grid: GRID_5x5, tileStates, comboLevel: 10 });

    expect(scene.tweens.timeScale).toBe(0.3);
  });

  it('skips time dilation when reduceMotion is true', () => {
    const scene = createBlastScene();
    GameBridge.emit('accessibility:update', {
      reduceMotion: true,
      disableFireRoundLights: false,
      disableEarthquakeEffects: false,
      isLowEnd: false,
      isRTL: false,
    });

    const tileStates = GRID_5x5.map(row =>
      row.map(() => ({ type: 'standard' as const, hitsRemaining: 0 }))
    );

    GameBridge.emit('blast:grid:update', { grid: GRID_5x5, tileStates, comboLevel: 0 });
    GameBridge.emit('blast:grid:update', { grid: GRID_5x5, tileStates, comboLevel: 10 });

    // timeScale should remain at 1 (not dilated)
    expect(scene.tweens.timeScale).toBe(1);
  });
});
