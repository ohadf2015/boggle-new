import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { GameModeIntro } from '../GameModeIntro';
import type { GameMode } from '@/shared/types/game';

// Mock framer-motion
vi.mock('framer-motion', () => {
  const MotionDiv = React.forwardRef(({ children, ...props }: any, ref: any) => (
    <div ref={ref} {...props}>{children}</div>
  ));
  MotionDiv.displayName = 'MotionDiv';
  const MotionH1 = React.forwardRef(({ children, ...props }: any, ref: any) => (
    <h1 ref={ref} {...props}>{children}</h1>
  ));
  MotionH1.displayName = 'MotionH1';
  const MotionP = React.forwardRef(({ children, ...props }: any, ref: any) => (
    <p ref={ref} {...props}>{children}</p>
  ));
  MotionP.displayName = 'MotionP';
  return {
    m: {
      div: MotionDiv,
      h1: MotionH1,
      p: MotionP,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

const mockT = (key: string) => {
  const translations: Record<string, string> = {
    'gameModes.classic.name': 'Classic',
    'gameModes.classic.description': 'Find as many words as you can!',
    'gameModes.blast.name': 'Blast',
    'gameModes.blast.description': 'Clear tiles with combos and special powers!',
    'gameModes.wordHunt.name': 'Word Hunt',
    'gameModes.wordHunt.description': 'Race to find the target word!',
  };
  return translations[key] || key;
};

describe('GameModeIntro', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render classic mode intro', () => {
    render(<GameModeIntro mode="classic" t={mockT} onComplete={vi.fn()} />);
    expect(screen.getByText('Classic')).toBeInTheDocument();
    expect(screen.getByText('Find as many words as you can!')).toBeInTheDocument();
  });

  it('should render blast mode intro', () => {
    render(<GameModeIntro mode="blast" t={mockT} onComplete={vi.fn()} />);
    expect(screen.getByText('Blast')).toBeInTheDocument();
    expect(screen.getByText('Clear tiles with combos and special powers!')).toBeInTheDocument();
  });

  it('should render word-hunt mode intro', () => {
    render(<GameModeIntro mode="word-hunt" t={mockT} onComplete={vi.fn()} />);
    expect(screen.getByText('Word Hunt')).toBeInTheDocument();
    expect(screen.getByText('Race to find the target word!')).toBeInTheDocument();
  });

  it('should call onComplete after duration', () => {
    const onComplete = vi.fn();
    render(<GameModeIntro mode="classic" t={mockT} onComplete={onComplete} duration={3000} />);

    expect(onComplete).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('should use default 3-second duration', () => {
    const onComplete = vi.fn();
    render(<GameModeIntro mode="classic" t={mockT} onComplete={onComplete} />);

    act(() => {
      vi.advanceTimersByTime(2999);
    });
    expect(onComplete).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('should render mode icon', () => {
    const { container } = render(<GameModeIntro mode="classic" t={mockT} onComplete={vi.fn()} />);
    expect(container.querySelector('[data-testid="game-mode-intro"]')).toBeInTheDocument();
  });

  it('should have correct data-mode attribute', () => {
    const { container } = render(<GameModeIntro mode="blast" t={mockT} onComplete={vi.fn()} />);
    const element = container.querySelector('[data-testid="game-mode-intro"]');
    expect(element).toHaveAttribute('data-mode', 'blast');
  });

  it('should render in TV mode with larger text', () => {
    render(<GameModeIntro mode="classic" t={mockT} onComplete={vi.fn()} isTv />);
    const element = screen.getByTestId('game-mode-intro');
    expect(element).toHaveAttribute('data-tv', 'true');
  });

  it('should clean up timer on unmount', () => {
    const onComplete = vi.fn();
    const { unmount } = render(
      <GameModeIntro mode="classic" t={mockT} onComplete={onComplete} />
    );
    unmount();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(onComplete).not.toHaveBeenCalled();
  });
});
