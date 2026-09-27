import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import PostGameWordReview from '../PostGameWordReview';

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      const translations: Record<string, string> = {
        'education.postGame.wordsYouLearned': 'Words You Learned',
        'education.postGame.found': 'Found',
        'education.postGame.wordsToLearn': 'Words to Learn',
        'education.postGame.studyTheseNext': 'Study these next!',
        'education.postGame.practiceTheseWords': 'Practice These Words',
        'education.postGame.vocabScore': `You found ${params?.found ?? ''} of ${params?.total ?? ''} vocabulary words!`,
      };
      return translations[key] || key;
    },
  }),
}));

// Mock framer-motion — must use inline functions (vi.mock is hoisted)
vi.mock('framer-motion', async () => {
  const React = await import('react');
  const MockDiv = React.forwardRef(function MockDiv({ children, ...props }: any, ref: any) {
    return React.createElement('div', { ...props, ref }, children);
  });
  const MockButton = React.forwardRef(function MockButton({ children, ...props }: any, ref: any) {
    return React.createElement('button', { ...props, ref }, children);
  });
  const MockSpan = React.forwardRef(function MockSpan({ children, ...props }: any, ref: any) {
    return React.createElement('span', { ...props, ref }, children);
  });
  return {
    m: { div: MockDiv, button: MockButton, span: MockSpan },
    AnimatePresence: ({ children }: any) => children,
  };
});

const defaultProps = {
  vocabularyWords: ['apple', 'banana', 'cherry', 'date', 'elderberry'],
  wordsFound: ['apple', 'cherry'],
  lessonId: 'lesson-123',
  onPractice: vi.fn(),
};

describe('PostGameWordReview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the header with words you learned title', () => {
    render(<PostGameWordReview {...defaultProps} />);
    expect(screen.getByText('Words You Learned')).toBeInTheDocument();
  });

  it('displays vocab score with correct counts', () => {
    render(<PostGameWordReview {...defaultProps} />);
    expect(screen.getByText('You found 2 of 5 vocabulary words!')).toBeInTheDocument();
  });

  it('renders found words with check indicators', () => {
    render(<PostGameWordReview {...defaultProps} />);
    expect(screen.getByText('apple')).toBeInTheDocument();
    expect(screen.getByText('cherry')).toBeInTheDocument();
  });

  it('renders missed words section', () => {
    render(<PostGameWordReview {...defaultProps} />);
    expect(screen.getByText('banana')).toBeInTheDocument();
    expect(screen.getByText('date')).toBeInTheDocument();
    expect(screen.getByText('elderberry')).toBeInTheDocument();
  });

  it('shows found section label', () => {
    render(<PostGameWordReview {...defaultProps} />);
    expect(screen.getByText('Found')).toBeInTheDocument();
  });

  it('shows words to learn section label', () => {
    render(<PostGameWordReview {...defaultProps} />);
    expect(screen.getByText('Words to Learn')).toBeInTheDocument();
  });

  it('calls onPractice when practice button is clicked', () => {
    render(<PostGameWordReview {...defaultProps} />);
    const button = screen.getByText('Practice These Words');
    fireEvent.click(button);
    expect(defaultProps.onPractice).toHaveBeenCalledTimes(1);
  });

  it('handles case when all words are found', () => {
    render(
      <PostGameWordReview
        {...defaultProps}
        wordsFound={['apple', 'banana', 'cherry', 'date', 'elderberry']}
      />
    );
    expect(screen.getByText('You found 5 of 5 vocabulary words!')).toBeInTheDocument();
  });

  it('handles case when no words are found', () => {
    render(<PostGameWordReview {...defaultProps} wordsFound={[]} />);
    expect(screen.getByText('You found 0 of 5 vocabulary words!')).toBeInTheDocument();
  });

  it('handles case-insensitive word matching', () => {
    render(
      <PostGameWordReview
        {...defaultProps}
        wordsFound={['APPLE', 'Cherry']}
      />
    );
    // apple and cherry should be in found section
    expect(screen.getByText('You found 2 of 5 vocabulary words!')).toBeInTheDocument();
  });

  it('renders with neo-brutalist styling classes', () => {
    const { container } = render(<PostGameWordReview {...defaultProps} />);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('border-neo');
    expect(card.className).toContain('shadow-hard-lg');
  });
});
