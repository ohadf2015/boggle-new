import { render, screen } from '@testing-library/react';
import { OpponentProgressBar } from '../OpponentProgressBar';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('OpponentProgressBar', () => {
  it('should render progress bar with scores', () => {
    render(
      <OpponentProgressBar
        myScore={100}
        opponentScore={50}
        myName="Alice"
        opponentName="Bob"
      />
    );

    expect(screen.getByTestId('opponent-progress-bar')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
  });

  it('should show 50/50 split when both scores are 0', () => {
    render(
      <OpponentProgressBar
        myScore={0}
        opponentScore={0}
        myName="Alice"
        opponentName="Bob"
      />
    );

    const bar = screen.getByTestId('opponent-progress-bar');
    expect(bar).toBeInTheDocument();
  });

  it('should render player side with correct data attribute', () => {
    const { container } = render(
      <OpponentProgressBar
        myScore={75}
        opponentScore={25}
        myName="Alice"
        opponentName="Bob"
      />
    );

    // Player side should exist
    const playerSide = container.querySelector('[data-side="player"]');
    expect(playerSide).toBeInTheDocument();
  });

  it('should render opponent side with correct data attribute', () => {
    const { container } = render(
      <OpponentProgressBar
        myScore={30}
        opponentScore={70}
        myName="Alice"
        opponentName="Bob"
      />
    );

    // Opponent side should exist
    const opponentSide = container.querySelector('[data-side="opponent"]');
    expect(opponentSide).toBeInTheDocument();
  });
});
