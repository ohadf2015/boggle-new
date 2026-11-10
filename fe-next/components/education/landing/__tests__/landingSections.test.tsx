import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LandingHowItWorks } from '../LandingHowItWorks';
import { LandingFinalCta } from '../LandingFinalCta';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));

describe('LandingHowItWorks', () => {
  it('leads with the answer-first question as the section heading and keeps the three setup steps public', () => {
    render(<LandingHowItWorks geo={{ question: 'How do I run it?', answer: 'Share a code.' }} />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('How do I run it?');
    expect(screen.getByText('Share a code.')).toBeInTheDocument();
    for (const id of ['create', 'share', 'play']) {
      expect(screen.getByTestId(`onboarding-step-${id}`)).toBeInTheDocument();
    }
    expect(document.querySelector('section#how-it-works')).not.toBeNull();
  });

  it('falls back to its own heading without a geo answer', () => {
    render(<LandingHowItWorks />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('eduPlans.how.title');
  });
});

describe('LandingFinalCta', () => {
  it('closes on the same free start as the hero, with no /teacher bounce', () => {
    render(<LandingFinalCta />);
    expect(screen.getByTestId('landing-final-start')).toHaveAttribute('href', '/en/education/access');
  });

  it('asks a signed-in non-teacher to finish setup', () => {
    render(<LandingFinalCta setupPending />);
    expect(screen.getByTestId('landing-final-start')).toHaveTextContent('eg2Land.hero.ctaFinishSetup');
  });
});
