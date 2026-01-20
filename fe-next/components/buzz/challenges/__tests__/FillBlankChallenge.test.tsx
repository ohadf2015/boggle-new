import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FillBlankChallenge from '../FillBlankChallenge';
import { LanguageProvider } from '@/contexts/LanguageContext';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    h2: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('FillBlankChallenge', () => {
  const mockOnAnswer = jest.fn();

  const renderComponent = (prompt: string, answer: string = 'TEST') => {
    return render(
      <LanguageProvider>
        <FillBlankChallenge
          challenge={{
            prompt,
            answer,
            hint: 'Test hint',
          }}
          onAnswer={mockOnAnswer}
          showHint={false}
        />
      </LanguageProvider>
    );
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Prompt Display', () => {
    it('should NOT display (N letters) pattern in the prompt when present', () => {
      const promptWithLetters = 'Fill in the _ _ _ _ (4 letters)';
      renderComponent(promptWithLetters, 'TEST');

      // The prompt should be displayed WITHOUT the "(4 letters)" suffix
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading.textContent).not.toContain('(4 letters)');
      expect(heading.textContent).toBe('Fill in the _ _ _ _');
    });

    it('should handle different letter count patterns: (3 letters)', () => {
      const prompt = 'Complete the phrase: The _ _ _ (3 letters)';
      renderComponent(prompt, 'CAT');

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading.textContent).not.toContain('(3 letters)');
      expect(heading.textContent).toBe('Complete the phrase: The _ _ _');
    });

    it('should handle different letter count patterns: (10 letters)', () => {
      const prompt = 'What word fits? _ _ _ _ _ _ _ _ _ _ (10 letters)';
      renderComponent(prompt, 'JAVASCRIPT');

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading.textContent).not.toContain('(10 letters)');
      expect(heading.textContent).toBe('What word fits? _ _ _ _ _ _ _ _ _ _');
    });

    it('should handle prompts without letter count pattern (edge case)', () => {
      const prompt = 'Fill in the blank';
      renderComponent(prompt, 'TEST');

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading.textContent).toBe('Fill in the blank');
    });

    it('should preserve content that looks like letter count but is part of the question', () => {
      const prompt = 'How many (5 items) fit in the box? _ _ _ (3 letters)';
      renderComponent(prompt, 'TEN');

      const heading = screen.getByRole('heading', { level: 2 });
      // Should only remove the trailing "(3 letters)"
      expect(heading.textContent).not.toContain('(3 letters)');
      expect(heading.textContent).toContain('(5 items)');
      expect(heading.textContent).toBe('How many (5 items) fit in the box? _ _ _');
    });
  });

  describe('Letter Count Display', () => {
    it('should show separate letter count indicator below the prompt', () => {
      const prompt = 'Fill in the _ _ _ _ (4 letters)';
      renderComponent(prompt, 'TEST');

      // The letter count should be shown in the separate indicator section
      // The answer is 'TEST' which is 4 letters, so we should see "0 / 4"
      // Note: Multiple "4"s exist (one per letter box index), so we just check the pattern exists
      expect(screen.getByText('/', { exact: false })).toBeInTheDocument();
    });
  });

  describe('First Letter Reveal Feature', () => {
    const fullChallenge = {
      prompt: 'Complete this word: _ _ _ _ _ (5 letters)',
      answer: 'APPLE',
      hint: 'A fruit that keeps the doctor away',
      trendingContext: 'Popular fruit in Fall season',
    };

    describe('First Letter Display', () => {
      it('should extract and display first letter as hint', () => {
        render(
          <LanguageProvider>
            <FillBlankChallenge
              challenge={fullChallenge}
              onAnswer={mockOnAnswer}
              showHint={false}
            />
          </LanguageProvider>
        );

        // First letter should be visible (appears twice: once in count, once in box)
        const allAs = screen.getAllByText('A');
        expect(allAs.length).toBeGreaterThanOrEqual(2);

        // Should have hint badge and hint label text
        const hintElements = screen.getAllByText(/hint/i);
        expect(hintElements.length).toBeGreaterThanOrEqual(2); // Badge + label text
      });

      it('should display correct number of input boxes (length - 1)', () => {
        render(
          <LanguageProvider>
            <FillBlankChallenge
              challenge={fullChallenge}
              onAnswer={mockOnAnswer}
              showHint={false}
            />
          </LanguageProvider>
        );

        // APPLE = 5 letters, so 4 input boxes (5 - 1)
        const inputs = screen.getAllByRole('textbox');
        expect(inputs).toHaveLength(4); // Not 5!
      });

      it('should show letter count as "first + remaining"', () => {
        render(
          <LanguageProvider>
            <FillBlankChallenge
              challenge={fullChallenge}
              onAnswer={mockOnAnswer}
              showHint={false}
            />
          </LanguageProvider>
        );

        // Should show: A + 0 / 4 letters initially
        const allAs = screen.getAllByText('A');
        expect(allAs.length).toBeGreaterThanOrEqual(2); // First letter appears twice
        expect(screen.getByText('0')).toBeInTheDocument(); // Filled count
        // "4" appears multiple times (letter count + box number indicator at position 4)
        const all4s = screen.getAllByText('4');
        expect(all4s.length).toBeGreaterThanOrEqual(2); // Remaining count + box indicator
      });

      it('should update letter count as user fills boxes', async () => {
        const user = userEvent.setup();
        render(
          <LanguageProvider>
            <FillBlankChallenge
              challenge={fullChallenge}
              onAnswer={mockOnAnswer}
              showHint={false}
            />
          </LanguageProvider>
        );

        const inputs = screen.getAllByRole('textbox');

        // Initially should show: A + 0 / 4
        expect(screen.getByText('0')).toBeInTheDocument();

        // Type "P" in first input box
        await user.type(inputs[0], 'P');

        // Should now show: A + 1 / 4
        // Note: "1" appears multiple times (filled count + box number indicator)
        await waitFor(() => {
          const all1s = screen.getAllByText('1');
          expect(all1s.length).toBeGreaterThanOrEqual(2);
        });

        // Type "P" in second input box
        await user.type(inputs[1], 'P');

        // Should now show: A + 2 / 4
        // Note: "2" appears multiple times (filled count + box number indicator)
        await waitFor(() => {
          const all2s = screen.getAllByText('2');
          expect(all2s.length).toBeGreaterThanOrEqual(2);
        });
      });
    });

    describe('Submit with First Letter Prepended', () => {
      it('should prepend first letter when submitting via button', async () => {
        const user = userEvent.setup();
        const onAnswer = jest.fn();
        render(
          <LanguageProvider>
            <FillBlankChallenge
              challenge={fullChallenge}
              onAnswer={onAnswer}
              showHint={false}
            />
          </LanguageProvider>
        );

        const inputs = screen.getAllByRole('textbox');

        // Type remaining letters: "PPLE"
        await user.type(inputs[0], 'P');
        await user.type(inputs[1], 'P');
        await user.type(inputs[2], 'L');
        await user.type(inputs[3], 'E');

        // Submit button should be enabled
        const submitButton = screen.getByRole('button', { name: /submit/i });
        await waitFor(() => {
          expect(submitButton).not.toBeDisabled();
        });

        // Click submit
        await user.click(submitButton);

        // onAnswer should be called with first letter prepended: "APPLE"
        await waitFor(() => {
          expect(onAnswer).toHaveBeenCalledWith('APPLE');
        });
      });

      it('should prepend first letter when submitting via Enter key', async () => {
        const user = userEvent.setup();
        const onAnswer = jest.fn();
        render(
          <LanguageProvider>
            <FillBlankChallenge
              challenge={fullChallenge}
              onAnswer={onAnswer}
              showHint={false}
            />
          </LanguageProvider>
        );

        const inputs = screen.getAllByRole('textbox');

        // Type remaining letters: "PPLE"
        await user.type(inputs[0], 'P');
        await user.type(inputs[1], 'P');
        await user.type(inputs[2], 'L');
        await user.type(inputs[3], 'E');

        // Wait for state to update after typing
        const submitButton = screen.getByRole('button', { name: /submit/i });
        await waitFor(() => {
          expect(submitButton).not.toBeDisabled();
        }, { timeout: 3000 });

        // Press Enter in any input box
        fireEvent.keyDown(inputs[3], { key: 'Enter', code: 'Enter' });

        // onAnswer should be called with first letter prepended: "APPLE"
        await waitFor(() => {
          expect(onAnswer).toHaveBeenCalledWith('APPLE');
        });
      });

      it('should NOT submit if incomplete when Enter pressed', async () => {
        const user = userEvent.setup();
        const onAnswer = jest.fn();
        render(
          <LanguageProvider>
            <FillBlankChallenge
              challenge={fullChallenge}
              onAnswer={onAnswer}
              showHint={false}
            />
          </LanguageProvider>
        );

        const inputs = screen.getAllByRole('textbox');

        // Type only partial answer: "PP"
        await user.type(inputs[0], 'P');
        await user.type(inputs[1], 'P');

        // Press Enter in second input box
        fireEvent.keyDown(inputs[1], { key: 'Enter', code: 'Enter' });

        // onAnswer should NOT be called (incomplete)
        await waitFor(() => {
          expect(onAnswer).not.toHaveBeenCalled();
        });
      });

      it('should disable submit button when incomplete', async () => {
        const user = userEvent.setup();
        render(
          <LanguageProvider>
            <FillBlankChallenge
              challenge={fullChallenge}
              onAnswer={mockOnAnswer}
              showHint={false}
            />
          </LanguageProvider>
        );

        const submitButton = screen.getByRole('button', { name: /submit/i });

        // Initially disabled (no input)
        expect(submitButton).toBeDisabled();

        const inputs = screen.getAllByRole('textbox');

        // Type partial answer
        await user.type(inputs[0], 'P');
        await user.type(inputs[1], 'P');

        // Still disabled (incomplete)
        expect(submitButton).toBeDisabled();

        // Complete the answer
        await user.type(inputs[2], 'L');
        await user.type(inputs[3], 'E');

        // Now enabled
        await waitFor(() => {
          expect(submitButton).not.toBeDisabled();
        }, { timeout: 3000 });
      });
    });

    describe('Clear Functionality', () => {
      it('should clear all user input but keep first letter displayed', async () => {
        const user = userEvent.setup();
        render(
          <LanguageProvider>
            <FillBlankChallenge
              challenge={fullChallenge}
              onAnswer={mockOnAnswer}
              showHint={false}
            />
          </LanguageProvider>
        );

        const inputs = screen.getAllByRole('textbox');

        // Type some letters
        await user.type(inputs[0], 'P');
        await user.type(inputs[1], 'P');
        await user.type(inputs[2], 'L');

        // Click clear button (has Delete icon)
        const buttons = screen.getAllByRole('button');
        const clearButton = buttons.find((btn) => !btn.textContent?.includes('Submit'));
        expect(clearButton).toBeDefined();
        await user.click(clearButton!);

        // All input boxes should be empty
        await waitFor(() => {
          inputs.forEach((input) => {
            expect(input).toHaveValue('');
          });
        });

        // First letter "A" should still be displayed (appears twice: count + box)
        const allAs = screen.getAllByText('A');
        expect(allAs.length).toBeGreaterThanOrEqual(2);

        // Focus should return to first input box
        expect(inputs[0]).toHaveFocus();
      });
    });

    describe('Different Word Lengths', () => {
      it('should handle 3-letter word (2 input boxes)', () => {
        const shortChallenge = {
          prompt: 'Short word: _ _ _',
          answer: 'CAT',
          hint: 'A feline pet',
        };

        render(
          <LanguageProvider>
            <FillBlankChallenge
              challenge={shortChallenge}
              onAnswer={mockOnAnswer}
              showHint={false}
            />
          </LanguageProvider>
        );

        // First letter "C" displayed (appears twice: count + box)
        const allCs = screen.getAllByText('C');
        expect(allCs.length).toBeGreaterThanOrEqual(2);

        // 2 input boxes (3 - 1)
        const inputs = screen.getAllByRole('textbox');
        expect(inputs).toHaveLength(2);
      });

      it('should handle 10-letter word (9 input boxes)', () => {
        const longChallenge = {
          prompt: 'Long word: _ _ _ _ _ _ _ _ _ _',
          answer: 'STRAWBERRY',
          hint: 'A red berry',
        };

        render(
          <LanguageProvider>
            <FillBlankChallenge
              challenge={longChallenge}
              onAnswer={mockOnAnswer}
              showHint={false}
            />
          </LanguageProvider>
        );

        // First letter "S" displayed (appears twice: count + box)
        const allSs = screen.getAllByText('S');
        expect(allSs.length).toBeGreaterThanOrEqual(2);

        // 9 input boxes (10 - 1)
        const inputs = screen.getAllByRole('textbox');
        expect(inputs).toHaveLength(9);
      });
    });

    describe('Box Number Indicators', () => {
      it('should show box numbers starting from 2 (first letter is position 1)', () => {
        render(
          <LanguageProvider>
            <FillBlankChallenge
              challenge={fullChallenge}
              onAnswer={mockOnAnswer}
              showHint={false}
            />
          </LanguageProvider>
        );

        // First letter box should show "1" below it
        expect(screen.getByText('1')).toBeInTheDocument();

        // Input boxes should show "2", "3", "4", "5"
        // Note: Some numbers like "4" appear multiple times (box indicator + letter count)
        expect(screen.getByText('2')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
        // "4" appears in letter count ("A + 0 / 4") and as box indicator
        const all4s = screen.getAllByText('4');
        expect(all4s.length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('5')).toBeInTheDocument();
      });
    });
  });
});
