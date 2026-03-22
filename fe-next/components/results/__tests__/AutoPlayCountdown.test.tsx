/**
 * AutoPlayCountdown Component Tests
 *
 * Tests for the auto-play countdown timer that appears
 * after a singleplayer game ends and auto-starts the next game.
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

// Mock LanguageContext
jest.mock('@/contexts/LanguageContext', () => ({
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
jest.mock('@/hooks/useReducedMotion', () => ({
  __esModule: true,
  default: jest.fn(() => false),
}));

import AutoPlayCountdown from '../AutoPlayCountdown';

describe('AutoPlayCountdown', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render with initial countdown value', () => {
    render(<AutoPlayCountdown onComplete={jest.fn()} onCancel={jest.fn()} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should render play again button', () => {
    render(<AutoPlayCountdown onComplete={jest.fn()} onCancel={jest.fn()} />);
    expect(screen.getByText('PLAY AGAIN')).toBeInTheDocument();
  });

  it('should render exit button', () => {
    render(<AutoPlayCountdown onComplete={jest.fn()} onCancel={jest.fn()} />);
    expect(screen.getByText('Exit')).toBeInTheDocument();
  });

  it('should count down every second', () => {
    render(<AutoPlayCountdown onComplete={jest.fn()} onCancel={jest.fn()} />);
    expect(screen.getByText('5')).toBeInTheDocument();

    act(() => { jest.advanceTimersByTime(1000); });
    expect(screen.getByText('4')).toBeInTheDocument();

    act(() => { jest.advanceTimersByTime(1000); });
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should call onComplete when countdown reaches 0', () => {
    const onComplete = jest.fn();
    render(<AutoPlayCountdown onComplete={onComplete} onCancel={jest.fn()} />);

    act(() => { jest.advanceTimersByTime(5000); });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('should call onComplete immediately when countdown ring is clicked', () => {
    const onComplete = jest.fn();
    render(<AutoPlayCountdown onComplete={onComplete} onCancel={jest.fn()} />);

    // Click the countdown ring button (has aria-label "PLAY AGAIN")
    fireEvent.click(screen.getByRole('button', { name: 'PLAY AGAIN' }));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('should call onCancel when exit is clicked', () => {
    const onCancel = jest.fn();
    render(<AutoPlayCountdown onComplete={jest.fn()} onCancel={onCancel} />);

    fireEvent.click(screen.getByText('Exit'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('should stop countdown when exit is clicked', () => {
    const onComplete = jest.fn();
    render(<AutoPlayCountdown onComplete={onComplete} onCancel={jest.fn()} />);

    fireEvent.click(screen.getByText('Exit'));
    act(() => { jest.advanceTimersByTime(10000); });
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('should accept custom duration', () => {
    render(<AutoPlayCountdown onComplete={jest.fn()} onCancel={jest.fn()} duration={3} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should have accessible countdown region', () => {
    render(<AutoPlayCountdown onComplete={jest.fn()} onCancel={jest.fn()} />);
    const region = screen.getByRole('status');
    expect(region).toBeInTheDocument();
  });

  it('should render SVG countdown ring', () => {
    const { container } = render(<AutoPlayCountdown onComplete={jest.fn()} onCancel={jest.fn()} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});
