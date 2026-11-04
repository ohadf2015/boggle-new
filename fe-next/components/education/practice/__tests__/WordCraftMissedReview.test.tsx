import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) => (params ? `${key}(${Object.values(params).join(',')})` : key),
    language: 'he',
  }),
}));

import WordCraftMissedReview from '../WordCraftMissedReview';

describe('WordCraftMissedReview', () => {
  it('links to the review of this lesson and counts the missed words', () => {
    render(<WordCraftMissedReview lessonId="L1" missed={['bird', 'fish']} />);
    const link = screen.getByTestId('wordcraft-missed-review');
    expect(link.getAttribute('href')).toBe('/he/student/review?lesson=L1');
    expect(link.textContent).toContain('wordcraftReview.cta(2)');
  });

  it('previews the first words and folds the rest into a count', () => {
    render(<WordCraftMissedReview lessonId="L1" missed={['a1', 'b2', 'c3', 'd4', 'e5']} />);
    const chips = screen.getAllByTestId('wordcraft-missed-word');
    expect(chips.map((c) => c.textContent)).toEqual(['a1', 'b2', 'c3']);
    expect(screen.getByTestId('wordcraft-missed-more').textContent).toBe('+2');
  });

  it('renders nothing when every lesson word was built', () => {
    const { container } = render(<WordCraftMissedReview lessonId="L1" missed={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
