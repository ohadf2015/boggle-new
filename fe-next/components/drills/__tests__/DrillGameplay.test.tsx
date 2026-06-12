/**
 * DrillGameplay Tests — ComboMaster as representative drill
 *
 * Covers: phase transitions, timer, score calculation, combo tracking, game over
 */

import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
    button: ({ children, className, onClick, ...props }: React.HTMLAttributes<HTMLButtonElement> & { onClick?: () => void }) => (
      <button className={className} onClick={onClick} {...props}>{children}</button>
    ),
    div: ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} {...props}>{children}</div>
    ),
    h2: ({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h2 className={className} {...props}>{children}</h2>
    ),
    span: ({ children, className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
      <span className={className} {...props}>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    dir: 'ltr',
    language: 'en',
  }),
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  // Any sound fn (and setGameActive) resolves to a no-op spy; these tests don't
  // assert audio, they just need drill sound/game-active calls to not throw.
  useSoundEffects: () => new Proxy({}, { get: () => vi.fn() }),
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
  default: ({ onWordSubmit }: { onWordSubmit?: (word: string) => void }) => (
    <div data-testid="grid-component">
      <button data-testid="submit-cat" onClick={() => onWordSubmit?.('cat')}>CAT</button>
      <button data-testid="submit-dog" onClick={() => onWordSubmit?.('dog')}>DOG</button>
      <button data-testid="submit-bat" onClick={() => onWordSubmit?.('bat')}>BAT</button>
      <button data-testid="submit-hat" onClick={() => onWordSubmit?.('hat')}>HAT</button>
      <button data-testid="submit-mat" onClick={() => onWordSubmit?.('mat')}>MAT</button>
    </div>
  ),
}));

vi.mock('@/components/keyboard', () => ({
  KeyboardDesktopBadge: () => null,
  EnterKeyHint: () => null,
  KeyboardQuickTip: () => null,
}));

vi.mock('@/utils/utils', () => ({
  isWordOnBoard: () => true,
}));

import ComboMaster from '../ComboMaster';

const mockGrid = [
  ['C', 'A', 'T', 'S', 'D'],
  ['O', 'G', 'H', 'E', 'L'],
  ['W', 'I', 'N', 'D', 'O'],
  ['B', 'A', 'T', 'S', 'W'],
  ['P', 'L', 'A', 'Y', 'S'],
];

const mockAvailableWords = [
  { word: 'CAT', path: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }] },
  { word: 'DOG', path: [{ row: 0, col: 4 }, { row: 1, col: 0 }, { row: 1, col: 1 }] },
  { word: 'BAT', path: [{ row: 3, col: 0 }, { row: 3, col: 1 }, { row: 3, col: 2 }] },
  { word: 'HAT', path: [{ row: 1, col: 2 }, { row: 0, col: 1 }, { row: 0, col: 2 }] },
  { word: 'MAT', path: [{ row: 4, col: 0 }, { row: 4, col: 2 }, { row: 0, col: 2 }] },
];

const defaultProps = {
  grid: mockGrid,
  availableWords: mockAvailableWords,
  level: 1,
  language: 'en' as const,
  onComplete: vi.fn(),
};

describe('ComboMaster Drill Gameplay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // --- Phase Transitions ---

  describe('phase transitions', () => {
    it('starts in ready phase with start button visible', () => {
      render(<ComboMaster {...defaultProps} />);
      expect(screen.getByText('brain.drills.combo-master.name')).toBeInTheDocument();
      expect(screen.getByText('brain.briefing.letsTrain')).toBeInTheDocument();
    });

    it('transitions from ready to playing on start click', () => {
      render(<ComboMaster {...defaultProps} />);
      fireEvent.click(screen.getByText('brain.briefing.letsTrain'));
      expect(screen.getByTestId('grid-component')).toBeInTheDocument();
      expect(screen.queryByText('brain.briefing.letsTrain')).not.toBeInTheDocument();
    });

    it('transitions to complete phase when finish button clicked', () => {
      const onComplete = vi.fn();
      render(<ComboMaster {...defaultProps} onComplete={onComplete} />);

      fireEvent.click(screen.getByText('brain.briefing.letsTrain'));
      fireEvent.click(screen.getByText('brain.drills.finishGame'));

      // Warm results screen (earnings breakdown), not a harsh "Game Over".
      expect(screen.queryByText('brain.drills.gameOver')).not.toBeInTheDocument();
      expect(screen.getByText('brain.briefing.participationLabel')).toBeInTheDocument();
      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          score: 0,
          maxCombo: 0,
          wordsFound: 0,
          level: 1,
        })
      );
    });
  });

  // --- Timer Behavior ---

  describe('timer behavior', () => {
    it('shows countdown timer during playing phase', () => {
      render(<ComboMaster {...defaultProps} />);
      fireEvent.click(screen.getByText('brain.briefing.letsTrain'));
      // Level 1 has comboTimeout=8
      expect(screen.getByRole('status')).toHaveTextContent('8s');
    });

    it('combo timer counts down each second', () => {
      render(<ComboMaster {...defaultProps} />);
      fireEvent.click(screen.getByText('brain.briefing.letsTrain'));

      act(() => { vi.advanceTimersByTime(1000); });
      expect(screen.getByRole('status')).toHaveTextContent('7s');

      act(() => { vi.advanceTimersByTime(2000); });
      expect(screen.getByRole('status')).toHaveTextContent('5s');
    });

    it('combo breaks on timeout and timer resets', () => {
      render(<ComboMaster {...defaultProps} />);
      fireEvent.click(screen.getByText('brain.briefing.letsTrain'));

      // Submit a word to get combo=1
      fireEvent.click(screen.getByTestId('submit-cat'));

      // Let timer expire (8 seconds)
      act(() => { vi.advanceTimersByTime(8000); });

      // Timer resets to 8 after combo break
      expect(screen.getByRole('status')).toHaveTextContent('8s');
    });
  });

  // --- Score Calculation ---

  describe('score calculation', () => {
    it('calculates score using canonical scoring: calculateWordScore(word,0) * (1 + combo * 0.1)', () => {
      const onComplete = vi.fn();
      render(<ComboMaster {...defaultProps} onComplete={onComplete} />);
      fireEvent.click(screen.getByText('brain.briefing.letsTrain'));

      // Submit 'cat' (length=3): canonical base = 10pts, combo becomes 1, score = round(10 * 1.1) = 11
      fireEvent.click(screen.getByTestId('submit-cat'));

      // Finish to check score
      fireEvent.click(screen.getByText('brain.drills.finishGame'));
      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({ score: 11 })
      );
    });

    it('accumulates score across multiple words with increasing combo', () => {
      const onComplete = vi.fn();
      render(<ComboMaster {...defaultProps} onComplete={onComplete} />);
      fireEvent.click(screen.getByText('brain.briefing.letsTrain'));

      // Word 1 'cat' (3 letters): canonical base=10, combo=1, score = round(10 * 1.1) = 11
      fireEvent.click(screen.getByTestId('submit-cat'));
      // Word 2 'dog' (3 letters): canonical base=10, combo=2, score = round(10 * 1.2) = 12
      fireEvent.click(screen.getByTestId('submit-dog'));

      fireEvent.click(screen.getByText('brain.drills.finishGame'));
      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({ score: 11 + 12 })
      );
    });
  });

  // --- Combo Tracking ---

  describe('combo tracking', () => {
    it('increments combo on each valid word', () => {
      const onComplete = vi.fn();
      render(<ComboMaster {...defaultProps} onComplete={onComplete} />);
      fireEvent.click(screen.getByText('brain.briefing.letsTrain'));

      fireEvent.click(screen.getByTestId('submit-cat'));
      fireEvent.click(screen.getByTestId('submit-dog'));

      // Verify combo via finishing and checking maxCombo
      fireEvent.click(screen.getByText('brain.drills.finishGame'));
      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({ maxCombo: 2, wordsFound: 2 })
      );
    });

    it('tracks maxCombo correctly even after combo reset', () => {
      const onComplete = vi.fn();
      render(<ComboMaster {...defaultProps} onComplete={onComplete} />);
      fireEvent.click(screen.getByText('brain.briefing.letsTrain'));

      // Build combo to 2
      fireEvent.click(screen.getByTestId('submit-cat'));
      fireEvent.click(screen.getByTestId('submit-dog'));

      // Let timer expire to break combo
      act(() => { vi.advanceTimersByTime(8000); });

      // Build new combo to 1
      fireEvent.click(screen.getByTestId('submit-bat'));

      fireEvent.click(screen.getByText('brain.drills.finishGame'));
      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({ maxCombo: 2 })
      );
    });
  });

  // --- Completion after 3 combo breaks (no harsh "Game Over") ---

  describe('ends after 3 combo breaks', () => {
    it('completes the drill after 3 combo breaks (MAX_COMBO_BREAKS) with a warm results screen', () => {
      const onComplete = vi.fn();
      render(<ComboMaster {...defaultProps} onComplete={onComplete} />);
      fireEvent.click(screen.getByText('brain.briefing.letsTrain'));

      // 3 timeouts = 3 combo breaks = drill ends.
      // Level 1 timeout = 8 seconds
      act(() => { vi.advanceTimersByTime(8000); }); // break 1
      act(() => { vi.advanceTimersByTime(8000); }); // break 2
      act(() => { vi.advanceTimersByTime(8000); }); // break 3

      // The mechanic is unchanged (drill ends + onComplete fires)...
      expect(onComplete).toHaveBeenCalled();
      // ...but the harsh "Game Over" framing is gone — the warm earnings
      // breakdown (always-colored badge + participation) shows instead.
      expect(screen.queryByText('brain.drills.gameOver')).not.toBeInTheDocument();
      expect(screen.getByText('brain.briefing.participationLabel')).toBeInTheDocument();
    });

    it('does not end game after only 2 combo breaks', () => {
      const onComplete = vi.fn();
      render(<ComboMaster {...defaultProps} onComplete={onComplete} />);
      fireEvent.click(screen.getByText('brain.briefing.letsTrain'));

      act(() => { vi.advanceTimersByTime(8000); }); // break 1
      act(() => { vi.advanceTimersByTime(8000); }); // break 2

      // Should still be playing
      expect(screen.getByTestId('grid-component')).toBeInTheDocument();
      expect(onComplete).not.toHaveBeenCalled();
    });
  });
});
