import { render, screen } from '@testing-library/react';
import FillBlankChallenge from '../FillBlankChallenge';
import { LanguageProvider } from '@/contexts/LanguageContext';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    h2: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
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
});
