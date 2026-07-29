/**
 * WotdTeaser Component Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock useLanguage
const mockT = vi.fn((key: string) => {
  const translations: Record<string, string> = {
    'wotd.teaser': 'Word of the Day',
    'wotd.play': 'Play now',
  };
  return translations[key] || key;
});

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: mockT, language: 'en', dir: 'ltr' }),
}));

// Mock useWordOfTheDay
const mockUseWordOfTheDay = vi.fn();
vi.mock('@/hooks/useWordOfTheDay', () => ({
  useWordOfTheDay: (...args: unknown[]) => mockUseWordOfTheDay(...args),
}));

import { WotdTeaser } from '../WotdTeaser';
import * as LanguageContext from '@/contexts/LanguageContext';

describe('WotdTeaser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render nothing while loading', () => {
    mockUseWordOfTheDay.mockReturnValue({
      word: '', loading: true, stats: { foundCount: 0, totalPlayers: 0, foundPercent: 0 },
      playerFound: false, error: null,
    });

    const { container } = render(<WotdTeaser />);
    expect(container.innerHTML).toBe('');
  });

  it('should render nothing when word is empty', () => {
    mockUseWordOfTheDay.mockReturnValue({
      word: '', loading: false, stats: { foundCount: 0, totalPlayers: 0, foundPercent: 0 },
      playerFound: false, error: null,
    });

    const { container } = render(<WotdTeaser />);
    expect(container.innerHTML).toBe('');
  });

  it('should render the teaser with first letter visible', () => {
    mockUseWordOfTheDay.mockReturnValue({
      word: 'crystal', loading: false,
      stats: { foundCount: 0, totalPlayers: 0, foundPercent: 0 },
      playerFound: false, error: null,
    });

    render(<WotdTeaser />);

    expect(screen.getByTestId('wotd-teaser')).toBeInTheDocument();
    expect(screen.getByTestId('wotd-first-letter')).toHaveTextContent('C');
    expect(screen.getByTestId('wotd-masked')).toHaveTextContent('_ _ _ _ _ _');
  });

  it('should link to /daily', () => {
    mockUseWordOfTheDay.mockReturnValue({
      word: 'dragon', loading: false,
      stats: { foundCount: 0, totalPlayers: 0, foundPercent: 0 },
      playerFound: false, error: null,
    });

    render(<WotdTeaser />);

    const link = screen.getByTestId('wotd-teaser');
    expect(link).toHaveAttribute('href', '/daily');
  });

  it('should show teaser label and play CTA', () => {
    mockUseWordOfTheDay.mockReturnValue({
      word: 'blaze', loading: false,
      stats: { foundCount: 0, totalPlayers: 0, foundPercent: 0 },
      playerFound: false, error: null,
    });

    render(<WotdTeaser />);

    expect(screen.getByText('Word of the Day')).toBeInTheDocument();
    expect(screen.getByText('Play now')).toBeInTheDocument();
  });

  it('should mask all letters except the first', () => {
    mockUseWordOfTheDay.mockReturnValue({
      word: 'hi', loading: false,
      stats: { foundCount: 0, totalPlayers: 0, foundPercent: 0 },
      playerFound: false, error: null,
    });

    render(<WotdTeaser />);

    expect(screen.getByTestId('wotd-first-letter')).toHaveTextContent('H');
    expect(screen.getByTestId('wotd-masked')).toHaveTextContent('_');
  });

  it('should show last letter for RTL languages', () => {
    // Override useLanguage to return RTL
    vi.spyOn(LanguageContext, 'useLanguage').mockReturnValue({
      t: mockT, language: 'he', dir: 'rtl',
    });
    mockUseWordOfTheDay.mockReturnValue({
      word: 'שמש', loading: false,
      stats: { foundCount: 0, totalPlayers: 0, foundPercent: 0 },
      playerFound: false, error: null,
    });

    render(<WotdTeaser />);

    // RTL: reveals the last letter (visually first in RTL)
    expect(screen.getByTestId('wotd-first-letter')).toHaveTextContent('ש');
    expect(screen.getByTestId('wotd-masked')).toHaveTextContent('_ _');
  });
});
