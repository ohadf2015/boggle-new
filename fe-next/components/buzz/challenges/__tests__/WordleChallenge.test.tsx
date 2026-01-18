/**
 * @jest-environment jsdom
 */

// Mock framer-motion BEFORE imports
jest.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      initial,
      animate,
      exit,
      transition,
      whileHover,
      whileTap,
      whileInView,
      viewport,
      layout,
      layoutId,
      drag,
      dragConstraints,
      dragElastic,
      dragMomentum,
      dragTransition,
      onDrag,
      onDragStart,
      onDragEnd,
      variants,
      custom,
      ...props
    }: any) => <div {...props}>{children}</div>,
    h2: ({
      children,
      initial,
      animate,
      exit,
      transition,
      whileHover,
      whileTap,
      whileInView,
      viewport,
      layout,
      layoutId,
      drag,
      dragConstraints,
      dragElastic,
      dragMomentum,
      dragTransition,
      onDrag,
      onDragStart,
      onDragEnd,
      variants,
      custom,
      ...props
    }: any) => <h2 {...props}>{children}</h2>,
    button: ({
      children,
      initial,
      animate,
      exit,
      transition,
      whileHover,
      whileTap,
      whileInView,
      viewport,
      layout,
      layoutId,
      drag,
      dragConstraints,
      dragElastic,
      dragMomentum,
      dragTransition,
      onDrag,
      onDragStart,
      onDragEnd,
      variants,
      custom,
      ...props
    }: any) => <button {...props}>{children}</button>,
    span: ({
      children,
      initial,
      animate,
      exit,
      transition,
      whileHover,
      whileTap,
      whileInView,
      viewport,
      layout,
      layoutId,
      drag,
      dragConstraints,
      dragElastic,
      dragMomentum,
      dragTransition,
      onDrag,
      onDragStart,
      onDragEnd,
      variants,
      custom,
      ...props
    }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import WordleChallenge from '../WordleChallenge';
import { LanguageProvider } from '@/contexts/LanguageContext';

// Create a mutable language state for tests
let mockLanguage = 'en';

// Mock translations
jest.mock('@/contexts/LanguageContext', () => ({
  ...jest.requireActual('@/contexts/LanguageContext'),
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'buzz.type.wordle': 'WORDLE',
        'buzz.hint': 'HINT',
        'buzz.wordle.instruction': 'Guess the 5-letter word',
        'buzz.wordle.attemptsLeft': 'attempts left',
        'buzz.wordle.solved': 'Solved!',
        'buzz.wordle.failed': 'Out of attempts',
        'buzz.submit': 'SUBMIT',
        'buzz.wordle.useDeviceKeyboard': 'Tap to type',
      };
      return translations[key] || key;
    },
    language: mockLanguage,
  }),
}));

// Helper to change mock language
const setMockLanguage = (lang: string) => {
  mockLanguage = lang;
};

describe('WordleChallenge', () => {
  const mockChallenge = {
    prompt: 'Related to trending topic: Movies',
    answer: 'OSCAR',
    hint: 'Award ceremony',
    trendingContext: 'The Academy Awards are trending today',
  };

  const mockOnAnswer = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the challenge prompt', () => {
    render(
      <LanguageProvider>
        <WordleChallenge
          challenge={mockChallenge}
          onAnswer={mockOnAnswer}
          showHint={false}
        />
      </LanguageProvider>
    );

    expect(
      screen.getByText('Related to trending topic: Movies')
    ).toBeInTheDocument();
    // Type tag removed - now displayed in parent BuzzGameScreen header
  });

  it('shows hint when showHint is true', () => {
    render(
      <LanguageProvider>
        <WordleChallenge
          challenge={mockChallenge}
          onAnswer={mockOnAnswer}
          showHint={true}
        />
      </LanguageProvider>
    );

    expect(screen.getByText('HINT')).toBeInTheDocument();
    expect(screen.getByText('Award ceremony')).toBeInTheDocument();
  });

  it('does not show hint when showHint is false', () => {
    render(
      <LanguageProvider>
        <WordleChallenge
          challenge={mockChallenge}
          onAnswer={mockOnAnswer}
          showHint={false}
        />
      </LanguageProvider>
    );

    expect(screen.queryByText('HINT')).not.toBeInTheDocument();
    expect(screen.queryByText('Award ceremony')).not.toBeInTheDocument();
  });

  it('renders 6 rows of 5 cells for the wordle grid', () => {
    render(
      <LanguageProvider>
        <WordleChallenge
          challenge={mockChallenge}
          onAnswer={mockOnAnswer}
          showHint={false}
        />
      </LanguageProvider>
    );

    // Each row should have 5 cells, 6 rows total = 30 cells
    const grid = screen.getByTestId('wordle-grid');
    expect(grid).toBeInTheDocument();
    const rows = screen.getAllByTestId(/^wordle-row-/);
    expect(rows).toHaveLength(6);
  });

  it('allows typing letters via keyboard', async () => {
    const user = userEvent.setup();

    render(
      <LanguageProvider>
        <WordleChallenge
          challenge={mockChallenge}
          onAnswer={mockOnAnswer}
          showHint={false}
        />
      </LanguageProvider>
    );

    // Type letters
    await user.keyboard('HELLO');

    // First row should show HELLO
    const cells = screen.getAllByTestId(/^wordle-cell-0-/);
    expect(cells[0]).toHaveTextContent('H');
    expect(cells[1]).toHaveTextContent('E');
    expect(cells[2]).toHaveTextContent('L');
    expect(cells[3]).toHaveTextContent('L');
    expect(cells[4]).toHaveTextContent('O');
  });

  it('limits input to 5 letters per guess', async () => {
    const user = userEvent.setup();

    render(
      <LanguageProvider>
        <WordleChallenge
          challenge={mockChallenge}
          onAnswer={mockOnAnswer}
          showHint={false}
        />
      </LanguageProvider>
    );

    // Type 7 letters
    await user.keyboard('HELLOAB');

    // Should only show first 5 letters
    const cells = screen.getAllByTestId(/^wordle-cell-0-/);
    expect(cells[0]).toHaveTextContent('H');
    expect(cells[1]).toHaveTextContent('E');
    expect(cells[2]).toHaveTextContent('L');
    expect(cells[3]).toHaveTextContent('L');
    expect(cells[4]).toHaveTextContent('O');
  });

  it('handles backspace to delete letters', async () => {
    const user = userEvent.setup();

    render(
      <LanguageProvider>
        <WordleChallenge
          challenge={mockChallenge}
          onAnswer={mockOnAnswer}
          showHint={false}
        />
      </LanguageProvider>
    );

    await user.keyboard('HELLO');
    await user.keyboard('{Backspace}');

    const cells = screen.getAllByTestId(/^wordle-cell-0-/);
    expect(cells[4]).toHaveTextContent('');
  });

  it('submits guess on Enter when 5 letters entered', async () => {
    const user = userEvent.setup();

    render(
      <LanguageProvider>
        <WordleChallenge
          challenge={mockChallenge}
          onAnswer={mockOnAnswer}
          showHint={false}
        />
      </LanguageProvider>
    );

    await user.keyboard('HELLO{Enter}');

    // Should move to second row (first row is now locked)
    // Type in second row
    await user.keyboard('WORLD');
    const secondRowCells = screen.getAllByTestId(/^wordle-cell-1-/);
    expect(secondRowCells[0]).toHaveTextContent('W');
  });

  it('does not submit guess on Enter when less than 5 letters', async () => {
    const user = userEvent.setup({ delay: null }); // Disable delay for faster tests

    render(
      <LanguageProvider>
        <WordleChallenge
          challenge={mockChallenge}
          onAnswer={mockOnAnswer}
          showHint={false}
        />
      </LanguageProvider>
    );

    // Type less than 5 letters
    await user.keyboard('HEL');

    // Wait for cells to update
    await waitFor(() => {
      expect(screen.getAllByTestId(/^wordle-cell-0-/)[0]).toHaveTextContent('H');
    });

    // Press Enter
    await user.keyboard('{Enter}');

    // Should still be on first row, no submission - check cells
    const cells = screen.getAllByTestId(/^wordle-cell-0-/);
    expect(cells[0]).toHaveTextContent('H');
    expect(cells[1]).toHaveTextContent('E');
    expect(cells[2]).toHaveTextContent('L');
    expect(cells[3]).toHaveTextContent('');
  });

  it('calls onAnswer when correct word is guessed', async () => {
    const user = userEvent.setup({ delay: null }); // Disable delay for faster tests

    render(
      <LanguageProvider>
        <WordleChallenge
          challenge={mockChallenge}
          onAnswer={mockOnAnswer}
          showHint={false}
        />
      </LanguageProvider>
    );

    // Type the correct answer
    await user.keyboard('OSCAR');

    // Wait for all letters to be typed
    await waitFor(() => {
      const cells = screen.getAllByTestId(/^wordle-cell-0-/);
      expect(cells[4]).toHaveTextContent('R');
    });

    // Press Enter to submit
    await user.keyboard('{Enter}');

    // Wait for onAnswer to be called
    await waitFor(() => {
      expect(mockOnAnswer).toHaveBeenCalledWith('OSCAR');
    });
  });

  it('calls onAnswer with last guess when 6 attempts exhausted', async () => {
    const user = userEvent.setup();

    render(
      <LanguageProvider>
        <WordleChallenge
          challenge={mockChallenge}
          onAnswer={mockOnAnswer}
          showHint={false}
        />
      </LanguageProvider>
    );

    // Make 6 wrong guesses
    await user.keyboard('HELLO{Enter}');
    await user.keyboard('WORLD{Enter}');
    await user.keyboard('TRAIN{Enter}');
    await user.keyboard('PLANE{Enter}');
    await user.keyboard('BRAIN{Enter}');
    await user.keyboard('CRANE{Enter}');

    expect(mockOnAnswer).toHaveBeenCalledWith('CRANE');
  });

  it('shows correct letter states after guess', async () => {
    const user = userEvent.setup();

    render(
      <LanguageProvider>
        <WordleChallenge
          challenge={mockChallenge}
          onAnswer={mockOnAnswer}
          showHint={false}
        />
      </LanguageProvider>
    );

    // OSCAR is the answer, guess AROSE
    // A: present (in word, wrong position)
    // R: present (in word, wrong position)
    // O: present (in word, wrong position)
    // S: present (in word, wrong position)
    // E: absent (not in word)
    await user.keyboard('AROSE{Enter}');

    // Check that cells have appropriate classes
    const cells = screen.getAllByTestId(/^wordle-cell-0-/);
    // The exact class names will depend on implementation
    expect(cells[0]).toHaveAttribute('data-state');
  });

  it('shows trending context when provided', () => {
    render(
      <LanguageProvider>
        <WordleChallenge
          challenge={mockChallenge}
          onAnswer={mockOnAnswer}
          showHint={false}
        />
      </LanguageProvider>
    );

    expect(
      screen.getByText('The Academy Awards are trending today')
    ).toBeInTheDocument();
  });

  it('handles duplicate letters correctly', async () => {
    const user = userEvent.setup();

    const challengeWithDuplicates = {
      ...mockChallenge,
      answer: 'TABOO', // Has duplicate O at positions 3 and 4
    };

    render(
      <LanguageProvider>
        <WordleChallenge
          challenge={challengeWithDuplicates}
          onAnswer={mockOnAnswer}
          showHint={false}
        />
      </LanguageProvider>
    );

    // TABOO = T-A-B-O-O
    // DROOL = D-R-O-O-L
    // Position 0: D vs T = absent (D not in TABOO)
    // Position 1: R vs A = absent (R not in TABOO)
    // Position 2: O vs B = present (O is in TABOO but not at position 2)
    // Position 3: O vs O = correct (exact match)
    // Position 4: L vs O = absent (L not in TABOO)
    await user.keyboard('DROOL{Enter}');

    const cells = screen.getAllByTestId(/^wordle-cell-0-/);
    expect(cells[0]).toHaveAttribute('data-state', 'absent');
    expect(cells[1]).toHaveAttribute('data-state', 'absent');
    expect(cells[2]).toHaveAttribute('data-state', 'present');
    expect(cells[3]).toHaveAttribute('data-state', 'correct');
    expect(cells[4]).toHaveAttribute('data-state', 'absent');
  });

  it('renders on-screen keyboard', () => {
    render(
      <LanguageProvider>
        <WordleChallenge
          challenge={mockChallenge}
          onAnswer={mockOnAnswer}
          showHint={false}
        />
      </LanguageProvider>
    );

    const keyboard = screen.getByTestId('wordle-keyboard');
    expect(keyboard).toBeInTheDocument();

    // Check some keys exist
    expect(screen.getByTestId('key-Q')).toBeInTheDocument();
    expect(screen.getByTestId('key-ENTER')).toBeInTheDocument();
    expect(screen.getByTestId('key-BACKSPACE')).toBeInTheDocument();
  });

  it('handles on-screen keyboard clicks', async () => {
    const user = userEvent.setup();

    render(
      <LanguageProvider>
        <WordleChallenge
          challenge={mockChallenge}
          onAnswer={mockOnAnswer}
          showHint={false}
        />
      </LanguageProvider>
    );

    // Click keys on virtual keyboard
    await user.click(screen.getByTestId('key-H'));
    await user.click(screen.getByTestId('key-E'));
    await user.click(screen.getByTestId('key-L'));
    await user.click(screen.getByTestId('key-L'));
    await user.click(screen.getByTestId('key-O'));

    const cells = screen.getAllByTestId(/^wordle-cell-0-/);
    expect(cells[0]).toHaveTextContent('H');
    expect(cells[1]).toHaveTextContent('E');
    expect(cells[2]).toHaveTextContent('L');
    expect(cells[3]).toHaveTextContent('L');
    expect(cells[4]).toHaveTextContent('O');
  });

  it('updates keyboard key states after guess', async () => {
    const user = userEvent.setup();

    render(
      <LanguageProvider>
        <WordleChallenge
          challenge={mockChallenge}
          onAnswer={mockOnAnswer}
          showHint={false}
        />
      </LanguageProvider>
    );

    // OSCAR is answer, guess AROSE
    await user.keyboard('AROSE{Enter}');

    // E should be marked as absent on keyboard
    const keyE = screen.getByTestId('key-E');
    expect(keyE).toHaveAttribute('data-state', 'absent');

    // A should be marked as present
    const keyA = screen.getByTestId('key-A');
    expect(keyA).toHaveAttribute('data-state', 'present');
  });

  it('displays attempts remaining', () => {
    render(
      <LanguageProvider>
        <WordleChallenge
          challenge={mockChallenge}
          onAnswer={mockOnAnswer}
          showHint={false}
        />
      </LanguageProvider>
    );

    expect(screen.getByText(/6/)).toBeInTheDocument();
    expect(screen.getByText('attempts left')).toBeInTheDocument();
  });

  it('converts lowercase input to uppercase', async () => {
    const user = userEvent.setup();

    render(
      <LanguageProvider>
        <WordleChallenge
          challenge={mockChallenge}
          onAnswer={mockOnAnswer}
          showHint={false}
        />
      </LanguageProvider>
    );

    await user.keyboard('hello');

    const cells = screen.getAllByTestId(/^wordle-cell-0-/);
    expect(cells[0]).toHaveTextContent('H');
    expect(cells[1]).toHaveTextContent('E');
    expect(cells[2]).toHaveTextContent('L');
    expect(cells[3]).toHaveTextContent('L');
    expect(cells[4]).toHaveTextContent('O');
  });

  it('ignores non-letter keyboard input', async () => {
    const user = userEvent.setup();

    render(
      <LanguageProvider>
        <WordleChallenge
          challenge={mockChallenge}
          onAnswer={mockOnAnswer}
          showHint={false}
        />
      </LanguageProvider>
    );

    await user.keyboard('HE123LLO');

    const cells = screen.getAllByTestId(/^wordle-cell-0-/);
    expect(cells[0]).toHaveTextContent('H');
    expect(cells[1]).toHaveTextContent('E');
    expect(cells[2]).toHaveTextContent('L');
    expect(cells[3]).toHaveTextContent('L');
    expect(cells[4]).toHaveTextContent('O');
  });

  describe('language-specific keyboard', () => {
    beforeEach(() => {
      setMockLanguage('en');
    });

    it('renders Hebrew keyboard layout when language is Hebrew', () => {
      setMockLanguage('he');

      const hebrewChallenge = {
        prompt: 'נושא טרנדי: קולנוע',
        answer: 'סרטים',
        hint: 'טקס פרסים',
      };

      const { unmount } = render(
        <LanguageProvider>
          <WordleChallenge
            challenge={hebrewChallenge}
            onAnswer={mockOnAnswer}
            showHint={false}
          />
        </LanguageProvider>
      );

      const keyboard = screen.getByTestId('wordle-keyboard');
      expect(keyboard).toBeInTheDocument();

      // Hebrew keyboard should have Hebrew letters
      expect(screen.getByTestId('key-ק')).toBeInTheDocument();
      expect(screen.getByTestId('key-ש')).toBeInTheDocument();
      expect(screen.getByTestId('key-א')).toBeInTheDocument();

      unmount();
    });

    it('Hebrew keyboard should NOT contain final letters (sofit)', () => {
      setMockLanguage('he');

      const hebrewChallenge = {
        prompt: 'נושא טרנדי: קולנוע',
        answer: 'סרטים',
        hint: 'טקס פרסים',
      };

      const { unmount } = render(
        <LanguageProvider>
          <WordleChallenge
            challenge={hebrewChallenge}
            onAnswer={mockOnAnswer}
            showHint={false}
          />
        </LanguageProvider>
      );

      // Final letters (sofit) should NOT be in the keyboard
      // ך (final kaf), ם (final mem), ן (final nun), ף (final pe), ץ (final tsadi)
      expect(screen.queryByTestId('key-ך')).not.toBeInTheDocument();
      expect(screen.queryByTestId('key-ם')).not.toBeInTheDocument();
      expect(screen.queryByTestId('key-ן')).not.toBeInTheDocument();
      expect(screen.queryByTestId('key-ף')).not.toBeInTheDocument();
      expect(screen.queryByTestId('key-ץ')).not.toBeInTheDocument();

      // Regular forms of these letters SHOULD be present
      expect(screen.getByTestId('key-כ')).toBeInTheDocument();
      expect(screen.getByTestId('key-מ')).toBeInTheDocument();
      expect(screen.getByTestId('key-נ')).toBeInTheDocument();
      expect(screen.getByTestId('key-פ')).toBeInTheDocument();
      expect(screen.getByTestId('key-צ')).toBeInTheDocument();

      unmount();
    });

    it('Hebrew keyboard should have all 22 Hebrew letters in standard layout order', () => {
      setMockLanguage('he');

      const hebrewChallenge = {
        prompt: 'נושא טרנדי: קולנוע',
        answer: 'סרטים',
        hint: 'טקס פרסים',
      };

      const { unmount } = render(
        <LanguageProvider>
          <WordleChallenge
            challenge={hebrewChallenge}
            onAnswer={mockOnAnswer}
            showHint={false}
          />
        </LanguageProvider>
      );

      // All 22 Hebrew letters (regular forms only, no finals)
      const hebrewLetters = [
        'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י', 'כ',
        'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ', 'ק', 'ר', 'ש', 'ת'
      ];

      for (const letter of hebrewLetters) {
        expect(screen.getByTestId(`key-${letter}`)).toBeInTheDocument();
      }

      unmount();
    });

    it('should match regular form letters with final form letters in answer', async () => {
      // BUG FIX TEST: When answer contains final form letter (ם) and user types
      // regular form (מ), it should be treated as correct/present, not absent
      setMockLanguage('he');

      // Answer ends with final mem (ם), but keyboard only has regular mem (מ)
      // Must be 5 letters to work with WORD_LENGTH = 5
      const hebrewChallenge = {
        prompt: 'נושא טרנדי',
        answer: 'אשלום', // 5 letters: א-ש-ל-ו-ם (ends with final mem ם)
        hint: 'ברכה',
      };

      const { unmount } = render(
        <LanguageProvider>
          <WordleChallenge
            challenge={hebrewChallenge}
            onAnswer={mockOnAnswer}
            showHint={false}
          />
        </LanguageProvider>
      );

      // User types אשלומ using regular mem (מ) - the keyboard only has regular forms
      // Click Hebrew keys to simulate user input
      await userEvent.click(screen.getByTestId('key-א'));
      await userEvent.click(screen.getByTestId('key-ש'));
      await userEvent.click(screen.getByTestId('key-ל'));
      await userEvent.click(screen.getByTestId('key-ו'));
      await userEvent.click(screen.getByTestId('key-מ')); // Regular mem, not final
      await userEvent.click(screen.getByTestId('key-ENTER'));

      // Wait for the guess to be submitted
      await waitFor(() => {
        const cells = screen.getAllByTestId(/^wordle-cell-0-/);
        // The last letter (מ regular) should match ם (final) in the answer
        // It should be 'correct' because it's the same letter just different form
        expect(cells[4]).toHaveAttribute('data-state', 'correct');
      });

      unmount();
    });

    it('should mark regular form as present when final form exists elsewhere in answer', async () => {
      setMockLanguage('he');

      // Answer has final nun (ן) at position 2 (middle of word)
      // Actually Hebrew finals only appear at end, so let's use a word ending with ן
      const hebrewChallenge = {
        prompt: 'נושא טרנדי',
        answer: 'אבגדן', // 5 letters ending with final nun ן
        hint: 'מילה',
      };

      const { unmount } = render(
        <LanguageProvider>
          <WordleChallenge
            challenge={hebrewChallenge}
            onAnswer={mockOnAnswer}
            showHint={false}
          />
        </LanguageProvider>
      );

      // User types נאבגד - regular nun (נ) at position 0, but answer has final nun (ן) at position 4
      await userEvent.click(screen.getByTestId('key-נ')); // Regular nun at position 0
      await userEvent.click(screen.getByTestId('key-א'));
      await userEvent.click(screen.getByTestId('key-ב'));
      await userEvent.click(screen.getByTestId('key-ג'));
      await userEvent.click(screen.getByTestId('key-ד'));
      await userEvent.click(screen.getByTestId('key-ENTER'));

      await waitFor(() => {
        const cells = screen.getAllByTestId(/^wordle-cell-0-/);
        // Position 0: נ (regular nun) should be 'present' because ן (final nun) is in answer at position 4
        expect(cells[0]).toHaveAttribute('data-state', 'present');
      });

      unmount();
    });

    it('renders English keyboard layout when language is English', () => {
      setMockLanguage('en');

      render(
        <LanguageProvider>
          <WordleChallenge
            challenge={mockChallenge}
            onAnswer={mockOnAnswer}
            showHint={false}
          />
        </LanguageProvider>
      );

      // English keyboard should have Q, W, E, R, T, Y, etc.
      expect(screen.getByTestId('key-Q')).toBeInTheDocument();
      expect(screen.getByTestId('key-W')).toBeInTheDocument();
      expect(screen.getByTestId('key-E')).toBeInTheDocument();
    });

    it('renders Swedish keyboard layout when language is Swedish', () => {
      setMockLanguage('sv');

      render(
        <LanguageProvider>
          <WordleChallenge
            challenge={mockChallenge}
            onAnswer={mockOnAnswer}
            showHint={false}
          />
        </LanguageProvider>
      );

      // Swedish keyboard should have Å, Ä, Ö
      expect(screen.getByTestId('key-Å')).toBeInTheDocument();
      expect(screen.getByTestId('key-Ä')).toBeInTheDocument();
      expect(screen.getByTestId('key-Ö')).toBeInTheDocument();
    });
  });

  describe('native device keyboard support', () => {
    it('renders hidden input for mobile keyboard support', () => {
      render(
        <LanguageProvider>
          <WordleChallenge
            challenge={mockChallenge}
            onAnswer={mockOnAnswer}
            showHint={false}
          />
        </LanguageProvider>
      );

      const hiddenInput = screen.getByTestId('wordle-native-input');
      expect(hiddenInput).toBeInTheDocument();
      expect(hiddenInput.tagName).toBe('INPUT');
    });

    it('accepts input from native keyboard via hidden input', async () => {
      const user = userEvent.setup();

      render(
        <LanguageProvider>
          <WordleChallenge
            challenge={mockChallenge}
            onAnswer={mockOnAnswer}
            showHint={false}
          />
        </LanguageProvider>
      );

      const hiddenInput = screen.getByTestId('wordle-native-input');

      // Focus and type into the hidden input
      await user.click(hiddenInput);
      await user.type(hiddenInput, 'HELLO');

      // Should show in the grid
      const cells = screen.getAllByTestId(/^wordle-cell-0-/);
      expect(cells[0]).toHaveTextContent('H');
      expect(cells[1]).toHaveTextContent('E');
      expect(cells[2]).toHaveTextContent('L');
      expect(cells[3]).toHaveTextContent('L');
      expect(cells[4]).toHaveTextContent('O');
    });
  });
});
