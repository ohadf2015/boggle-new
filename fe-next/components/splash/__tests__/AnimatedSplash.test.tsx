import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnimatedSplash } from '../AnimatedSplash';

const PHRASES: Record<string, string> = {
  'logo.lexi': 'Lexi',
  'logo.clash': 'Clash',
  'splash.loadingText1': 'Sharpening the pencils…',
  'splash.loadingText2': 'Shuffling the alphabet…',
  'splash.loadingText3': 'Warming up the dictionary…',
  'splash.loadingText4': 'Summoning rare words…',
  'splash.loadingText5': 'Bribing the vowels…',
  'splash.loadingText6': 'Polishing the trophies…',
  'splash.loadingText7': 'Untangling triple-word scores…',
  'splash.loadingText8': 'Waking the word wizard…',
};

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => PHRASES[k] ?? k, language: 'en' }),
}));

function mockMatchMedia(reduced: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query.includes('prefers-reduced-motion') ? reduced : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  );
}

describe('AnimatedSplash', () => {
  beforeEach(() => {
    try {
      sessionStorage.removeItem('lx_splash_shown');
    } catch {
      /* noop */
    }
    mockMatchMedia(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the overlay with logo wordmark, a loading phrase and the bar', () => {
    render(<AnimatedSplash />);

    expect(screen.getByTestId('animated-splash')).toBeInTheDocument();
    // Logo wordmark (reused from HeaderLogo)
    expect(screen.getByText('Lexi')).toBeInTheDocument();
    expect(screen.getByText('Clash')).toBeInTheDocument();
    // A witty loading phrase (first one on mount)
    expect(screen.getByTestId('splash-loading-text')).toHaveTextContent(PHRASES['splash.loadingText1']);
    // Neon bar fill present
    expect(screen.getByTestId('splash-bar-fill')).toBeInTheDocument();
  });

  it('returns null (no overlay) when the session flag is already set', () => {
    sessionStorage.setItem('lx_splash_shown', 'true');
    render(<AnimatedSplash />);
    expect(screen.queryByTestId('animated-splash')).not.toBeInTheDocument();
  });

  it('renders decorative particles when motion is allowed', () => {
    render(<AnimatedSplash />);
    expect(screen.getByTestId('splash-particles')).toBeInTheDocument();
  });

  it('omits particles under prefers-reduced-motion', () => {
    mockMatchMedia(true);
    render(<AnimatedSplash />);
    // Overlay + logo still render; only motion decoration is dropped.
    expect(screen.getByTestId('animated-splash')).toBeInTheDocument();
    expect(screen.queryByTestId('splash-particles')).not.toBeInTheDocument();
  });
});
