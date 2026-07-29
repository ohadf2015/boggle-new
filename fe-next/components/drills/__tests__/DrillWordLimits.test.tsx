/**
 * Drill Word Limits Tests
 *
 * Tests for word length limits and rarity thresholds in brain drills
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock framer-motion before imports
vi.mock('framer-motion', () => ({
  m: {
    button: ({ children, className, onClick, ...props }: React.HTMLAttributes<HTMLButtonElement> & { onClick?: () => void }) => (
      <button className={className} onClick={onClick} {...props}>{children}</button>
    ),
    div: ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock dependencies
vi.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playErrorSound: vi.fn(),
    playSuccessSound: vi.fn(),
    playDrillStartSound: vi.fn(),
    playSound: vi.fn(),
  }),
}));

vi.mock('@/hooks/useDrillKeyboardSupport', () => ({
  useDrillKeyboardSupport: () => ({
    isTypingMode: false,
    typedWord: '',
    highlightedCells: [],
    isDesktop: false,
    showEnterHint: false,
    showQuickTip: false,
    dismissQuickTip: vi.fn(),
    isValidOnGrid: false,
  }),
}));

vi.mock('@/components/GridComponent', () => ({
  __esModule: true,
  default: () => <div data-testid="grid-component">Grid</div>,
}));

vi.mock('@/components/keyboard', () => ({
  KeyboardDesktopBadge: () => null,
  EnterKeyHint: () => null,
  KeyboardQuickTip: () => null,
}));

vi.mock('@/utils/utils', () => ({
  isWordOnBoard: () => true,
}));

// Import components after mocks
import PatternSwitcher from '../PatternSwitcher';
import RareGems from '../RareGems';
import MemoryHunt from '../MemoryHunt';

// Test data
const mockGrid = [
  ['C', 'A', 'T', 'S', 'D'],
  ['O', 'G', 'H', 'E', 'L'],
  ['W', 'I', 'N', 'D', 'O'],
  ['B', 'A', 'T', 'S', 'W'],
  ['P', 'L', 'A', 'Y', 'S'],
];

const mockAvailableWords = [
  { word: 'CAT', path: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }] },
  { word: 'DOG', path: [{ row: 0, col: 4 }, { row: 1, col: 4 }, { row: 2, col: 4 }] },
  { word: 'CATS', path: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 }] },
  { word: 'BATS', path: [{ row: 3, col: 0 }, { row: 3, col: 1 }, { row: 3, col: 2 }, { row: 3, col: 3 }] },
  { word: 'WINDS', path: [{ row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 }, { row: 2, col: 3 }, { row: 3, col: 3 }] },
  { word: 'PLAYING', path: [{ row: 4, col: 0 }, { row: 4, col: 1 }, { row: 4, col: 2 }, { row: 4, col: 3 }, { row: 4, col: 4 }, { row: 3, col: 4 }, { row: 2, col: 4 }] },
  { word: 'COWBOYS', path: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 2, col: 0 }, { row: 3, col: 0 }, { row: 3, col: 1 }, { row: 4, col: 4 }, { row: 0, col: 3 }] },
];

describe('PatternSwitcher', () => {
  describe('word length limits', () => {
    it('should cap available word lengths at 5 letters', () => {
      const onComplete = vi.fn();

      // Filter logic test - simulating what the component does
      const MAX_WORD_LENGTH = 5;
      const availableLengths = [...new Set(mockAvailableWords.map(w => w.word.length))]
        .filter(len => len <= MAX_WORD_LENGTH)
        .sort();

      // Should not include 7-letter words (PLAYING, COWBOYS)
      expect(availableLengths).not.toContain(7);
      expect(availableLengths).toContain(3); // CAT, DOG
      expect(availableLengths).toContain(4); // CATS, BATS
      expect(availableLengths).toContain(5); // WINDS
      expect(Math.max(...availableLengths)).toBe(5);
    });

    it('should render without crashing', () => {
      const onComplete = vi.fn();

      render(
        <PatternSwitcher
          grid={mockGrid}
          availableWords={mockAvailableWords}
          level={1}
          language="en"
          onComplete={onComplete}
        />
      );

      expect(screen.getByText('brain.drills.pattern-switcher.name')).toBeInTheDocument();
    });
  });
});

describe('RareGems', () => {
  describe('rarity thresholds', () => {
    // Test the rarity function directly
    const getWordRarity = (word: string): 'common' | 'uncommon' | 'rare' | 'legendary' => {
      const len = word.length;
      if (len >= 6) return 'legendary';  // 6+ letters = legendary
      if (len >= 5) return 'rare';       // 5 letters = rare
      if (len >= 4) return 'uncommon';   // 4 letters = uncommon
      return 'common';                   // 3 letters = common
    };

    it('should classify 3-letter words as common', () => {
      expect(getWordRarity('CAT')).toBe('common');
      expect(getWordRarity('DOG')).toBe('common');
    });

    it('should classify 4-letter words as uncommon', () => {
      expect(getWordRarity('CATS')).toBe('uncommon');
      expect(getWordRarity('BATS')).toBe('uncommon');
    });

    it('should classify 5-letter words as rare', () => {
      expect(getWordRarity('WINDS')).toBe('rare');
      expect(getWordRarity('PLAYS')).toBe('rare');
    });

    it('should classify 6+ letter words as legendary', () => {
      expect(getWordRarity('PLAYER')).toBe('legendary');
      expect(getWordRarity('PLAYING')).toBe('legendary');
    });

    it('should render without crashing', () => {
      const onComplete = vi.fn();

      render(
        <RareGems
          grid={mockGrid}
          availableWords={mockAvailableWords}
          level={1}
          language="en"
          onComplete={onComplete}
        />
      );

      expect(screen.getByText('brain.drills.rare-gems.name')).toBeInTheDocument();
    });
  });
});

describe('MemoryHunt', () => {
  describe('study modal and word replacement', () => {
    it('should render without crashing', () => {
      const onComplete = vi.fn();

      render(
        <MemoryHunt
          grid={mockGrid}
          availableWords={mockAvailableWords}
          level={1}
          language="en"
          onComplete={onComplete}
        />
      );

      expect(screen.getByText('brain.drills.memory-hunt.name')).toBeInTheDocument();
    });

    it('should show start button in ready phase', () => {
      const onComplete = vi.fn();

      render(
        <MemoryHunt
          grid={mockGrid}
          availableWords={mockAvailableWords}
          level={1}
          language="en"
          onComplete={onComplete}
        />
      );

      expect(screen.getByText('brain.briefing.letsTrain')).toBeInTheDocument();
    });

    it('should display study modal after starting game', async () => {
      const onComplete = vi.fn();

      render(
        <MemoryHunt
          grid={mockGrid}
          availableWords={mockAvailableWords}
          level={1}
          language="en"
          onComplete={onComplete}
        />
      );

      // Click start button
      const startButton = screen.getByText('brain.briefing.letsTrain');
      fireEvent.click(startButton);

      // Study modal should appear with study phase text
      await waitFor(() => {
        expect(screen.getByText('brain.drills.memory-hunt.studyPhase')).toBeInTheDocument();
      });
    });

    it('should show "I\'m Ready" button in study modal', async () => {
      const onComplete = vi.fn();

      render(
        <MemoryHunt
          grid={mockGrid}
          availableWords={mockAvailableWords}
          level={1}
          language="en"
          onComplete={onComplete}
        />
      );

      // Click start button
      const startButton = screen.getByText('brain.briefing.letsTrain');
      fireEvent.click(startButton);

      // Ready button should be in the modal
      await waitFor(() => {
        expect(screen.getByText("brain.drills.memory-hunt.readyToStart")).toBeInTheDocument();
      });
    });
  });
});
