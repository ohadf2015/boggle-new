import { vi } from 'vitest';
/**
 * Education Landing — the teacher shortcuts must navigate client-side.
 *
 * A raw `<a href>` here is a full document navigation: the browser tears the
 * app down and boots it again, which re-runs the whole Supabase auth bootstrap
 * on the destination. Teachers reported "clicking Open Teacher Dashboard just
 * refreshes the page" — that reload IS the bug, and on a slow session fetch the
 * rebooted page can even bounce back out of /teacher before auth resolves.
 *
 * next/link keeps it a client transition, so the already-resolved auth state
 * (and the teacher role with it) survives the navigation.
 */

import { render, screen } from '@testing-library/react';
import EducationPageClient from '../PageClient';

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => '/en/education',
}));

// Tag Link-rendered anchors so a raw `<a>` is distinguishable from a client link.
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a data-client-nav="true" href={href} {...rest}>{children}</a>
  ),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

vi.mock('@/components/education/EducationHeader', () => ({
  EducationHeader: () => <div data-testid="education-header" />,
}));

vi.mock('@/components/ui/InteractiveMascot', () => ({
  InteractiveMascot: () => <div data-testid="interactive-mascot" />,
}));

vi.mock('@/components/auth/AuthModal', () => ({
  __esModule: true,
  default: () => null,
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

describe('Education Landing — teacher shortcuts navigate client-side', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      profile: { display_name: 'Mr. Smith', user_role: 'teacher', is_admin: false },
    });
  });

  it('renders the Open Teacher Dashboard CTA as a client-side link, not a document reload', () => {
    render(<EducationPageClient />);
    expect(screen.getByTestId('go-to-dashboard-link')).toHaveAttribute('data-client-nav', 'true');
  });

  it('renders the Start Game shortcut as a client-side link too', () => {
    render(<EducationPageClient />);
    const startGame = screen.getByRole('link', { name: /education\.landing\.startGame/i });
    expect(startGame).toHaveAttribute('data-client-nav', 'true');
  });
});
