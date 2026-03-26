import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

// Ensure banner is visible (no stored consent)
beforeEach(() => {
  localStorage.clear();
});

describe('CookieConsent - Learn More link', () => {
  let CookieConsent: any;

  beforeAll(async () => {
    const mod = await import('../CookieConsent');
    CookieConsent = mod.default;
  });

  it('renders a Learn More link to cookie policy', () => {
    render(<CookieConsent />);
    const link = screen.getByText('cookieConsent.learnMore');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', '/en/legal/cookies');
  });
});
