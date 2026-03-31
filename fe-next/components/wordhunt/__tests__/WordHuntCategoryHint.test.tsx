import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { WordHuntCategoryHint } from '../WordHuntCategoryHint';

// Mock useLanguage
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, opts?: Record<string, string | number>) => {
      if (key === 'wordHunt.categoryHint') {
        return `Find a ${opts?.length}-letter ${opts?.category}`;
      }
      if (key === 'wordHunt.categoryHintGeneric') {
        return `Find a ${opts?.length}-letter word`;
      }
      return key;
    },
    language: 'en',
  }),
}));

beforeEach(() => {
  vi.useFakeTimers();
});

describe('WordHuntCategoryHint', () => {
  it('renders category hint with emoji when category is provided', () => {
    render(<WordHuntCategoryHint targetLength={4} targetCategory="animals" />);
    expect(screen.getByText(/Find a 4-letter animal/)).toBeTruthy();
    expect(screen.getByText('\uD83D\uDC3E')).toBeTruthy(); // 🐾
  });

  it('renders nothing when no category', () => {
    const { container } = render(<WordHuntCategoryHint targetLength={4} targetCategory={null} />);
    expect(container.querySelector('[data-testid="category-hint"]')).toBeNull();
  });

  it('renders food category with correct emoji', () => {
    render(<WordHuntCategoryHint targetLength={5} targetCategory="food" />);
    expect(screen.getByText(/Find a 5-letter food item/)).toBeTruthy();
    expect(screen.getByText('\uD83C\uDF7D\uFE0F')).toBeTruthy(); // 🍽️
  });

  it('collapses to emoji-only after 10 seconds', () => {
    render(<WordHuntCategoryHint targetLength={4} targetCategory="animals" />);
    // Full text visible initially
    expect(screen.getByText(/Find a 4-letter animal/)).toBeTruthy();

    // Advance past fade delay
    act(() => { vi.advanceTimersByTime(10_001); });

    // Now should show emoji button only
    const btn = screen.getByTestId('category-hint');
    expect(btn.tagName).toBe('BUTTON');
    expect(btn.textContent).toBe('\uD83D\uDC3E');
  });

  it('renders inline (span, no card wrapper)', () => {
    const { container } = render(
      <WordHuntCategoryHint targetLength={4} targetCategory="animals" />
    );
    const hint = container.querySelector('[data-testid="category-hint"]');
    expect(hint?.tagName).toBe('SPAN');
  });

  it('renders all 10 categories without error', () => {
    const categories = [
      'animals', 'food', 'nature', 'objects', 'actions',
      'colors', 'body', 'clothes', 'home', 'weather',
    ];
    for (const cat of categories) {
      const { unmount } = render(
        <WordHuntCategoryHint targetLength={4} targetCategory={cat} />
      );
      expect(screen.getByTestId('category-hint')).toBeTruthy();
      unmount();
    }
  });

  it('returns null when collapsed with no category', () => {
    const { container } = render(
      <WordHuntCategoryHint targetLength={4} targetCategory={null} />
    );
    act(() => { vi.advanceTimersByTime(10_001); });
    expect(container.querySelector('[data-testid="category-hint"]')).toBeNull();
  });
});
