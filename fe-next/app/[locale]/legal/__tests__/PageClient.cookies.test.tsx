import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  useParams: vi.fn(() => ({ locale: 'en' })),
}));

vi.mock('framer-motion', () => ({
  m: {
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
  },
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

vi.mock('@/components/legal/LegalPageLayout', () => ({
  __esModule: true,
  default: ({ children, title }: any) => <div><h1>{title}</h1>{children}</div>,
}));

describe('Legal Index - Cookies card', () => {
  let LegalIndexPageClient: any;

  beforeAll(async () => {
    const mod = await import('../PageClient');
    LegalIndexPageClient = mod.default;
  });

  it('renders a cookies card with link to cookie policy', () => {
    render(<LegalIndexPageClient />);
    const cookiesLink = screen.getByRole('link', { name: /legal\.cookies\.title/i });
    expect(cookiesLink).toHaveAttribute('href', '/en/legal/cookies');
  });

  it('renders cookies description', () => {
    render(<LegalIndexPageClient />);
    expect(screen.getByText('legal.index.cookiesDescription')).toBeInTheDocument();
  });
});
