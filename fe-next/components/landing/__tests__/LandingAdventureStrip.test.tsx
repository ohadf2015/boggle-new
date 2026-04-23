import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LandingAdventureStrip } from '../LandingAdventureStrip';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    a: ({ children, ...props }: any) => <a {...props}>{children}</a>,
  },
}));

const trackModeSelected = vi.fn();
const trackLandingCtaClick = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackModeSelected: (...args: any[]) => trackModeSelected(...args),
  trackLandingCtaClick: (...args: any[]) => trackLandingCtaClick(...args),
}));

describe('LandingAdventureStrip', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders adventure title + description via t()', () => {
    render(<LandingAdventureStrip />);
    expect(screen.getByText('landing.adventureMode')).toBeInTheDocument();
    expect(screen.getByText('landing.adventureModeDesc')).toBeInTheDocument();
  });

  it('links to /en/adventure', () => {
    render(<LandingAdventureStrip />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/en/adventure');
  });

  it('fires analytics on click', () => {
    render(<LandingAdventureStrip />);
    fireEvent.click(screen.getByRole('link'));
    expect(trackModeSelected).toHaveBeenCalledWith('adventure', 'home');
    expect(trackLandingCtaClick).toHaveBeenCalledWith('mode_card', {
      mode: 'adventure',
      variant: 'lime',
    });
  });

  it('is NOT styled as a ModeCard (distinct visual treatment)', () => {
    const { container } = render(<LandingAdventureStrip />);
    // Must not reuse ModeCard markers — this is a full-width strip.
    expect(container.querySelector('[data-testid="mode-card"]')).toBeNull();
    expect(container.firstChild).toHaveAttribute('data-testid', 'landing-adventure-strip');
  });
});
