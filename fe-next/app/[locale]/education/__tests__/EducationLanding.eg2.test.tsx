import { vi } from 'vitest';

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

describe('Education Landing — eg2 conversion pass', () => {
  beforeEach(() => vi.clearAllMocks());

  const anon = { isAuthenticated: false, loading: false, profile: null };
  const player = { isAuthenticated: true, loading: false, profile: { display_name: 'Ana', user_role: 'student' } };

  it('has a header with a home link and a free start, so the page is not a dead end', () => {
    mockUseAuth.mockReturnValue(anon);
    render(<EducationPageClient />);
    expect(screen.getByTestId('landing-header-home')).toHaveAttribute('href', '/en');
    expect(screen.getByTestId('landing-header-start')).toHaveAttribute('href', '/en/education/access');
  });

  it('keeps a signed-in account without teacher access on the landing: every profile starts as student', () => {
    mockUseAuth.mockReturnValue(player);
    render(<EducationPageClient />);
    expect(mockReplace).not.toHaveBeenCalledWith('/en/student');
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByTestId('education-hero-free-cta')).toHaveTextContent('eg2Land.hero.ctaFinishSetup');
    expect(screen.getByTestId('landing-student-classes-link')).toHaveAttribute('href', '/en/student');
  });

  it('no consumer-game links on the teacher landing', () => {
    mockUseAuth.mockReturnValue(anon);
    const { container } = render(<EducationPageClient />);
    const hrefs = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href') ?? '');
    for (const consumer of ['/en/multiplayer', '/en/blast', '/en/daily', '/en/guides', '/en/glossary', '/en/tools/word-solver']) {
      expect(hrefs).not.toContain(consumer);
    }
  });

  it('drops the competitor table and the duplicate client FAQ', () => {
    mockUseAuth.mockReturnValue(anon);
    const { container } = render(<EducationPageClient />);
    expect(container.querySelector('[data-compare-table]')).toBeNull();
    expect(screen.queryByText('education.landing.faq.title')).toBeNull();
  });

  it('renders the server FAQ slot once and offers a school quote', () => {
    mockUseAuth.mockReturnValue(anon);
    render(<EducationPageClient faq={<div data-testid="server-faq" />} />);
    expect(screen.getAllByTestId('server-faq')).toHaveLength(1);
    expect(screen.getByTestId('landing-school-quote-open')).toBeInTheDocument();
  });

  it('every free-start CTA goes straight to access, none through /teacher', () => {
    mockUseAuth.mockReturnValue(anon);
    const { container } = render(<EducationPageClient />);
    const hrefs = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href') ?? '');
    expect(hrefs).not.toContain('/en/teacher');
    expect(hrefs.filter((h) => h === '/en/education/access').length).toBeGreaterThanOrEqual(3);
  });
});
