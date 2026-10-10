import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ShellWordFeed } from '../ShellWordFeed';

const t = (key: string) => key;

describe('ShellWordFeed', () => {
  it('given no words, then it shows a ghost row and the empty copy instead of a void', () => {
    render(<ShellWordFeed words={[]} t={t} />);
    expect(screen.getByTestId('shell-words-empty')).toBeTruthy();
    expect(screen.getByText('gameShell.wordsEmptyTitle')).toBeTruthy();
    expect(screen.getByTestId('shell-words-count').textContent).toBe('0');
  });

  it('given words in found order, then the newest sits on top as the fresh hero row', () => {
    render(
      <ShellWordFeed
        words={[
          { word: 'cat', score: 3 },
          { word: 'tact', score: 5 },
          { word: 'actor', score: 8 },
        ]}
        t={t}
      />,
    );
    const rows = screen.getAllByTestId(/^shell-word-row-/);
    expect(rows.map((r) => r.getAttribute('data-word'))).toEqual(['actor', 'tact', 'cat']);
    expect(rows[0].getAttribute('data-fresh')).toBe('true');
    expect(rows[1].getAttribute('data-fresh')).toBe('false');
    expect(within(rows[0]).getByText('+8')).toBeTruthy();
  });

  it('counts the words and totals their points in the header', () => {
    render(
      <ShellWordFeed
        words={[
          { word: 'cat', score: 3 },
          { word: 'actor', score: 8 },
        ]}
        t={t}
      />,
    );
    expect(screen.getByTestId('shell-words-count').textContent).toBe('2');
    expect(screen.getByTestId('shell-words-points').textContent).toBe('11');
  });

  it('omits the points pill for modes that score by tiles, not by word', () => {
    render(<ShellWordFeed words={[{ word: 'blast' }]} t={t} />);
    const row = screen.getByTestId('shell-word-row-blast');
    expect(row.textContent).not.toContain('+');
    expect(screen.queryByTestId('shell-words-points')).toBeNull();
  });

  it('renders each word whole, never as per-letter tiles a drag rig could mistake for the board', () => {
    const { container } = render(<ShellWordFeed words={[{ word: 'cat', score: 3 }, { word: 'tea', score: 3 }]} t={t} />);
    const leaves = Array.from(container.querySelectorAll('span,div,button')).filter((e) => e.children.length === 0);
    expect(leaves.some((e) => /^[A-Za-z]$/.test((e.textContent ?? '').trim()))).toBe(false);
  });
});
