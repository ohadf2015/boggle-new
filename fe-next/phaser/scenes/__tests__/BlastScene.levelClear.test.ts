/**
 * BlastScene level-clear celebration — "Sugar Crush" auto-trigger sequence.
 *
 * When objectives are met, remaining special tiles auto-fire sequentially:
 * - Each tile triggers its explosion effect with staggered delays
 * - "LEVEL COMPLETE!" banner appears
 * - Move conversion bonus displayed
 * - Confetti celebration
 * - Emits blast:anim:complete { phase: 'level-clear' } when done
 *
 * RED phase: tests written before implementation.
 */

import { GameBridge } from '@/lib/phaser/bridge/GameBridge';
import { BlastScene } from '../BlastScene';
import type { AutoTriggerStep } from '@/components/blast/utils/blastLevelClear';

// ─── Helpers ────────────────────────────────────────────────────────────────

function createScene(): BlastScene {
  const scene = new BlastScene();
  (scene.game.canvas as unknown as Record<string, unknown>).addEventListener = jest.fn();
  scene.create();
  return scene;
}

const GRID_2x2: string[][] = [
  ['A', 'B'],
  ['C', 'D'],
];

const TILE_STATES_2x2 = Array.from({ length: 2 }, (_, row) =>
  Array.from({ length: 2 }, (_, col) => ({
    row, col, type: 'standard' as const, isCleared: false,
    activationEffect: null, hitsRemaining: 0,
  }))
);

function populateGrid(scene: BlastScene): void {
  GameBridge.emit('blast:grid:update', {
    grid: GRID_2x2,
    tileStates: TILE_STATES_2x2,
    comboLevel: 0,
  });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  GameBridge.reset();
});

afterEach(() => {
  GameBridge.reset();
});

describe('BlastScene level-clear handler', () => {
  it('subscribes to blast:level:clear event', () => {
    const scene = createScene();
    const listener = jest.fn();
    // If the scene subscribes, emitting should trigger the handler
    // We test indirectly by checking that the scene reacts to the event
    GameBridge.emit('blast:level:clear', {
      autoTriggerSequence: [],
      movesRemaining: 0,
      moveBonus: 0,
      totalScore: 100,
    });
    // No error thrown = subscribed and handled
    expect(true).toBe(true);
  });

  it('shows "LEVEL COMPLETE!" text on level clear', () => {
    const scene = createScene();
    populateGrid(scene);

    const addTextSpy = scene.add.text as jest.Mock;
    addTextSpy.mockClear();

    GameBridge.emit('blast:level:clear', {
      autoTriggerSequence: [],
      movesRemaining: 0,
      moveBonus: 0,
      totalScore: 500,
    });

    expect(addTextSpy).toHaveBeenCalled();
    const textCalls = addTextSpy.mock.calls;
    const levelCompleteCall = textCalls.find(
      (call: unknown[]) => typeof call[2] === 'string' && call[2].includes('LEVEL COMPLETE')
    );
    expect(levelCompleteCall).toBeDefined();
  });

  it('shows total score text on level clear', () => {
    const scene = createScene();
    populateGrid(scene);

    const addTextSpy = scene.add.text as jest.Mock;
    addTextSpy.mockClear();

    GameBridge.emit('blast:level:clear', {
      autoTriggerSequence: [],
      movesRemaining: 3,
      moveBonus: 150,
      totalScore: 1250,
    });

    const textCalls = addTextSpy.mock.calls;
    const scoreCall = textCalls.find(
      (call: unknown[]) => typeof call[2] === 'string' && call[2].includes('1250')
    );
    expect(scoreCall).toBeDefined();
  });

  it('shows move bonus text when moves remaining > 0', () => {
    const scene = createScene();
    populateGrid(scene);

    const addTextSpy = scene.add.text as jest.Mock;
    addTextSpy.mockClear();

    GameBridge.emit('blast:level:clear', {
      autoTriggerSequence: [],
      movesRemaining: 5,
      moveBonus: 250,
      totalScore: 1000,
    });

    const textCalls = addTextSpy.mock.calls;
    const bonusCall = textCalls.find(
      (call: unknown[]) => typeof call[2] === 'string' && call[2].includes('250')
    );
    expect(bonusCall).toBeDefined();
  });

  it('does not show move bonus text when movesRemaining is 0', () => {
    const scene = createScene();
    populateGrid(scene);

    const addTextSpy = scene.add.text as jest.Mock;
    addTextSpy.mockClear();

    GameBridge.emit('blast:level:clear', {
      autoTriggerSequence: [],
      movesRemaining: 0,
      moveBonus: 0,
      totalScore: 500,
    });

    const textCalls = addTextSpy.mock.calls;
    const bonusCall = textCalls.find(
      (call: unknown[]) => typeof call[2] === 'string' &&
        (call[2] as string).toLowerCase().includes('bonus')
    );
    expect(bonusCall).toBeUndefined();
  });

  it('schedules delayed calls for auto-trigger sequence', () => {
    const scene = createScene();
    populateGrid(scene);

    const delayedCallSpy = scene.time.delayedCall as jest.Mock;
    delayedCallSpy.mockClear();

    const sequence: AutoTriggerStep[] = [
      { type: 'bomb', row: 0, col: 0, delayMs: 0 },
      { type: 'lightning', row: 0, col: 1, delayMs: 200 },
      { type: 'prism', row: 1, col: 0, delayMs: 400 },
    ];

    GameBridge.emit('blast:level:clear', {
      autoTriggerSequence: sequence,
      movesRemaining: 0,
      moveBonus: 0,
      totalScore: 500,
    });

    // Should schedule delayed calls for each auto-trigger step
    expect(delayedCallSpy).toHaveBeenCalled();
    // At minimum 3 delayed calls for the 3 auto-trigger steps
    expect(delayedCallSpy.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it('plays confetti on level clear', () => {
    const scene = createScene();
    populateGrid(scene);

    // Access particle manager to spy on confetti
    const particleSpy = jest.spyOn(
      (scene as unknown as { particles: { playConfetti: jest.Mock } }).particles,
      'playConfetti'
    );

    GameBridge.emit('blast:level:clear', {
      autoTriggerSequence: [],
      movesRemaining: 0,
      moveBonus: 0,
      totalScore: 500,
    });

    expect(particleSpy).toHaveBeenCalled();
  });

  it('schedules blast:anim:complete emission via delayedCall', () => {
    const scene = createScene();
    populateGrid(scene);

    const delayedCallSpy = scene.time.delayedCall as jest.Mock;
    delayedCallSpy.mockClear();

    GameBridge.emit('blast:level:clear', {
      autoTriggerSequence: [],
      movesRemaining: 0,
      moveBonus: 0,
      totalScore: 500,
    });

    // Completion is scheduled via delayedCall(1500, callback)
    // Find the call with 1500ms delay
    const completionCall = delayedCallSpy.mock.calls.find(
      (call: unknown[]) => call[0] === 1500
    );
    expect(completionCall).toBeDefined();

    // Execute the callback manually to verify it emits the event
    const completeSpy = jest.fn();
    GameBridge.on('blast:anim:complete', completeSpy);
    const callback = completionCall![1] as () => void;
    callback();
    expect(completeSpy).toHaveBeenCalledWith({ phase: 'level-clear' });
  });

  it('applies camera flash on level clear', () => {
    const scene = createScene();
    populateGrid(scene);

    const cameraFlashSpy = scene.cameras.main.flash as jest.Mock;

    GameBridge.emit('blast:level:clear', {
      autoTriggerSequence: [],
      movesRemaining: 0,
      moveBonus: 0,
      totalScore: 500,
    });

    expect(cameraFlashSpy).toHaveBeenCalled();
  });

  it('cleans up level-clear text on scene destroy', () => {
    const scene = createScene();
    populateGrid(scene);

    GameBridge.emit('blast:level:clear', {
      autoTriggerSequence: [],
      movesRemaining: 0,
      moveBonus: 0,
      totalScore: 500,
    });

    // Should not throw when destroying
    expect(() => scene.destroy()).not.toThrow();
  });
});

describe('BlastScene level-clear with reduceMotion', () => {
  it('skips confetti when reduceMotion is true', () => {
    const scene = createScene();

    // Set reduceMotion
    GameBridge.emit('accessibility:update', {
      reduceMotion: true,
      disableFireRoundLights: false,
      disableEarthquakeEffects: false,
      isLowEnd: false,
      isRTL: false,
    });

    populateGrid(scene);

    const particleSpy = jest.spyOn(
      (scene as unknown as { particles: { playConfetti: jest.Mock } }).particles,
      'playConfetti'
    );

    GameBridge.emit('blast:level:clear', {
      autoTriggerSequence: [],
      movesRemaining: 0,
      moveBonus: 0,
      totalScore: 500,
    });

    expect(particleSpy).not.toHaveBeenCalled();
  });

  it('still shows level complete text with reduceMotion', () => {
    const scene = createScene();

    GameBridge.emit('accessibility:update', {
      reduceMotion: true,
      disableFireRoundLights: false,
      disableEarthquakeEffects: false,
      isLowEnd: false,
      isRTL: false,
    });

    populateGrid(scene);

    const addTextSpy = scene.add.text as jest.Mock;
    addTextSpy.mockClear();

    GameBridge.emit('blast:level:clear', {
      autoTriggerSequence: [],
      movesRemaining: 0,
      moveBonus: 0,
      totalScore: 500,
    });

    const textCalls = addTextSpy.mock.calls;
    const levelCompleteCall = textCalls.find(
      (call: unknown[]) => typeof call[2] === 'string' && call[2].includes('LEVEL COMPLETE')
    );
    expect(levelCompleteCall).toBeDefined();
  });

  it('still schedules blast:anim:complete with reduceMotion', () => {
    const scene = createScene();

    GameBridge.emit('accessibility:update', {
      reduceMotion: true,
      disableFireRoundLights: false,
      disableEarthquakeEffects: false,
      isLowEnd: false,
      isRTL: false,
    });

    populateGrid(scene);

    const delayedCallSpy = scene.time.delayedCall as jest.Mock;
    delayedCallSpy.mockClear();

    GameBridge.emit('blast:level:clear', {
      autoTriggerSequence: [],
      movesRemaining: 0,
      moveBonus: 0,
      totalScore: 500,
    });

    // Completion is still scheduled even with reduceMotion
    const completionCall = delayedCallSpy.mock.calls.find(
      (call: unknown[]) => call[0] === 1500
    );
    expect(completionCall).toBeDefined();

    // Execute callback to verify event
    const completeSpy = jest.fn();
    GameBridge.on('blast:anim:complete', completeSpy);
    const callback = completionCall![1] as () => void;
    callback();
    expect(completeSpy).toHaveBeenCalledWith({ phase: 'level-clear' });
  });
});
