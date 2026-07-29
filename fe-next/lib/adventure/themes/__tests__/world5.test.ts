/**
 * World 5: Compound Canyon Theme Tests
 *
 * Validates theme structure, configuration, and registry integration.
 */

import { WORLD_5_THEME } from '../world5';
import { getWorldTheme, isThemeImplemented } from '../index';

describe('World 5: Compound Canyon Theme', () => {
  describe('Theme Identity', () => {
    it('has correct world ID', () => {
      expect(WORLD_5_THEME.id).toBe(5);
    });

    it('has correct name key', () => {
      expect(WORLD_5_THEME.nameKey).toBe('adventure.worlds.compoundCanyon');
    });

    it('has desert-cliffs theme ID', () => {
      expect(WORLD_5_THEME.themeId).toBe('desert-cliffs');
    });

    it('has compounds mechanic', () => {
      expect(WORLD_5_THEME.mechanic).toBe('compounds');
    });

    it('has world-canyon container class', () => {
      expect(WORLD_5_THEME.containerClass).toBe('world-canyon');
    });
  });

  describe('Parallax Layers', () => {
    it('has 5 parallax layers', () => {
      expect(WORLD_5_THEME.background.layers).toHaveLength(5);
    });

    it('layers have increasing depth', () => {
      const depths = WORLD_5_THEME.background.layers.map((l) => l.depth);
      expect(depths).toEqual([0.1, 0.2, 0.35, 0.5, 0.65]);
    });

    it('all layers have unique IDs', () => {
      const ids = WORLD_5_THEME.background.layers.map((l) => l.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('all layers have canyon prefix', () => {
      WORLD_5_THEME.background.layers.forEach((layer) => {
        expect(layer.id).toMatch(/^canyon-/);
      });
    });

    it('all layers have valid opacity (0-1)', () => {
      WORLD_5_THEME.background.layers.forEach((layer) => {
        expect(layer.opacity).toBeGreaterThanOrEqual(0);
        expect(layer.opacity).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Particle Configuration', () => {
    it('has dust particle type', () => {
      expect(WORLD_5_THEME.background.particles.type).toBe('dust');
    });

    it('has desert particle variant', () => {
      expect(WORLD_5_THEME.background.particles.variant).toBe('desert');
    });

    it('has 10 particles (performance budget)', () => {
      expect(WORLD_5_THEME.background.particles.count).toBe(10);
    });

    it('has sandy/brown color palette', () => {
      expect(WORLD_5_THEME.background.particles.colors).toHaveLength(3);
      WORLD_5_THEME.background.particles.colors?.forEach((color) => {
        expect(color).toMatch(/^rgba\(/);
      });
    });

    it('has 1.0 speed (drifting dust)', () => {
      expect(WORLD_5_THEME.background.particles.speed).toBe(1.0);
    });
  });

  describe('Color Palette', () => {
    it('has neo-red as primary color', () => {
      expect(WORLD_5_THEME.colors.primary).toBe('neo-red');
    });

    it('has red-400 as secondary color', () => {
      expect(WORLD_5_THEME.colors.secondary).toBe('red-400');
    });

    it('has neo-orange as accent color', () => {
      expect(WORLD_5_THEME.colors.accent).toBe('neo-orange');
    });

    it('has red background tint', () => {
      expect(WORLD_5_THEME.colors.backgroundTint).toBe('red-900/20');
    });
  });

  describe('Tile Styles', () => {
    it('has all required tile styles', () => {
      const styles = WORLD_5_THEME.tileStyles;
      expect(styles.standard).toBeDefined();
      expect(styles.gold).toBeDefined();
      expect(styles.ice).toBeDefined();
      expect(styles.bomb).toBeDefined();
      expect(styles.rainbow).toBeDefined();
      expect(styles.chain).toBeDefined();
      expect(styles.time).toBeDefined();
      expect(styles.locked).toBeDefined();
      expect(styles.multiplier).toBeDefined();
    });

    it('standard tile has amber/orange gradient (desert sandstone)', () => {
      expect(WORLD_5_THEME.tileStyles.standard.gradientFrom).toBe('amber-100');
      expect(WORLD_5_THEME.tileStyles.standard.gradientTo).toBe('orange-200');
    });

    it('standard tile has hard shadow (desert rock look)', () => {
      expect(WORLD_5_THEME.tileStyles.standard.shadowStyle).toBe('hard');
    });

    it('gold tile has red/orange glow', () => {
      expect(WORLD_5_THEME.tileStyles.gold.shadowColor).toContain('255, 100, 50');
    });
  });

  describe('Modifier Display', () => {
    it('is visible (compound word mechanic active)', () => {
      expect(WORLD_5_THEME.modifierDisplay.visible).toBe(true);
    });

    it('uses neo-red styling', () => {
      expect(WORLD_5_THEME.modifierDisplay.backgroundColor).toBe('bg-neo-red/20');
      expect(WORLD_5_THEME.modifierDisplay.borderColor).toBe('border-neo-red');
      expect(WORLD_5_THEME.modifierDisplay.textColor).toBe('text-neo-red');
    });

    it('has Plus icon for compound words', () => {
      expect(WORLD_5_THEME.modifierDisplay.icon).toBeDefined();
    });

    it('has red glow color', () => {
      expect(WORLD_5_THEME.modifierDisplay.glowColor).toBe('rgba(255, 0, 0, 0.5)');
    });
  });

  describe('Animations', () => {
    it('uses slide-up tile entry (rising from canyon floor)', () => {
      expect(WORLD_5_THEME.animations.tileEntry).toBe('slide-up');
    });

    it('has 1.0x speed multiplier (normal pace)', () => {
      expect(WORLD_5_THEME.animations.speedMultiplier).toBe(1.0);
    });

    it('has neo-red selection ring-3', () => {
      expect(WORLD_5_THEME.animations.tileSelect).toContain('ring-neo-red');
    });
  });

  describe('Chapter Structure', () => {
    it('has 3 chapters with 2-2-3 structure', () => {
      const chapters = WORLD_5_THEME.chapters;
      expect(chapters).toHaveLength(3);
      expect(chapters[0].levelCount).toBe(2);
      expect(chapters[1].levelCount).toBe(2);
      expect(chapters[2].levelCount).toBe(3);
    });

    it('chapter 3 is boss chapter', () => {
      expect(WORLD_5_THEME.chapters[2].isBossChapter).toBe(true);
    });

    it('chapters 1 and 2 are not boss chapters', () => {
      expect(WORLD_5_THEME.chapters[0].isBossChapter).toBe(false);
      expect(WORLD_5_THEME.chapters[1].isBossChapter).toBe(false);
    });

    it('has correct chapter name keys', () => {
      expect(WORLD_5_THEME.chapters[0].nameKey).toBe('adventure.chapters.canyon.zone1');
      expect(WORLD_5_THEME.chapters[1].nameKey).toBe('adventure.chapters.canyon.zone2');
      expect(WORLD_5_THEME.chapters[2].nameKey).toBe('adventure.chapters.canyon.bossZone');
    });

    it('has correct starting levels', () => {
      expect(WORLD_5_THEME.chapters[0].startLevel).toBe(1);
      expect(WORLD_5_THEME.chapters[1].startLevel).toBe(3);
      expect(WORLD_5_THEME.chapters[2].startLevel).toBe(5);
    });

    it('has varied accent colors (red to orange to yellow progression)', () => {
      expect(WORLD_5_THEME.chapters[0].accentColor).toBe('neo-red');
      expect(WORLD_5_THEME.chapters[1].accentColor).toBe('neo-orange');
      expect(WORLD_5_THEME.chapters[2].accentColor).toBe('neo-yellow');
    });
  });

  describe('Theme Registry Integration', () => {
    it('is registered in theme index', () => {
      const theme = getWorldTheme(5);
      expect(theme.id).toBe(5);
    });

    it('returns WORLD_5_THEME from registry', () => {
      const theme = getWorldTheme(5);
      expect(theme).toBe(WORLD_5_THEME);
    });

    it('is marked as implemented', () => {
      expect(isThemeImplemented(5)).toBe(true);
    });
  });

  describe('Texture Configuration', () => {
    it('uses stone texture', () => {
      expect(WORLD_5_THEME.background.texture.type).toBe('stone');
    });

    it('has subtle opacity (0.06)', () => {
      expect(WORLD_5_THEME.background.texture.opacity).toBe(0.06);
    });

    it('uses soft-light blend mode', () => {
      expect(WORLD_5_THEME.background.texture.blendMode).toBe('soft-light');
    });
  });

  describe('Background Configuration', () => {
    it('has amber-950 gradient base', () => {
      expect(WORLD_5_THEME.background.baseColor).toContain('amber-950');
    });

    it('has canyon illustration path', () => {
      expect(WORLD_5_THEME.background.illustrationPath).toBe(
        '/images/adventure/backgrounds/canyon.webp'
      );
    });
  });
});
