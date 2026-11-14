import { render, screen } from '@testing-library/react';
import { RealGamesHero } from '../RealGamesHero';

vi.mock('@/hooks/useCountUp', () => ({ useCountUp: ({ target }: { target: number }) => target }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (_k: string, fb?: string, p?: Record<string, string | number>) =>
      (fb ?? _k).replace(/\{(\w+)\}/g, (_, n: string) => String(p?.[n] ?? `{${n}}`)),
    language: 'en',
  }),
}));

describe('RealGamesHero', () => {
  it('shows all-time real games as the headline with today and this week', () => {
    render(<RealGamesHero total={5678} today={44} week={469} />);
    expect(screen.getByTestId('real-games-total')).toHaveTextContent('5,678');
    const card = screen.getByTestId('real-games-hero');
    expect(card).toHaveTextContent('+44');
    expect(card).toHaveTextContent('+469');
    expect(card).toHaveTextContent('Games played since launch');
  });

  it('says what counts as a real game', () => {
    render(<RealGamesHero total={1} today={0} week={0} />);
    expect(screen.getByTestId('real-games-hint')).toHaveTextContent('at least one word');
  });
});
