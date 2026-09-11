import { render, screen, fireEvent } from '@testing-library/react';
import { DuelRevealScreen } from '../DuelRevealScreen';

const playSound = vi.fn();
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playSound }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, _f?: string, p?: Record<string, unknown>) =>
      p ? `${key} ${Object.values(p).join(' ')}` : key,
    language: 'en',
  }),
}));

const fireVictoryConfetti = vi.fn();
vi.mock('@/utils/confettiUtils', () => ({
  fireVictoryConfetti: () => fireVictoryConfetti(),
}));

vi.mock('framer-motion', () => ({
  m: { div: ({ children, ...props }: any) => <div {...props}>{children}</div> },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('../DuelCoinFlight', () => ({
  DuelCoinFlight: ({ coins }: any) => <div data-testid="coin-flight">{coins}</div>,
}));

const props = {
  outcome: 'win' as const,
  myScore: 120,
  opponentScore: 80,
  myName: 'Alice',
  opponentName: 'Bob',
  xp: 30,
  coins: 40,
  peakStreak: 5,
  series: { mine: 1, theirs: 0, games: 1 },
  seriesStatus: 'open' as const,
  onBackToLobby: vi.fn(),
};

describe('DuelRevealScreen', () => {
  beforeEach(() => vi.clearAllMocks());

  it('paints a dark-only surface that cannot scroll the page', () => {
    render(<DuelRevealScreen {...props} />);

    const root = screen.getByTestId('duel-reveal');
    expect(root.className).toContain('bg-neo-navy');
    expect(root.className).not.toContain('bg-neo-cream');
    expect(root.className).toContain('overflow-hidden');
  });

  it('plays the champion clip and fires confetti + a fanfare on a win', () => {
    render(<DuelRevealScreen {...props} />);

    expect(screen.getByTestId('duel-reveal-clip')).toHaveAttribute(
      'src',
      '/mascots/celebration-champion-4.mp4'
    );
    expect(fireVictoryConfetti).toHaveBeenCalled();
    expect(playSound).toHaveBeenCalledWith('epicVictory', expect.anything());
  });

  it('plays the defeat clip with a sting and NO confetti on a loss', () => {
    render(<DuelRevealScreen {...props} outcome="loss" />);

    expect(screen.getByTestId('duel-reveal-clip')).toHaveAttribute(
      'src',
      '/mascots/celebration-defeat.mp4'
    );
    expect(fireVictoryConfetti).not.toHaveBeenCalled();
    expect(playSound).toHaveBeenCalledWith('defeatSting', expect.anything());
  });

  it('gives the clip a poster so nothing flashes before it decodes', () => {
    render(<DuelRevealScreen {...props} />);
    expect(screen.getByTestId('duel-reveal-clip')).toHaveAttribute('poster');
  });

  it('shows both final scores and the coin award', () => {
    render(<DuelRevealScreen {...props} />);

    expect(screen.getByTestId('duel-reveal-my-score')).toHaveTextContent('120');
    expect(screen.getByTestId('duel-reveal-opponent-score')).toHaveTextContent('80');
    expect(screen.getByTestId('coin-flight')).toHaveTextContent('40');
  });

  it('credits the best chain of the duel', () => {
    render(<DuelRevealScreen {...props} />);
    expect(screen.getByTestId('duel-reveal-peak-streak')).toHaveTextContent('5');
  });

  it('carries the best-of-3 tally', () => {
    render(<DuelRevealScreen {...props} />);
    expect(screen.getAllByTestId('duel-series-pip')).toHaveLength(3);
  });

  it('offers a rematch only when a rematch is possible', () => {
    const { rerender } = render(<DuelRevealScreen {...props} />);
    expect(screen.queryByTestId('duel-rematch-btn')).not.toBeInTheDocument();

    const onRematch = vi.fn();
    rerender(<DuelRevealScreen {...props} onRematch={onRematch} />);
    fireEvent.click(screen.getByTestId('duel-rematch-btn'));
    expect(onRematch).toHaveBeenCalled();
  });

  it('offers a fresh series instead of a rematch once the series is decided', () => {
    const onRematch = vi.fn();
    render(
      <DuelRevealScreen
        {...props}
        onRematch={onRematch}
        series={{ mine: 2, theirs: 0, games: 2 }}
        seriesStatus="won"
      />
    );

    expect(screen.getByTestId('duel-rematch-btn')).toHaveTextContent('newSeries');
  });

  it('always offers the way back to the lobby', () => {
    const onBackToLobby = vi.fn();
    render(<DuelRevealScreen {...props} onBackToLobby={onBackToLobby} />);

    fireEvent.click(screen.getByTestId('duel-back-btn'));
    expect(onBackToLobby).toHaveBeenCalled();
  });
});
