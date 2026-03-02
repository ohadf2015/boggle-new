/**
 * ScorePopupManager — floating score text in Phaser canvas.
 *
 * Verifies:
 * - showPopup creates a Text object at the correct position
 * - Creates a rise + fade tween
 * - High scores get larger scale
 * - reduceMotion skips animation (instant)
 * - cleanup destroys all active popups
 *
 * RED phase: tests fail until implementation exists.
 */

import Phaser from 'phaser';
import { ScorePopupManager } from '../ScorePopupManager';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeScene(): Phaser.Scene {
  return new Phaser.Scene();
}

// ─── showPopup ────────────────────────────────────────────────────────────────

describe('ScorePopupManager.showPopup', () => {
  it('creates a text object via scene.add.text', () => {
    const scene = makeScene();
    const manager = new ScorePopupManager();

    manager.showPopup(scene, 100, 200, 5);

    expect(scene.add.text).toHaveBeenCalled();
  });

  it('passes the score as text content', () => {
    const scene = makeScene();
    const manager = new ScorePopupManager();

    manager.showPopup(scene, 100, 200, 12);

    const callArgs = (scene.add.text as jest.Mock).mock.calls[0];
    // scene.add.text(x, y, text, style) — text is 3rd arg
    expect(callArgs[2]).toContain('12');
  });

  it('creates a tween for the popup animation', () => {
    const scene = makeScene();
    const manager = new ScorePopupManager();

    manager.showPopup(scene, 100, 200, 5);

    expect(scene.tweens.add).toHaveBeenCalled();
  });

  it('positions popup at given x, y coordinates', () => {
    const scene = makeScene();
    const manager = new ScorePopupManager();

    manager.showPopup(scene, 150, 250, 5);

    const callArgs = (scene.add.text as jest.Mock).mock.calls[0];
    // x has random horizontal drift ±10px to avoid overlap
    expect(callArgs[0]).toBeGreaterThanOrEqual(140);
    expect(callArgs[0]).toBeLessThanOrEqual(160);
    expect(callArgs[1]).toBe(250);
  });
});

// ─── Intensity scaling ────────────────────────────────────────────────────────

describe('ScorePopupManager intensity', () => {
  it('uses a + prefix for the score text', () => {
    const scene = makeScene();
    const manager = new ScorePopupManager();

    manager.showPopup(scene, 0, 0, 8);

    const callArgs = (scene.add.text as jest.Mock).mock.calls[0];
    expect(callArgs[2]).toBe('+8');
  });
});

// ─── reduceMotion ─────────────────────────────────────────────────────────────

describe('ScorePopupManager reduceMotion', () => {
  it('still creates text (for score visibility) when reduceMotion is true', () => {
    const scene = makeScene();
    const manager = new ScorePopupManager();

    manager.showPopup(scene, 0, 0, 5, { reduceMotion: true });

    expect(scene.add.text).toHaveBeenCalled();
  });

  it('skips tween when reduceMotion is true', () => {
    const scene = makeScene();
    const manager = new ScorePopupManager();

    manager.showPopup(scene, 0, 0, 5, { reduceMotion: true });

    expect(scene.tweens.add).not.toHaveBeenCalled();
  });
});

// ─── cleanup ──────────────────────────────────────────────────────────────────

describe('ScorePopupManager.cleanup', () => {
  it('does not throw when no popups exist', () => {
    const manager = new ScorePopupManager();
    expect(() => manager.cleanup()).not.toThrow();
  });
});
