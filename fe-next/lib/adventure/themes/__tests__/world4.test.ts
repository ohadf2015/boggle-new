/**
 * World 4: Idiom Archipelago Theme Tests
 *
 * Validates theme structure, configuration, and registry integration.
 */

import { WORLD_4_THEME } from '../world4';
import { getWorldTheme, isThemeImplemented } from '../index';

describe('World 4: Idiom Archipelago Theme', () => {
  describe('Theme Identity', () => {
    it('has correct world ID', () => {
      expect(WORLD_4_THEME.id).toBe(4);
    });

    it('has correct name key', () => {
      expect(WORLD_4_THEME.nameKey).toBe('adventure.worlds.idiomArchipelago');
    });

    it('has tropical-islands theme ID', () => {
      expect(WORLD_4_THEME.themeId).toBe('tropical-islands');
    });

    it('has idioms mechanic', () => {
      expect(WORLD_4_THEME.mechanic).toBe('idioms');
    });

    it('has world-archipelago container class', () => {
      expect(WORLD_4_THEME.containerClass).toBe('world-archipelago');
    });
  });

  describe('Parallax Layers', () => {
    it('has 5 parallax layers', () => {
      expect(WORLD_4_THEME.background.layers).toHaveLength(5);
    });

    it('layers have increasing depth', () => {
      const depths = WORLD_4_THEME.background.layers.map((l) => l.depth);
      expect(depths).toEqual([0.1, 0.25, 0.4, 0.55, 0.7]);
    });

    it('all layers have unique IDs', () => {
      const ids = WORLD_4_THEME.background.layers.map((l) => l.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('all layers have valid opacity (0-1)', () => {
      WORLD_4_THEME.background.layers.forEach((layer) => {
        expect(layer.opacity).toBeGreaterThanOrEqual(0);
        expect(layer.opacity).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Particle Configuration', () => {
    it('has droplets particle type', () => {
      expect(WORLD_4_THEME.background.particles.type).toBe('droplets');
    });

    it('has tropical particle variant', () => {
      expect(WORLD_4_THEME.background.particles.variant).toBe('tropical');
    });

    it('has 12 particles (performance budget)', () => {
      expect(WORLD_4_THEME.background.particles.count).toBe(12);
    });

    it('has tropical color palette', () => {
      expect(WORLD_4_THEME.background.particles.colors).toHaveLength(3);
    });
  });

  describe('Color Palette', () => {
    it('has neo-orange as primary color', () => {
      expect(WORLD_4_THEME.colors.primary).toBe('neo-orange');
    });

    it('has neo-yellow as accent color', () => {
      expect(WORLD_4_THEME.colors.accent).toBe('neo-yellow');
    });

    it('has orange background tint', () => {
      expect(WORLD_4_THEME.colors.backgroundTint).toBe('orange-900/20');
    });
  });

  describe('Tile Styles', () => {
    it('has all required tile styles', () => {
      const styles = WORLD_4_THEME.tileStyles;
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

    it('standard tile has teal/cyan gradient (tropical)', () => {
      expect(WORLD_4_THEME.tileStyles.standard.gradientFrom).toBe('teal-100');
      expect(WORLD_4_THEME.tileStyles.standard.gradientTo).toBe('cyan-200');
    });

    it('gold tile has orange glow', () => {
      expect(WORLD_4_THEME.tileStyles.gold.shadowColor).toContain('255, 165, 0');
    });
  });

  describe('Modifier Display', () => {
    it('is visible (idiom mechanic active)', () => {
      expect(WORLD_4_THEME.modifierDisplay.visible).toBe(true);
    });

    it('uses neo-orange styling', () => {
      expect(WORLD_4_THEME.modifierDisplay.backgroundColor).toBe('bg-neo-orange/20');
      expect(WORLD_4_THEME.modifierDisplay.borderColor).toBe('border-neo-orange');
      expect(WORLD_4_THEME.modifierDisplay.textColor).toBe('text-neo-orange');
    });

    it('has MessageCircle icon for idioms', () => {
      expect(WORLD_4_THEME.modifierDisplay.icon).toBeDefined();
    });
  });

  describe('Animations', () => {
    it('uses wave tile entry (ocean theme)', () => {
      expect(WORLD_4_THEME.animations.tileEntry).toBe('wave');
    });

    it('has 1.0x speed multiplier (normal pace)', () => {
      expect(WORLD_4_THEME.animations.speedMultiplier).toBe(1.0);
    });

    it('has neo-orange selection ring-3', () => {
      expect(WORLD_4_THEME.animations.tileSelect).toContain('ring-neo-orange');
    });
  });

  describe('Chapter Structure', () => {
    it('has 3 chapters with 2-2-3 structure', () => {
      const chapters = WORLD_4_THEME.chapters;
      expect(chapters).toHaveLength(3);
      expect(chapters[0].levelCount).toBe(2);
      expect(chapters[1].levelCount).toBe(2);
      expect(chapters[2].levelCount).toBe(3);
    });

    it('chapter 3 is boss chapter', () => {
      expect(WORLD_4_THEME.chapters[2].isBossChapter).toBe(true);
    });

    it('chapters 1 and 2 are not boss chapters', () => {
      expect(WORLD_4_THEME.chapters[0].isBossChapter).toBe(false);
      expect(WORLD_4_THEME.chapters[1].isBossChapter).toBe(false);
    });

    it('has correct chapter name keys', () => {
      expect(WORLD_4_THEME.chapters[0].nameKey).toBe('adventure.chapters.archipelago.zone1');
      expect(WORLD_4_THEME.chapters[1].nameKey).toBe('adventure.chapters.archipelago.zone2');
      expect(WORLD_4_THEME.chapters[2].nameKey).toBe('adventure.chapters.archipelago.bossZone');
    });

    it('has correct starting levels', () => {
      expect(WORLD_4_THEME.chapters[0].startLevel).toBe(1);
      expect(WORLD_4_THEME.chapters[1].startLevel).toBe(3);
      expect(WORLD_4_THEME.chapters[2].startLevel).toBe(5);
    });

    it('has varied accent colors', () => {
      expect(WORLD_4_THEME.chapters[0].accentColor).toBe('neo-orange');
      expect(WORLD_4_THEME.chapters[1].accentColor).toBe('neo-yellow');
      expect(WORLD_4_THEME.chapters[2].accentColor).toBe('neo-cyan');
    });
  });

  describe('Theme Registry Integration', () => {
    it('is registered in theme index', () => {
      const theme = getWorldTheme(4);
      expect(theme.id).toBe(4);
    });

    it('returns WORLD_4_THEME from registry', () => {
      const theme = getWorldTheme(4);
      expect(theme).toBe(WORLD_4_THEME);
    });

    it('is marked as implemented', () => {
      expect(isThemeImplemented(4)).toBe(true);
    });
  });

  describe('Texture Configuration', () => {
    it('uses grain texture', () => {
      expect(WORLD_4_THEME.background.texture.type).toBe('grain');
    });

    it('has subtle opacity (0.04)', () => {
      expect(WORLD_4_THEME.background.texture.opacity).toBe(0.04);
    });

    it('uses overlay blend mode', () => {
      expect(WORLD_4_THEME.background.texture.blendMode).toBe('overlay');
    });
  });
});
