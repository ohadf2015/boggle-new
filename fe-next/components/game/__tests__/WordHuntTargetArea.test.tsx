/**
 * WordHuntTargetArea Tests
 * Tests for target word display (blanks, feedback, submit)
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { WordHuntTargetArea } from '../WordHuntTargetArea';
import type { LetterFeedback } from '@/shared/types/game';

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'wordHunt.guessTarget': 'Guess the target word',
        'wordHunt.submit': 'Submit',
        'wordHunt.found': 'Found!',
        'wordHunt.targetLength': 'Target word has {length} letters',
      };
      return translations[key] || key;
    },
    dir: 'ltr',
  }),
}));

describe('WordHuntTargetArea', () => {
  const defaultProps = {
    targetLength: 5,
    attempts: [] as Array<{ guess: string; feedback: LetterFeedback[] }>,
    onSubmit: vi.fn(),
    found: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render blank boxes for target word length', () => {
    render(<WordHuntTargetArea {...defaultProps} />);
    const blanks = screen.getAllByTestId(/^target-blank-/);
    expect(blanks).toHaveLength(5);
  });

  it('should render input field for guessing', () => {
    render(<WordHuntTargetArea {...defaultProps} />);
    const input = screen.getByTestId('target-guess-input');
    expect(input).toBeInTheDocument();
  });

  it('should render submit button', () => {
    render(<WordHuntTargetArea {...defaultProps} />);
    const button = screen.getByTestId('target-submit-button');
    expect(button).toBeInTheDocument();
  });

  it('should call onSubmit with guess when submitted', () => {
    const onSubmit = vi.fn();
    render(<WordHuntTargetArea {...defaultProps} onSubmit={onSubmit} />);

    const input = screen.getByTestId('target-guess-input');
    fireEvent.change(input, { target: { value: 'hello' } });

    const button = screen.getByTestId('target-submit-button');
    fireEvent.click(button);

    expect(onSubmit).toHaveBeenCalledWith('hello');
  });

  it('should show previous attempts with colored feedback', () => {
    const attempts = [
      {
        guess: 'world',
        feedback: ['absent', 'absent', 'absent', 'correct', 'absent'] as LetterFeedback[],
      },
    ];

    render(<WordHuntTargetArea {...defaultProps} attempts={attempts} />);

    // Should render the attempt letters
    const attemptLetters = screen.getAllByTestId(/^attempt-0-letter-/);
    expect(attemptLetters).toHaveLength(5);
  });

  it('should apply correct color classes for feedback', () => {
    const attempts = [
      {
        guess: 'world',
        feedback: ['correct', 'present', 'absent', 'correct', 'absent'] as LetterFeedback[],
      },
    ];

    render(<WordHuntTargetArea {...defaultProps} attempts={attempts} />);

    const correctLetter = screen.getByTestId('attempt-0-letter-0');
    const presentLetter = screen.getByTestId('attempt-0-letter-1');
    const absentLetter = screen.getByTestId('attempt-0-letter-2');

    expect(correctLetter.className).toContain('bg-green');
    expect(presentLetter.className).toContain('bg-yellow');
    expect(absentLetter.className).toContain('bg-gray');
  });

  it('should disable input and submit when found is true', () => {
    render(<WordHuntTargetArea {...defaultProps} found={true} />);

    const input = screen.getByTestId('target-guess-input');
    const button = screen.getByTestId('target-submit-button');

    expect(input).toBeDisabled();
    expect(button).toBeDisabled();
  });

  it('should not submit empty guess', () => {
    const onSubmit = vi.fn();
    render(<WordHuntTargetArea {...defaultProps} onSubmit={onSubmit} />);

    const button = screen.getByTestId('target-submit-button');
    fireEvent.click(button);

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should not submit guess with wrong length', () => {
    const onSubmit = vi.fn();
    render(<WordHuntTargetArea {...defaultProps} onSubmit={onSubmit} />);

    const input = screen.getByTestId('target-guess-input');
    fireEvent.change(input, { target: { value: 'hi' } });

    const button = screen.getByTestId('target-submit-button');
    fireEvent.click(button);

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does not submit on Enter when keyCode is 229 (IME Process key)', () => {
    const onSubmit = vi.fn();
    render(<WordHuntTargetArea {...defaultProps} onSubmit={onSubmit} />);

    const input = screen.getByTestId('target-guess-input');
    fireEvent.change(input, { target: { value: 'hello' } });
    fireEvent.keyDown(input, { key: 'Enter', keyCode: 229 });

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
