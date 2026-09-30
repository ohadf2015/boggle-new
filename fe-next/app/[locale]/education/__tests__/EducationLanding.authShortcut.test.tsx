import { vi } from 'vitest';
/**
 * Education Landing — authenticated dashboard shortcut tests
 * Covers: role-aware shortcut banner shown when user is authenticated
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

describe('Education Landing — authenticated dashboard shortcut', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('redirects authenticated students instead of showing shortcut', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      profile: { display_name: 'Alice', user_role: 'student' },
    });
    render(<EducationPageClient />);
    expect(mockReplace).toHaveBeenCalledWith('/en/student');
    expect(screen.queryByTestId('auth-dashboard-shortcut')).not.toBeInTheDocument();
  });

  it('sends an approved teacher straight to the live classroom lobby', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      profile: { display_name: 'Mr. Smith', user_role: 'teacher' },
    });
    render(<EducationPageClient />);
    expect(mockReplace).toHaveBeenCalledWith('/en/education/classroom-game');
    expect(screen.queryByTestId('auth-dashboard-shortcut')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });

  it('does NOT show create classroom shortcut when unauthenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      loading: false,
      profile: null,
    });
    render(<EducationPageClient />);
    expect(screen.queryByTestId('create-classroom-shortcut')).not.toBeInTheDocument();
  });

  it('sends an admin to the live classroom lobby too', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      profile: { display_name: 'Ms. Jones', user_role: undefined, is_admin: true },
    });
    render(<EducationPageClient />);
    expect(mockReplace).toHaveBeenCalledWith('/en/education/classroom-game');
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

  it('does not keep a teacher on the marketing catalog', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      profile: { display_name: 'Mr. Smith', user_role: 'teacher' },
    });
    render(<EducationPageClient />);
    expect(screen.queryByTestId('teacher-hub-for-schools-link')).not.toBeInTheDocument();
    expect(screen.queryByText('education.landing.modes.title')).not.toBeInTheDocument();
  });

  it('does NOT show for-schools link for unauthenticated visitors', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      loading: false,
      profile: null,
    });
    render(<EducationPageClient />);
    expect(screen.queryByTestId('teacher-hub-for-schools-link')).not.toBeInTheDocument();
  });

  it('shows district role card link to for-schools for unauthenticated visitors', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      loading: false,
      profile: null,
    });
    render(<EducationPageClient />);
    const link = screen.getByTestId('district-role-card-link');
    expect(link).toHaveAttribute('href', '/en/education/for-schools');
  });
});
