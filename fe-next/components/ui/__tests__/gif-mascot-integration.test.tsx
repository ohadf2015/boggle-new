/**
 * GIF Mascot Integration Tests
 *
 * Tests the integration of animated GIF mascots with the mascot component system.
 * Verifies that GIF variants are correctly mapped and rendered with appropriate props.
 */

import { render, screen } from '@testing-library/react';
import { getMascotImagePath, isGifVariant, GIF_VARIANTS, MascotVariant, Mascot, MascotWithEntrance } from '../Mascot';
import InteractiveMascot from '../InteractiveMascot';
import IdleMascot from '../IdleMascot';

describe('GIF Mascot Integration', () => {
  describe('getMascotImagePath', () => {
    it('should return GIF path for happy variant', () => {
      const path = getMascotImagePath('happy');
      expect(path).toBe('/mascot/main-nobg.gif');
    });

    it('should return GIF path for gaming variant', () => {
      const path = getMascotImagePath('gaming');
      expect(path).toBe('/mascot/play-nobg.gif');
    });

    it('should return GIF path for thinking variant', () => {
      const path = getMascotImagePath('thinking');
      expect(path).toBe('/mascot/study-nobg.gif');
    });

    it('should return GIF path for oops variant', () => {
      const path = getMascotImagePath('oops');
      expect(path).toBe('/mascot/oops-nobg.gif');
    });

    it('should return PNG path for celebrating variant', () => {
      const path = getMascotImagePath('celebrating');
      expect(path).toBe('/mascot/lexi-celebrating.png');
    });

    it('should return PNG path for victory variant', () => {
      const path = getMascotImagePath('victory');
      expect(path).toBe('/mascot/lexi-victory.png');
    });

    it('should return PNG path for all non-GIF activity variants', () => {
      const nonGifVariants: MascotVariant[] = [
        'eating_pizza',
        'drinking_coffee',
        'dancing',
        'waving',
        'holding_trophy',
        'cheering',
        'skateboarding',
      ];

      nonGifVariants.forEach((variant) => {
        const path = getMascotImagePath(variant);
        expect(path).toContain('.png');
        expect(path).not.toContain('.gif');
      });
    });
  });

  describe('isGifVariant', () => {
    it('should return true for GIF variants', () => {
      expect(isGifVariant('happy')).toBe(true);
      expect(isGifVariant('gaming')).toBe(true);
      expect(isGifVariant('thinking')).toBe(true);
      expect(isGifVariant('oops')).toBe(true);
    });

    it('should return false for PNG variants', () => {
      expect(isGifVariant('celebrating')).toBe(false);
      expect(isGifVariant('victory')).toBe(false);
      expect(isGifVariant('excited')).toBe(false);
      expect(isGifVariant('focused')).toBe(false);
    });
  });

  describe('GIF_VARIANTS Set', () => {
    it('should contain exactly 4 variants', () => {
      expect(GIF_VARIANTS.size).toBe(4);
    });

    it('should contain the correct GIF variants', () => {
      expect(GIF_VARIANTS.has('happy')).toBe(true);
      expect(GIF_VARIANTS.has('gaming')).toBe(true);
      expect(GIF_VARIANTS.has('thinking')).toBe(true);
      expect(GIF_VARIANTS.has('oops')).toBe(true);
    });

    it('should not contain non-GIF variants', () => {
      expect(GIF_VARIANTS.has('celebrating')).toBe(false);
      expect(GIF_VARIANTS.has('victory')).toBe(false);
      expect(GIF_VARIANTS.has('eating_pizza')).toBe(false);
    });
  });

  describe('Mascot Component with GIF', () => {
    it('should render GIF variant with correct src', () => {
      render(<Mascot variant="happy" />);

      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('alt', 'Lexi mascot - happy');
      // Note: Next.js Image component transforms src, so we check it's set
      expect(img).toHaveAttribute('src');
    });

    it('should render PNG variant with correct src', () => {
      render(<Mascot variant="celebrating" />);

      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('alt', 'Lexi mascot - celebrating');
      expect(img).toHaveAttribute('src');
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

  describe('InteractiveMascot Component with GIF', () => {
    it('should render GIF variant', () => {
      render(<InteractiveMascot variant="thinking" />);

      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('alt', expect.stringContaining('thinking'));
    });

    it('should render PNG variant', () => {
      render(<InteractiveMascot variant="excited" />);

      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('alt', expect.stringContaining('excited'));
    });
  });

  describe('IdleMascot Component with GIF', () => {
    it('should render with GIF base variant', () => {
      render(<IdleMascot baseVariant="oops" />);

      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
    });

    it('should render with PNG base variant', () => {
      render(<IdleMascot baseVariant="encouraging" />);

      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
    });
  });

  describe('GIF Mapping Correctness', () => {
    it('should map main.gif to happy variant', () => {
      const path = getMascotImagePath('happy');
      expect(path).toContain('main-nobg.gif');
    });

    it('should map play.gif to gaming variant', () => {
      const path = getMascotImagePath('gaming');
      expect(path).toContain('play-nobg.gif');
    });

    it('should map study.gif to thinking variant', () => {
      const path = getMascotImagePath('thinking');
      expect(path).toContain('study-nobg.gif');
    });

    it('should map oops.gif to oops variant', () => {
      const path = getMascotImagePath('oops');
      expect(path).toContain('oops-nobg.gif');
    });
  });

  describe('Backward Compatibility', () => {
    it('should not break existing PNG mascots', () => {
      const pngVariants: MascotVariant[] = [
        'encouraging',
        'celebrating',
        'victory',
        'focused',
        'surprised',
        'sleepy',
        'excited',
        'pointing',
      ];

      pngVariants.forEach((variant) => {
        const path = getMascotImagePath(variant);
        expect(path).toContain('.png');
        expect(path).toContain(`lexi-${variant}`);
      });
    });

    it('should handle all variants without errors', () => {
      const allVariants: MascotVariant[] = [
        'happy',
        'encouraging',
        'thinking',
        'oops',
        'celebrating',
        'victory',
        'focused',
        'surprised',
        'sleepy',
        'excited',
        'pointing',
        'eating_pizza',
        'drinking_coffee',
        'gaming',
        'dancing',
        'waving',
        'holding_trophy',
        'cheering',
        'skateboarding',
      ];

      allVariants.forEach((variant) => {
        expect(() => getMascotImagePath(variant)).not.toThrow();
        expect(() => isGifVariant(variant)).not.toThrow();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle variant case correctly', () => {
      // TypeScript should prevent invalid variants, but test the logic
      expect(isGifVariant('happy')).toBe(true);
      expect(isGifVariant('HAPPY' as MascotVariant)).toBe(false); // Case sensitive
    });

    it('should return consistent results for same variant', () => {
      const path1 = getMascotImagePath('happy');
      const path2 = getMascotImagePath('happy');
      expect(path1).toBe(path2);

      const isGif1 = isGifVariant('happy');
      const isGif2 = isGifVariant('happy');
      expect(isGif1).toBe(isGif2);
    });
  });
});
