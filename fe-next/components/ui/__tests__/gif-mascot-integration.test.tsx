/**
 * Mascot Integration Tests (all animated WebP).
 *
 * Verifies that mascot variants are mapped to the correct WebP asset
 * and rendered uniformly via <img>. MP4s replaced with WebP for cross-device compat.
 */

import { render } from '@testing-library/react';
import { getMascotImagePath, isVideoVariant, MascotVariant, MASCOT_IMAGES, Mascot, MascotWithEntrance } from '../Mascot';
import InteractiveMascot from '../InteractiveMascot';
import IdleMascot from '../IdleMascot';
import { getBaseVariant, BASE_VARIANTS, VARIANT_MAP } from '../mascotUtils';

/** All 32 base mascot variants */
const ALL_BASE_VARIANTS: MascotVariant[] = [
  'happy', 'gaming', 'thinking', 'oops', 'celebration', 'dj', 'trophy',
  'panic', 'crying', 'onfire', 'bored', 'mindblown', 'encouraging',
  'explorer', 'flexing', 'scared', 'shopkeeper', 'spectating', 'waving', 'powerup',
  'sleepy', 'waiting', 'gg', 'scholar', 'rage', 'bomber', 'winner',
  'knight', 'sad', 'ghostly', 'dance', 'question',
];

describe('Mascot Integration (animated WebP)', () => {
  describe('getMascotImagePath', () => {
    it('returns WebP path for previously-MP4 opaque variants', () => {
      expect(getMascotImagePath('happy')).toBe('/mascot/winner.webp');
      expect(getMascotImagePath('gaming')).toBe('/mascot/play.webp');
      expect(getMascotImagePath('thinking')).toBe('/mascot/question.webp');
      expect(getMascotImagePath('oops')).toBe('/mascot/oops.webp');
    });

    it('returns animated WebP path for transparent variants', () => {
      expect(getMascotImagePath('onfire')).toBe('/mascot/onfire-nobg.webp');
      expect(getMascotImagePath('bored')).toBe('/mascot/bored-nobg.webp');
      expect(getMascotImagePath('mindblown')).toBe('/mascot/mindblown-nobg.webp');
      expect(getMascotImagePath('powerup')).toBe('/mascot/powerup-nobg.webp');
    });

    it('returns a .webp asset for every base variant', () => {
      ALL_BASE_VARIANTS.forEach((variant) => {
        const path = getMascotImagePath(variant);
        expect(path).toMatch(/\.webp$/);
        expect(path).not.toContain('.mp4');
        expect(path).not.toContain('.gif');
        expect(path).not.toContain('.png');
      });
    });
  });

  describe('isVideoVariant', () => {
    it('returns false for every variant (no MP4s remain)', () => {
      ALL_BASE_VARIANTS.forEach((variant) => {
        expect(isVideoVariant(variant)).toBe(false);
      });
    });
  });

  describe('BASE_VARIANTS and MASCOT_IMAGES consistency', () => {
    it('has 32 base variants', () => {
      expect(BASE_VARIANTS).toHaveLength(32);
    });

    it('has a .webp entry in MASCOT_IMAGES for every base variant', () => {
      BASE_VARIANTS.forEach((variant) => {
        expect(MASCOT_IMAGES[variant]).toBeDefined();
        expect(MASCOT_IMAGES[variant]).toMatch(/\.webp$/);
      });
    });
  });

  describe('Remapped mood variant aliases', () => {
    it('maps nervous to scared', () => {
      expect(getBaseVariant('nervous')).toBe('scared');
    });

    it('resolves sad as its own base variant', () => {
      expect(getBaseVariant('sad')).toBe('sad');
    });

    it('resolves sleepy as its own base variant', () => {
      expect(getBaseVariant('sleepy')).toBe('sleepy');
    });

    it('maps excited to onfire', () => {
      expect(getBaseVariant('excited')).toBe('onfire');
    });

    it('maps surprised to mindblown', () => {
      expect(getBaseVariant('surprised')).toBe('mindblown');
    });

    it('resolves encouraging as its own base variant', () => {
      expect(getBaseVariant('encouraging')).toBe('encouraging');
    });

    it('resolves waving as its own base variant', () => {
      expect(getBaseVariant('waving')).toBe('waving');
    });
  });

  describe('Mascot component rendering', () => {
    it('renders <img> with correct WebP src for any variant', () => {
      const { container } = render(<Mascot variant="happy" />);
      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('alt', 'Lexi mascot - happy');
      expect(img?.getAttribute('src') || '').toContain('winner.webp');
    });

    it('renders <img> for transparent variants', () => {
      const { container } = render(<Mascot variant="onfire" />);
      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('alt', 'Lexi mascot - onfire');
    });

    it('renders every base variant without crashing', () => {
      ALL_BASE_VARIANTS.forEach((variant) => {
        const { unmount } = render(<Mascot variant={variant} />);
        unmount();
      });
    });

    it('does not render <video> for any variant', () => {
      ALL_BASE_VARIANTS.forEach((variant) => {
        const { container, unmount } = render(<Mascot variant={variant} />);
        expect(container.querySelector('video')).toBeNull();
        unmount();
      });
    });
  });

  describe('MascotWithEntrance component', () => {
    it('renders previously-opaque variants via <img>', () => {
      const { container } = render(<MascotWithEntrance variant="gaming" />);
      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('alt', 'Lexi mascot - gaming');
    });

    it('renders transparent variants via <img>', () => {
      const { container } = render(<MascotWithEntrance variant="mindblown" />);
      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
    });
  });

  describe('InteractiveMascot component', () => {
    it('renders previously-opaque base variant via <img>', () => {
      const { container } = render(<InteractiveMascot variant="thinking" />);
      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
    });

    it('renders transparent base variant via <img> with correct src', () => {
      const { container } = render(<InteractiveMascot variant="onfire" />);
      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', '/mascot/onfire-nobg.webp');
    });

    it('renders extended variants mapped through VARIANT_MAP', () => {
      const { container } = render(<InteractiveMascot variant="excited" />);
      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
    });
  });

  describe('IdleMascot component', () => {
    it('renders previously-opaque base variant via <img>', () => {
      const { container } = render(<IdleMascot baseVariant="oops" />);
      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
    });

    it('renders encouraging as its own base variant', () => {
      const { container } = render(<IdleMascot baseVariant="encouraging" />);
      expect(container.querySelector('img')).toBeInTheDocument();
    });
  });

  describe('Path mapping correctness', () => {
    it('maps winner.webp to happy', () => {
      expect(getMascotImagePath('happy')).toContain('winner.webp');
    });

    it('maps play.webp to gaming', () => {
      expect(getMascotImagePath('gaming')).toContain('play.webp');
    });

    it('maps question.webp to thinking', () => {
      expect(getMascotImagePath('thinking')).toContain('question.webp');
    });

    it('maps oops.webp to oops', () => {
      expect(getMascotImagePath('oops')).toContain('oops.webp');
    });
  });

  describe('Edge cases', () => {
    it('handles all base variants without throwing', () => {
      ALL_BASE_VARIANTS.forEach((variant) => {
        expect(() => getMascotImagePath(variant)).not.toThrow();
        expect(() => isVideoVariant(variant)).not.toThrow();
      });
    });

    it('returns consistent results for the same variant', () => {
      expect(getMascotImagePath('happy')).toBe(getMascotImagePath('happy'));
      expect(isVideoVariant('happy')).toBe(isVideoVariant('happy'));
    });

    it('keys that overlap between BASE_VARIANTS and VARIANT_MAP resolve to themselves', () => {
      const overlapping = BASE_VARIANTS.filter((v) => VARIANT_MAP[v] !== undefined);
      overlapping.forEach((variant) => {
        expect(getBaseVariant(variant)).toBe(variant);
      });
    });
  });
});
