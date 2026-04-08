/**
 * Tests for Worlds 6-10 full theme implementations.
 * Validates complete theme structure, unique palettes, and registry integration.
 */

import { WORLD_6_THEME } from '../world6';
import { WORLD_7_THEME } from '../world7';
import { WORLD_8_THEME } from '../world8';
import { WORLD_9_THEME } from '../world9';
import { WORLD_10_THEME } from '../world10';
import { getWorldTheme, isThemeImplemented } from '../index';
import type { WorldTheme, HUDTheme, BossFightTheme } from '../types';

const ALL_WORLDS_6_10: WorldTheme[] = [
  WORLD_6_THEME,
  WORLD_7_THEME,
  WORLD_8_THEME,
  WORLD_9_THEME,
  WORLD_10_THEME,
];

const EXPECTED_IDENTITIES: Record<number, {
  nameKey: string;
  themeId: string;
  mechanic: string;
  arenaEffect: string;
  containerClass: string;
}> = {
  6: { nameKey: 'adventure.worlds.anagramLabyrinth', themeId: 'escher-maze', mechanic: 'scrambledReality', arenaEffect: 'maze', containerClass: 'world-labyrinth' },
  7: { nameKey: 'adventure.worlds.mirrorPalace', themeId: 'reflective-glass', mechanic: 'mirrorMatch', arenaEffect: 'mirror', containerClass: 'world-palace' },
  8: { nameKey: 'adventure.worlds.neologismNebula', themeId: 'space-stars', mechanic: 'stellarForge', arenaEffect: 'starfield', containerClass: 'world-nebula' },
  9: { nameKey: 'adventure.worlds.polyglotPeaks', themeId: 'mountain-aurora', mechanic: 'babelSummit', arenaEffect: 'aurora', containerClass: 'world-peaks' },
  10: { nameKey: 'adventure.worlds.lexiconThrone', themeId: 'golden-library', mechanic: 'finalWord', arenaEffect: 'dragon-library', containerClass: 'world-throne' },
};

const TILE_TYPES = [
  'standard', 'gold', 'ice', 'bomb', 'rainbow', 'chain', 'time', 'locked', 'multiplier',
] as const;

describe('Worlds 6-10: Full Theme Implementations', () => {
  describe.each(ALL_WORLDS_6_10.map((w) => [w.id, w]))('World %i', (_id, theme) => {
    const world = theme as WorldTheme;
    const expected = EXPECTED_IDENTITIES[world.id];

    describe('Theme Identity', () => {
      it('has correct world ID', () => {
        expect(world.id).toBe(_id);
      });

      it('has correct name key', () => {
        expect(world.nameKey).toBe(expected.nameKey);
      });

      it('has correct theme ID', () => {
        expect(world.themeId).toBe(expected.themeId);
      });

      it('has correct mechanic', () => {
        expect(world.mechanic).toBe(expected.mechanic);
      });

      it('has correct container class', () => {
        expect(world.containerClass).toBe(expected.containerClass);
      });
    });

    describe('Color Palette', () => {
      it('has all 9 color fields', () => {
        const c = world.colors;
        expect(c.primary).toBeDefined();
        expect(c.secondary).toBeDefined();
        expect(c.accent).toBeDefined();
        expect(c.backgroundTint).toBeDefined();
        expect(c.textLight).toBeDefined();
        expect(c.textDark).toBeDefined();
        expect(c.success).toBeDefined();
        expect(c.warning).toBeDefined();
        expect(c.danger).toBeDefined();
      });
    });

    describe('Background', () => {
      it('has baseColor with gradient', () => {
        // Tailwind v4 uses 'bg-linear-to-*' syntax instead of 'bg-gradient-to-*'
        expect(world.background.baseColor).toMatch(/bg-linear|bg-gradient/);
      });

      it('has 3 parallax layers', () => {
        expect(world.background.layers.length).toBeGreaterThanOrEqual(3);
      });

      it('layers have increasing depth', () => {
        const depths = world.background.layers.map((l) => l.depth);
        for (let i = 1; i < depths.length; i++) {
          expect(depths[i]).toBeGreaterThan(depths[i - 1]);
        }
      });

      it('all layers have unique IDs', () => {
        const ids = world.background.layers.map((l) => l.id);
        expect(new Set(ids).size).toBe(ids.length);
      });

      it('has texture config', () => {
        expect(world.background.texture).toBeDefined();
      });

      it('has particle config', () => {
        expect(world.background.particles).toBeDefined();
        expect(world.background.particles.count).toBeLessThanOrEqual(50);
      });
    });

    describe('Tile Styles', () => {
      it('has all 9 tile types defined', () => {
        for (const type of TILE_TYPES) {
          expect(world.tileStyles[type]).toBeDefined();
        }
      });

      it('standard tile has hard shadow', () => {
        expect(world.tileStyles.standard.shadowStyle).toBe('hard');
      });

      it('locked tile has lock overlay', () => {
        expect(world.tileStyles.locked.overlayType).toBe('lock');
      });

      it('gold tile has sparkle overlay', () => {
        expect(world.tileStyles.gold.overlayType).toBe('sparkle');
      });
    });

    describe('Modifier Display', () => {
      it('is visible', () => {
        expect(world.modifierDisplay.visible).toBe(true);
      });

      it('has icon defined', () => {
        expect(world.modifierDisplay.icon).toBeDefined();
      });
    });

    describe('Animations', () => {
      it('has valid tile entry type', () => {
        const validTypes = ['fade', 'cascade', 'spiral', 'explode', 'wave', 'slide-up', 'zoom'];
        expect(validTypes).toContain(world.animations.tileEntry);
      });

      it('has speed multiplier between 0.5 and 2.0', () => {
        expect(world.animations.speedMultiplier).toBeGreaterThanOrEqual(0.5);
        expect(world.animations.speedMultiplier).toBeLessThanOrEqual(2.0);
      });
    });

    describe('Chapter Structure', () => {
      it('has 3 chapters', () => {
        expect(world.chapters).toHaveLength(3);
      });

      it('follows 2-2-3 level structure', () => {
        expect(world.chapters[0].levelCount).toBe(2);
        expect(world.chapters[1].levelCount).toBe(2);
        expect(world.chapters[2].levelCount).toBe(3);
      });

      it('chapter 3 is boss chapter', () => {
        expect(world.chapters[2].isBossChapter).toBe(true);
        expect(world.chapters[0].isBossChapter).toBe(false);
        expect(world.chapters[1].isBossChapter).toBe(false);
      });

      it('has correct starting levels', () => {
        expect(world.chapters[0].startLevel).toBe(1);
        expect(world.chapters[1].startLevel).toBe(3);
        expect(world.chapters[2].startLevel).toBe(5);
      });
    });

    describe('HUD Theme', () => {
      it('has hud defined', () => {
        expect(world.hud).toBeDefined();
      });

      it('headerBg starts with bg-', () => {
        expect(world.hud!.headerBg).toMatch(/^bg-/);
      });
    });

    describe('Timer Urgency Theme', () => {
      it('has timerTheme defined', () => {
        expect(world.timerTheme).toBeDefined();
      });

      it('has all 4 urgency levels', () => {
        expect(world.timerTheme!.normal).toBeDefined();
        expect(world.timerTheme!.warning).toBeDefined();
        expect(world.timerTheme!.danger).toBeDefined();
        expect(world.timerTheme!.critical).toBeDefined();
      });
    });

    describe('Boss Fight Theme', () => {
      it('has bossFight defined', () => {
        expect(world.bossFight).toBeDefined();
      });

      it('has correct arena effect', () => {
        expect(world.bossFight!.arenaEffect).toBe(expected.arenaEffect);
      });

      it('has 3 HP segment colors', () => {
        expect(world.bossFight!.hpSegmentColors).toHaveLength(3);
      });

      it('has all 3 phase colors', () => {
        expect(world.bossFight!.phaseColors.phase1).toBeDefined();
        expect(world.bossFight!.phaseColors.phase2).toBeDefined();
        expect(world.bossFight!.phaseColors.enraged).toBeDefined();
      });
    });
  });

  describe('Registry Integration', () => {
    it.each([6, 7, 8, 9, 10])('world %i is registered in theme index', (id) => {
      const theme = getWorldTheme(id);
      expect(theme.id).toBe(id);
    });

    it.each([6, 7, 8, 9, 10])('world %i is marked as implemented', (id) => {
      expect(isThemeImplemented(id)).toBe(true);
    });
  });

  describe('Uniqueness', () => {
    it('all 5 worlds have unique primary colors', () => {
      const primaries = ALL_WORLDS_6_10.map((w) => w.colors.primary);
      expect(new Set(primaries).size).toBe(5);
    });

    it('all 5 worlds have unique arena effects', () => {
      const effects = ALL_WORLDS_6_10.map((w) => w.bossFight!.arenaEffect);
      expect(new Set(effects).size).toBe(5);
    });

    it('all 5 worlds have unique container classes', () => {
      const classes = ALL_WORLDS_6_10.map((w) => w.containerClass);
      expect(new Set(classes).size).toBe(5);
    });

    it('all 5 worlds have unique HUD headerBg', () => {
      const bgs = ALL_WORLDS_6_10.map((w) => w.hud!.headerBg);
      expect(new Set(bgs).size).toBe(5);
    });
  });
});
