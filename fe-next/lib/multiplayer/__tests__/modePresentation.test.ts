import { describe, it, expect } from 'vitest';
import {
  getModePresentation,
  MODE_COLOR_FAMILIES,
  type ModeColorFamily,
} from '../modePresentation';

// Mirror of ALL_GAME_MODES in backend/modules/gameModeSelector.ts. Kept inline
// so this stays a pure unit test (no backend module graph / alias dependency).
const ALL_GAME_MODES = ['classic', 'blast', 'word-hunt', 'wheel-rush'] as const;

describe('getModePresentation', () => {
  it('returns a presentation for every rotation mode with all fields populated', () => {
    for (const mode of ALL_GAME_MODES) {
      const p = getModePresentation(mode);
      expect(p.mode).toBe(mode);
      expect(p.labelKey).toMatch(/^results\.modeTease\.label\./);
      expect(p.hookKey).toMatch(/^results\.modeTease\.hook\./);
      expect(p.icon.length).toBeGreaterThan(0);
      expect(MODE_COLOR_FAMILIES).toContain(p.color);
    }
  });

  it('gives the four rotation modes FOUR DISTINCT colors (council: visual mode identity)', () => {
    const rotation = ['classic', 'blast', 'word-hunt', 'wheel-rush'] as const;
    const colors = new Set<ModeColorFamily>(
      rotation.map((m) => getModePresentation(m).color),
    );
    expect(colors.size).toBe(4);
  });

  it('maps slugs consistently between label and hook keys', () => {
    expect(getModePresentation('classic').labelKey).toBe('results.modeTease.label.classic');
    expect(getModePresentation('classic').hookKey).toBe('results.modeTease.hook.classic');
    expect(getModePresentation('word-hunt').labelKey).toBe('results.modeTease.label.wordHunt');
    expect(getModePresentation('wheel-rush').hookKey).toBe('results.modeTease.hook.wheelRush');
  });

  it('covers the non-rotation modes too (word-tower, shiritori)', () => {
    expect(getModePresentation('word-tower').labelKey).toBe('results.modeTease.label.wordTower');
    expect(getModePresentation('word-tower').hookKey).toBe('results.modeTease.hook.wordTower');
    expect(getModePresentation('shiritori').labelKey).toBe('results.modeTease.label.shiritori');
  });

  it('falls back gracefully for unknown / "random" / null without a raw key', () => {
    for (const bad of ['random', 'totally-unknown', null, undefined, '']) {
      const p = getModePresentation(bad);
      expect(p.mode).toBe('random');
      expect(p.labelKey).toBe('results.modeTease.label.random');
      expect(p.hookKey).toBe('results.modeTease.hook.random');
      expect(MODE_COLOR_FAMILIES).toContain(p.color);
      expect(p.icon.length).toBeGreaterThan(0);
    }
  });
});
