import { render, screen, act } from '@testing-library/react';
import {
  WordHuntFirstTimeNudges,
  getSeenNudges,
  STORAGE_KEY,
} from '../WordHuntFirstTimeNudges';

// Mock AdaptiveMotion
jest.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, transition, ...rest } = props;
      return <div {...(rest as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>;
    },
  },
  AdaptiveAnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

const mockT = (key: string) => key;

describe('WordHuntFirstTimeNudges', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the nudge container', () => {
    render(
      <WordHuntFirstTimeNudges
        lifePoints={100}
        discoveryClueCount={0}
        wrongGuessCount={0}
        t={mockT}
      />,
    );
    expect(screen.getByTestId('nudge-container')).toBeInTheDocument();
  });

  it('shows lifeDrop nudge when life drops below 70', () => {
    const { rerender } = render(
      <WordHuntFirstTimeNudges lifePoints={100} discoveryClueCount={0} wrongGuessCount={0} t={mockT} />,
    );
    expect(screen.queryByTestId('nudge-lifeDrop')).not.toBeInTheDocument();

    rerender(
      <WordHuntFirstTimeNudges lifePoints={65} discoveryClueCount={0} wrongGuessCount={0} t={mockT} />,
    );
    expect(screen.getByTestId('nudge-lifeDrop')).toBeInTheDocument();
  });

  it('shows firstClue nudge when discovery clue arrives', () => {
    const { rerender } = render(
      <WordHuntFirstTimeNudges lifePoints={100} discoveryClueCount={0} wrongGuessCount={0} t={mockT} />,
    );

    rerender(
      <WordHuntFirstTimeNudges lifePoints={100} discoveryClueCount={1} wrongGuessCount={0} t={mockT} />,
    );
    expect(screen.getByTestId('nudge-firstClue')).toBeInTheDocument();
  });

  it('shows wrongGuess nudge on first wrong guess', () => {
    const { rerender } = render(
      <WordHuntFirstTimeNudges lifePoints={100} discoveryClueCount={0} wrongGuessCount={0} t={mockT} />,
    );

    rerender(
      <WordHuntFirstTimeNudges lifePoints={100} discoveryClueCount={0} wrongGuessCount={1} t={mockT} />,
    );
    expect(screen.getByTestId('nudge-wrongGuess')).toBeInTheDocument();
  });

  it('auto-dismisses nudge after 4 seconds', () => {
    const { rerender } = render(
      <WordHuntFirstTimeNudges lifePoints={100} discoveryClueCount={0} wrongGuessCount={0} t={mockT} />,
    );

    rerender(
      <WordHuntFirstTimeNudges lifePoints={65} discoveryClueCount={0} wrongGuessCount={0} t={mockT} />,
    );
    expect(screen.getByTestId('nudge-lifeDrop')).toBeInTheDocument();

    act(() => { jest.advanceTimersByTime(4000); });
    expect(screen.queryByTestId('nudge-lifeDrop')).not.toBeInTheDocument();
  });

  it('persists seen nudges to localStorage', () => {
    const { rerender } = render(
      <WordHuntFirstTimeNudges lifePoints={100} discoveryClueCount={0} wrongGuessCount={0} t={mockT} />,
    );

    rerender(
      <WordHuntFirstTimeNudges lifePoints={65} discoveryClueCount={0} wrongGuessCount={0} t={mockT} />,
    );

    const seen = getSeenNudges();
    expect(seen.has('lifeDrop')).toBe(true);
  });

  it('does not show a nudge that was already seen', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['lifeDrop']));

    const { rerender } = render(
      <WordHuntFirstTimeNudges lifePoints={100} discoveryClueCount={0} wrongGuessCount={0} t={mockT} />,
    );

    rerender(
      <WordHuntFirstTimeNudges lifePoints={65} discoveryClueCount={0} wrongGuessCount={0} t={mockT} />,
    );

    expect(screen.queryByTestId('nudge-lifeDrop')).not.toBeInTheDocument();
  });

  it('does not show life nudge when life is 0 (already dead)', () => {
    render(
      <WordHuntFirstTimeNudges lifePoints={0} discoveryClueCount={0} wrongGuessCount={0} t={mockT} />,
    );
    expect(screen.queryByTestId('nudge-lifeDrop')).not.toBeInTheDocument();
  });
});
