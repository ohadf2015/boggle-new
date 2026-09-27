import { render, screen } from '@testing-library/react';
import { DuelSwingBar } from '../DuelSwingBar';

// Mirrors the real t(): it interpolates {param} placeholders, so an assertion
// on the interpolated number is a real assertion and not a key match.
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, _fallback?: string, params?: Record<string, unknown>) =>
      params
        ? `${key} ${Object.values(params).join(' ')}`
        : key,
    language: 'en',
  }),
}));

vi.mock('framer-motion', () => ({
  m: { div: ({ children, ...props }: any) => <div {...props}>{children}</div> },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const base = { myName: 'Alice', opponentName: 'Bob' };

describe('DuelSwingBar', () => {
  it('says you are ahead and by how much', () => {
    render(<DuelSwingBar {...base} myScore={40} opponentScore={25} />);

    const bar = screen.getByTestId('duel-swing-bar');
    expect(bar).toHaveAttribute('data-swing', 'ahead');
    expect(screen.getByTestId('duel-swing-verdict')).toHaveTextContent('15');
  });

  it('says you are behind and by how much', () => {
    render(<DuelSwingBar {...base} myScore={10} opponentScore={31} />);

    expect(screen.getByTestId('duel-swing-bar')).toHaveAttribute('data-swing', 'behind');
    expect(screen.getByTestId('duel-swing-verdict')).toHaveTextContent('21');
  });

  it('calls a tie level rather than pretending someone leads', () => {
    render(<DuelSwingBar {...base} myScore={30} opponentScore={30} />);

    expect(screen.getByTestId('duel-swing-bar')).toHaveAttribute('data-swing', 'level');
  });

  it('splits the bar evenly before anyone scores', () => {
    render(<DuelSwingBar {...base} myScore={0} opponentScore={0} />);

    expect(screen.getByTestId('duel-swing-mine')).toHaveStyle({ width: '50%' });
  });

  it('gives the leader the larger share of the bar', () => {
    render(<DuelSwingBar {...base} myScore={75} opponentScore={25} />);

    expect(screen.getByTestId('duel-swing-mine')).toHaveStyle({ width: '75%' });
  });

  it('shows both names and both live scores', () => {
    render(<DuelSwingBar {...base} myScore={12} opponentScore={9} />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByTestId('duel-swing-my-score')).toHaveTextContent('12');
    expect(screen.getByTestId('duel-swing-opponent-score')).toHaveTextContent('9');
  });

  it('flags a rival who is on a hot chain', () => {
    const { rerender } = render(
      <DuelSwingBar {...base} myScore={10} opponentScore={10} opponentStreak={1} />
    );
    expect(screen.queryByTestId('duel-swing-opponent-fire')).not.toBeInTheDocument();

    rerender(<DuelSwingBar {...base} myScore={10} opponentScore={10} opponentStreak={4} />);
    expect(screen.getByTestId('duel-swing-opponent-fire')).toBeInTheDocument();
  });

  it('announces the swing politely instead of shouting every point', () => {
    render(<DuelSwingBar {...base} myScore={5} opponentScore={1} />);
    expect(screen.getByTestId('duel-swing-verdict')).toHaveAttribute('aria-live', 'polite');
  });
});
