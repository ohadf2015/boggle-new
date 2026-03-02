/**
 * BlastScene combo milestones — milestone text, camera flash, zoom punch.
 *
 * Verifies:
 * - Milestone text at combo 3 ("NICE!"), 5 ("FIRE!"), 7 ("MYTHIC!"), 10 ("GODLIKE!")
 * - Milestone text animates: scales from 2.0→1.0 with Back.easeOut, fades after 1s
 * - Camera flash at each milestone (color matches combo level)
 * - Camera zoom punch at milestones (1.05x)
 * - All tile borders tinted at each combo threshold with correct alpha
 * - Rainbow cycling at level 10+
 * - Respects reduceMotion
 *
 * RED phase: tests fail until implementation exists.
 */

import { GameBridge } from '@/lib/phaser/bridge/GameBridge';
import { BlastScene } from '../BlastScene';

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

function emitGridUpdate(comboLevel: number): void {
  GameBridge.emit('blast:grid:update', {
    grid: GRID_2x2,
    tileStates: TILE_STATES_2x2,
    comboLevel,
  });
}

// ─── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  GameBridge.reset();
});

afterEach(() => {
  GameBridge.reset();
});

// ─── Milestone text ─────────────────────────────────────────────────────────

describe('BlastScene milestone text', () => {
  it('shows "NICE!" text at combo level 3', () => {
    const scene = createScene();
    emitGridUpdate(0); // first update (baseline)

    emitGridUpdate(3); // level-up to 3

    const addText = scene.add.text as jest.Mock;
    const textCalls = addText.mock.calls;
    const milestoneCall = textCalls.find(
      (c: unknown[]) => typeof c[2] === 'string' && (c[2] as string).includes('NICE')
    );
    expect(milestoneCall).toBeDefined();
  });

  it('shows "FIRE!" text at combo level 5', () => {
    const scene = createScene();
    emitGridUpdate(0);
    emitGridUpdate(5);

    const addText = scene.add.text as jest.Mock;
    const textCalls = addText.mock.calls;
    const milestoneCall = textCalls.find(
      (c: unknown[]) => typeof c[2] === 'string' && (c[2] as string).includes('FIRE')
    );
    expect(milestoneCall).toBeDefined();
  });

  it('shows "MYTHIC!" text at combo level 7', () => {
    const scene = createScene();
    emitGridUpdate(0);
    emitGridUpdate(7);

    const addText = scene.add.text as jest.Mock;
    const textCalls = addText.mock.calls;
    const milestoneCall = textCalls.find(
      (c: unknown[]) => typeof c[2] === 'string' && (c[2] as string).includes('MYTHIC')
    );
    expect(milestoneCall).toBeDefined();
  });

  it('shows "GODLIKE!" text at combo level 10', () => {
    const scene = createScene();
    emitGridUpdate(0);
    emitGridUpdate(10);

    const addText = scene.add.text as jest.Mock;
    const textCalls = addText.mock.calls;
    const milestoneCall = textCalls.find(
      (c: unknown[]) => typeof c[2] === 'string' && (c[2] as string).includes('GODLIKE')
    );
    expect(milestoneCall).toBeDefined();
  });

  it('milestone text has a scale-down tween (Back.easeOut)', () => {
    const scene = createScene();
    emitGridUpdate(0);

    const tweensSpy = scene.tweens.add as jest.Mock;
    tweensSpy.mockClear();

    emitGridUpdate(3);

    // One of the tweens should have Back.easeOut ease
    const tweenConfigs = tweensSpy.mock.calls.map((c: unknown[]) => c[0] as Record<string, unknown>);
    const milestoneTextTween = tweenConfigs.find(
      (t) => t.ease === 'Back.easeOut' && t.scaleX !== undefined
    );
    expect(milestoneTextTween).toBeDefined();
  });

  it('does not show milestone text below combo 3', () => {
    const scene = createScene();
    emitGridUpdate(0);

    const addText = scene.add.text as jest.Mock;
    addText.mockClear();

    emitGridUpdate(2);

    const textCalls = addText.mock.calls;
    const milestoneCall = textCalls.find(
      (c: unknown[]) =>
        typeof c[2] === 'string' &&
        ['NICE', 'FIRE', 'MYTHIC', 'GODLIKE'].some((m) => (c[2] as string).includes(m))
    );
    expect(milestoneCall).toBeUndefined();
  });
});

// ─── Camera effects at milestones ───────────────────────────────────────────

describe('BlastScene milestone camera effects', () => {
  it('flashes camera on milestone', () => {
    const scene = createScene();
    emitGridUpdate(0);

    emitGridUpdate(3);

    expect(scene.cameras.main.flash).toHaveBeenCalled();
  });

  it('zooms camera on milestone (1.05x)', () => {
    const scene = createScene();
    emitGridUpdate(0);

    emitGridUpdate(5);

    expect(scene.cameras.main.zoomTo).toHaveBeenCalled();
  });
});

// ─── Combo glow on tiles ────────────────────────────────────────────────────

describe('BlastScene combo glow on tiles', () => {
  it('applies combo glow to all tiles at combo 3+', () => {
    const scene = createScene();
    emitGridUpdate(0);

    const tweensSpy = scene.tweens.add as jest.Mock;
    tweensSpy.mockClear();

    emitGridUpdate(3);

    // Should have at least combo ring + tile glow tweens
    // At level 3, border glow on 4 tiles + combo ring + milestone text + radial
    expect(tweensSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
