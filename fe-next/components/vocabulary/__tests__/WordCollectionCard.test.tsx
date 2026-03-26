import React from 'react';
import { render, screen } from '@testing-library/react';
import { WordCollectionCard } from '../WordCollectionCard';

// Mock useLanguage
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, fallback?: string | Record<string, unknown>, params?: Record<string, unknown>) => {
      const p = typeof fallback === 'object' ? fallback : params;
      const translations: Record<string, string> = {
        'vocabulary.title': 'Word Collection',
        'vocabulary.dueForReview': `${p?.count ?? 0} words due for review!`,
        'vocabulary.totalCollected': `${p?.count ?? 0} words collected`,
        'vocabulary.mastered': `${p?.count ?? 0} mastered`,
        'vocabulary.reviewNow': 'Review Now',
        'vocabulary.empty': 'Play games to discover rare words!',
      };
      return translations[key] ?? key;
    },
    language: 'en',
  }),
}));

// Mock useWordCollection
const mockUseWordCollection = vi.fn();
vi.mock('@/hooks/useWordCollection', () => ({
  useWordCollection: () => mockUseWordCollection(),
}));

describe('WordCollectionCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render empty state when no words collected', () => {
    // GIVEN
    mockUseWordCollection.mockReturnValue({
      words: [],
      dueForReview: [],
      totalCollected: 0,
      masteredCount: 0,
    });

    // WHEN
    render(<WordCollectionCard />);

    // THEN
    expect(screen.getByText('Word Collection')).toBeInTheDocument();
    expect(screen.getByText('Play games to discover rare words!')).toBeInTheDocument();
  });

  it('should show total collected count', () => {
    // GIVEN
    mockUseWordCollection.mockReturnValue({
      words: [
        { word: 'ephemeral', context: { foundInMode: 'classic', date: '2026-03-22' }, reviewData: { repetitions: 0 } },
        { word: 'quixotic', context: { foundInMode: 'blast', date: '2026-03-22' }, reviewData: { repetitions: 0 } },
      ],
      dueForReview: [],
      totalCollected: 2,
      masteredCount: 0,
    });

    // WHEN
    render(<WordCollectionCard />);

    // THEN
    expect(screen.getByText('2 words collected')).toBeInTheDocument();
  });

  it('should show due for review count with CTA', () => {
    // GIVEN
    mockUseWordCollection.mockReturnValue({
      words: [
        { word: 'ephemeral', context: { foundInMode: 'classic', date: '2026-03-22' }, reviewData: { repetitions: 0 } },
      ],
      dueForReview: ['ephemeral', 'quixotic', 'serendipity'],
      totalCollected: 5,
      masteredCount: 1,
    });

    // WHEN
    render(<WordCollectionCard />);

    // THEN
    expect(screen.getByText('3 words due for review!')).toBeInTheDocument();
    expect(screen.getByText('Review Now')).toBeInTheDocument();
  });

  it('should show mastered count', () => {
    // GIVEN
    mockUseWordCollection.mockReturnValue({
      words: [
        { word: 'tenacious', context: { foundInMode: 'classic', date: '2026-03-22' }, reviewData: { repetitions: 6 } },
      ],
      dueForReview: [],
      totalCollected: 3,
      masteredCount: 2,
    });

    // WHEN
    render(<WordCollectionCard />);

    // THEN
    expect(screen.getByText('2 mastered')).toBeInTheDocument();
  });

  it('should display recent words', () => {
    // GIVEN
    mockUseWordCollection.mockReturnValue({
      words: [
        { word: 'ephemeral', context: { foundInMode: 'classic', date: '2026-03-22' }, reviewData: { repetitions: 0 } },
        { word: 'quixotic', context: { foundInMode: 'blast', date: '2026-03-21' }, reviewData: { repetitions: 2 } },
      ],
      dueForReview: [],
      totalCollected: 2,
      masteredCount: 0,
    });

    // WHEN
    render(<WordCollectionCard />);

    // THEN
    expect(screen.getByText('ephemeral')).toBeInTheDocument();
    expect(screen.getByText('quixotic')).toBeInTheDocument();
  });

  it('should have mastery progress bar', () => {
    // GIVEN
    mockUseWordCollection.mockReturnValue({
      words: [],
      dueForReview: [],
      totalCollected: 10,
      masteredCount: 3,
    });

    // WHEN
    render(<WordCollectionCard />);

    // THEN
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveAttribute('aria-valuenow', '30');
  });

  it('should call onReviewClick when Review Now is clicked', () => {
    // GIVEN
    const onReviewClick = vi.fn();
    mockUseWordCollection.mockReturnValue({
      words: [],
      dueForReview: ['word1'],
      totalCollected: 1,
      masteredCount: 0,
    });

    // WHEN
    render(<WordCollectionCard onReviewClick={onReviewClick} />);
    screen.getByText('Review Now').click();

    // THEN
    expect(onReviewClick).toHaveBeenCalledTimes(1);
  });
});
