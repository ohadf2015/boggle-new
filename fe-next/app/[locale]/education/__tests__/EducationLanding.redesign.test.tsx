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

  describe('authenticated student auto-redirect', () => {
    it('redirects student to student dashboard immediately', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        loading: false,
        profile: { user_role: 'student', is_admin: false },
      });
      render(<EducationPageClient />);
      expect(mockReplace).toHaveBeenCalledWith('/en/student');
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

    it('shows a "Start a Game" shortcut button', () => {
      render(<EducationPageClient />);
      expect(screen.getByText('education.landing.startGame')).toBeInTheDocument();
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

    it('shows role cards without feature checklists', () => {
      render(<EducationPageClient />);
      // Cards should exist
      expect(screen.getByText('education.landing.teacher')).toBeInTheDocument();
      expect(screen.getByText('education.landing.student')).toBeInTheDocument();
      // Feature items should NOT exist
      expect(screen.queryByText('education.landing.teacherFeature1')).not.toBeInTheDocument();
      expect(screen.queryByText('education.landing.studentFeature1')).not.toBeInTheDocument();
    });

    it('does NOT show DuelTeaserCard', () => {
      render(<EducationPageClient />);
      expect(screen.queryByText('education.landing.duelTeaser.headline')).not.toBeInTheDocument();
    });

    it('shows social proof banner', () => {
      render(<EducationPageClient />);
      expect(screen.getByText('education.landing.socialProof')).toBeInTheDocument();
    });

    it('teacher role card links to the access request page', () => {
      render(<EducationPageClient />);
      const teacherAccessLink = screen.getByTestId('teacher-card-access-link');
      expect(teacherAccessLink).toBeInTheDocument();
      expect(teacherAccessLink).toHaveAttribute('href', expect.stringContaining('/education/access'));
    });
  });
});
