/**
 * Mascot Integration Tests (split-format: MP4 for opaque, animated WebP for transparent).
 *
 * Verifies that mascot variants are mapped to the correct optimized asset
 * and rendered with the matching DOM element (<video> vs <img>).
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

const VIDEO_VARIANTS: MascotVariant[] = ALL_BASE_VARIANTS.filter((v) => isVideoVariant(v));
const WEBP_VARIANTS: MascotVariant[] = ALL_BASE_VARIANTS.filter((v) => !isVideoVariant(v));

describe('Mascot Integration (split-format)', () => {
  describe('getMascotImagePath', () => {
    it('returns MP4 path for opaque variants', () => {
      expect(getMascotImagePath('happy')).toBe('/mascot/winner.mp4');
      expect(getMascotImagePath('gaming')).toBe('/mascot/play.mp4');
      expect(getMascotImagePath('thinking')).toBe('/mascot/question.mp4');
      expect(getMascotImagePath('oops')).toBe('/mascot/oops.mp4');
    });

    it('returns animated WebP path for transparent variants', () => {
      expect(getMascotImagePath('onfire')).toBe('/mascot/onfire-nobg.webp');
      expect(getMascotImagePath('bored')).toBe('/mascot/bored-nobg.webp');
      expect(getMascotImagePath('mindblown')).toBe('/mascot/mindblown-nobg.webp');
      expect(getMascotImagePath('powerup')).toBe('/mascot/powerup-nobg.webp');
    });

    it('returns an optimized asset (.mp4 or .webp) for every base variant', () => {
      ALL_BASE_VARIANTS.forEach((variant) => {
        const path = getMascotImagePath(variant);
        expect(path).toMatch(/\.(mp4|webp)$/);
        expect(path).not.toContain('.gif');
        expect(path).not.toContain('.png');
      });
    });
  });

  describe('isVideoVariant', () => {
    it('returns true for opaque MP4 variants', () => {
      VIDEO_VARIANTS.forEach((variant) => {
        expect(isVideoVariant(variant)).toBe(true);
      });
    });

    it('returns false for transparent WebP variants', () => {
      WEBP_VARIANTS.forEach((variant) => {
        expect(isVideoVariant(variant)).toBe(false);
      });
    });
  });

  describe('BASE_VARIANTS and MASCOT_IMAGES consistency', () => {
    it('has 32 base variants', () => {
      expect(BASE_VARIANTS).toHaveLength(32);
    });

    it('has an entry in MASCOT_IMAGES for every base variant', () => {
      BASE_VARIANTS.forEach((variant) => {
        expect(MASCOT_IMAGES[variant]).toBeDefined();
        expect(MASCOT_IMAGES[variant]).toMatch(/\.(mp4|webp)$/);
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
    it('renders a <video> element for opaque variants', () => {
      const { container } = render(<Mascot variant="happy" />);
      const video = container.querySelector('video');
      expect(video).toBeInTheDocument();
      expect(video).toHaveAttribute('src', '/mascot/winner.mp4');
      expect(video).toHaveAttribute('aria-label', 'Lexi mascot - happy');
    });

    it('renders an <img> element for transparent variants', () => {
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
  });

  describe('MascotWithEntrance component', () => {
    it('renders opaque variants via <video>', () => {
      const { container } = render(<MascotWithEntrance variant="gaming" />);
      const video = container.querySelector('video');
      expect(video).toBeInTheDocument();
      expect(video).toHaveAttribute('aria-label', 'Lexi mascot - gaming');
    });

    it('renders transparent variants via <img>', () => {
      const { container } = render(<MascotWithEntrance variant="mindblown" />);
      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
    });
  });

  describe('InteractiveMascot component', () => {
    it('renders opaque base variant via <video>', () => {
      const { container } = render(<InteractiveMascot variant="thinking" />);
      const video = container.querySelector('video');
      expect(video).toBeInTheDocument();
      expect(video).toHaveAttribute('aria-label', expect.stringContaining('thinking'));
    });

    it('renders transparent base variant via <img> with correct src', () => {
      const { container } = render(<InteractiveMascot variant="onfire" />);
      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', '/mascot/onfire-nobg.webp');
    });

    it('renders extended variants mapped through VARIANT_MAP', () => {
      // 'excited' maps to 'onfire' → transparent WebP → <img>
      const { container } = render(<InteractiveMascot variant="excited" />);
      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
    });
  });

  describe('IdleMascot component', () => {
    it('renders opaque base variant via <video>', () => {
      const { container } = render(<IdleMascot baseVariant="oops" />);
      const video = container.querySelector('video');
      expect(video).toBeInTheDocument();
    });

    it('renders encouraging as its own base variant', () => {
      const { container } = render(<IdleMascot baseVariant="encouraging" />);
      expect(container.querySelector('video, img')).toBeInTheDocument();
    });
  });

  describe('Path mapping correctness', () => {
    it('maps winner.mp4 to happy', () => {
      expect(getMascotImagePath('happy')).toContain('winner.mp4');
    });

    it('maps play.mp4 to gaming', () => {
      expect(getMascotImagePath('gaming')).toContain('play.mp4');
    });

    it('maps question.mp4 to thinking', () => {
      expect(getMascotImagePath('thinking')).toContain('question.mp4');
    });

    it('maps oops.mp4 to oops', () => {
      expect(getMascotImagePath('oops')).toContain('oops.mp4');
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
