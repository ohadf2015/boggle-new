import { render, screen } from '@testing-library/react';
import { SignupsHero } from '../SignupsHero';

vi.mock('@/hooks/useCountUp', () => ({ useCountUp: ({ target }: { target: number }) => target }));
vi.mock('@/components/ui/Mascot', () => ({ Mascot: () => <div data-testid="mascot" /> }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (_k: string, fb?: string, p?: Record<string, string | number>) =>
      (fb ?? _k).replace(/\{(\w+)\}/g, (_, n: string) => String(p?.[n] ?? `{${n}}`)),
    language: 'en',
  }),
}));

describe('SignupsHero', () => {
  it('shows total signups as the headline with today and this week', () => {
    render(<SignupsHero total={1234} today={3} week={21} />);
    expect(screen.getByTestId('signups-total')).toHaveTextContent('1,234');
    expect(screen.getByTestId('signups-hero')).toHaveTextContent('+3');
    expect(screen.getByTestId('signups-hero')).toHaveTextContent('+21');
  });

  it('shows how far it is to the next milestone', () => {
    render(<SignupsHero total={1250} today={0} week={0} />);
    expect(screen.getByTestId('signups-next')).toHaveTextContent('250');
    expect(screen.getByTestId('signups-next')).toHaveTextContent('1,500');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
  });

  it('celebrates a milestone crossed this week', () => {
    render(<SignupsHero total={1000} today={7} week={40} />);
    expect(screen.getByTestId('signups-milestone')).toHaveTextContent('1,000');
  });
});
