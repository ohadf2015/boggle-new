/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { DesktopWordList } from '../DesktopWordList';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: React.PropsWithChildren<object>) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: React.PropsWithChildren<object>) => <>{children}</>,
}));

const mockT = (key: string, params?: Record<string, string | number>) => {
  const translations: Record<string, string> = {
    'singlePlayer.wordsFound': 'Words Found',
    'singlePlayer.bestWord': 'Best Word',
    'singlePlayer.bonusPoints': 'Bonus Points',
    'singlePlayer.comboBonus': 'Combo Bonus',
    'singlePlayer.fireBonus': 'Fire Bonus',
    'singlePlayer.noWordsYet': 'No words yet',
    'common.showLess': 'Show Less',
    'singlePlayer.showMore': `Show ${params?.count ?? 0} more`,
  };
  return translations[key] || key;
};

const createWord = (
  word: string,
  score: number,
  isValid: boolean | null = true,
  options: { comboBonus?: number; fireRoundBonus?: number } = {}
) => ({
  word,
  score,
  timestamp: Date.now() - Math.random() * 10000,
  timeSinceStart: Math.random() * 60,
  isValid,
  comboBonus: options.comboBonus,
  fireRoundBonus: options.fireRoundBonus,
});

describe('DesktopWordList', () => {
  const defaultProps = {
    foundWords: [],
    showOnlyValid: true,
    maxVisible: 15,
    t: mockT,
  };

  describe('Empty state', () => {
    it('should show empty message when no words found', () => {
      // GIVEN no words
      // WHEN component is rendered
      render(<DesktopWordList {...defaultProps} />);

      // THEN empty state should be visible
      expect(screen.getByText('No words yet')).toBeInTheDocument();
    });
  });

  describe('Word count header', () => {
    it('should display word count in header', () => {
      // GIVEN 3 valid words
      const props = {
        ...defaultProps,
        foundWords: [
          createWord('apple', 4),
          createWord('banana', 5),
          createWord('cherry', 5),
        ],
      };

      // WHEN component is rendered
      render(<DesktopWordList {...props} />);

      // THEN header should show count
      expect(screen.getByText('Words Found')).toBeInTheDocument();
      // Use getAllByText since count appears in header badge
      const countElements = screen.getAllByText('3');
      expect(countElements.length).toBeGreaterThan(0);
    });

    it('should filter invalid words when showOnlyValid is true', () => {
      // GIVEN mix of valid and invalid words
      const props = {
        ...defaultProps,
        foundWords: [
          createWord('valid', 4, true),
          createWord('invalid', 6, false),
          createWord('pending', 6, null),
        ],
      };

      // WHEN component is rendered
      render(<DesktopWordList {...props} />);

      // THEN only valid word count should show
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should show all words when showOnlyValid is false', () => {
      // GIVEN mix of valid and invalid words
      const props = {
        ...defaultProps,
        showOnlyValid: false,
        foundWords: [
          createWord('valid', 4, true),
          createWord('invalid', 6, false),
          createWord('pending', 6, null),
        ],
      };

      // WHEN component is rendered
      render(<DesktopWordList {...props} />);

      // THEN all word count should show (3 words)
      const countElements = screen.getAllByText('3');
      expect(countElements.length).toBeGreaterThan(0);
    });
  });

  describe('Word list display', () => {
    it('should display words (styled as uppercase via CSS)', () => {
      // GIVEN a word
      const props = {
        ...defaultProps,
        foundWords: [createWord('testing', 6)],
      };

      // WHEN component is rendered
      render(<DesktopWordList {...props} />);

      // THEN word should be in DOM (CSS handles uppercase display)
      // Word appears in list and possibly in footer as "best word"
      const wordElements = screen.getAllByText('testing');
      expect(wordElements.length).toBeGreaterThanOrEqual(1);
    });

    it('should display word scores', () => {
      // GIVEN a word with unique score 8
      const props = {
        ...defaultProps,
        foundWords: [createWord('elephant', 8)],
      };

      // WHEN component is rendered
      render(<DesktopWordList {...props} />);

      // THEN score should be displayed
      expect(screen.getByText('8')).toBeInTheDocument();
    });

    it('should show combo bonus indicator', () => {
      // GIVEN a word with combo bonus
      const props = {
        ...defaultProps,
        foundWords: [createWord('combo', 8, true, { comboBonus: 3 })],
      };

      // WHEN component is rendered
      render(<DesktopWordList {...props} />);

      // THEN bonus should be displayed
      expect(screen.getByText('(+3)')).toBeInTheDocument();
    });

    it('should show combined bonus for combo and fire', () => {
      // GIVEN a word with both bonuses
      const props = {
        ...defaultProps,
        foundWords: [createWord('fire', 10, true, { comboBonus: 2, fireRoundBonus: 3 })],
      };

      // WHEN component is rendered
      render(<DesktopWordList {...props} />);

      // THEN combined bonus should be displayed
      expect(screen.getByText('(+5)')).toBeInTheDocument();
    });
  });

  describe('Show more/less functionality', () => {
    it('should show "Show more" button when there are hidden words', () => {
      // GIVEN more words than maxVisible
      const words = Array.from({ length: 20 }, (_, i) =>
        createWord(`word${i}`, i + 3)
      );
      const props = {
        ...defaultProps,
        foundWords: words,
        maxVisible: 15,
      };

      // WHEN component is rendered
      render(<DesktopWordList {...props} />);

      // THEN "Show more" button should be visible
      expect(screen.getByText('Show 5 more')).toBeInTheDocument();
    });

    it('should expand list when clicking "Show more"', () => {
      // GIVEN more words than maxVisible
      const words = Array.from({ length: 18 }, (_, i) =>
        createWord(`word${i}`, i + 3)
      );
      const props = {
        ...defaultProps,
        foundWords: words,
        maxVisible: 15,
      };

      // WHEN component is rendered and button clicked
      render(<DesktopWordList {...props} />);
      fireEvent.click(screen.getByText('Show 3 more'));

      // THEN "Show Less" button should appear
      expect(screen.getByText('Show Less')).toBeInTheDocument();
    });

    it('should NOT show button when words fit within maxVisible', () => {
      // GIVEN fewer words than maxVisible
      const words = Array.from({ length: 5 }, (_, i) =>
        createWord(`word${i}`, i + 3)
      );
      const props = {
        ...defaultProps,
        foundWords: words,
        maxVisible: 15,
      };

      // WHEN component is rendered
      render(<DesktopWordList {...props} />);

      // THEN no expand button should be visible
      expect(screen.queryByText(/Show.*more/)).not.toBeInTheDocument();
      expect(screen.queryByText('Show Less')).not.toBeInTheDocument();
    });
  });

  describe('Stats footer', () => {
    it('should show best word (longest)', () => {
      // GIVEN words with varying lengths
      const props = {
        ...defaultProps,
        foundWords: [
          createWord('hi', 1),
          createWord('champion', 8),
          createWord('best', 3),
        ],
      };

      // WHEN component is rendered
      render(<DesktopWordList {...props} />);

      // THEN best word label should be visible
      expect(screen.getByText('Best Word')).toBeInTheDocument();
      // The longest word appears twice: once in word list, once in footer
      // Just verify it appears at least twice (both places rendered)
      const championElements = screen.getAllByText('champion');
      expect(championElements.length).toBeGreaterThanOrEqual(2);
    });

    it('should show bonus points total when bonuses exist', () => {
      // GIVEN words with bonuses
      const props = {
        ...defaultProps,
        foundWords: [
          createWord('combo', 5, true, { comboBonus: 2 }),
          createWord('fire', 6, true, { fireRoundBonus: 3 }),
        ],
      };

      // WHEN component is rendered
      render(<DesktopWordList {...props} />);

      // THEN total bonus should be displayed
      expect(screen.getByText('Bonus Points')).toBeInTheDocument();
      expect(screen.getByText('+5')).toBeInTheDocument();
    });

    it('should NOT show bonus section when no bonuses', () => {
      // GIVEN words without bonuses
      const props = {
        ...defaultProps,
        foundWords: [
          createWord('test', 3),
          createWord('word', 3),
        ],
      };

      // WHEN component is rendered
      render(<DesktopWordList {...props} />);

      // THEN bonus section should not appear
      expect(screen.queryByText('Bonus Points')).not.toBeInTheDocument();
    });
  });

  describe('Word length distribution', () => {
    it('should display word length distribution chart', () => {
      // GIVEN words of various lengths
      const props = {
        ...defaultProps,
        foundWords: [
          createWord('the', 2),
          createWord('test', 3),
          createWord('words', 4),
          createWord('elephant', 7),
        ],
      };

      // WHEN component is rendered
      render(<DesktopWordList {...props} />);

      // THEN distribution labels should be visible (may have duplicates)
      // Check that the 7+ label exists
      expect(screen.getByText('7+')).toBeInTheDocument();
      // Check distribution container exists by looking for specific text patterns
      const container = screen.getByText('7+').closest('div');
      expect(container).toBeInTheDocument();
    });
  });
});
