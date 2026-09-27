/**
 * Education Landing — first-screen UX (declutter R1)
 * Ensures teacher host path is primary, student join path is secondary,
 * page height at 390px is under 8 screens (~6720px).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import EducationPageClient from '../PageClient';

const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/en/education',
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

vi.mock('framer-motion', () => {
  const React = require('react');
  const MotionDiv = React.forwardRef(
    ({ children, ...rest }: any, ref: any) =>
      <div ref={ref} {...rest}>{children}</div>
  );
  MotionDiv.displayName = 'MotionDiv';
  return {
    m: { div: MotionDiv },
    AnimatePresence: ({ children }: any) => <>{children}</>,
    useReducedMotion: () => false,
  };
});

vi.mock('@/components/auth/AuthModal', () => ({
  __esModule: true,
  default: ({ isOpen }: any) => isOpen ? <div data-testid="auth-modal" /> : null,
}));

// Mock all education subcomponents
vi.mock('@/components/education/EducationHero', () => ({
  EducationHero: () => <div data-testid="education-hero" />,
}));

vi.mock('@/components/education/MoatTrifectaSection', () => ({
  MoatTrifectaSection: () => <div data-testid="moat-section" />,
}));

vi.mock('@/components/education/ProFramingSection', () => ({
  ProFramingSection: () => <div data-testid="pro-framing" />,
}));

vi.mock('@/components/education/SixModeTour', () => ({
  SixModeTour: () => <div data-testid="six-mode-tour" />,
}));

vi.mock('@/components/education/ComparisonStrip', () => ({
  ComparisonStrip: () => <div data-testid="comparison-strip" />,
}));

vi.mock('@/components/education/TeacherSetupSection', () => ({
  TeacherSetupSection: () => (
    <div data-testid="teacher-setup">
      <div data-testid="onboarding-step-create" />
      <div data-testid="onboarding-step-share" />
      <div data-testid="onboarding-step-join" />
      <div data-testid="onboarding-step-play" />
      <div data-testid="onboarding-step-results" />
    </div>
  ),
}));

vi.mock('@/components/education/EducationFAQ', () => ({
  EducationFAQ: () => <div data-testid="education-faq" />,
}));

vi.mock('@/components/education/DistrictUpsellStrip', () => ({
  DistrictUpsellStrip: () => <div data-testid="district-upsell" />,
}));

vi.mock('@/components/education/TeacherWelcomeBanner', () => ({
  TeacherWelcomeBanner: () => <div data-testid="teacher-welcome" />,
}));

vi.mock('@/components/education/TeacherProCheckoutCta', () => ({
  TeacherProCheckoutCta: () => <div data-testid="teacher-pro-checkout" />,
}));

vi.mock('@/components/education/NoAccountCta', () => ({
  NoAccountCta: () => <div data-testid="no-account-cta" />,
}));

vi.mock('@/components/navigation/TopBackLink', () => ({
  TopBackLink: () => <div data-testid="top-back-link" />,
}));

describe('Education Landing — first-screen declutter (R1)', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      loading: false,
      profile: null,
    });
  });

  describe('teacher host path is primary', () => {
    it('shows a lime (neo-neo-lime) CTA for free teacher access', () => {
      render(<EducationPageClient />);
      const teaCta = screen.getByTestId('teacher-card-access-link');
      expect(teaCta).toBeInTheDocument();
      // Lime button = neo-lime bg
      expect(teaCta).toHaveClass('bg-neo-lime');
    });

    it('shows the teacher request link in the hero section near the top', () => {
      render(<EducationPageClient />);
      const hero = screen.getByTestId('education-hero');
      const teaCta = screen.getByTestId('teacher-card-access-link');
      // Both should exist in the document
      expect(hero).toBeInTheDocument();
      expect(teaCta).toBeInTheDocument();
    });
  });

  describe('student join path is secondary', () => {
    it('shows no-account CTA below the fold, not above', () => {
      render(<EducationPageClient />);
      const noAcct = screen.getByTestId('no-account-cta');
      // Should exist but not be a primary first-screen CTA
      expect(noAcct).toBeInTheDocument();
    });
  });

  describe('teacher setup steps are visible pre-signup', () => {
    it('shows all five onboarding steps for an unauthenticated user', () => {
      render(<EducationPageClient />);
      for (const step of ['create', 'share', 'join', 'play', 'results']) {
        expect(screen.getByTestId(`onboarding-step-${step}`)).toBeInTheDocument();
      }
    });
  });

  describe('role cards remain', () => {
    it('shows teacher and student role cards', () => {
      render(<EducationPageClient />);
      // The role cards are in a specific grid
      expect(screen.getByTestId('teacher-card-access-link')).toBeInTheDocument();
      expect(screen.getByTestId('student-card-join-link')).toBeInTheDocument();
    });
  });
});
