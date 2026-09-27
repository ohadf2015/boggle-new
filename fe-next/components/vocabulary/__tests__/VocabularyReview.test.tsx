import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { VocabularyReview } from '../VocabularyReview';

// Mock useLanguage
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'vocabulary.iKnowIt': 'I know it',
        'vocabulary.somewhat': 'Somewhat',
        'vocabulary.forgot': 'Forgot',
        'vocabulary.reviewComplete': 'Review complete!',
        'vocabulary.title': 'Word Collection',
      };
      return translations[key] ?? key;
    },
    language: 'en',
  }),
}));

const mockWords = [
  {
    word: 'ephemeral',
    context: { foundInMode: 'classic', date: '2026-03-22' },
    reviewData: {
      word: 'ephemeral',
      easeFactor: 2.5,
      interval: 1,
      repetitions: 0,
      nextReviewDate: '2026-03-22',
      lastReviewDate: '2026-03-22',
    },
  },
  {
    word: 'quixotic',
    context: { foundInMode: 'blast', date: '2026-03-21' },
    reviewData: {
      word: 'quixotic',
      easeFactor: 2.5,
      interval: 1,
      repetitions: 1,
      nextReviewDate: '2026-03-22',
      lastReviewDate: '2026-03-21',
    },
  },
];

describe('VocabularyReview', () => {
  const defaultProps = {
    words: mockWords,
    onReview: vi.fn(),
    onComplete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show the first word for review', () => {
    // GIVEN/WHEN
    render(<VocabularyReview {...defaultProps} />);

    // THEN
    expect(screen.getByText('ephemeral')).toBeInTheDocument();
  });

  it('should show three review buttons', () => {
    // GIVEN/WHEN
    render(<VocabularyReview {...defaultProps} />);

    // THEN
    expect(screen.getByText('I know it')).toBeInTheDocument();
    expect(screen.getByText('Somewhat')).toBeInTheDocument();
    expect(screen.getByText('Forgot')).toBeInTheDocument();
  });

  it('should call onReview with quality 5 when "I know it" is clicked', () => {
    // GIVEN
    render(<VocabularyReview {...defaultProps} />);

    // WHEN
    fireEvent.click(screen.getByText('I know it'));

    // THEN
    expect(defaultProps.onReview).toHaveBeenCalledWith('ephemeral', 5);
  });

  it('should call onReview with quality 3 when "Somewhat" is clicked', () => {
    // GIVEN
    render(<VocabularyReview {...defaultProps} />);

    // WHEN
    fireEvent.click(screen.getByText('Somewhat'));

    // THEN
    expect(defaultProps.onReview).toHaveBeenCalledWith('ephemeral', 3);
  });

  it('should call onReview with quality 0 when "Forgot" is clicked', () => {
    // GIVEN
    render(<VocabularyReview {...defaultProps} />);

    // WHEN
    fireEvent.click(screen.getByText('Forgot'));

    // THEN
    expect(defaultProps.onReview).toHaveBeenCalledWith('ephemeral', 0);
  });

  it('should advance to next word after answering', () => {
    // GIVEN
    render(<VocabularyReview {...defaultProps} />);

    // WHEN: answer first word
    fireEvent.click(screen.getByText('I know it'));

    // THEN: should show second word
    expect(screen.getByText('quixotic')).toBeInTheDocument();
  });

  it('should show completion screen after all words reviewed', () => {
    // GIVEN
    render(<VocabularyReview {...defaultProps} />);

    // WHEN: review all words
    fireEvent.click(screen.getByText('I know it')); // ephemeral
    fireEvent.click(screen.getByText('Somewhat'));   // quixotic

    // THEN
    expect(screen.getByText('Review complete!')).toBeInTheDocument();
    expect(defaultProps.onComplete).toHaveBeenCalledTimes(1);
  });

  it('should show progress indicator', () => {
    // GIVEN/WHEN
    render(<VocabularyReview {...defaultProps} />);

    // THEN: should show "1 / 2"
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });

  it('should handle empty words list', () => {
    // GIVEN/WHEN
    render(<VocabularyReview {...defaultProps} words={[]} />);

    // THEN
    expect(screen.getByText('Review complete!')).toBeInTheDocument();
  });
});
