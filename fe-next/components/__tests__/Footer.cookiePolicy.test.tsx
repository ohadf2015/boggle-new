import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

vi.mock('@/components/icons/SocialIcons', () => ({
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
    const links = screen.getAllByText('legal.title');
    const legalLink = links.find(el => el.closest('a'));
    expect(legalLink).toBeInTheDocument();
    expect(legalLink!.closest('a')).toHaveAttribute('href', '/en/legal');
  });
});
