import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BlastLevelCompleteCard } from '../BlastLevelCompleteCard';

// GSAP touches the DOM in an effect; jsdom is fine with it, but stub matchMedia
// to "reduced motion" so the timeline early-returns and the static markup is
// what we assert against.
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
  coins: 120,
  modeColor: '#00FFFF',
  levelNumber: 7,
  themeWordCount: 4,
  wordsFound: 4,
  stars: 3,
  onNext: vi.fn(),
};

describe('BlastLevelCompleteCard (trimmed)', () => {
  it('renders the stars as the hero, with the right filled count', () => {
    render(<BlastLevelCompleteCard {...baseProps} stars={2} />);
    const stars = screen.getByTestId('complete-stars');
    const filled = stars.querySelectorAll('[data-star-filled="true"]');
    expect(filled.length).toBe(2);
  });

  it('shows the coin reward', () => {
    render(<BlastLevelCompleteCard {...baseProps} coins={120} />);
    expect(screen.getByTestId('complete-coins').textContent).toContain('120');
  });

  it('celebrates discovered bonus words when there are any', () => {
    render(<BlastLevelCompleteCard {...baseProps} bonusWordsFound={3} />);
    const pill = screen.getByTestId('complete-bonus');
    expect(pill.textContent).toContain('3');
  });

  it('hides the bonus stat when no bonus words were found', () => {
    render(<BlastLevelCompleteCard {...baseProps} bonusWordsFound={0} />);
    expect(screen.queryByTestId('complete-bonus')).not.toBeInTheDocument();
  });

  it('drops the noisy six-tile stat grid (no time/cascade/gem/chain tiles)', () => {
    const { container } = render(
      <BlastLevelCompleteCard
        {...baseProps}
        cascadeCount={4}
        timeSeconds={42}
        gemsCollected={5}
        bestChainDepth={3}
      />,
    );
    expect(container.querySelector('[data-stat="time"]')).toBeNull();
    expect(container.querySelector('[data-stat="cascades"]')).toBeNull();
    expect(container.querySelector('[data-stat="gems"]')).toBeNull();
    expect(container.querySelector('[data-stat="chain"]')).toBeNull();
  });

  it('drops the full found-words chip list (it just repeats the board)', () => {
    render(<BlastLevelCompleteCard {...baseProps} wordsFoundList={['CAT', 'SUN', 'EGG', 'DOG']} />);
    expect(screen.queryByTestId('complete-words-list')).not.toBeInTheDocument();
  });

  it('renders the Next CTA', () => {
    render(<BlastLevelCompleteCard {...baseProps} />);
    expect(screen.getByTestId('next-btn')).toBeInTheDocument();
  });

  it('shows a personal-best stars indicator when provided', () => {
    render(<BlastLevelCompleteCard {...baseProps} stars={2} bestStars={3} />);
    expect(screen.getByTestId('complete-best')).toBeInTheDocument();
  });

  it('flags a NEW BEST when this run beats the stored best', () => {
    render(<BlastLevelCompleteCard {...baseProps} stars={3} bestStars={3} isNewBest />);
    expect(screen.getByTestId('complete-newbest')).toBeInTheDocument();
  });

  describe('chest progression insight', () => {
    it('surfaces chest fill % and the gain earned this level', () => {
      render(<BlastLevelCompleteCard {...baseProps} chestProgress={0.6} chestProgressGain={0.2} chestNumber={3} />);
      const chest = screen.getByTestId('complete-chest');
      expect(chest).toHaveAttribute('data-chest-pct', '60');
      expect(chest.textContent).toContain('60%');
      expect(chest.textContent).toContain('+20%'); // the delta from THIS level
    });

    it('shows a "ready to open" callout when the chest is full', () => {
      render(<BlastLevelCompleteCard {...baseProps} chestProgress={1} chestProgressGain={0.1} />);
      expect(screen.getByTestId('complete-chest-ready')).toBeInTheDocument();
    });

    it('omits the chest block entirely when no chest data is provided', () => {
      render(<BlastLevelCompleteCard {...baseProps} />);
      expect(screen.queryByTestId('complete-chest')).not.toBeInTheDocument();
    });
  });
});
