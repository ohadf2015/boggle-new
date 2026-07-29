import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BlastLevelFailedCard } from '../BlastLevelFailedCard';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_key: string, fallback: string) => fallback }),
}));

// GSAP entrance reads matchMedia; force reduced-motion so the timeline
// early-returns to a static, assertable DOM.
beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: q.includes('reduce'),
    media: q,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
});

const baseProps = {
  modeColor: '#00FFFF',
  levelNumber: 12,
  themeWordCount: 5,
  wordsFound: 3,
  onRetry: vi.fn(),
};

describe('BlastLevelFailedCard', () => {
  it('offers a Try Again button that calls onRetry', () => {
    const onRetry = vi.fn();
    render(<BlastLevelFailedCard {...baseProps} onRetry={onRetry} />);
    const btn = screen.getByTestId('retry-btn');
    fireEvent.click(btn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows how close the player got (words found / total)', () => {
    render(<BlastLevelFailedCard {...baseProps} wordsFound={3} themeWordCount={5} />);
    const progress = screen.getByTestId('failed-progress');
    expect(progress.textContent).toContain('3');
    expect(progress.textContent).toContain('5');
  });

  it('has NO "Next" advance button — a loss never advances', () => {
    render(<BlastLevelFailedCard {...baseProps} />);
    expect(screen.queryByTestId('next-btn')).not.toBeInTheDocument();
  });

  it('does NOT render any celebration confetti layer', () => {
    const { container } = render(<BlastLevelFailedCard {...baseProps} />);
    expect(container.querySelector('[data-testid="failed-confetti"]')).toBeNull();
  });
});
