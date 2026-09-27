import { vi } from 'vitest';
/**
 * Education Landing — the hub's marketing body must be in the FIRST render.
 *
 * `PageClient.tsx` gated the whole marketing body (hero H1, mode tour,
 * comparison, FAQ, social proof) behind `!loading && !hasTeacherAccess`.
 * `loading` is `true` on every SSR pass and on first client paint, so the
 * server-rendered HTML — and the very first thing a crawler or a visitor on
 * a slow connection sees — had no H1 at all. That is the Class-1 dual-source
 * pitfall run in reverse: the fix there is normally "render the pessimistic
 * state until every source resolves", but here the pessimistic (safest)
 * state for an unauthenticated marketing page IS the marketing page, so it
 * must render before auth resolves, not after.
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

describe('Education Landing — marketing body renders before auth resolves', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the hero H1 while auth is still loading (SSR + first paint)', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      loading: true,
      profile: null,
    });
    render(<EducationPageClient />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('does not show the teacher shortcut bar while auth is still loading', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      loading: true,
      profile: null,
    });
    render(<EducationPageClient />);
    expect(screen.queryByTestId('auth-dashboard-shortcut')).not.toBeInTheDocument();
  });

  it('switches away from the marketing H1 once auth resolves to a teacher', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      profile: { display_name: 'Ms. Smith', user_role: 'teacher', is_admin: true },
    });
    render(<EducationPageClient />);
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.getByTestId('auth-dashboard-shortcut')).toBeInTheDocument();
  });
});
