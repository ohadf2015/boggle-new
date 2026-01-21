/**
 * GIF Mascot Integration Tests
 *
 * Tests the integration of animated GIF mascots with the mascot component system.
 * Verifies that GIF variants are correctly mapped and rendered with appropriate props.
 */

import { render, screen } from '@testing-library/react';
import { getMascotImagePath, isGifVariant, MascotVariant, Mascot, MascotWithEntrance } from '../Mascot';
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

    it('should return GIF paths for all 7 base variants', () => {
      const allVariants: MascotVariant[] = ['happy', 'gaming', 'thinking', 'oops', 'celebration', 'dj', 'trophy'];

      allVariants.forEach((variant) => {
        const path = getMascotImagePath(variant);
        expect(path).toContain('.gif');
        expect(path).toContain('-nobg.gif'); // All use background-removed GIFs
        expect(path).not.toContain('.png');
      });
    });
  });

  describe('isGifVariant', () => {
    it('should return true for ALL variants (GIF-ONLY system)', () => {
      const allVariants: MascotVariant[] = ['happy', 'gaming', 'thinking', 'oops', 'celebration', 'dj', 'trophy'];

      allVariants.forEach((variant) => {
        expect(isGifVariant(variant)).toBe(true);
      });
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

    it('should render gaming GIF variant', () => {
      render(<Mascot variant="gaming" />);
      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('alt', 'Lexi mascot - gaming');
      expect(img).toHaveAttribute('src');
    });

    it('should render thinking GIF variant', () => {
      render(<Mascot variant="thinking" />);
      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('alt', 'Lexi mascot - thinking');
      expect(img).toHaveAttribute('src');
    });

    it('should render oops GIF variant', () => {
      render(<Mascot variant="oops" />);
      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('alt', 'Lexi mascot - oops');
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

  describe('InteractiveMascot Component (GIF-ONLY)', () => {
    it('should render base GIF variants', () => {
      render(<InteractiveMascot variant="thinking" />);

      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('alt', expect.stringContaining('thinking'));
    });

    it('should render extended variants (mapped to GIF)', () => {
      // 'excited' maps to 'happy' GIF
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

    it('should render with extended variant (mapped to GIF)', () => {
      // 'encouraging' maps to 'happy' GIF
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

  describe('GIF-Only System', () => {
    it('should handle all 7 GIF variants without errors', () => {
      const allVariants: MascotVariant[] = ['happy', 'gaming', 'thinking', 'oops', 'celebration', 'dj', 'trophy'];

      allVariants.forEach((variant) => {
        expect(() => getMascotImagePath(variant)).not.toThrow();
        expect(() => isGifVariant(variant)).not.toThrow();
        const path = getMascotImagePath(variant);
        expect(path).toContain('.gif');
        expect(path).toContain('-nobg.gif');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should return true for all valid GIF variants', () => {
      // All mascot variants are GIFs now
      expect(isGifVariant('happy')).toBe(true);
      expect(isGifVariant('gaming')).toBe(true);
      expect(isGifVariant('thinking')).toBe(true);
      expect(isGifVariant('oops')).toBe(true);
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
