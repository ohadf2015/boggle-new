'use client';

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DesktopWordsRail } from '../components/DesktopWordsRail';

vi.mock('../components/GameWordList', () => ({
  GameWordList: ({ foundWords }: { foundWords: unknown[] }) => (
    <div data-testid="game-word-list">{foundWords.length}</div>
  ),
}));

const t = (key: string) => key;
const words = [
  { word: 'cat', score: 3 },
  { word: 'tact', score: 4 },
  { word: 'actor', score: 5 },
] as never[];

describe('DesktopWordsRail', () => {
  it('fills the rail height on lg so it reads as a full column', () => {
    render(<DesktopWordsRail foundWords={[]} minWordLength={3} t={t} />);
    const rail = screen.getByTestId('desktop-rail-words');
    expect(rail.className).toContain('lg:self-stretch');
    expect(rail.className).toContain('hidden');
    expect(rail.className).toContain('lg:flex');
  });

  it('shows the running found-word count next to the heading', () => {
    render(<DesktopWordsRail foundWords={words} minWordLength={3} t={t} />);
    expect(screen.getByTestId('desktop-rail-words-count').textContent).toBe('3');
  });

  it('passes the found words through to the list', () => {
    render(<DesktopWordsRail foundWords={words} minWordLength={3} t={t} />);
    expect(screen.getByTestId('game-word-list').textContent).toBe('3');
  });

  it('shows the empty hint when no word is found yet', () => {
    render(<DesktopWordsRail foundWords={[]} minWordLength={3} t={t} />);
    expect(screen.getByText('playerView.swipeHintShort')).toBeTruthy();
  });
});
