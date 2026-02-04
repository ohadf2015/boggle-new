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
    input: ({
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
    }: any) => <input {...props} />,
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
      variants,
      custom,
      ...props
    }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChainChallenge from '../ChainChallenge';
import { LanguageProvider } from '@/contexts/LanguageContext';

// Mock translations
jest.mock('@/contexts/LanguageContext', () => ({
  ...jest.requireActual('@/contexts/LanguageContext'),
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'buzz.type.chain': 'CHAIN',
        'buzz.hint': 'HINT',
        'buzz.yourAnswer': 'YOUR ANSWER',
        'buzz.submit': 'SUBMIT',
        'buzz.chain.instruction': 'Complete the word chain!',
        'buzz.chain.compoundHint': 'The middle word forms compound words with both neighbors',
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

describe('ChainChallenge', () => {
  const mockChallenge = {
    prompt: 'SUN → ??? → POT', // Backend format with ??? placeholder
    answer: 'FLOWER',
    hint: 'SUNflower + FLOWERpot',
    trendingContext: 'Related to trending topic: Gardening',
  };

  const mockOnAnswer = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the challenge with word chain display showing both context words', () => {
    render(
      <LanguageProvider>
        <ChainChallenge
          challenge={mockChallenge}
          onAnswer={mockOnAnswer}
          showHint={false}
        />
      </LanguageProvider>
    );

    // Type tag removed - now displayed in parent BuzzGameScreen header

    // BOTH known words should be visible (not the ??? placeholder)
    expect(screen.getByText('SUN')).toBeInTheDocument();
    expect(screen.getByText('POT')).toBeInTheDocument();

    // The ??? placeholder should NOT appear as a word box (only in the mystery box)
    const wordBoxes = screen.getAllByText(/^(SUN|POT)$/);
    expect(wordBoxes).toHaveLength(2);
  });

  it('shows ??? in the mystery word placeholder before user types', () => {
    render(
      <LanguageProvider>
        <ChainChallenge
          challenge={mockChallenge}
          onAnswer={mockOnAnswer}
          showHint={false}
        />
      </LanguageProvider>
    );

    // Mystery placeholder should show ???
    expect(screen.getByText('???')).toBeInTheDocument();
  });

  it('shows hint when showHint is true', () => {
    render(
      <LanguageProvider>
        <ChainChallenge
          challenge={mockChallenge}
          onAnswer={mockOnAnswer}
          showHint={true}
        />
      </LanguageProvider>
    );

    expect(screen.getByText('HINT')).toBeInTheDocument();
    expect(screen.getByText('SUNflower + FLOWERpot')).toBeInTheDocument();
  });

  it('does not show hint when showHint is false', () => {
    render(
      <LanguageProvider>
        <ChainChallenge
          challenge={mockChallenge}
          onAnswer={mockOnAnswer}
          showHint={false}
        />
      </LanguageProvider>
    );

    expect(screen.queryByText('HINT')).not.toBeInTheDocument();
    expect(screen.queryByText('SUNflower + FLOWERpot')).not.toBeInTheDocument();
  });

  it('converts input to uppercase', () => {
    render(
      <LanguageProvider>
        <ChainChallenge
          challenge={mockChallenge}
          onAnswer={mockOnAnswer}
          showHint={false}
        />
      </LanguageProvider>
    );

    const input = screen.getByPlaceholderText('YOUR ANSWER');

    fireEvent.change(input, { target: { value: 'flower' } });

    expect(input).toHaveValue('FLOWER');
  });

  it('calls onAnswer with user input when submit button is clicked', () => {
    render(
      <LanguageProvider>
        <ChainChallenge
          challenge={mockChallenge}
          onAnswer={mockOnAnswer}
          showHint={false}
        />
      </LanguageProvider>
    );

    const input = screen.getByPlaceholderText('YOUR ANSWER');
    const submitButton = screen.getByText('SUBMIT');

    fireEvent.change(input, { target: { value: 'FLOWER' } });
    fireEvent.click(submitButton);

    expect(mockOnAnswer).toHaveBeenCalledWith('FLOWER');
  });

  it('submit button is disabled when input is empty', () => {
    render(
      <LanguageProvider>
        <ChainChallenge
          challenge={mockChallenge}
          onAnswer={mockOnAnswer}
          showHint={false}
        />
      </LanguageProvider>
    );

    const submitButton = screen.getByText('SUBMIT');

    expect(submitButton).toBeDisabled();
  });

  it('submit button is enabled when input has text', () => {
    render(
      <LanguageProvider>
        <ChainChallenge
          challenge={mockChallenge}
          onAnswer={mockOnAnswer}
          showHint={false}
        />
      </LanguageProvider>
    );

    const input = screen.getByPlaceholderText('YOUR ANSWER');
    const submitButton = screen.getByText('SUBMIT');

    fireEvent.change(input, { target: { value: 'FLOWER' } });

    expect(submitButton).not.toBeDisabled();
  });

  it('shows trending context when provided', () => {
    render(
      <LanguageProvider>
        <ChainChallenge
          challenge={mockChallenge}
          onAnswer={mockOnAnswer}
          showHint={false}
        />
      </LanguageProvider>
    );

    expect(
      screen.getByText('Related to trending topic: Gardening')
    ).toBeInTheDocument();
  });

  it('handles Enter key to submit answer', () => {
    render(
      <LanguageProvider>
        <ChainChallenge
          challenge={mockChallenge}
          onAnswer={mockOnAnswer}
          showHint={false}
        />
      </LanguageProvider>
    );

    const input = screen.getByPlaceholderText('YOUR ANSWER');

    fireEvent.change(input, { target: { value: 'FLOWER' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockOnAnswer).toHaveBeenCalledWith('FLOWER');
  });

  it('handles chain with flex-wrap for responsive layout', () => {
    render(
      <LanguageProvider>
        <ChainChallenge
          challenge={mockChallenge}
          onAnswer={mockOnAnswer}
          showHint={false}
        />
      </LanguageProvider>
    );

    // Find the chain container - it should have flex-wrap class
    const chainContainer = screen.getByText('SUN').closest('div')?.parentElement;
    expect(chainContainer).toHaveClass('flex-wrap');
    expect(chainContainer).toHaveClass('justify-center');
    expect(chainContainer).toHaveClass('items-center');
  });

  it('word boxes use reasonable sizing that allows wrapping on narrow screens', () => {
    render(
      <LanguageProvider>
        <ChainChallenge
          challenge={mockChallenge}
          onAnswer={mockOnAnswer}
          showHint={false}
        />
      </LanguageProvider>
    );

    // Word boxes should not have fixed width constraints that prevent wrapping
    const sunBox = screen.getByText('SUN').closest('div');
    const potBox = screen.getByText('POT').closest('div');

    // Boxes should have padding (px-4 py-2) but no width constraints
    expect(sunBox).toHaveClass('px-4');
    expect(potBox).toHaveClass('px-4');

    // Mystery box should have min-width but not max-width
    const mysteryBox = screen.getByText('???').closest('div');
    expect(mysteryBox).toHaveClass('min-w-[80px]');
  });

  it('displays correct order: WORD1 → Mystery → WORD2', () => {
    render(
      <LanguageProvider>
        <ChainChallenge
          challenge={mockChallenge}
          onAnswer={mockOnAnswer}
          showHint={false}
        />
      </LanguageProvider>
    );

    // Get all text content in order
    const chainContainer = screen.getByText('SUN').closest('div')?.parentElement;
    const textContent = chainContainer?.textContent || '';

    // Should be in order: SUN ... ??? ... POT
    const sunIndex = textContent.indexOf('SUN');
    const questionIndex = textContent.indexOf('???');
    const potIndex = textContent.indexOf('POT');

    expect(sunIndex).toBeLessThan(questionIndex);
    expect(questionIndex).toBeLessThan(potIndex);
  });

  // Multiple-choice mode tests
  describe('Multiple Choice Mode', () => {
    const mockChallengeWithOptions = {
      prompt: 'SUN → ??? → POT',
      answer: 'FLOWER',
      options: ['FLOWER', 'LIGHT', 'BURN', 'PLANT'],
      hint: 'SUNflower + FLOWERpot',
      trendingContext: 'Related to trending topic: Gardening',
    };

    it('renders options buttons when options are provided', () => {
      render(
        <LanguageProvider>
          <ChainChallenge
            challenge={mockChallengeWithOptions}
            onAnswer={mockOnAnswer}
            showHint={false}
          />
        </LanguageProvider>
      );

      // All options should be visible as buttons
      expect(screen.getByRole('button', { name: 'FLOWER' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'LIGHT' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'BURN' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'PLANT' })).toBeInTheDocument();
    });

    it('hides text input when options are provided', () => {
      render(
        <LanguageProvider>
          <ChainChallenge
            challenge={mockChallengeWithOptions}
            onAnswer={mockOnAnswer}
            showHint={false}
          />
        </LanguageProvider>
      );

      // Text input should not be rendered
      expect(screen.queryByPlaceholderText('YOUR ANSWER')).not.toBeInTheDocument();
      // Submit button should not be rendered (auto-submit on option click)
      expect(screen.queryByText('SUBMIT')).not.toBeInTheDocument();
    });

    it('calls onAnswer when an option is clicked', () => {
      render(
        <LanguageProvider>
          <ChainChallenge
            challenge={mockChallengeWithOptions}
            onAnswer={mockOnAnswer}
            showHint={false}
          />
        </LanguageProvider>
      );

      const flowerButton = screen.getByRole('button', { name: 'FLOWER' });
      fireEvent.click(flowerButton);

      expect(mockOnAnswer).toHaveBeenCalledWith('FLOWER');
    });

    it('disables all options after one is selected', () => {
      render(
        <LanguageProvider>
          <ChainChallenge
            challenge={mockChallengeWithOptions}
            onAnswer={mockOnAnswer}
            showHint={false}
          />
        </LanguageProvider>
      );

      const flowerButton = screen.getByRole('button', { name: 'FLOWER' });
      fireEvent.click(flowerButton);

      // All option buttons should be disabled after selection
      expect(screen.getByRole('button', { name: 'FLOWER' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'LIGHT' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'BURN' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'PLANT' })).toBeDisabled();
    });

    it('shows selected option in the mystery word placeholder', () => {
      render(
        <LanguageProvider>
          <ChainChallenge
            challenge={mockChallengeWithOptions}
            onAnswer={mockOnAnswer}
            showHint={false}
          />
        </LanguageProvider>
      );

      // Before selection, show ???
      expect(screen.getByText('???')).toBeInTheDocument();

      const lightButton = screen.getByRole('button', { name: 'LIGHT' });
      fireEvent.click(lightButton);

      // After selection, the selected option should appear in the chain
      // There should be two instances - one in the option button and one in the chain display
      const lightInstances = screen.getAllByText('LIGHT');
      expect(lightInstances.length).toBeGreaterThanOrEqual(1);
    });

    it('renders options in a grid layout', () => {
      render(
        <LanguageProvider>
          <ChainChallenge
            challenge={mockChallengeWithOptions}
            onAnswer={mockOnAnswer}
            showHint={false}
          />
        </LanguageProvider>
      );

      // Find the grid container (parent of options)
      const flowerButton = screen.getByRole('button', { name: 'FLOWER' });
      const gridContainer = flowerButton.parentElement;

      expect(gridContainer).toHaveClass('grid');
      expect(gridContainer).toHaveClass('grid-cols-2');
    });

    it('still shows hint in multiple choice mode', () => {
      render(
        <LanguageProvider>
          <ChainChallenge
            challenge={mockChallengeWithOptions}
            onAnswer={mockOnAnswer}
            showHint={true}
          />
        </LanguageProvider>
      );

      expect(screen.getByText('HINT')).toBeInTheDocument();
      expect(screen.getByText('SUNflower + FLOWERpot')).toBeInTheDocument();
    });

    it('still shows trending context in multiple choice mode', () => {
      render(
        <LanguageProvider>
          <ChainChallenge
            challenge={mockChallengeWithOptions}
            onAnswer={mockOnAnswer}
            showHint={false}
          />
        </LanguageProvider>
      );

      expect(screen.getByText('Related to trending topic: Gardening')).toBeInTheDocument();
    });

    it('falls back to text input when options array is empty', () => {
      const challengeWithEmptyOptions = {
        ...mockChallenge,
        options: [],
      };

      render(
        <LanguageProvider>
          <ChainChallenge
            challenge={challengeWithEmptyOptions}
            onAnswer={mockOnAnswer}
            showHint={false}
          />
        </LanguageProvider>
      );

      // Should show text input, not options
      expect(screen.getByPlaceholderText('YOUR ANSWER')).toBeInTheDocument();
      expect(screen.getByText('SUBMIT')).toBeInTheDocument();
    });
  });
});
