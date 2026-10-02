import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LandingProofStrip } from '../LandingProofStrip';
import { LandingHowItWorks } from '../LandingHowItWorks';
import { LandingFinalCta } from '../LandingFinalCta';
import { LandingFaq } from '../LandingFaq';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/components/education/TeacherSetupSteps', () => ({
  TeacherSetupSteps: () => (
    <ol>
      {['create', 'share', 'join', 'play', 'results'].map((id) => (
        <li key={id} data-testid={`onboarding-step-${id}`} />
      ))}
    </ol>
  ),
}));
vi.mock('@/components/education/tour/TeacherTourDialog', () => ({
  TeacherTourDialog: () => <button type="button" data-testid="tour" />,
}));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));

describe('LandingProofStrip', () => {
  it('states only product facts, no competitor claims', () => {
    const { container } = render(<LandingProofStrip />);
    const items = container.querySelectorAll('li');
    expect(items.length).toBeGreaterThanOrEqual(3);
    expect(container.textContent).not.toMatch(/kahoot|quizlet|blooket|wordwall/i);
  });
});

describe('LandingHowItWorks', () => {
  it('leads with the answer-first question as the section heading and keeps all five setup steps public', () => {
    render(<LandingHowItWorks geo={{ question: 'How do I run it?', answer: 'Share a code.' }} />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('How do I run it?');
    expect(screen.getByText('Share a code.')).toBeInTheDocument();
    for (const id of ['create', 'share', 'join', 'play', 'results']) {
      expect(screen.getByTestId(`onboarding-step-${id}`)).toBeInTheDocument();
    }
    expect(document.querySelector('section#how-it-works')).not.toBeNull();
  });

  it('falls back to its own heading without a geo answer', () => {
    render(<LandingHowItWorks />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('eg2Land.how.title');
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

describe('LandingFaq', () => {
  const items = [
    { question: 'Q1?', answer: 'A1.' },
    { question: 'Q2?', answer: 'A2.' },
  ];

  it('renders every FAQPage item exactly once, answers in the HTML', () => {
    const { container } = render(<LandingFaq title="FAQ" items={items} />);
    expect(container.querySelectorAll('details')).toHaveLength(2);
    expect(container.textContent).toContain('A1.');
    expect(container.textContent).toContain('A2.');
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('FAQ');
  });
});
