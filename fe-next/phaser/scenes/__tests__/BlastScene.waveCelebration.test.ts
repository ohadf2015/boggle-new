/**
 * BlastScene wave transition celebration — confetti, score summary, rotation.
 *
 * Verifies:
 * - Confetti particles fired during wave transition
 * - Score summary text shown when score is provided
 * - Tile fly-out includes rotation (random angle)
 * - "WAVE N" text uses overshoot bounce (scale 0→1.5→1.0)
 * - Wave 3+: red pulse overlay (camera flash)
 * - 200ms breathing room after tile fly-out
 */

import { GameBridge } from '@/lib/phaser/bridge/GameBridge';
import { BlastScene } from '../BlastScene';

// ─── Helpers ────────────────────────────────────────────────────────────────

function createScene(): BlastScene {
  const scene = new BlastScene();
  (scene.game.canvas as Record<string, unknown>).addEventListener = jest.fn();
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

describe('BlastScene wave celebration — confetti', () => {
  it('calls scene.add.particles during wave transition (confetti)', () => {
    const scene = createScene();
    populateGrid(scene);

    const particlesSpy = scene.add.particles as jest.Mock;
    particlesSpy.mockClear();

    GameBridge.emit('blast:wave:transition', { waveNumber: 2 });

    // Confetti should create multiple particle emitters (one per color)
    expect(particlesSpy).toHaveBeenCalled();
  });

  it('does NOT fire confetti when reduceMotion', () => {
    const scene = createScene();
    // Enable reduce motion
    (scene as unknown as { a11y: { reduceMotion: boolean; isLowEnd: boolean } }).a11y = {
      reduceMotion: true,
      isLowEnd: false,
    };
    populateGrid(scene);

    const particlesSpy = scene.add.particles as jest.Mock;
    particlesSpy.mockClear();

    GameBridge.emit('blast:wave:transition', { waveNumber: 2 });

    expect(particlesSpy).not.toHaveBeenCalled();
  });
});

describe('BlastScene wave celebration — score summary', () => {
  it('shows score summary text when score is provided', () => {
    const scene = createScene();
    populateGrid(scene);

    const addTextSpy = scene.add.text as jest.Mock;
    addTextSpy.mockClear();

    GameBridge.emit('blast:wave:transition', { waveNumber: 2, score: 450 });

    // Should show at least 2 texts: score summary + WAVE N
    const allTextCalls = addTextSpy.mock.calls;
    const hasScoreText = allTextCalls.some(
      (call: unknown[]) => typeof call[2] === 'string' && (call[2] as string).includes('450')
    );
    expect(hasScoreText).toBe(true);
  });

  it('does NOT show score text when score is not provided', () => {
    const scene = createScene();
    populateGrid(scene);

    const addTextSpy = scene.add.text as jest.Mock;
    addTextSpy.mockClear();

    GameBridge.emit('blast:wave:transition', { waveNumber: 2 });

    // Should only show "WAVE N" text, not a score line
    const allTextCalls = addTextSpy.mock.calls;
    const hasScoreText = allTextCalls.some(
      (call: unknown[]) => typeof call[2] === 'string' && /\+\d+/.test(call[2] as string)
    );
    expect(hasScoreText).toBe(false);
  });
});

describe('BlastScene wave celebration — tile fly-out rotation', () => {
  it('includes rotation in tile fly-out tweens', () => {
    const scene = createScene();
    populateGrid(scene);

    const tweenSpy = scene.tweens.add as jest.Mock;
    tweenSpy.mockClear();

    GameBridge.emit('blast:wave:transition', { waveNumber: 2 });

    // Tile fly-out tweens should include angle property
    const flyOutTweens = tweenSpy.mock.calls.map((c: unknown[]) => c[0]);
    const hasRotation = flyOutTweens.some(
      (t: Record<string, unknown>) => t.angle !== undefined
    );
    expect(hasRotation).toBe(true);
  });
});

describe('BlastScene wave celebration — overshoot bounce on WAVE text', () => {
  it('animates WAVE text with overshoot (scale exceeds 1.0)', () => {
    const scene = createScene();
    populateGrid(scene);

    const tweenSpy = scene.tweens.add as jest.Mock;
    tweenSpy.mockClear();

    GameBridge.emit('blast:wave:transition', { waveNumber: 3 });

    // Find the tween for wave text that has scaleX > 1.0
    const allTweens = tweenSpy.mock.calls.map((c: unknown[]) => c[0]);
    const overshootTween = allTweens.find((t: Record<string, unknown>) => {
      const scaleXVal = t.scaleX;
      if (typeof scaleXVal === 'object' && scaleXVal !== null) {
        // Check for { from: ..., to: ... } where to > 1
        return (scaleXVal as { to?: number }).to !== undefined &&
               (scaleXVal as { to: number }).to > 1;
      }
      return typeof scaleXVal === 'number' && scaleXVal > 1;
    });
    expect(overshootTween).toBeDefined();
  });
});

describe('BlastScene wave celebration — red warning for wave 3+', () => {
  it('flashes camera red for wave 3+', () => {
    const scene = createScene();
    populateGrid(scene);

    const flashSpy = scene.cameras.main.flash as jest.Mock;
    flashSpy.mockClear();

    GameBridge.emit('blast:wave:transition', { waveNumber: 3 });

    // Camera flash with red tint
    expect(flashSpy).toHaveBeenCalled();
  });

  it('does NOT flash camera for wave 1-2', () => {
    const scene = createScene();
    populateGrid(scene);

    const flashSpy = scene.cameras.main.flash as jest.Mock;
    flashSpy.mockClear();

    GameBridge.emit('blast:wave:transition', { waveNumber: 2 });

    expect(flashSpy).not.toHaveBeenCalled();
  });
});

describe('BlastScene wave celebration — breathing room delay', () => {
  it('uses 200ms delayedCall for breathing room after fly-out completes', () => {
    const scene = createScene();
    populateGrid(scene);

    const tweenSpy = scene.tweens.add as jest.Mock;
    tweenSpy.mockClear();
    const delayedCallSpy = scene.time.delayedCall as jest.Mock;
    delayedCallSpy.mockClear();

    GameBridge.emit('blast:wave:transition', { waveNumber: 2 });

    // Trigger all tile fly-out onComplete callbacks to simulate animation finishing
    const flyOutTweens = tweenSpy.mock.calls
      .map((c: unknown[]) => c[0])
      .filter((t: Record<string, unknown>) => t.alpha === 0 && t.onComplete);
    for (const tween of flyOutTweens) {
      (tween as { onComplete: () => void }).onComplete();
    }

    // After all fly-outs complete, a 200ms breathing room delay should fire
    const delays = delayedCallSpy.mock.calls.map((c: unknown[]) => c[0]);
    expect(delays.some((d: number) => d === 200)).toBe(true);
  });
});
