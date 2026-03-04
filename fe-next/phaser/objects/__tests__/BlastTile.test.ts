/**
 * BlastTile — extends LetterTile with blast mode special tile visuals.
 *
 * Verifies:
 * - Overlay graphics drawn for special types
 * - Badge text rendered with correct label
 * - Cracked state visual changes for multi-hit tiles
 * - Clear animation returns a Promise
 * - Standard tiles have no overlay
 *
 * RED phase: tests fail until implementation exists.
 */

import Phaser from 'phaser';
import { BlastTile } from '../BlastTile';
import type { BlastTileType } from '@/components/blast/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Mock graphics shape returned by scene.make.graphics() */
interface MockGraphics {
  fillStyle: jest.Mock;
  clear: jest.Mock;
  [key: string]: unknown;
}

function makeScene(): Phaser.Scene {
  return new Phaser.Scene();
}

function makeTile(
  letter = 'A',
  type: BlastTileType = 'standard',
  hitsRemaining = 0,
): BlastTile {
  const scene = makeScene();
  return new BlastTile(scene, 100, 100, letter, 60, type, hitsRemaining);
}

/** Get the overlay graphics object (2nd graphics created via scene.make.graphics) */
function getOverlayGraphics(tile: BlastTile): MockGraphics {
  const scene = (tile as unknown as { scene: Phaser.Scene }).scene;
  const makeGraphics = scene.make.graphics as jest.Mock;
  // First call = base LetterTile bg, second call = BlastTile overlay
  return makeGraphics.mock.results[1]?.value as MockGraphics;
}

/** Get the badge text object (2nd text created via scene.make.text) */
function getBadgeText(tile: BlastTile): { setText: jest.Mock; [key: string]: unknown } {
  const scene = (tile as unknown as { scene: Phaser.Scene }).scene;
  const makeText = scene.make.text as jest.Mock;
  // First call = base LetterTile label, second call = BlastTile badge
  return makeText.mock.results[1]?.value as { setText: jest.Mock; [key: string]: unknown };
}

// ─── Constructor ──────────────────────────────────────────────────────────────

describe('BlastTile constructor', () => {
  it('creates tile in idle state', () => {
    const tile = makeTile('A', 'standard');
    expect(tile.getStatus()).toBe('idle');
  });

  it('exposes the correct letter', () => {
    const tile = makeTile('Z', 'gold');
    expect(tile.getLetter()).toBe('Z');
  });

  it('exposes the tile type', () => {
    const tile = makeTile('A', 'bomb', 0);
    expect(tile.getTileType()).toBe('bomb');
  });

  it('exposes hits remaining', () => {
    const tile = makeTile('A', 'ice', 2);
    expect(tile.getHitsRemaining()).toBe(2);
  });
});

// ─── Special tile overlay ─────────────────────────────────────────────────────

describe('BlastTile overlay', () => {
  it('draws overlay graphics for special tiles (gold)', () => {
    const tile = makeTile('A', 'gold', 0);
    const overlay = getOverlayGraphics(tile);
    expect(overlay).toBeDefined();
    // Overlay should have had fillStyle called with gold tint
    const fillCalls = (overlay.fillStyle as jest.Mock).mock.calls;
    expect(fillCalls.length).toBeGreaterThan(0);
  });

  it('does not create overlay graphics for standard tiles', () => {
    const tile = makeTile('A', 'standard', 0);
    const scene = (tile as unknown as { scene: Phaser.Scene }).scene;
    const makeGraphics = scene.make.graphics as jest.Mock;
    // Only 1 call = the base LetterTile bg (no overlay for standard)
    expect(makeGraphics.mock.calls.length).toBe(1);
  });

  it('creates badge text for special tiles', () => {
    const tile = makeTile('A', 'bomb', 0);
    const badge = getBadgeText(tile);
    expect(badge).toBeDefined();
  });

  it('does not create badge text for standard tiles', () => {
    const tile = makeTile('A', 'standard', 0);
    const scene = (tile as unknown as { scene: Phaser.Scene }).scene;
    const makeText = scene.make.text as jest.Mock;
    // Only 1 call = the base LetterTile label (no badge for standard)
    expect(makeText.mock.calls.length).toBe(1);
  });
});

// ─── updateTileType ───────────────────────────────────────────────────────────

describe('BlastTile.updateTileType', () => {
  it('changes the tile type', () => {
    const tile = makeTile('A', 'gold', 0);
    tile.updateTileType('bomb', 0);
    expect(tile.getTileType()).toBe('bomb');
  });

  it('updates hits remaining', () => {
    const tile = makeTile('A', 'ice', 2);
    tile.updateTileType('ice', 1);
    expect(tile.getHitsRemaining()).toBe(1);
  });

  it('redraws overlay when type changes', () => {
    const tile = makeTile('A', 'gold', 0);
    const overlay = getOverlayGraphics(tile);
    (overlay.fillStyle as jest.Mock).mockClear();

    tile.updateTileType('bomb', 0);

    const fillCalls = (overlay.fillStyle as jest.Mock).mock.calls;
    expect(fillCalls.length).toBeGreaterThan(0);
  });
});

// ─── Cracked states ───────────────────────────────────────────────────────────

describe('BlastTile cracked states', () => {
  it('ice at hitsRemaining=1 redraws overlay (cracked visual)', () => {
    const tile = makeTile('A', 'ice', 2);
    const overlay = getOverlayGraphics(tile);
    (overlay.fillStyle as jest.Mock).mockClear();

    tile.updateTileType('ice', 1);

    const fillCalls = (overlay.fillStyle as jest.Mock).mock.calls;
    expect(fillCalls.length).toBeGreaterThan(0);
  });

  it('prism at hitsRemaining=1 redraws overlay (about to detonate)', () => {
    const tile = makeTile('A', 'prism', 2);
    const overlay = getOverlayGraphics(tile);
    (overlay.fillStyle as jest.Mock).mockClear();

    tile.updateTileType('prism', 1);

    const fillCalls = (overlay.fillStyle as jest.Mock).mock.calls;
    expect(fillCalls.length).toBeGreaterThan(0);
  });

  it('gem progresses through 3 stages (hitsRemaining 3→2→1)', () => {
    const tile = makeTile('A', 'gem', 3);
    const overlay = getOverlayGraphics(tile);

    // Stage 2
    (overlay.fillStyle as jest.Mock).mockClear();
    tile.updateTileType('gem', 2);
    expect((overlay.fillStyle as jest.Mock).mock.calls.length).toBeGreaterThan(0);

    // Stage 1
    (overlay.fillStyle as jest.Mock).mockClear();
    tile.updateTileType('gem', 1);
    expect((overlay.fillStyle as jest.Mock).mock.calls.length).toBeGreaterThan(0);
  });
});

// ─── Diamond overlay ─────────────────────────────────────────────────────────

describe('BlastTile diamond overlay', () => {
  it('draws a diamond polygon shape via moveTo/lineTo for diamond type', () => {
    const tile = makeTile('A', 'diamond', 0);
    const overlay = getOverlayGraphics(tile);
    // Diamond overlay should use moveTo + lineTo for polygon (not just fillRoundedRect)
    const moveToFn = overlay.moveTo as jest.Mock | undefined;
    const lineToFn = overlay.lineTo as jest.Mock | undefined;
    // At minimum, moveTo and lineTo should have been called to draw the diamond shape
    expect(moveToFn).toBeDefined();
    expect(lineToFn).toBeDefined();
    expect(moveToFn!.mock.calls.length).toBeGreaterThan(0);
    expect(lineToFn!.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it('draws facet lines inside the diamond', () => {
    const tile = makeTile('A', 'diamond', 0);
    const overlay = getOverlayGraphics(tile);
    // Facets drawn as additional lineTo calls (6+ total: 4 for outline, 2+ for facets)
    const lineToFn = overlay.lineTo as jest.Mock | undefined;
    expect(lineToFn).toBeDefined();
    expect(lineToFn!.mock.calls.length).toBeGreaterThanOrEqual(6);
  });
});

// ─── playClearAnimation ───────────────────────────────────────────────────────

describe('BlastTile.playClearAnimation', () => {
  it('returns a Promise', () => {
    const tile = makeTile('A', 'gold', 0);
    const result = tile.playClearAnimation();
    expect(result).toBeInstanceOf(Promise);
  });

  it('creates a tween on the scene', () => {
    const tile = makeTile('A', 'bomb', 0);
    const scene = (tile as unknown as { scene: Phaser.Scene }).scene;
    const tweensSpy = scene.tweens.add as jest.Mock;
    const callsBefore = tweensSpy.mock.calls.length;

    // Don't await — the mock tween doesn't fire onComplete
    tile.playClearAnimation();

    expect(tweensSpy.mock.calls.length).toBeGreaterThan(callsBefore);
  });
});
