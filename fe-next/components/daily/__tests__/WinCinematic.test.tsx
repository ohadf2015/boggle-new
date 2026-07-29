import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WinCinematic } from '../WinCinematic';

vi.useFakeTimers();

// Mock framer-motion to render plain divs
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, className, onClick, ...props }: any) => {
      const { initial, animate, transition, exit, whileTap, variants, whileHover, ...rest } = props;
      return <div className={className} onClick={onClick} {...rest}>{children}</div>;
    },
    span: ({ children, className, ...props }: any) => {
      const { initial, animate, transition, exit, whileTap, variants, whileHover, ...rest } = props;
      return <span className={className} {...rest}>{children}</span>;
    },
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock confetti utility so it doesn't blow up in jsdom
vi.mock('@/utils/confettiUtils', () => ({
  fireConfetti: vi.fn(),
  fireVictoryConfetti: vi.fn(),
}));

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

describe('WinCinematic', () => {
  afterEach(() => {
    jest.clearAllTimers();
    vi.clearAllMocks();
  });

  it('renders puzzle number', () => {
    render(
      <WinCinematic
        puzzleNumber={421}
        finalScore={847}
        onComplete={vi.fn()}
      />
    );
    expect(screen.getByText(/421/)).toBeInTheDocument();
  });

  it('calls onComplete after timeout', () => {
    const onComplete = vi.fn();
    render(
      <WinCinematic
        puzzleNumber={421}
        finalScore={847}
        onComplete={onComplete}
      />
    );
    act(() => { vi.advanceTimersByTime(2600); });
    expect(onComplete).toHaveBeenCalled();
  });

  it('calls onComplete on click exactly once', async () => {
    const onComplete = vi.fn();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(
      <WinCinematic
        puzzleNumber={421}
        finalScore={847}
        onComplete={onComplete}
      />
    );
    await user.click(screen.getByTestId('win-cinematic'));
    // Advance past the original 2.5s timer — should NOT fire again
    act(() => { vi.advanceTimersByTime(3000); });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('does not call onComplete after unmount', () => {
    const onComplete = vi.fn();
    const { unmount } = render(
      <WinCinematic
        puzzleNumber={421}
        finalScore={847}
        onComplete={onComplete}
      />
    );
    unmount();
    act(() => { vi.advanceTimersByTime(3000); });
    expect(onComplete).not.toHaveBeenCalled();
  });
});
