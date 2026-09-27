import { render, screen } from '@testing-library/react';
import CreateBoardCTA from '../CreateBoardCTA';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

describe('CreateBoardCTA', () => {
  it('renders nothing when gamesPlayed < 5', () => {
    const { container } = render(<CreateBoardCTA gamesPlayed={3} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders CTA when gamesPlayed >= 5', () => {
    render(<CreateBoardCTA gamesPlayed={5} />);
    expect(screen.getByText('ugc.creator.makeYourOwn')).toBeInTheDocument();
  });

  it('links to create board page', () => {
    render(<CreateBoardCTA gamesPlayed={10} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/en/create/board');
  });

  it('renders at exactly 5 games', () => {
    render(<CreateBoardCTA gamesPlayed={5} />);
    expect(screen.getByText('ugc.createBoard')).toBeInTheDocument();
  });
});
