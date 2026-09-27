import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  useParams: vi.fn(() => ({ locale: 'en' })),
}));

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
  },
}));

vi.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
}));

vi.mock('@/components/Header', () => ({
  default: function MockHeader() {
    return <header data-testid="header">Header</header>;
  },
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

vi.mock('@/components/legal/LegalPageLayout', () => ({
  __esModule: true,
  default: ({ children, title }: any) => <div><h1>{title}</h1>{children}</div>,
}));

describe('CookiePolicyPageClient', () => {
  let CookiePolicyPageClient: any;

  beforeAll(async () => {
    const mod = await import('../PageClient');
    CookiePolicyPageClient = mod.default;
  });

  it('renders the page title', () => {
    render(<CookiePolicyPageClient />);
    expect(screen.getAllByText('Cookie Policy').length).toBeGreaterThan(0);
  });

  it('renders introduction text', () => {
    render(<CookiePolicyPageClient />);
    expect(screen.getByText(/explains how LexiClash uses cookies/i)).toBeInTheDocument();
  });

  it('renders all section headings', () => {
    render(<CookiePolicyPageClient />);
    const expectedSections = [
      '1. What Are Cookies',
      '2. Cookies We Use',
      '3. Third-Party Cookies',
      '4. Managing Cookies',
      '5. Cookie Consent',
      '6. Changes to This Policy',
      '7. Contact Us',
    ];
    expectedSections.forEach((heading) => {
      expect(screen.getByText(heading)).toBeInTheDocument();
    });
  });

  it('renders cookie category items', () => {
    render(<CookiePolicyPageClient />);
    expect(screen.getByText(/Authentication tokens/i)).toBeInTheDocument();
    expect(screen.getAllByText(/LogRocket/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Google AdMob/i).length).toBeGreaterThan(0);
  });

  it('renders managing cookies content with opt-out mention', () => {
    render(<CookiePolicyPageClient />);
    expect(screen.getAllByText(/Google Ad Settings/i).length).toBeGreaterThan(0);
  });

  it('renders contact page link', () => {
    render(<CookiePolicyPageClient />);
    const contactLink = screen.getByRole('link', { name: /contact/i });
    expect(contactLink).toHaveAttribute('href', '/en/contact');
  });
});
