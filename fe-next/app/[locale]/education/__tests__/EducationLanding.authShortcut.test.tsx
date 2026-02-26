/**
 * Education Landing — authenticated dashboard shortcut tests
 * Covers: role-aware shortcut banner shown when user is authenticated
 */

import { render, screen } from '@testing-library/react';
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

const mockUseAuth = jest.fn();
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('Education Landing — authenticated dashboard shortcut', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does NOT show shortcut when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      loading: false,
      profile: null,
    });
    render(<EducationPageClient />);
    expect(screen.queryByTestId('auth-dashboard-shortcut')).not.toBeInTheDocument();
  });

  it('shows shortcut when user is authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      profile: { display_name: 'Alice', user_role: 'student' },
    });
    render(<EducationPageClient />);
    expect(screen.getByTestId('auth-dashboard-shortcut')).toBeInTheDocument();
  });

  it('shows student dashboard link for student role', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      profile: { display_name: 'Alice', user_role: 'student', is_admin: false },
    });
    render(<EducationPageClient />);
    const link = screen.getByTestId('go-to-dashboard-link');
    expect(link).toHaveAttribute('href', '/en/student');
  });

  it('shows teacher dashboard link for teacher role', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      profile: { display_name: 'Mr. Smith', user_role: 'teacher', is_admin: true },
    });
    render(<EducationPageClient />);
    const link = screen.getByTestId('go-to-dashboard-link');
    expect(link).toHaveAttribute('href', '/en/teacher');
  });

  it('shows teacher dashboard link when is_admin flag is set', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      profile: { display_name: 'Ms. Jones', user_role: undefined, is_admin: true },
    });
    render(<EducationPageClient />);
    const link = screen.getByTestId('go-to-dashboard-link');
    expect(link).toHaveAttribute('href', '/en/teacher');
  });

  it('displays the authenticated user display name', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      profile: { display_name: 'Alice Learner', user_role: 'student', is_admin: false },
    });
    render(<EducationPageClient />);
    expect(screen.getByText('Alice Learner')).toBeInTheDocument();
  });

  it('does NOT show shortcut while auth is loading', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      loading: true,
      profile: null,
    });
    render(<EducationPageClient />);
    expect(screen.queryByTestId('auth-dashboard-shortcut')).not.toBeInTheDocument();
  });
});
