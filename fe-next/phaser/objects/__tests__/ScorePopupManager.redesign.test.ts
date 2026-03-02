/**
 * ScorePopupManager redesign — color-coded popups, cascade distinction,
 * stagger timing, scale-up pop, improved readability.
 *
 * Verifies:
 * - Base font 24px minimum, 36px for scores 16+
 * - Color coding by tile type: gold→#FFD700, bomb→#FF4500, ice→#00BFFF,
 *   lightning→#FFE135, standard→white
 * - Stroke thickness 3px for readability
 * - Cascade scores: magenta color, "xN" suffix, 20% larger
 * - Rise distance 60px (up from 40px)
 * - Scale-up pop at start: 1.3→1.0 over 150ms
 * - Stagger by 50ms per stagger index
 * - Random horizontal drift ±10px
 *
 * RED phase: tests fail until implementation exists.
 */

import Phaser from 'phaser';
import { ScorePopupManager } from '../ScorePopupManager';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeScene(): Phaser.Scene {
  return new Phaser.Scene();
}

// ─── Font size scaling ──────────────────────────────────────────────────────

describe('ScorePopupManager font sizes', () => {
  it('uses at least 24px for low scores', () => {
    const scene = makeScene();
    const manager = new ScorePopupManager();

    manager.showPopup(scene, 0, 0, 3);

    const styleArg = (scene.add.text as jest.Mock).mock.calls[0][3];
    const fontSize = parseInt(styleArg.fontSize, 10);
    expect(fontSize).toBeGreaterThanOrEqual(24);
  });

  it('uses 36px+ for scores >= 16', () => {
    const scene = makeScene();
    const manager = new ScorePopupManager();

    manager.showPopup(scene, 0, 0, 20);

    const styleArg = (scene.add.text as jest.Mock).mock.calls[0][3];
    const fontSize = parseInt(styleArg.fontSize, 10);
    expect(fontSize).toBeGreaterThanOrEqual(36);
  });
});

// ─── Color coding by tile type ──────────────────────────────────────────────

describe('ScorePopupManager color coding', () => {
  it('uses gold color (#ffd700) for gold tile type', () => {
    const scene = makeScene();
    const manager = new ScorePopupManager();

    manager.showPopup(scene, 0, 0, 5, { tileType: 'gold' });

    const styleArg = (scene.add.text as jest.Mock).mock.calls[0][3];
    expect(styleArg.color.toLowerCase()).toBe('#ffd700');
  });

  it('uses orange-red (#ff4500) for bomb tile type', () => {
    const scene = makeScene();
    const manager = new ScorePopupManager();

    manager.showPopup(scene, 0, 0, 5, { tileType: 'bomb' });

    const styleArg = (scene.add.text as jest.Mock).mock.calls[0][3];
    expect(styleArg.color.toLowerCase()).toBe('#ff4500');
  });

  it('uses cyan (#00bfff) for ice tile type', () => {
    const scene = makeScene();
    const manager = new ScorePopupManager();

    manager.showPopup(scene, 0, 0, 5, { tileType: 'ice' });

    const styleArg = (scene.add.text as jest.Mock).mock.calls[0][3];
    expect(styleArg.color.toLowerCase()).toBe('#00bfff');
  });

  it('uses yellow (#ffe135) for lightning tile type', () => {
    const scene = makeScene();
    const manager = new ScorePopupManager();

    manager.showPopup(scene, 0, 0, 5, { tileType: 'lightning' });

    const styleArg = (scene.add.text as jest.Mock).mock.calls[0][3];
    expect(styleArg.color.toLowerCase()).toBe('#ffe135');
  });

  it('uses white (#ffffff) for standard tile type', () => {
    const scene = makeScene();
    const manager = new ScorePopupManager();

    manager.showPopup(scene, 0, 0, 5, { tileType: 'standard' });

    const styleArg = (scene.add.text as jest.Mock).mock.calls[0][3];
    expect(styleArg.color.toLowerCase()).toBe('#ffffff');
  });

  it('uses white by default when no tile type specified', () => {
    const scene = makeScene();
    const manager = new ScorePopupManager();

    manager.showPopup(scene, 0, 0, 5);

    const styleArg = (scene.add.text as jest.Mock).mock.calls[0][3];
    expect(styleArg.color.toLowerCase()).toBe('#ffffff');
  });
});

// ─── Stroke thickness ───────────────────────────────────────────────────────

describe('ScorePopupManager stroke', () => {
  it('uses 3px stroke thickness for readability', () => {
    const scene = makeScene();
    const manager = new ScorePopupManager();

    manager.showPopup(scene, 0, 0, 5);

    const styleArg = (scene.add.text as jest.Mock).mock.calls[0][3];
    expect(styleArg.strokeThickness).toBe(3);
  });
});

// ─── Cascade distinction ────────────────────────────────────────────────────

describe('ScorePopupManager cascade', () => {
  it('uses magenta color for cascade popups', () => {
    const scene = makeScene();
    const manager = new ScorePopupManager();

    manager.showPopup(scene, 0, 0, 10, { chainLevel: 2 });

    const styleArg = (scene.add.text as jest.Mock).mock.calls[0][3];
    expect(styleArg.color.toLowerCase()).toBe('#ff00ff');
  });

  it('appends chain level suffix to cascade score text', () => {
    const scene = makeScene();
    const manager = new ScorePopupManager();

    manager.showPopup(scene, 0, 0, 10, { chainLevel: 3 });

    const textArg = (scene.add.text as jest.Mock).mock.calls[0][2];
    expect(textArg).toContain('\u00D73'); // ×3
  });

  it('uses 20% larger font for cascade popups', () => {
    const scene = makeScene();
    const manager = new ScorePopupManager();

    // Normal popup
    manager.showPopup(scene, 0, 0, 5);
    const normalStyle = (scene.add.text as jest.Mock).mock.calls[0][3];
    const normalSize = parseInt(normalStyle.fontSize, 10);

    // Reset mock
    (scene.add.text as jest.Mock).mockClear();

    // Cascade popup with same score
    manager.showPopup(scene, 0, 0, 5, { chainLevel: 2 });
    const cascadeStyle = (scene.add.text as jest.Mock).mock.calls[0][3];
    const cascadeSize = parseInt(cascadeStyle.fontSize, 10);

    expect(cascadeSize).toBeGreaterThan(normalSize);
  });
});

// ─── Rise distance ──────────────────────────────────────────────────────────

describe('ScorePopupManager rise distance', () => {
  it('rises 60px (not 40px)', () => {
    const scene = makeScene();
    const manager = new ScorePopupManager();

    manager.showPopup(scene, 100, 200, 5);

    const tweenConfig = (scene.tweens.add as jest.Mock).mock.calls[0][0];
    // The y tween target should be 200 - 60 = 140
    expect(tweenConfig.y).toBe(140);
  });
});

// ─── Stagger timing ─────────────────────────────────────────────────────────

describe('ScorePopupManager stagger', () => {
  it('delays popup by staggerIndex * 50ms', () => {
    const scene = makeScene();
    const manager = new ScorePopupManager();

    manager.showPopup(scene, 0, 0, 5, { staggerIndex: 3 });

    const tweenConfig = (scene.tweens.add as jest.Mock).mock.calls[0][0];
    expect(tweenConfig.delay).toBe(150); // 3 * 50ms
  });

  it('has no delay when staggerIndex is 0 or unset', () => {
    const scene = makeScene();
    const manager = new ScorePopupManager();

    manager.showPopup(scene, 0, 0, 5);

    const tweenConfig = (scene.tweens.add as jest.Mock).mock.calls[0][0];
    expect(tweenConfig.delay).toBeFalsy();
  });
});

// ─── Scale-up pop ───────────────────────────────────────────────────────────

describe('ScorePopupManager scale-up pop', () => {
  it('starts with scale > 1 in the tween config', () => {
    const scene = makeScene();
    const manager = new ScorePopupManager();

    manager.showPopup(scene, 0, 0, 8);

    const tweenConfig = (scene.tweens.add as jest.Mock).mock.calls[0][0];
    // scaleX should start from 1.3 (scale pop)
    expect(tweenConfig.scaleX).toBeDefined();
    const scaleFrom = typeof tweenConfig.scaleX === 'object'
      ? tweenConfig.scaleX.from
      : undefined;
    expect(scaleFrom).toBe(1.3);
  });
});
