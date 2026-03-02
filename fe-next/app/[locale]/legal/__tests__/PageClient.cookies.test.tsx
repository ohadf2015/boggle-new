import { render, screen } from '@testing-library/react';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
  useParams: jest.fn(() => ({ locale: 'en' })),
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
  },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

jest.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
}));

jest.mock('@/components/Header', () => {
  return function MockHeader() {
    return <header data-testid="header">Header</header>;
  };
});

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
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
