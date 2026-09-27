import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HeroStyleMascot } from '../HeroStyleMascot';
import { getStyle, type PlayerStyleKey } from '@/lib/playerStyle/styles';

// usePlayerStyle is swapped per-test via this mutable holder.
let styleKey: PlayerStyleKey = 'default';
vi.mock('@/contexts/PlayerStyleContext', () => ({
  usePlayerStyle: () => ({ styleKey, style: getStyle(styleKey) }),
}));

// Animated-loop registry is mocked so the component test controls whether a
// style has a real dancing loop (the actual registry is covered by
// animatedMascots.test.ts). This lets us exercise BOTH the animated-loop path
// and the CSS-dance fallback deterministically.
let animatedMap: Partial<Record<string, string>> = {};
vi.mock('@/lib/playerStyle/animatedMascots', () => ({
  getAnimatedMascot: (k: string) => animatedMap[k] ?? null,
  ANIMATED_STYLE_MASCOTS: {},
}));

vi.mock('@/components/ui/IdleMascot', () => {
  const IdleMascotWithEntrance = () => <div data-testid="animated-mascot" />;
  IdleMascotWithEntrance.displayName = 'IdleMascotWithEntrance';
  return { IdleMascotWithEntrance };
});

// next/image → plain img so we can read src/alt; strip the non-DOM fill/sizes/priority props.
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  default: ({ fill, priority, sizes, ...props }: any) => <img {...props} />,
}));

describe('HeroStyleMascot', () => {
  beforeEach(() => {
    styleKey = 'default';
    animatedMap = {};
    vi.clearAllMocks();
  });

  it('default style → renders the animated mascot (zero change for default users)', () => {
    render(<HeroStyleMascot isMobilePortrait={false} />);
    expect(screen.getByTestId('animated-mascot')).toBeInTheDocument();
    expect(screen.queryByTestId('hero-style-mascot')).not.toBeInTheDocument();
  });

  it('style with a real dancing loop → renders the loop (unoptimized) and NO css dance class', () => {
    styleKey = 'jazz';
    animatedMap = { jazz: '/mascots/styles/jazz.webp' };
    render(<HeroStyleMascot isMobilePortrait={false} />);
    const img = screen.getByTestId('hero-style-mascot');
    expect(img).toHaveAttribute('src', '/mascots/styles/jazz.webp');
    expect(screen.getByTestId('hero-style-mascot-box').className).not.toMatch(/hero-dance-/);
  });

  it('style WITHOUT a loop → falls back to the static PNG + genre CSS dance class', () => {
    styleKey = 'arcade';
    animatedMap = {}; // no loop registered → CSS-dance fallback
    render(<HeroStyleMascot isMobilePortrait={false} />);
    const img = screen.getByTestId('hero-style-mascot');
    expect(img).toHaveAttribute('src', '/mascots/styles/arcade.png');
    expect(screen.getByTestId('hero-style-mascot-box').className).toContain('hero-dance-8bit');
  });

  it('desktop hover → replaces the dancing mascot with the animated one', () => {
    styleKey = 'jazz';
    animatedMap = { jazz: '/mascots/styles/jazz.webp' };
    render(<HeroStyleMascot isMobilePortrait={false} />);
    fireEvent.mouseEnter(screen.getByTestId('hero-style-mascot-box'));
    expect(screen.getByTestId('animated-mascot')).toBeInTheDocument();
  });

  it('mobile portrait → no hover swap, the style mascot keeps dancing', () => {
    styleKey = 'jazz';
    animatedMap = { jazz: '/mascots/styles/jazz.webp' };
    render(<HeroStyleMascot isMobilePortrait={true} />);
    fireEvent.mouseEnter(screen.getByTestId('hero-style-mascot-box'));
    expect(screen.queryByTestId('animated-mascot')).not.toBeInTheDocument();
    expect(screen.getByTestId('hero-style-mascot')).toBeInTheDocument();
  });
});
