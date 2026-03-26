import { vi, type Mock, } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  useParams: vi.fn(() => ({ locale: 'en' })),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
  },
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

vi.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
}));

vi.mock('@/components/Header', () => ({
  default: function MockHeader() {
    return <header data-testid="header">Header</header>;
  };
});

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

describe('CookiePolicyPageClient', () => {
  // Lazy import so mocks are ready
  let CookiePolicyPageClient: any;

  beforeAll(async () => {
    const mod = await import('../PageClient');
    CookiePolicyPageClient = mod.default;
  });

  it('renders the page title', () => {
    render(<CookiePolicyPageClient />);
    expect(screen.getByRole('heading', { level: 1, name: 'legal.cookies.title' })).toBeInTheDocument();
  });

  it('renders introduction text', () => {
    render(<CookiePolicyPageClient />);
    expect(screen.getByText('legal.cookies.intro')).toBeInTheDocument();
  });

  it('renders all section headings', () => {
    render(<CookiePolicyPageClient />);
    const expectedSections = [
      'legal.cookies.whatAreCookies.title',
      'legal.cookies.cookiesWeUse.title',
      'legal.cookies.thirdPartyCookies.title',
      'legal.cookies.managingCookies.title',
      'legal.cookies.consent.title',
      'legal.cookies.changes.title',
      'legal.cookies.contactUs.title',
    ];
    expectedSections.forEach((key) => {
      expect(screen.getByText(key)).toBeInTheDocument();
    });
  });

  it('renders cookie category lists', () => {
    render(<CookiePolicyPageClient />);
    expect(screen.getByText('legal.cookies.cookiesWeUse.essential.auth')).toBeInTheDocument();
    expect(screen.getByText('legal.cookies.cookiesWeUse.analytics.logrocket')).toBeInTheDocument();
    expect(screen.getByText('legal.cookies.cookiesWeUse.advertising.adsense')).toBeInTheDocument();
  });

  it('renders opt-out links', () => {
    render(<CookiePolicyPageClient />);
    const googleAdSettings = screen.getByRole('link', { name: /Google Ad Settings/i });
    expect(googleAdSettings).toHaveAttribute('href', 'https://www.google.com/settings/ads');
  });

  it('renders contact page link in content', () => {
    render(<CookiePolicyPageClient />);
    const contactLinks = screen.getAllByRole('link', { name: /contact/i });
    const contentContactLink = contactLinks.find(link =>
      link.closest('section') !== null
    );
    expect(contentContactLink).toHaveAttribute('href', '/en/contact');
  });
});
