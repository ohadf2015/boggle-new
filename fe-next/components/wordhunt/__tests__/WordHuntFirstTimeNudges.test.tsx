import { render, screen, act } from '@testing-library/react';
import {
  WordHuntFirstTimeNudges,
  getSeenNudges,
  STORAGE_KEY,
} from '../WordHuntFirstTimeNudges';

// Mock AdaptiveMotion
vi.mock('@/components/motion/AdaptiveMotion', () => ({
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
    vi.useFakeTimers();
    localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
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

    act(() => { vi.advanceTimersByTime(4000); });
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

  // The nudge floats (fixed) over the bright white Word Hunt grid tiles. A
  // translucent color fill (bg-neo-X/10) lets the white grid bleed through, so
  // cream text lands on near-white → ~1.2:1 contrast (invisible). The fill MUST
  // be a solid opaque dark base so contrast is independent of what's behind it.
  describe('contrast: backdrop-independent solid background', () => {
    const cases: Array<[string, Partial<React.ComponentProps<typeof WordHuntFirstTimeNudges>>]> = [
      ['nudge-lifeDrop', { lifePoints: 65 }],
      ['nudge-firstClue', { discoveryClueCount: 1 }],
      ['nudge-wrongGuess', { wrongGuessCount: 1 }],
    ];

    it.each(cases)('%s uses a solid dark fill, never a translucent color tint', (testId, trigger) => {
      const base = { lifePoints: 100, discoveryClueCount: 0, wrongGuessCount: 0, t: mockT };
      const { rerender } = render(<WordHuntFirstTimeNudges {...base} />);
      rerender(<WordHuntFirstTimeNudges {...base} {...trigger} />);

      const className = screen.getByTestId(testId).className;
      // Opaque dark base guarantees contrast regardless of the white grid behind it.
      expect(className).toContain('bg-neo-navy');
      // No translucent color fill (the bug: white grid bled through bg-neo-*/10).
      expect(className).not.toMatch(/bg-neo-\w+\/\d/);
    });
  });
});
