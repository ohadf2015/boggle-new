import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MissedWordsSection from '../MissedWordsSection';

// Mock LanguageContext
const mockT = (key: string) => {
  const translations: Record<string, string> = {
    'singlePlayer.results.missedWords.title': 'Words You Missed',
    'singlePlayer.results.missedWords.showMore': 'Show More',
    'singlePlayer.results.missedWords.count': '{found} of {total} words found',
    'common.showLess': 'Show Less',
  };
  return translations[key] || key;
};

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: mockT,
    language: 'en',
    dir: 'ltr',
  }),
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const filteredProps = Object.fromEntries(
        Object.entries(props).filter(([k]) => !['initial', 'animate', 'exit', 'transition', 'layout', 'whileHover'].includes(k))
      );
      return <div {...filteredProps}>{children}</div>;
    },
    button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const filteredProps = Object.fromEntries(
        Object.entries(props).filter(([k]) => !['initial', 'animate', 'exit', 'transition', 'layout', 'whileHover'].includes(k))
      );
      return <button {...filteredProps}>{children}</button>;
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

describe('MissedWordsSection', () => {
  const defaultWords = [
    { word: 'testing', score: 6 },
    { word: 'castle', score: 5 },
    { word: 'house', score: 4 },
    { word: 'tree', score: 3 },
    { word: 'cat', score: 2 },
    { word: 'dog', score: 2 },
    { word: 'bat', score: 2 },
    { word: 'rat', score: 2 },
    { word: 'hat', score: 2 },
    { word: 'mat', score: 2 },
    { word: 'sat', score: 2 },
    { word: 'pat', score: 2 },
  ];

  it('renders the section title', () => {
    render(<MissedWordsSection words={defaultWords} playerFoundCount={5} />);
    expect(screen.getByText('Words You Missed')).toBeInTheDocument();
  });

  it('renders nothing when words array is empty', () => {
    const { container } = render(<MissedWordsSection words={[]} playerFoundCount={5} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows words sorted by length (longest first)', () => {
    render(<MissedWordsSection words={defaultWords} playerFoundCount={5} />);
    const wordElements = screen.getAllByTestId('missed-word');
    // First word should be the longest
    expect(wordElements[0]).toHaveTextContent(/testing/i);
    expect(wordElements[1]).toHaveTextContent(/castle/i);
  });

  it('shows score for each word', () => {
    render(<MissedWordsSection words={defaultWords.slice(0, 3)} playerFoundCount={5} />);
    // Score badges should be visible
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('shows only initial words and expands on click', () => {
    render(<MissedWordsSection words={defaultWords} playerFoundCount={5} initialDisplayCount={5} />);
    // Initially shows 5 words
    let wordElements = screen.getAllByTestId('missed-word');
    expect(wordElements.length).toBe(5);

    // Click show more
    const showMoreBtn = screen.getByText('Show More');
    fireEvent.click(showMoreBtn);

    // Now shows all words
    wordElements = screen.getAllByTestId('missed-word');
    expect(wordElements.length).toBe(defaultWords.length);
  });

  it('displays found count summary', () => {
    render(
      <MissedWordsSection
        words={defaultWords}
        playerFoundCount={5}
        totalBoardWords={17}
      />
    );
    // Should show "5 of 17 words found"
    expect(screen.getByText('5 of 17 words found')).toBeInTheDocument();
  });

  it('applies neo-brutalist design classes', () => {
    render(<MissedWordsSection words={defaultWords.slice(0, 2)} playerFoundCount={3} />);
    const container = screen.getByTestId('missed-words-section');
    // The inner card div has neo-brutalist styling
    const card = container.firstElementChild as HTMLElement;
    expect(card.className).toMatch(/border-3/);
    expect(card.className).toMatch(/border-neo-black/);
    expect(card.className).toMatch(/shadow-hard/);
    expect(card.className).toMatch(/rounded-neo/);
  });
});
