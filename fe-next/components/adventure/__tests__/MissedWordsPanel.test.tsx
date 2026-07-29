/**
 * MissedWordsPanel Tests
 *
 * Tests for the panel that shows words the player missed on the board
 * after completing a level.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MissedWordsPanel } from '../MissedWordsPanel';

vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
    li: ({ children, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
      <li {...props}>{children}</li>
    ),
  },
  AdaptiveAnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string, params?: Record<string, string | number>) => {
    if (params?.count !== undefined) return `${key}:${params.count}`;
    return key;
  }}),
}));

const sampleWords = ['STAR', 'STONE', 'STARS', 'TONE', 'NOTES'];

describe('MissedWordsPanel', () => {
  it('renders nothing when missedWords is empty', () => {
    const { container } = render(
      <MissedWordsPanel missedWords={[]} foundWords={sampleWords} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when all words found (missedWords empty)', () => {
    const { container } = render(
      <MissedWordsPanel missedWords={[]} foundWords={sampleWords} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders panel when there are missed words', () => {
    render(
      <MissedWordsPanel missedWords={['STAR', 'STONE']} foundWords={['TONE']} />
    );
    expect(screen.getByTestId('missed-words-panel')).toBeInTheDocument();
  });

  it('shows section heading', () => {
    render(
      <MissedWordsPanel missedWords={['STAR']} foundWords={['TONE']} />
    );
    expect(screen.getByText('adventure.game.wordsYouMissed')).toBeInTheDocument();
  });

  it('shows missed word count', () => {
    render(
      <MissedWordsPanel missedWords={['STAR', 'STONE']} foundWords={['TONE']} />
    );
    expect(screen.getByText(/adventure\.game\.missedWordsSummary/)).toBeInTheDocument();
  });

  it('shows up to 8 missed words in collapsed state', () => {
    const missed = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    render(<MissedWordsPanel missedWords={missed} foundWords={[]} />);
    // Should show max 8 words initially
    const wordChips = screen.getAllByTestId('missed-word-chip');
    expect(wordChips.length).toBeLessThanOrEqual(8);
  });

  it('shows a "show more" button when more than 8 words missed', () => {
    const missed = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    render(<MissedWordsPanel missedWords={missed} foundWords={[]} />);
    expect(screen.getByTestId('missed-words-show-more')).toBeInTheDocument();
  });

  it('does not show "show more" button when 8 or fewer words missed', () => {
    const missed = ['STAR', 'STONE', 'TONE'];
    render(<MissedWordsPanel missedWords={missed} foundWords={[]} />);
    expect(screen.queryByTestId('missed-words-show-more')).not.toBeInTheDocument();
  });

  it('expands to show all words when show more is clicked', () => {
    const missed = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    render(<MissedWordsPanel missedWords={missed} foundWords={[]} />);
    fireEvent.click(screen.getByTestId('missed-words-show-more'));
    const wordChips = screen.getAllByTestId('missed-word-chip');
    expect(wordChips.length).toBe(10);
  });

  it('displays words in uppercase', () => {
    render(<MissedWordsPanel missedWords={['star']} foundWords={[]} />);
    const chip = screen.getByTestId('missed-word-chip');
    expect(chip.textContent).toBe('STAR');
  });

  it('prioritizes longer words first', () => {
    render(
      <MissedWordsPanel missedWords={['CAT', 'STORIES', 'STONE', 'AT']} foundWords={[]} />
    );
    const chips = screen.getAllByTestId('missed-word-chip');
    // STORIES (7) should come before STONE (5) before CAT (3) before AT (2)
    expect(chips[0].textContent).toBe('STORIES');
    expect(chips[1].textContent).toBe('STONE');
  });
});
