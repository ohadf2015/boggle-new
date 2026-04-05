/**
 * GIF Mascot Integration Tests
 *
 * Tests the integration of animated GIF mascots with the mascot component system.
 * Verifies that GIF variants are correctly mapped and rendered with appropriate props.
 */

import { render, screen } from '@testing-library/react';
import { getMascotImagePath, isGifVariant, MascotVariant, MASCOT_IMAGES, Mascot, MascotWithEntrance } from '../Mascot';
import InteractiveMascot from '../InteractiveMascot';
import IdleMascot from '../IdleMascot';
import { getBaseVariant, BASE_VARIANTS, VARIANT_MAP } from '../mascotUtils';

/** All 20 base GIF variants */
const ALL_BASE_VARIANTS: MascotVariant[] = [
  'happy', 'gaming', 'thinking', 'oops', 'celebration', 'dj', 'trophy',
  'panic', 'crying', 'onfire', 'bored', 'mindblown', 'encouraging',
  'explorer', 'flexing', 'scared', 'shopkeeper', 'spectating', 'waving', 'powerup',
];

describe('GIF Mascot Integration', () => {
  describe('getMascotImagePath', () => {
    it('should return GIF path for happy variant', () => {
      const path = getMascotImagePath('happy');
      expect(path).toBe('/mascot/main.gif');
    });

    it('should return GIF path for gaming variant', () => {
      const path = getMascotImagePath('gaming');
      expect(path).toBe('/mascot/play.gif');
    });

    it('should return GIF path for thinking variant', () => {
      const path = getMascotImagePath('thinking');
      expect(path).toBe('/mascot/study.gif');
    });

    it('should return GIF path for oops variant', () => {
      const path = getMascotImagePath('oops');
      expect(path).toBe('/mascot/oops.gif');
    });

    it('should return GIF paths for all 20 base variants', () => {
      ALL_BASE_VARIANTS.forEach((variant) => {
        const path = getMascotImagePath(variant);
        expect(path).toContain('.gif');
        expect(path).toContain('.gif');
        expect(path).not.toContain('.png');
      });
    });

    it('should return correct paths for new variants', () => {
      expect(getMascotImagePath('panic')).toBe('/mascot/panic.gif');
      expect(getMascotImagePath('crying')).toBe('/mascot/crying.gif');
      expect(getMascotImagePath('onfire')).toBe('/mascot/onfire.gif');
      expect(getMascotImagePath('bored')).toBe('/mascot/bored.gif');
      expect(getMascotImagePath('mindblown')).toBe('/mascot/mindblown.gif');
      expect(getMascotImagePath('encouraging')).toBe('/mascot/encouraging.gif');
      expect(getMascotImagePath('explorer')).toBe('/mascot/explorer.gif');
      expect(getMascotImagePath('flexing')).toBe('/mascot/flexing.gif');
      expect(getMascotImagePath('scared')).toBe('/mascot/scared.gif');
      expect(getMascotImagePath('shopkeeper')).toBe('/mascot/shopkeeper.gif');
      expect(getMascotImagePath('spectating')).toBe('/mascot/spectating.gif');
      expect(getMascotImagePath('waving')).toBe('/mascot/waving.gif');
      expect(getMascotImagePath('powerup')).toBe('/mascot/powerup.gif');
    });
  });

  describe('isGifVariant', () => {
    it('should return true for ALL variants (GIF-ONLY system)', () => {
      ALL_BASE_VARIANTS.forEach((variant) => {
        expect(isGifVariant(variant)).toBe(true);
      });
    });
  });

  describe('BASE_VARIANTS and MASCOT_IMAGES consistency', () => {
    it('should have 20 base variants', () => {
      expect(BASE_VARIANTS).toHaveLength(20);
    });

    it('should have MASCOT_IMAGES entry for every base variant', () => {
      BASE_VARIANTS.forEach((variant) => {
        expect(MASCOT_IMAGES[variant]).toBeDefined();
        expect(MASCOT_IMAGES[variant]).toContain('.gif');
      });
    });
  });

  describe('Remapped mood variant aliases', () => {
    it('should map nervous to scared (was oops)', () => {
      expect(getBaseVariant('nervous')).toBe('scared');
    });

    it('should map sad to crying (was thinking)', () => {
      expect(getBaseVariant('sad')).toBe('crying');
    });

    it('should map sleepy to bored (was thinking)', () => {
      expect(getBaseVariant('sleepy')).toBe('bored');
    });

    it('should map excited to onfire (was celebration)', () => {
      expect(getBaseVariant('excited')).toBe('onfire');
    });

    it('should map surprised to mindblown (was oops)', () => {
      expect(getBaseVariant('surprised')).toBe('mindblown');
    });

    it('should resolve encouraging as base variant (no longer an alias)', () => {
      expect(getBaseVariant('encouraging')).toBe('encouraging');
    });

    it('should resolve waving as base variant (no longer an activity alias)', () => {
      expect(getBaseVariant('waving')).toBe('waving');
    });
  });

  describe('Mascot Component (GIF-ONLY)', () => {
    it('should render happy GIF variant', () => {
      render(<Mascot variant="happy" />);
      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('alt', 'Lexi mascot - happy');
      expect(img).toHaveAttribute('src');
    });

    it('should render new base variants', () => {
      const newVariants: MascotVariant[] = ['panic', 'crying', 'onfire', 'bored', 'encouraging'];
      newVariants.forEach((variant) => {
        const { unmount } = render(<Mascot variant={variant} />);
        const img = screen.getByRole('img');
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('alt', `Lexi mascot - ${variant}`);
        unmount();
      });
    });
  });

  describe('MascotWithEntrance Component with GIF', () => {
    it('should render GIF variant', () => {
      render(<MascotWithEntrance variant="gaming" />);

      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('alt', 'Lexi mascot - gaming');
    });
  });

  describe('InteractiveMascot Component (GIF-ONLY)', () => {
    it('should render base GIF variants', () => {
      render(<InteractiveMascot variant="thinking" />);

      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('alt', expect.stringContaining('thinking'));
    });

    it('should render new base variants directly', () => {
      render(<InteractiveMascot variant="onfire" />);

      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', '/mascot/onfire.gif');
    });

    it('should render extended variants (mapped to GIF)', () => {
      // 'excited' now maps to 'onfire' GIF
      render(<InteractiveMascot variant="excited" />);

      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('alt', expect.stringContaining('excited'));
    });
  });

  describe('IdleMascot Component (GIF-ONLY)', () => {
    it('should render with GIF base variant', () => {
      render(<IdleMascot baseVariant="oops" />);

      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
    });

    it('should render with encouraging as direct base variant', () => {
      // 'encouraging' is now a base variant with dedicated GIF
      render(<IdleMascot baseVariant="encouraging" />);

      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
    });
  });

  describe('GIF Mapping Correctness', () => {
    it('should map main.gif to happy variant', () => {
      const path = getMascotImagePath('happy');
      expect(path).toContain('main.gif');
    });

    it('should map play.gif to gaming variant', () => {
      const path = getMascotImagePath('gaming');
      expect(path).toContain('play.gif');
    });

    it('should map study.gif to thinking variant', () => {
      const path = getMascotImagePath('thinking');
      expect(path).toContain('study.gif');
    });

    it('should map oops.gif to oops variant', () => {
      const path = getMascotImagePath('oops');
      expect(path).toContain('oops.gif');
    });
  });

  describe('GIF-Only System', () => {
    it('should handle all 20 GIF variants without errors', () => {
      ALL_BASE_VARIANTS.forEach((variant) => {
        expect(() => getMascotImagePath(variant)).not.toThrow();
        expect(() => isGifVariant(variant)).not.toThrow();
        const path = getMascotImagePath(variant);
        expect(path).toContain('.gif');
        expect(path).toContain('.gif');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should return true for all valid GIF variants', () => {
      ALL_BASE_VARIANTS.forEach((variant) => {
        expect(isGifVariant(variant)).toBe(true);
      });
    });

    it('should return consistent results for same variant', () => {
      const path1 = getMascotImagePath('happy');
      const path2 = getMascotImagePath('happy');
      expect(path1).toBe(path2);

      const isGif1 = isGifVariant('happy');
      const isGif2 = isGifVariant('happy');
      expect(isGif1).toBe(isGif2);
    });

    it('VARIANT_MAP should not contain keys that are base variants', () => {
      // Base variants should resolve directly, not through VARIANT_MAP
      BASE_VARIANTS.forEach((variant) => {
        expect(VARIANT_MAP[variant]).toBeUndefined();
      });
    });
  });
});
