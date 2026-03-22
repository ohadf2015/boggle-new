/**
 * WotdReveal Component Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(function MotionDiv(
      { children, ...props }: React.PropsWithChildren<Record<string, unknown>>,
      ref: React.Ref<HTMLDivElement>
    ) {
      return <div ref={ref} {...props}>{children}</div>;
    }),
  },
  useReducedMotion: () => false,
}));

// Mock useLanguage
const mockT = jest.fn((key: string) => {
  const translations: Record<string, string> = {
    'wotd.found': 'You found it!',
    'wotd.foundPercent': 'Only {{percent}}% of players found this!',
    'wotd.missed': 'Word of the Day',
    'wotd.missedHint': 'Try again tomorrow!',
    'wotd.loading': 'Loading...',
  };
  return translations[key] || key;
});

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: mockT, language: 'en', dir: 'ltr' }),
}));

// Mock useWordOfTheDay
const mockUseWordOfTheDay = jest.fn();
jest.mock('@/hooks/useWordOfTheDay', () => ({
  useWordOfTheDay: (...args: unknown[]) => mockUseWordOfTheDay(...args),
}));

import { WotdReveal } from '../WotdReveal';

describe('WotdReveal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state', () => {
    mockUseWordOfTheDay.mockReturnValue({
      word: '', stats: { foundCount: 0, totalPlayers: 0, foundPercent: 0 },
      playerFound: false, loading: true, error: null,
    });

    render(<WotdReveal playerWords={[]} />);
    expect(screen.getByTestId('wotd-reveal-loading')).toBeInTheDocument();
  });

  it('should render found state when player found the word', () => {
    mockUseWordOfTheDay.mockReturnValue({
      word: 'crystal', stats: { foundCount: 10, totalPlayers: 50, foundPercent: 20 },
      playerFound: true, loading: false, error: null,
    });

    render(<WotdReveal playerWords={['crystal', 'garden']} />);

    expect(screen.getByTestId('wotd-reveal')).toBeInTheDocument();
    expect(screen.getByTestId('wotd-word')).toHaveTextContent('crystal');
    expect(screen.getByText('You found it!')).toBeInTheDocument();
  });

  it('should render missed state when player did not find the word', () => {
    mockUseWordOfTheDay.mockReturnValue({
      word: 'crystal', stats: { foundCount: 10, totalPlayers: 50, foundPercent: 20 },
      playerFound: false, loading: false, error: null,
    });

    render(<WotdReveal playerWords={['garden', 'bridge']} />);

    expect(screen.getByTestId('wotd-reveal')).toBeInTheDocument();
    expect(screen.getByTestId('wotd-word')).toHaveTextContent('crystal');
    expect(screen.getByText('Word of the Day')).toBeInTheDocument();
  });

  it('should handle case-insensitive word matching', () => {
    mockUseWordOfTheDay.mockReturnValue({
      word: 'crystal', stats: { foundCount: 5, totalPlayers: 20, foundPercent: 25 },
      playerFound: false, loading: false, error: null,
    });

    render(<WotdReveal playerWords={['CRYSTAL', 'GARDEN']} />);

    // Should match case-insensitively and show "found" state
    expect(screen.getByText('You found it!')).toBeInTheDocument();
  });

  it('should return null when no word is available', () => {
    mockUseWordOfTheDay.mockReturnValue({
      word: '', stats: { foundCount: 0, totalPlayers: 0, foundPercent: 0 },
      playerFound: false, loading: false, error: null,
    });

    const { container } = render(<WotdReveal playerWords={[]} />);
    // Loading is false and word is empty → render nothing
    expect(container.innerHTML).toBe('');
  });

  it('should display the found percent in the message', () => {
    mockUseWordOfTheDay.mockReturnValue({
      word: 'dragon', stats: { foundCount: 3, totalPlayers: 100, foundPercent: 3 },
      playerFound: true, loading: false, error: null,
    });

    render(<WotdReveal playerWords={['dragon']} />);
    expect(screen.getByText('Only 3% of players found this!')).toBeInTheDocument();
  });
});
