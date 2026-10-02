import { vi } from 'vitest';
/**
 * Education Landing — redesign tests (WU-9)
 * Covers: student auto-redirect, teacher simplified view, unauthenticated simplified view
 */

import { render, screen } from '@testing-library/react';
import EducationPageClient from '../PageClient';

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => '/en/education',
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

vi.mock('@/components/education/EducationHeader', () => ({
  EducationHeader: () => <div data-testid="education-header" />,
}));

vi.mock('@/components/ui/InteractiveMascot', () => ({
  InteractiveMascot: () => <div data-testid="interactive-mascot" />,
}));

vi.mock('@/components/auth/AuthModal', () => ({
  __esModule: true,
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="auth-modal" /> : null,
}));

vi.mock('framer-motion', () => {
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
    m: { div: MotionDiv, button: MotionButton },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useReducedMotion: vi.fn().mockReturnValue(false),
  };
});

const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('Education Landing — redesign (WU-9)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('signed-in account without teacher access', () => {
    it('stays on the landing and is asked to finish teacher setup, not sent to the student hub', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        loading: false,
        profile: { user_role: 'student', is_admin: false },
      });
      render(<EducationPageClient />);
      expect(mockReplace).not.toHaveBeenCalled();
      expect(screen.getByTestId('education-hero-free-cta')).toHaveAttribute('href', '/en/education/access');
    });

    it('does not redirect while auth is loading', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        loading: true,
        profile: null,
      });
      render(<EducationPageClient />);
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  describe('authenticated teacher simplified view', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        loading: false,
        profile: { display_name: 'Ms. Smith', user_role: 'teacher', is_admin: true },
      });
    });

    it('does NOT show role selection cards for teachers', () => {
      render(<EducationPageClient />);
      expect(screen.queryByText('education.landing.teacherCta')).not.toBeInTheDocument();
      expect(screen.queryByText('education.landing.studentCta')).not.toBeInTheDocument();
    });

    it('sends the teacher to the live lobby instead of a start-game button on the catalog', () => {
      render(<EducationPageClient />);
      expect(mockReplace).toHaveBeenCalledWith('/en/education/classroom-game');
      expect(screen.queryByText('education.landing.startGame')).not.toBeInTheDocument();
    });

    it('does NOT show DuelTeaserCard', () => {
      render(<EducationPageClient />);
      expect(screen.queryByText('education.landing.duelTeaser.headline')).not.toBeInTheDocument();
    });
  });

  describe('unauthenticated simplified view', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        loading: false,
        profile: null,
      });
    });

    it('has no feature checklists', () => {
      render(<EducationPageClient />);
      expect(screen.queryByText('education.landing.teacherFeature1')).not.toBeInTheDocument();
      expect(screen.queryByText('education.landing.studentFeature1')).not.toBeInTheDocument();
    });

    it('does NOT show DuelTeaserCard', () => {
      render(<EducationPageClient />);
      expect(screen.queryByText('education.landing.duelTeaser.headline')).not.toBeInTheDocument();
    });

    it('shows the product proof strip instead of an unverifiable social-proof line', () => {
      render(<EducationPageClient />);
      expect(screen.queryByText('education.landing.socialProof')).not.toBeInTheDocument();
      expect(screen.getByText('eg2Land.proof.noLogins')).toBeInTheDocument();
    });

    it('the closing CTA links to the access request page', () => {
      render(<EducationPageClient />);
      expect(screen.getByTestId('landing-final-start')).toHaveAttribute('href', expect.stringContaining('/education/access'));
    });

    /**
     * A teacher emailed to say the classroom setup instructions were not
     * accessible, and left. They were right: every explainer we had (the
     * first-run TeacherOnboarding modal, the #1099 dashboard checklist) sat
     * behind TeacherGate, and none of the eight landing FAQs answer "how do I
     * run this with my class". This asserts the steps are readable BEFORE
     * signing up — the one line that fixes it is otherwise unguarded.
     */
    it('shows the classroom setup steps to a visitor who has not signed up', () => {
      render(<EducationPageClient />);
      for (const id of ['create', 'share', 'join', 'play', 'results']) {
        expect(screen.getByTestId(`onboarding-step-${id}`)).toBeInTheDocument();
      }
    });

    it('ships an above-fold Teacher Pro checkout CTA to teacher/upgrade with $9', () => {
      render(<EducationPageClient />);
      const pro = screen.getByTestId('teacher-pro-checkout-link');
      expect(pro).toHaveAttribute('href', expect.stringContaining('teacher/upgrade'));
      expect(pro.textContent).toMatch(/\$9/);
    });
  });
});
