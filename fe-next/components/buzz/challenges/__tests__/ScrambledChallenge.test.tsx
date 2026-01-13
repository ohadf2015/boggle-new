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
      variants,
      custom,
      ...props
    }: any) => <span {...props}>{children}</span>,
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
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ScrambledChallenge from '../ScrambledChallenge';
import { LanguageProvider } from '@/contexts/LanguageContext';

// Mock translations
jest.mock('@/contexts/LanguageContext', () => ({
  ...jest.requireActual('@/contexts/LanguageContext'),
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'buzz.type.scrambled': 'SCRAMBLED',
        'buzz.hint': 'HINT',
        'buzz.yourAnswer': 'YOUR ANSWER',
        'buzz.submit': 'SUBMIT',
        'buzz.scrambled.unscramble': 'Unscramble the letters!',
        'buzz.letters': 'letters',
      };
      return translations[key] || key;
    },
    language: 'en',
  }),
}));

// Mock useMobileKeyboard hook
jest.mock('@/hooks/useMobileKeyboard', () => ({
  scrollInputIntoView: jest.fn(),
}));

describe('ScrambledChallenge', () => {
  const mockChallenge = {
    prompt: 'TSET', // Scrambled word to unscramble
    answer: 'TEST',
    hint: 'Four letter word for examination',
    trendingContext: 'Related to trending topic: Education',
  };

  const mockOnAnswer = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the challenge with scrambled letters display', () => {
    render(
      <LanguageProvider>
        <ScrambledChallenge
          challenge={mockChallenge}
          onAnswer={mockOnAnswer}
          showHint={false}
        />
      </LanguageProvider>
    );

    // Challenge type badge should be visible
    expect(screen.getByText('SCRAMBLED')).toBeInTheDocument();

    // Count unique letters in the prompt
    const letterCounts: Record<string, number> = {};
    mockChallenge.prompt.split('').forEach((letter) => {
      letterCounts[letter] = (letterCounts[letter] || 0) + 1;
    });

    // Each scrambled letter should be displayed in individual boxes
    // Use getAllByText for letters that appear multiple times
    Object.entries(letterCounts).forEach(([letter, count]) => {
      const elements = screen.getAllByText(letter);
      expect(elements.length).toBeGreaterThanOrEqual(count);
    });
  });

  it('shows hint when showHint is true', () => {
    render(
      <LanguageProvider>
        <ScrambledChallenge
          challenge={mockChallenge}
          onAnswer={mockOnAnswer}
          showHint={true}
        />
      </LanguageProvider>
    );

    expect(screen.getByText('HINT')).toBeInTheDocument();
    expect(
      screen.getByText('Four letter word for examination')
    ).toBeInTheDocument();
  });

  it('does not show hint when showHint is false', () => {
    render(
      <LanguageProvider>
        <ScrambledChallenge
          challenge={mockChallenge}
          onAnswer={mockOnAnswer}
          showHint={false}
        />
      </LanguageProvider>
    );

    expect(screen.queryByText('HINT')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Four letter word for examination')
    ).not.toBeInTheDocument();
  });

  it('converts input to uppercase', () => {
    render(
      <LanguageProvider>
        <ScrambledChallenge
          challenge={mockChallenge}
          onAnswer={mockOnAnswer}
          showHint={false}
        />
      </LanguageProvider>
    );

    // Component uses individual letter inputs with aria-labels
    const firstInput = screen.getByLabelText('Letter 1');

    // Use fireEvent.change for direct control
    fireEvent.change(firstInput, { target: { value: 't' } });

    // Should be converted to uppercase
    expect(firstInput).toHaveValue('T');
  });

  it('calls onAnswer with user input when submit button is clicked', () => {
    render(
      <LanguageProvider>
        <ScrambledChallenge
          challenge={mockChallenge}
          onAnswer={mockOnAnswer}
          showHint={false}
        />
      </LanguageProvider>
    );

    // Get all letter inputs and fill them
    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(4); // TEST has 4 letters

    // Fill each input with a letter
    fireEvent.change(inputs[0], { target: { value: 't' } });
    fireEvent.change(inputs[1], { target: { value: 'e' } });
    fireEvent.change(inputs[2], { target: { value: 's' } });
    fireEvent.change(inputs[3], { target: { value: 't' } });

    // Click submit
    const submitButton = screen.getByText('SUBMIT');
    fireEvent.click(submitButton);

    expect(mockOnAnswer).toHaveBeenCalledWith('TEST');
  });

  it('submit button is disabled when input is empty', () => {
    render(
      <LanguageProvider>
        <ScrambledChallenge
          challenge={mockChallenge}
          onAnswer={mockOnAnswer}
          showHint={false}
        />
      </LanguageProvider>
    );

    const submitButton = screen.getByText('SUBMIT');

    expect(submitButton).toBeDisabled();
  });

  it('submit button is enabled when all letters are filled', () => {
    render(
      <LanguageProvider>
        <ScrambledChallenge
          challenge={mockChallenge}
          onAnswer={mockOnAnswer}
          showHint={false}
        />
      </LanguageProvider>
    );

    // Get all letter inputs and fill them
    const inputs = screen.getAllByRole('textbox');

    // Fill each input
    fireEvent.change(inputs[0], { target: { value: 't' } });
    fireEvent.change(inputs[1], { target: { value: 'e' } });
    fireEvent.change(inputs[2], { target: { value: 's' } });
    fireEvent.change(inputs[3], { target: { value: 't' } });

    const submitButton = screen.getByText('SUBMIT');

    expect(submitButton).not.toBeDisabled();
  });

  it('shows trending context when provided', () => {
    render(
      <LanguageProvider>
        <ScrambledChallenge
          challenge={mockChallenge}
          onAnswer={mockOnAnswer}
          showHint={false}
        />
      </LanguageProvider>
    );

    expect(
      screen.getByText('Related to trending topic: Education')
    ).toBeInTheDocument();
  });

  it('renders the correct number of input boxes based on answer length', () => {
    render(
      <LanguageProvider>
        <ScrambledChallenge
          challenge={mockChallenge}
          onAnswer={mockOnAnswer}
          showHint={false}
        />
      </LanguageProvider>
    );

    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(mockChallenge.answer.length);
  });

  it('shows progress indicator with letter count', () => {
    render(
      <LanguageProvider>
        <ScrambledChallenge
          challenge={mockChallenge}
          onAnswer={mockOnAnswer}
          showHint={false}
        />
      </LanguageProvider>
    );

    // Progress indicator shows "X / Y letters" format
    // The text is split across multiple elements, so check individual parts
    expect(screen.getByText('letters')).toBeInTheDocument();

    // Initial filled count should be 0
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
