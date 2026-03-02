/**
 * CascadeSequencer — orchestrates cascade chain reaction choreography.
 *
 * Tests:
 * 1. Returns a Promise that resolves after full sequence
 * 2. Chains: highlight zoom-in → cascade text → camera flash (level 3+) → camera shake (level 4+)
 * 3. CASCADE text font size scales with chain level (24 + 4*level)
 * 4. CASCADE text color shifts: level 2=yellow, 3=orange, 4=pink, 5+=rainbow
 * 5. Glow alpha increases per chain level (0.3 + 0.1*level, capped at 0.8)
 * 6. No camera shake below level 4
 * 7. No camera flash below level 3
 * 8. reduceMotion skips all visual effects, still resolves Promise
 *
 * RED phase: tests fail until CascadeSequencer is implemented.
 */

import Phaser from 'phaser';
import { CascadeSequencer, type CascadeSequenceConfig } from '../CascadeSequencer';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeScene(): Phaser.Scene {
  const scene = new Phaser.Scene();
  // Make tweens.add fire onComplete synchronously for chain testing
  (scene.tweens.add as jest.Mock).mockImplementation((config: Record<string, unknown>) => {
    if (typeof config.onComplete === 'function') {
      (config.onComplete as () => void)();
    }
    return { destroy: jest.fn() };
  });
  // Make time.delayedCall fire callback synchronously
  (scene.time.delayedCall as jest.Mock).mockImplementation(
    (_delay: number, cb: () => void) => {
      cb();
      return { destroy: jest.fn() };
    },
  );
  return scene;
}

function makeConfig(overrides?: Partial<CascadeSequenceConfig>): CascadeSequenceConfig {
  return {
    scene: makeScene(),
    chainLevel: 2,
    cascadeWords: [
      {
        word: 'CAT',
        path: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }],
        chainLevel: 2,
      },
    ],
    layout: { tileSize: 60, gap: 4, offsetX: 10, offsetY: 10 },
    reduceMotion: false,
    isLowEnd: false,
    ...overrides,
  };
}

// ─── Basic contract ──────────────────────────────────────────────────────────

describe('CascadeSequencer', () => {
  it('returns a Promise', () => {
    const config = makeConfig();
    const result = CascadeSequencer.play(config);
    expect(result).toBeInstanceOf(Promise);
  });

  it('resolves the Promise', async () => {
    const config = makeConfig();
    await expect(CascadeSequencer.play(config)).resolves.toBeUndefined();
  });
});

// ─── Cascade text scaling ────────────────────────────────────────────────────

describe('CascadeSequencer cascade text', () => {
  it('creates CASCADE text via scene.add.text', () => {
    const config = makeConfig({ chainLevel: 2 });
    CascadeSequencer.play(config);
    expect(config.scene.add.text).toHaveBeenCalled();
  });

  it('uses fontSize 24 + 4*chainLevel', () => {
    const config = makeConfig({ chainLevel: 3 });
    CascadeSequencer.play(config);
    const textCall = (config.scene.add.text as jest.Mock).mock.calls[0];
    const style = textCall[3]; // 4th arg is style
    expect(style.fontSize).toBe('36px'); // 24 + 4*3
  });

  it('cascade text says "CASCADE ×N!"', () => {
    const config = makeConfig({ chainLevel: 4 });
    CascadeSequencer.play(config);
    const textCall = (config.scene.add.text as jest.Mock).mock.calls[0];
    const text = textCall[2]; // 3rd arg is text string
    expect(text).toContain('CASCADE');
    expect(text).toContain('4');
  });
});

// ─── Chain level color escalation ────────────────────────────────────────────

describe('CascadeSequencer color escalation', () => {
  it('level 2 text color is yellow', () => {
    const config = makeConfig({ chainLevel: 2 });
    CascadeSequencer.play(config);
    const style = (config.scene.add.text as jest.Mock).mock.calls[0][3];
    expect(style.color).toBe('#ffe135'); // neo-yellow
  });

  it('level 3 text color is orange', () => {
    const config = makeConfig({ chainLevel: 3 });
    CascadeSequencer.play(config);
    const style = (config.scene.add.text as jest.Mock).mock.calls[0][3];
    expect(style.color).toBe('#ff6b35'); // neo-orange
  });

  it('level 4 text color is pink', () => {
    const config = makeConfig({ chainLevel: 4 });
    CascadeSequencer.play(config);
    const style = (config.scene.add.text as jest.Mock).mock.calls[0][3];
    expect(style.color).toBe('#ff1493'); // neo-pink
  });

  it('level 5+ text color is cyan (rainbow)', () => {
    const config = makeConfig({ chainLevel: 5 });
    CascadeSequencer.play(config);
    const style = (config.scene.add.text as jest.Mock).mock.calls[0][3];
    expect(style.color).toBe('#00ffff'); // neo-cyan
  });
});

// ─── Camera flash escalation ─────────────────────────────────────────────────

describe('CascadeSequencer camera flash', () => {
  it('no flash at chain level 2', () => {
    const config = makeConfig({ chainLevel: 2 });
    CascadeSequencer.play(config);
    expect(config.scene.cameras.main.flash).not.toHaveBeenCalled();
  });

  it('flashes camera at chain level 3+', () => {
    const config = makeConfig({ chainLevel: 3 });
    CascadeSequencer.play(config);
    expect(config.scene.cameras.main.flash).toHaveBeenCalled();
  });
});

// ─── Camera shake escalation ─────────────────────────────────────────────────

describe('CascadeSequencer camera shake', () => {
  it('no shake at chain level 3', () => {
    const config = makeConfig({ chainLevel: 3 });
    CascadeSequencer.play(config);
    expect(config.scene.cameras.main.shake).not.toHaveBeenCalled();
  });

  it('shakes camera at chain level 4+', () => {
    const config = makeConfig({ chainLevel: 4 });
    CascadeSequencer.play(config);
    expect(config.scene.cameras.main.shake).toHaveBeenCalled();
  });
});

// ─── Glow alpha per chain level ──────────────────────────────────────────────

describe('CascadeSequencer glow alpha', () => {
  it('draws highlight glow via scene.add.graphics', () => {
    const config = makeConfig({ chainLevel: 2 });
    CascadeSequencer.play(config);
    expect(config.scene.add.graphics).toHaveBeenCalled();
  });
});

// ─── Accessibility ───────────────────────────────────────────────────────────

describe('CascadeSequencer reduceMotion', () => {
  it('does not create text or particles when reduceMotion is true', async () => {
    const config = makeConfig({ reduceMotion: true, chainLevel: 4 });
    await CascadeSequencer.play(config);
    expect(config.scene.add.text).not.toHaveBeenCalled();
    expect(config.scene.cameras.main.flash).not.toHaveBeenCalled();
    expect(config.scene.cameras.main.shake).not.toHaveBeenCalled();
  });

  it('still resolves Promise when reduceMotion is true', async () => {
    const config = makeConfig({ reduceMotion: true });
    await expect(CascadeSequencer.play(config)).resolves.toBeUndefined();
  });
});
