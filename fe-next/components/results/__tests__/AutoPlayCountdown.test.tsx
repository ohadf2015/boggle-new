/**
 * AutoPlayCountdown Component Tests
 *
 * Tests for the auto-play countdown timer that appears
 * after a singleplayer game ends and auto-starts the next game.
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'autoPlay.nextGameIn': `Next game in ${params?.seconds ?? 0}...`,
        'autoPlay.playAgain': 'PLAY AGAIN',
        'autoPlay.exit': 'Exit',
        'autoPlay.shuffling': 'SHUFFLING...',
      };
      return translations[key] ?? key;
    },
    dir: 'ltr',
  }),
}));

// Mock useReducedMotion
vi.mock('@/hooks/useReducedMotion', () => ({
  __esModule: true,
  default: vi.fn(() => false),
}));

import AutoPlayCountdown from '../AutoPlayCountdown';

describe('AutoPlayCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render with initial countdown value', () => {
    render(<AutoPlayCountdown onComplete={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should render play again button', () => {
    render(<AutoPlayCountdown onComplete={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('PLAY AGAIN')).toBeInTheDocument();
  });

  it('should render exit button', () => {
    render(<AutoPlayCountdown onComplete={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('Exit')).toBeInTheDocument();
  });

  it('should count down every second', () => {
    render(<AutoPlayCountdown onComplete={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('5')).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByText('4')).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should call onComplete when countdown reaches 0', () => {
    const onComplete = vi.fn();
    render(<AutoPlayCountdown onComplete={onComplete} onCancel={vi.fn()} />);

    act(() => { vi.advanceTimersByTime(5000); });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('should call onComplete immediately when countdown ring-3 is clicked', () => {
    const onComplete = vi.fn();
    render(<AutoPlayCountdown onComplete={onComplete} onCancel={vi.fn()} />);

    // Click the countdown ring button (has aria-label "PLAY AGAIN")
    fireEvent.click(screen.getByRole('button', { name: 'PLAY AGAIN' }));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('should call onCancel when exit is clicked', () => {
    const onCancel = vi.fn();
    render(<AutoPlayCountdown onComplete={vi.fn()} onCancel={onCancel} />);

    fireEvent.click(screen.getByText('Exit'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('should stop countdown when exit is clicked', () => {
    const onComplete = vi.fn();
    render(<AutoPlayCountdown onComplete={onComplete} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByText('Exit'));
    act(() => { vi.advanceTimersByTime(10000); });
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('should accept custom duration', () => {
    render(<AutoPlayCountdown onComplete={vi.fn()} onCancel={vi.fn()} duration={3} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should have accessible countdown region', () => {
    render(<AutoPlayCountdown onComplete={vi.fn()} onCancel={vi.fn()} />);
    const region = screen.getByRole('status');
    expect(region).toBeInTheDocument();
  });

  it('should render SVG countdown ring-3', () => {
    const { container } = render(<AutoPlayCountdown onComplete={vi.fn()} onCancel={vi.fn()} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});
