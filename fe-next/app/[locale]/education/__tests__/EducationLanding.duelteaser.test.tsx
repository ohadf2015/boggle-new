/**
 * DuelTeaserCard — Education Landing integration tests
 * TDD: RED phase first, then implement to pass.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import EducationPageClient from '../PageClient';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    loading: false,
  }),
}));

jest.mock('@/components/education/EducationHeader', () => ({
  EducationHeader: () => <div data-testid="education-header" />,
}));

jest.mock('@/components/ui/InteractiveMascot', () => ({
  InteractiveMascot: () => <div data-testid="interactive-mascot" />,
}));

jest.mock('@/components/auth/AuthModal', () => ({
  __esModule: true,
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="auth-modal" /> : null,
}));

jest.mock('framer-motion', () => {
  const React = require('react');
  const MotionDiv = React.forwardRef(
    ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }, ref: React.Ref<HTMLDivElement>) =>
      <div ref={ref as React.Ref<HTMLDivElement>} {...rest}>{children}</div>
  );
  MotionDiv.displayName = 'MotionDiv';
  const MotionButton = React.forwardRef(
    ({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }, ref: React.Ref<HTMLButtonElement>) =>
      <button ref={ref as React.Ref<HTMLButtonElement>} {...rest}>{children}</button>
  );
  MotionButton.displayName = 'MotionButton';
  return {
    motion: { div: MotionDiv, button: MotionButton },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useReducedMotion: jest.fn().mockReturnValue(false),
  };
});

describe('DuelTeaserCard on Education Landing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the duel teaser headline', () => {
    render(<EducationPageClient />);
    expect(screen.getByText('education.landing.duelTeaser.headline')).toBeInTheDocument();
  });

  it('renders the duel teaser subtext', () => {
    render(<EducationPageClient />);
    expect(screen.getByText('education.landing.duelTeaser.subtext')).toBeInTheDocument();
  });

  it('renders the Start a Duel CTA button', () => {
    render(<EducationPageClient />);
    expect(screen.getByRole('button', { name: /education\.landing\.duelTeaser\.cta/i })).toBeInTheDocument();
  });

  it('navigates to the duels route when CTA is clicked', () => {
    render(<EducationPageClient />);
    const ctaButton = screen.getByRole('button', { name: /education\.landing\.duelTeaser\.cta/i });
    fireEvent.click(ctaButton);
    expect(mockPush).toHaveBeenCalledWith('/en/education/duels');
  });
});
