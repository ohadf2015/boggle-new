import { vi } from 'vitest';
/**
 * Education Landing — an existing teacher must be able to SIGN IN.
 *
 * Live audit: /en/education carried only signup-flavoured CTAs ("Get Teacher
 * Access", "Get Teacher Pro"). A teacher who already has an account had to go
 * Get Teacher Access → create-account modal → "Use password instead" →
 * "Already a member? Sign in" — three clicks past a CTA that is not for them.
 *
 * The hub gets one direct sign-in control, reusing the same AuthModal every
 * other surface opens.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import EducationPageClient from '../PageClient';

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => '/en/education',
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
  default: ({ isOpen, initialMode }: { isOpen: boolean; initialMode?: string }) =>
    isOpen ? <div data-testid="auth-modal" data-mode={initialMode} /> : null,
}));

vi.mock('framer-motion', () => {
  const React = require('react');
  const MotionDiv = React.forwardRef(
    ({ children, ...rest }: any, ref: any) => <div ref={ref} {...rest}>{children}</div>
  );
  MotionDiv.displayName = 'MotionDiv';
  const MotionButton = React.forwardRef(
    ({ children, ...rest }: any, ref: any) => <button ref={ref} {...rest}>{children}</button>
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

describe('Education Landing — sign in for an existing teacher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      loading: false,
      profile: null,
    });
  });

  it('offers a direct sign-in control to a signed-out visitor', () => {
    render(<EducationPageClient />);
    expect(screen.getByTestId('education-sign-in')).toBeInTheDocument();
  });

  // The modal is lazy (next/dynamic) — it is a modal nobody sees until asked for,
  // so the assertion waits for the chunk rather than forcing an eager import.
  it('opens the shared auth modal in sign-in mode', async () => {
    render(<EducationPageClient />);
    expect(screen.queryByTestId('auth-modal')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('education-sign-in'));

    const modal = await screen.findByTestId('auth-modal');
    expect(modal).toHaveAttribute('data-mode', 'signin');
  });

  it('hides the sign-in control once a teacher is signed in', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      profile: { user_role: 'teacher' },
    });
    render(<EducationPageClient />);
    expect(screen.queryByTestId('education-sign-in')).not.toBeInTheDocument();
  });
});
