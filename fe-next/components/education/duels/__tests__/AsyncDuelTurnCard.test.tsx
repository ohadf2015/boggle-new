import { render, screen, fireEvent } from '@testing-library/react';
import { AsyncDuelTurnCard } from '../AsyncDuelTurnCard';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, _f?: string, p?: Record<string, unknown>) =>
      p ? `${key} ${Object.values(p).join(' ')}` : key,
    language: 'en',
  }),
}));

vi.mock('framer-motion', () => ({
  m: { div: ({ children, ...props }: any) => <div {...props}>{children}</div> },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const base = {
  duelId: 'duel-1',
  opponentName: 'Maya',
  lessonName: 'Unit 3 verbs',
  opponentScore: 340,
  onAccept: vi.fn(),
  onDecline: vi.fn(),
  onTaunt: vi.fn(),
};

describe('AsyncDuelTurnCard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('leads with the score you have to beat', () => {
    render(<AsyncDuelTurnCard {...base} />);

    expect(screen.getByTestId('duel-turn-card')).toHaveAttribute('data-state', 'target-set');
    expect(screen.getByTestId('duel-turn-target')).toHaveTextContent('340');
  });

  it('names the opponent and the lesson', () => {
    render(<AsyncDuelTurnCard {...base} />);

    expect(screen.getByText(/Maya/)).toBeInTheDocument();
    expect(screen.getByText('Unit 3 verbs')).toBeInTheDocument();
  });

  it('says "first move" instead of a fake zero when nobody has played yet', () => {
    render(<AsyncDuelTurnCard {...base} opponentScore={0} />);

    expect(screen.getByTestId('duel-turn-card')).toHaveAttribute('data-state', 'first-move');
    expect(screen.queryByTestId('duel-turn-target')).not.toBeInTheDocument();
  });

  it('plays the turn when the primary action is tapped', () => {
    render(<AsyncDuelTurnCard {...base} />);

    fireEvent.click(screen.getByTestId('duel-turn-play'));
    expect(base.onAccept).toHaveBeenCalledWith('duel-1');
  });

  it('declines when the secondary action is tapped', () => {
    render(<AsyncDuelTurnCard {...base} />);

    fireEvent.click(screen.getByTestId('duel-turn-decline'));
    expect(base.onDecline).toHaveBeenCalledWith('duel-1');
  });

  it('carries a taunt sticker picker', () => {
    render(<AsyncDuelTurnCard {...base} />);

    expect(screen.getAllByTestId('duel-taunt-option')).toHaveLength(4);
    fireEvent.click(screen.getAllByTestId('duel-taunt-option')[0]);
    expect(base.onTaunt).toHaveBeenCalledWith('duel-1', 'fire');
  });

  it('remembers the sticker already sent for this duel', () => {
    render(<AsyncDuelTurnCard {...base} sentTaunt="trophy" />);

    const trophy = screen
      .getAllByTestId('duel-taunt-option')
      .find((o) => o.getAttribute('data-taunt') === 'trophy')!;
    expect(trophy).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows a taunt the opponent threw back', () => {
    render(<AsyncDuelTurnCard {...base} incomingTaunt="mindblown" />);

    expect(screen.getByTestId('duel-turn-incoming-taunt')).toHaveAttribute(
      'src',
      '/mascot/teacher/sticker-mindblown.webp'
    );
  });
});
