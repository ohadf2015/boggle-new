import { render, screen } from '@testing-library/react';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

jest.mock('@/components/icons/SocialIcons', () => ({
  InstagramIcon: () => <span>Instagram</span>,
}));

describe('Footer - Legal link', () => {
  let Footer: any;

  beforeAll(async () => {
    const mod = await import('../Footer');
    Footer = mod.default;
  });

  it('renders a consolidated Legal link pointing to /legal', () => {
    render(<Footer />);
    const link = screen.getByText('legal.title');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', '/en/legal');
  });
});
