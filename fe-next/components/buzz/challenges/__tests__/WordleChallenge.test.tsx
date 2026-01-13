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

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import WordleChallenge from '../WordleChallenge';
import { LanguageProvider } from '@/contexts/LanguageContext';

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
      };
      return translations[key] || key;
    },
    language: 'en',
  }),
}));

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
    expect(screen.getByText('WORDLE')).toBeInTheDocument();
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

    await user.keyboard('HEL{Enter}');

    // Should still be on first row, no submission
    const cells = screen.getAllByTestId(/^wordle-cell-0-/);
    expect(cells[0]).toHaveTextContent('H');
    expect(cells[1]).toHaveTextContent('E');
    expect(cells[2]).toHaveTextContent('L');
    expect(cells[3]).toHaveTextContent('');
  });

  it('calls onAnswer when correct word is guessed', async () => {
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

    await user.keyboard('OSCAR{Enter}');

    expect(mockOnAnswer).toHaveBeenCalledWith('OSCAR');
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
});
