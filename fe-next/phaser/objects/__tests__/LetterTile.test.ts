/**
 * LetterTile — visual state and combo-color wiring tests.
 *
 * Verifies that:
 *  - select() accepts ComboHexColors and stores them for the tile's lifetime
 *  - submitAccept() uses the same combo colors set at select-time (no flash reset)
 *  - Idle tile draws with white background (0xffffff)
 *  - Font does not reference 'Fredoka' (unreliable in canvas)
 *
 * RED phase: tests fail until LetterTile is updated.
 */

import Phaser from 'phaser';
import { LetterTile } from '../LetterTile';
import type { ComboHexColors } from '@/lib/phaser/logic/ComboTracker';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeScene(): Phaser.Scene {
  return new Phaser.Scene();
}

const LIME_COMBO: ComboHexColors = {
  fillColor: 0xb8ff00,
  borderColor: 0x0d0d0d,
  textColor: 0x0d0d0d,
  glowColor: 0xb8ff00,
};

const PINK_COMBO: ComboHexColors = {
  fillColor: 0xff1493,
  borderColor: 0x0d0d0d,
  textColor: 0xffffff,
  glowColor: 0xff1493,
};

// ─── Constructor ──────────────────────────────────────────────────────────────

describe('LetterTile constructor', () => {
  it('creates tile in idle state', () => {
    const scene = makeScene();
    const tile = new LetterTile(scene, 0, 0, 'A', 80);
    expect(tile.getStatus()).toBe('idle');
  });

  it('exposes the correct letter', () => {
    const scene = makeScene();
    const tile = new LetterTile(scene, 0, 0, 'Q', 80);
    expect(tile.getLetter()).toBe('Q');
  });

  it('renders idle background as white (0xffffff)', () => {
    const scene = makeScene();
    const tile = new LetterTile(scene, 0, 0, 'A', 80);

    // bg is the internal graphics object created via scene.make.graphics()
    // The mock records all fillStyle calls — idle should include 0xffffff
    const makeGraphics = scene.make.graphics as jest.Mock;
    const bg = makeGraphics.mock.results[0]?.value;
    expect(bg).toBeDefined();

    const fillCalls: Array<[number, number]> = (bg.fillStyle as jest.Mock).mock.calls;
    const hasWhite = fillCalls.some(([color]) => color === 0xffffff);
    expect(hasWhite).toBe(true);
  });

  it('font uses system sans-serif for legibility at small tile sizes', () => {
    const scene = makeScene();
    new LetterTile(scene, 0, 0, 'A', 80);

    const makeText = scene.make.text as jest.Mock;
    const textConfig: Record<string, unknown> = makeText.mock.calls[0]?.[0];
    expect(textConfig).toBeDefined();
    const style = textConfig?.style as Record<string, unknown>;
    const fontFamily = String(style?.fontFamily ?? '').toLowerCase();
    // System sans-serif for instant letter recognition at small sizes
    expect(fontFamily).toContain('arial');
    expect(fontFamily).toContain('helvetica');
    expect(fontFamily).not.toContain('fredoka');
    // Bold for weight parity with Fredoka's thick strokes
    expect(style?.fontStyle).toBe('bold');
  });
});

// ─── select ───────────────────────────────────────────────────────────────────

describe('LetterTile.select', () => {
  it('transitions to selected state', () => {
    const scene = makeScene();
    const tile = new LetterTile(scene, 0, 0, 'A', 80);
    tile.select(0, LIME_COMBO);
    expect(tile.getStatus()).toBe('selected');
  });

  it('draws the combo fill color on selection', () => {
    const scene = makeScene();
    const tile = new LetterTile(scene, 0, 0, 'A', 80);

    const makeGraphics = scene.make.graphics as jest.Mock;
    const bg = makeGraphics.mock.results[0]?.value;
    (bg.fillStyle as jest.Mock).mockClear();

    tile.select(0, LIME_COMBO);

    const fillCalls: Array<[number, number]> = (bg.fillStyle as jest.Mock).mock.calls;
    const hasComboColor = fillCalls.some(([color]) => color === LIME_COMBO.fillColor);
    expect(hasComboColor).toBe(true);
  });

  it('uses the provided combo fill — pink at higher combo', () => {
    const scene = makeScene();
    const tile = new LetterTile(scene, 0, 0, 'A', 80);

    const makeGraphics = scene.make.graphics as jest.Mock;
    const bg = makeGraphics.mock.results[0]?.value;
    (bg.fillStyle as jest.Mock).mockClear();

    tile.select(0, PINK_COMBO);

    const fillCalls: Array<[number, number]> = (bg.fillStyle as jest.Mock).mock.calls;
    const hasPink = fillCalls.some(([color]) => color === PINK_COMBO.fillColor);
    expect(hasPink).toBe(true);
  });
});

// ─── submitAccept ─────────────────────────────────────────────────────────────

describe('LetterTile.submitAccept', () => {
  it('retains combo fill color after accept', () => {
    const scene = makeScene();
    const tile = new LetterTile(scene, 0, 0, 'A', 80);
    tile.select(0, PINK_COMBO);

    const makeGraphics = scene.make.graphics as jest.Mock;
    const bg = makeGraphics.mock.results[0]?.value;
    (bg.fillStyle as jest.Mock).mockClear();

    tile.submitAccept();
    expect(tile.getStatus()).toBe('submitted-accept');

    const fillCalls: Array<[number, number]> = (bg.fillStyle as jest.Mock).mock.calls;
    const hasComboColor = fillCalls.some(([color]) => color === PINK_COMBO.fillColor);
    expect(hasComboColor).toBe(true);
  });
});

// ─── submitReject ─────────────────────────────────────────────────────────────

describe('LetterTile.submitReject', () => {
  it('transitions to submitted-reject state', () => {
    const scene = makeScene();
    const tile = new LetterTile(scene, 0, 0, 'A', 80);
    tile.select(0, LIME_COMBO);
    tile.submitReject();
    expect(tile.getStatus()).toBe('submitted-reject');
  });
});

// ─── reset ────────────────────────────────────────────────────────────────────

describe('LetterTile.reset', () => {
  it('returns to idle after select', () => {
    const scene = makeScene();
    const tile = new LetterTile(scene, 0, 0, 'A', 80);
    tile.select(0, LIME_COMBO);
    tile.reset();
    expect(tile.getStatus()).toBe('idle');
  });

  it('returns to idle after submitAccept', () => {
    const scene = makeScene();
    const tile = new LetterTile(scene, 0, 0, 'A', 80);
    tile.select(0, LIME_COMBO);
    tile.submitAccept();
    tile.reset();
    expect(tile.getStatus()).toBe('idle');
  });

  it('re-renders idle background as white after reset', () => {
    const scene = makeScene();
    const tile = new LetterTile(scene, 0, 0, 'A', 80);
    tile.select(0, PINK_COMBO);
    tile.submitAccept();

    const makeGraphics = scene.make.graphics as jest.Mock;
    const bg = makeGraphics.mock.results[0]?.value;
    (bg.fillStyle as jest.Mock).mockClear();

    tile.reset();

    const fillCalls: Array<[number, number]> = (bg.fillStyle as jest.Mock).mock.calls;
    const hasWhite = fillCalls.some(([color]) => color === 0xffffff);
    expect(hasWhite).toBe(true);
  });
});

// ─── Hint glow ──────────────────────────────────────────────────────────────

describe('LetterTile hint glow', () => {
  it('isHintHighlighted is false by default', () => {
    const scene = makeScene();
    const tile = new LetterTile(scene, 0, 0, 'A', 80);
    expect(tile.isHintHighlighted).toBe(false);
  });

  it('showHintGlow makes isHintHighlighted true', () => {
    const scene = makeScene();
    const tile = new LetterTile(scene, 0, 0, 'A', 80);
    tile.showHintGlow();
    expect(tile.isHintHighlighted).toBe(true);
  });

  it('showHintGlow creates a graphics child and a pulse tween', () => {
    const scene = makeScene();
    const tile = new LetterTile(scene, 0, 0, 'A', 80);

    const makeGraphicsBefore = (scene.make.graphics as jest.Mock).mock.calls.length;
    tile.showHintGlow();
    const makeGraphicsAfter = (scene.make.graphics as jest.Mock).mock.calls.length;

    // Should have created one new graphics for the glow ring
    expect(makeGraphicsAfter - makeGraphicsBefore).toBe(1);

    // Pulse tween added
    expect(scene.tweens.add).toHaveBeenCalled();
  });

  it('showHintGlow is idempotent — calling twice does not duplicate glow', () => {
    const scene = makeScene();
    const tile = new LetterTile(scene, 0, 0, 'A', 80);

    const makeGraphicsBefore = (scene.make.graphics as jest.Mock).mock.calls.length;
    tile.showHintGlow();
    tile.showHintGlow();
    const makeGraphicsAfter = (scene.make.graphics as jest.Mock).mock.calls.length;

    // Only one glow created despite two calls
    expect(makeGraphicsAfter - makeGraphicsBefore).toBe(1);
  });

  it('showHintGlow with reduceMotion skips the pulse tween', () => {
    const scene = makeScene();
    const tile = new LetterTile(scene, 0, 0, 'A', 80);

    (scene.tweens.add as jest.Mock).mockClear();
    tile.showHintGlow(true);

    // No pulse tween when reduce motion
    expect(scene.tweens.add).not.toHaveBeenCalled();
    // But glow ring is still visible
    expect(tile.isHintHighlighted).toBe(true);
  });

  it('clearHintGlow removes the glow', () => {
    const scene = makeScene();
    const tile = new LetterTile(scene, 0, 0, 'A', 80);

    tile.showHintGlow();
    expect(tile.isHintHighlighted).toBe(true);

    tile.clearHintGlow();
    expect(tile.isHintHighlighted).toBe(false);
  });

  it('clearHintGlow is safe to call when no glow is shown', () => {
    const scene = makeScene();
    const tile = new LetterTile(scene, 0, 0, 'A', 80);

    // Should not throw
    expect(() => tile.clearHintGlow()).not.toThrow();
    expect(tile.isHintHighlighted).toBe(false);
  });
});
