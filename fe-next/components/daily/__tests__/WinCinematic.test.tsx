import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WinCinematic } from '../WinCinematic';

jest.useFakeTimers();

// Mock framer-motion to render plain divs
jest.mock('framer-motion', () => ({
  m: {
    div: ({ children, className, onClick, ...props }: any) => (
      <div className={className} onClick={onClick} {...props}>{children}</div>
    ),
    span: ({ children, className, ...props }: any) => (
      <span className={className} {...props}>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock confetti utility so it doesn't blow up in jsdom
jest.mock('@/utils/confettiUtils', () => ({
  fireConfetti: jest.fn(),
  fireVictoryConfetti: jest.fn(),
}));

// Mock LanguageContext
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

describe('WinCinematic', () => {
  it('renders puzzle number', () => {
    render(
      <WinCinematic
        puzzleNumber={421}
        finalScore={847}
        onComplete={jest.fn()}
      />
    );
    expect(screen.getByText(/421/)).toBeInTheDocument();
  });

  it('calls onComplete after timeout', () => {
    const onComplete = jest.fn();
    render(
      <WinCinematic
        puzzleNumber={421}
        finalScore={847}
        onComplete={onComplete}
      />
    );
    act(() => { jest.advanceTimersByTime(2600); });
    expect(onComplete).toHaveBeenCalled();
  });

  it('calls onComplete on click', async () => {
    const onComplete = jest.fn();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(
      <WinCinematic
        puzzleNumber={421}
        finalScore={847}
        onComplete={onComplete}
      />
    );
    await user.click(screen.getByTestId('win-cinematic'));
    expect(onComplete).toHaveBeenCalled();
  });
});
