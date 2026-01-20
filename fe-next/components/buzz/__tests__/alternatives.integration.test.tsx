/**
 * Integration Tests for Alternative Answers Feature
 *
 * Tests the full workflow of:
 * 1. Challenge data with alternatives
 * 2. User submitting alternative answers
 * 3. Validation accepting alternatives
 * 4. UI displaying alternatives in feedback and results
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import BuzzGameScreen from '../BuzzGameScreen';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { SoundEffectsProvider } from '@/contexts/SoundEffectsContext';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/buzz',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock sound effects
jest.mock('@/contexts/SoundEffectsContext', () => ({
  SoundEffectsProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useSoundEffects: () => ({
    playWordAcceptedSound: jest.fn(),
    playErrorSound: jest.fn(),
  }),
}));

// Mock confetti
jest.mock('@/utils/confettiUtils', () => ({
  fireConfetti: jest.fn(),
}));

// Mock AnswerFeedbackModal to immediately call onClose (bypasses setTimeout timing issues in tests)
jest.mock('../AnswerFeedbackModal', () => {
  return function MockAnswerFeedbackModal({
    isOpen,
    isCorrect,
    correctAnswer,
    alternatives,
    userAnswer,
    points,
    onClose,
  }: {
    isOpen: boolean;
    isCorrect: boolean;
    correctAnswer: string;
    alternatives?: string[];
    userAnswer: string;
    points: number;
    trendingContext?: string;
    onClose: () => void;
    autoCloseMs?: number;
  }) {
    const { formatValidAnswers } = require('@/utils/buzz/answerValidation');
    const onCloseRef = React.useRef(onClose);

    // Keep ref updated but don't trigger useEffect
    React.useEffect(() => {
      onCloseRef.current = onClose;
    }, [onClose]);

    React.useEffect(() => {
      if (isOpen) {
        console.log('[MockModal] Modal opened, calling onClose immediately');
        // Call onClose immediately (synchronously causes issues, so use queueMicrotask)
        queueMicrotask(() => {
          console.log('[MockModal] Calling onClose now');
          onCloseRef.current();
        });
      }
    }, [isOpen]); // Only depend on isOpen, not onClose

    if (!isOpen) return null;

    return (
      <div data-testid="feedback-modal">
        <div>{isCorrect ? 'CORRECT' : 'INCORRECT'}</div>
        <div>+{points}</div>
        {!isCorrect && <div>{formatValidAnswers(correctAnswer, alternatives)}</div>}
      </div>
    );
  };
});

// Test data with alternatives
const mockChallengeDataWithAlternatives = {
  id: 1,
  puzzleDate: '2026-01-20',
  language: 'en',
  challenges: [
    {
      type: 'fillBlank' as const,
      trendTopic: 'Camping',
      prompt: 'You need to _ _ _ _ _ a tent (5 letters)',
      answer: 'PITCH',
      alternatives: ['RAISE', 'ERECT'],
      hint: 'Set it up!',
      difficulty: 'medium' as const,
      trendingContext: 'Camping is trending today',
    },
    {
      type: 'fillBlank' as const,
      trendTopic: 'Parking',
      prompt: 'Where to _ _ _ _ your car (4 letters)',
      answer: 'PARK',
      alternatives: ['STOP'],
      hint: 'Leave it somewhere safe',
      difficulty: 'easy' as const,
      trendingContext: 'Parking spaces are in the news',
    },
    {
      type: 'fillBlank' as const,
      trendTopic: 'Regular',
      prompt: 'Say _ _ _ _ _ (5 letters)',
      answer: 'HELLO',
      hint: 'Greet someone',
      difficulty: 'easy' as const,
      trendingContext: 'No alternatives for this one',
    },
  ],
};

// Wrapper component with providers
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <LanguageProvider>
    <SoundEffectsProvider>{children}</SoundEffectsProvider>
  </LanguageProvider>
);

describe('Alternative Answers Integration', () => {
  let onCompleteMock: jest.Mock;
  let onQuitMock: jest.Mock;

  beforeEach(() => {
    onCompleteMock = jest.fn();
    onQuitMock = jest.fn();
  });

  describe('Validation with alternatives', () => {
    // GIVEN: Challenge with alternatives
    // WHEN: User submits correct answer
    // THEN: Answer is accepted
    test('should accept main answer', async () => {
      render(
        <TestWrapper>
          <BuzzGameScreen
            challengeData={mockChallengeDataWithAlternatives}
            onComplete={onCompleteMock}
            onQuit={onQuitMock}
          />
        </TestWrapper>
      );

      // Fill in "PITCH" (main answer) - challenge has alternatives, so no first letter hint
      const inputs = screen.getAllByRole('textbox');
      expect(inputs).toHaveLength(5); // 5-letter word, full input needed when alternatives exist

      fireEvent.change(inputs[0], { target: { value: 'P' } });
      fireEvent.change(inputs[1], { target: { value: 'I' } });
      fireEvent.change(inputs[2], { target: { value: 'T' } });
      fireEvent.change(inputs[3], { target: { value: 'C' } });
      fireEvent.change(inputs[4], { target: { value: 'H' } });

      // Submit
      const submitButton = screen.getByRole('button', { name: /submit/i });
      fireEvent.click(submitButton);

      // Should show correct feedback
      await waitFor(() => {
        expect(screen.getByText(/correct/i)).toBeInTheDocument();
      });
    });

    // GIVEN: Challenge with alternatives
    // WHEN: User submits first alternative
    // THEN: Answer is accepted
    test('should accept first alternative answer', async () => {
      render(
        <TestWrapper>
          <BuzzGameScreen
            challengeData={mockChallengeDataWithAlternatives}
            onComplete={onCompleteMock}
            onQuit={onQuitMock}
          />
        </TestWrapper>
      );

      // Fill in "RAISE" (first alternative) - challenge has alternatives, so no first letter hint
      const inputs = screen.getAllByRole('textbox');
      expect(inputs).toHaveLength(5); // 5-letter word, full input needed when alternatives exist
      fireEvent.change(inputs[0], { target: { value: 'R' } });
      fireEvent.change(inputs[1], { target: { value: 'A' } });
      fireEvent.change(inputs[2], { target: { value: 'I' } });
      fireEvent.change(inputs[3], { target: { value: 'S' } });
      fireEvent.change(inputs[4], { target: { value: 'E' } });

      // Submit
      const submitButton = screen.getByRole('button', { name: /submit/i });
      fireEvent.click(submitButton);

      // Should show correct feedback
      await waitFor(() => {
        expect(screen.getByText(/correct/i)).toBeInTheDocument();
      });
    });

    // GIVEN: Challenge with alternatives
    // WHEN: User submits second alternative
    // THEN: Answer is accepted
    test('should accept second alternative answer', async () => {
      render(
        <TestWrapper>
          <BuzzGameScreen
            challengeData={mockChallengeDataWithAlternatives}
            onComplete={onCompleteMock}
            onQuit={onQuitMock}
          />
        </TestWrapper>
      );

      // Fill in "ERECT" (second alternative) - challenge has alternatives, so no first letter hint
      const inputs = screen.getAllByRole('textbox');
      expect(inputs).toHaveLength(5); // 5-letter word, full input needed when alternatives exist
      fireEvent.change(inputs[0], { target: { value: 'E' } });
      fireEvent.change(inputs[1], { target: { value: 'R' } });
      fireEvent.change(inputs[2], { target: { value: 'E' } });
      fireEvent.change(inputs[3], { target: { value: 'C' } });
      fireEvent.change(inputs[4], { target: { value: 'T' } });

      // Submit
      const submitButton = screen.getByRole('button', { name: /submit/i });
      fireEvent.click(submitButton);

      // Should show correct feedback
      await waitFor(() => {
        expect(screen.getByText(/correct/i)).toBeInTheDocument();
      });
    });

    // GIVEN: Challenge with alternatives
    // WHEN: User submits wrong answer
    // THEN: Answer is rejected
    test('should reject wrong answer even when alternatives exist', async () => {
      render(
        <TestWrapper>
          <BuzzGameScreen
            challengeData={mockChallengeDataWithAlternatives}
            onComplete={onCompleteMock}
            onQuit={onQuitMock}
          />
        </TestWrapper>
      );

      // Fill in "WRONG" - challenge has alternatives, so user types full word
      const inputs = screen.getAllByRole('textbox');
      expect(inputs).toHaveLength(5); // 5-letter word, full input needed when alternatives exist
      fireEvent.change(inputs[0], { target: { value: 'W' } });
      fireEvent.change(inputs[1], { target: { value: 'R' } });
      fireEvent.change(inputs[2], { target: { value: 'O' } });
      fireEvent.change(inputs[3], { target: { value: 'N' } });
      fireEvent.change(inputs[4], { target: { value: 'G' } });

      // Submit
      const submitButton = screen.getByRole('button', { name: /submit/i });
      fireEvent.click(submitButton);

      // Should show incorrect feedback with alternatives displayed
      await waitFor(() => {
        expect(screen.getByText(/incorrect/i)).toBeInTheDocument();
        // Should show formatted alternatives: "PITCH (or RAISE, ERECT)"
        expect(screen.getByText(/PITCH \(or RAISE, ERECT\)/i)).toBeInTheDocument();
      });
    });

    // GIVEN: Challenge without alternatives
    // WHEN: User submits answer
    // THEN: Only main answer is validated
    test('should work normally for challenges without alternatives', async () => {
      render(
        <TestWrapper>
          <BuzzGameScreen
            challengeData={mockChallengeDataWithAlternatives}
            onComplete={onCompleteMock}
            onQuit={onQuitMock}
          />
        </TestWrapper>
      );

      // Submit first two challenges to reach third challenge (no alternatives)
      // Challenge 1: PITCH - has alternatives, so full word input
      let inputs = screen.getAllByRole('textbox');
      expect(inputs).toHaveLength(5); // 5-letter word, full input when alternatives exist
      fireEvent.change(inputs[0], { target: { value: 'P' } });
      fireEvent.change(inputs[1], { target: { value: 'I' } });
      fireEvent.change(inputs[2], { target: { value: 'T' } });
      fireEvent.change(inputs[3], { target: { value: 'C' } });
      fireEvent.change(inputs[4], { target: { value: 'H' } });

      let submitButton = screen.getByRole('button', { name: /submit/i });
      fireEvent.click(submitButton);

      // Wait for feedback modal to appear
      await waitFor(() => {
        expect(screen.getByText(/correct/i)).toBeInTheDocument();
      });

      // Mock modal closes immediately (50ms), wait for Challenge 2 to render
      await waitFor(() => {
        inputs = screen.getAllByRole('textbox');
        expect(inputs).toHaveLength(4); // Challenge 2: PARK (4-letter word with alternatives)
      });
      fireEvent.change(inputs[0], { target: { value: 'P' } });
      fireEvent.change(inputs[1], { target: { value: 'A' } });
      fireEvent.change(inputs[2], { target: { value: 'R' } });
      fireEvent.change(inputs[3], { target: { value: 'K' } });

      submitButton = screen.getByRole('button', { name: /submit/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/correct/i)).toBeInTheDocument();
      });

      // Mock modal closes immediately, wait for Challenge 3: HELLO
      await waitFor(() => {
        inputs = screen.getAllByRole('textbox');
        expect(inputs).toHaveLength(4); // 5-letter word - 1 pre-filled = 4 inputs (no alternatives)
      });
      fireEvent.change(inputs[0], { target: { value: 'E' } });
      fireEvent.change(inputs[1], { target: { value: 'L' } });
      fireEvent.change(inputs[2], { target: { value: 'L' } });
      fireEvent.change(inputs[3], { target: { value: 'O' } });

      // Submit
      submitButton = screen.getByRole('button', { name: /submit/i });
      fireEvent.click(submitButton);

      // Should show correct feedback
      await waitFor(() => {
        expect(screen.getByText(/correct/i)).toBeInTheDocument();
      });
    });
  });

  describe('Case-insensitive matching', () => {
    // GIVEN: Challenge with alternatives
    // WHEN: User submits alternative in lowercase
    // THEN: Answer is accepted
    test('should accept alternative in any case', async () => {
      render(
        <TestWrapper>
          <BuzzGameScreen
            challengeData={mockChallengeDataWithAlternatives}
            onComplete={onCompleteMock}
            onQuit={onQuitMock}
          />
        </TestWrapper>
      );

      // Fill in "raise" (lowercase alternative) - challenge has alternatives, so full word input
      const inputs = screen.getAllByRole('textbox');
      expect(inputs).toHaveLength(5); // 5-letter word, full input when alternatives exist
      fireEvent.change(inputs[0], { target: { value: 'r' } });
      fireEvent.change(inputs[1], { target: { value: 'a' } });
      fireEvent.change(inputs[2], { target: { value: 'i' } });
      fireEvent.change(inputs[3], { target: { value: 's' } });
      fireEvent.change(inputs[4], { target: { value: 'e' } });

      // Submit
      const submitButton = screen.getByRole('button', { name: /submit/i });
      fireEvent.click(submitButton);

      // Should show correct feedback
      await waitFor(() => {
        expect(screen.getByText(/correct/i)).toBeInTheDocument();
      });
    });

    // GIVEN: Challenge with alternatives
    // WHEN: User submits alternative in mixed case
    // THEN: Answer is accepted
    test('should accept alternative in mixed case', async () => {
      render(
        <TestWrapper>
          <BuzzGameScreen
            challengeData={mockChallengeDataWithAlternatives}
            onComplete={onCompleteMock}
            onQuit={onQuitMock}
          />
        </TestWrapper>
      );

      // Fill in "RaIsE" (mixed case alternative) - challenge has alternatives, so full word input
      const inputs = screen.getAllByRole('textbox');
      expect(inputs).toHaveLength(5); // 5-letter word, full input when alternatives exist
      fireEvent.change(inputs[0], { target: { value: 'R' } });
      fireEvent.change(inputs[1], { target: { value: 'a' } });
      fireEvent.change(inputs[2], { target: { value: 'I' } });
      fireEvent.change(inputs[3], { target: { value: 's' } });
      fireEvent.change(inputs[4], { target: { value: 'E' } });

      // Submit
      const submitButton = screen.getByRole('button', { name: /submit/i });
      fireEvent.click(submitButton);

      // Should show correct feedback
      await waitFor(() => {
        expect(screen.getByText(/correct/i)).toBeInTheDocument();
      });
    });
  });

  describe('Scoring with alternatives', () => {
    // GIVEN: Challenge with alternatives
    // WHEN: User submits alternative answer
    // THEN: Same points awarded as main answer
    test('should award same points for alternative as main answer', async () => {
      render(
        <TestWrapper>
          <BuzzGameScreen
            challengeData={mockChallengeDataWithAlternatives}
            onComplete={onCompleteMock}
            onQuit={onQuitMock}
          />
        </TestWrapper>
      );

      // Fill in alternative "RAISE" - challenge has alternatives, so full word input
      const inputs = screen.getAllByRole('textbox');
      expect(inputs).toHaveLength(5); // 5-letter word, full input when alternatives exist
      fireEvent.change(inputs[0], { target: { value: 'R' } });
      fireEvent.change(inputs[1], { target: { value: 'A' } });
      fireEvent.change(inputs[2], { target: { value: 'I' } });
      fireEvent.change(inputs[3], { target: { value: 'S' } });
      fireEvent.change(inputs[4], { target: { value: 'E' } });

      // Submit
      const submitButton = screen.getByRole('button', { name: /submit/i });
      fireEvent.click(submitButton);

      // Should show correct feedback with full points (20 points)
      await waitFor(() => {
        expect(screen.getByText(/\+20/i)).toBeInTheDocument();
      });
    });

    // GIVEN: Challenge with alternatives and hint used
    // WHEN: User submits alternative answer
    // THEN: Same penalty applies as main answer
    test('should apply hint penalty for alternative answers', async () => {
      render(
        <TestWrapper>
          <BuzzGameScreen
            challengeData={mockChallengeDataWithAlternatives}
            onComplete={onCompleteMock}
            onQuit={onQuitMock}
          />
        </TestWrapper>
      );

      // Click hint button
      const hintButton = screen.getByRole('button', { name: /hint/i });
      fireEvent.click(hintButton);

      // Fill in alternative "RAISE" - challenge has alternatives, so full word input
      const inputs = screen.getAllByRole('textbox');
      expect(inputs).toHaveLength(5); // 5-letter word, full input when alternatives exist
      fireEvent.change(inputs[0], { target: { value: 'R' } });
      fireEvent.change(inputs[1], { target: { value: 'A' } });
      fireEvent.change(inputs[2], { target: { value: 'I' } });
      fireEvent.change(inputs[3], { target: { value: 'S' } });
      fireEvent.change(inputs[4], { target: { value: 'E' } });

      // Submit
      const submitButton = screen.getByRole('button', { name: /submit/i });
      fireEvent.click(submitButton);

      // Should show correct feedback with reduced points (15 points: 20 - 5 hint penalty)
      await waitFor(() => {
        expect(screen.getByText(/\+15/i)).toBeInTheDocument();
      });
    });
  });

  describe('Full game completion with alternatives', () => {
    // GIVEN: Multiple challenges with alternatives
    // WHEN: User answers using mix of main and alternative answers
    // THEN: All answers validated correctly and game completes
    test('should complete game successfully using alternative answers', async () => {
      render(
        <TestWrapper>
          <BuzzGameScreen
            challengeData={mockChallengeDataWithAlternatives}
            onComplete={onCompleteMock}
            onQuit={onQuitMock}
          />
        </TestWrapper>
      );

      // Challenge 1: Use alternative "RAISE" - has alternatives, so full word input
      let inputs = screen.getAllByRole('textbox');
      expect(inputs).toHaveLength(5); // 5-letter word, full input when alternatives exist
      fireEvent.change(inputs[0], { target: { value: 'R' } });
      fireEvent.change(inputs[1], { target: { value: 'A' } });
      fireEvent.change(inputs[2], { target: { value: 'I' } });
      fireEvent.change(inputs[3], { target: { value: 'S' } });
      fireEvent.change(inputs[4], { target: { value: 'E' } });
      let submitButton = screen.getByRole('button', { name: /submit/i });
      fireEvent.click(submitButton);

      // Wait for feedback modal
      await waitFor(() => {
        expect(screen.getByText(/correct/i)).toBeInTheDocument();
      });

      // Mock modal closes immediately, wait for Challenge 2: STOP
      await waitFor(() => {
        inputs = screen.getAllByRole('textbox');
        expect(inputs).toHaveLength(4); // 4-letter word, full input when alternatives exist
      });
      fireEvent.change(inputs[0], { target: { value: 'S' } });
      fireEvent.change(inputs[1], { target: { value: 'T' } });
      fireEvent.change(inputs[2], { target: { value: 'O' } });
      fireEvent.change(inputs[3], { target: { value: 'P' } });
      submitButton = screen.getByRole('button', { name: /submit/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/correct/i)).toBeInTheDocument();
      });

      // Wait for modal to disappear completely (auto-close + exit animation)
      await waitFor(() => {
        expect(screen.queryByText(/correct/i)).not.toBeInTheDocument();
      }, { timeout: 3000 });

      // Challenge 3: Use main answer "HELLO" - NO alternatives, so first letter H is pre-filled, fill E-L-L-O
      await waitFor(() => {
        inputs = screen.getAllByRole('textbox');
        expect(inputs).toHaveLength(4); // 5-letter word - 1 pre-filled = 4 inputs (no alternatives)
      });
      fireEvent.change(inputs[0], { target: { value: 'E' } });
      fireEvent.change(inputs[1], { target: { value: 'L' } });
      fireEvent.change(inputs[2], { target: { value: 'L' } });
      fireEvent.change(inputs[3], { target: { value: 'O' } });
      submitButton = screen.getByRole('button', { name: /submit/i });
      fireEvent.click(submitButton);

      // Should complete game (feedback modal closes and onComplete is called)
      await waitFor(() => {
        expect(onCompleteMock).toHaveBeenCalled();
        const result = onCompleteMock.mock.calls[0][0];
        expect(result.challengesSolved).toHaveLength(3);
        // All should be marked correct
        expect(result.challengesSolved.every((c: { correct: boolean }) => c.correct)).toBe(true);
        // User answers should be the alternatives we submitted
        expect(result.challengesSolved[0].userAnswer).toBe('RAISE');
        expect(result.challengesSolved[1].userAnswer).toBe('STOP');
        expect(result.challengesSolved[2].userAnswer).toBe('HELLO');
      });
    });
  });
});
