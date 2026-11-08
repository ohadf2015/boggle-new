/**
 * Seen on a Hebrew phone (Nov 7): the counts ran together ("4 חדשות4 אסופות")
 * because the gap was a physical right margin, and the best word's tiles were
 * forced left-to-right, so a Hebrew word read backwards.
 */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QuickWordsCollected } from '../QuickWordsCollected';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, _f?: string, p?: Record<string, string>) => `${k}:${p?.count ?? ''}` }),
}));
vi.mock('../QuickWordsDetailDialog', () => ({ QuickWordsDetailDialog: () => null }));

describe('QuickWordsCollected in right-to-left', () => {
  const words = [
    { word: 'שלום', score: 30, isNew: true },
    { word: 'בית', score: 10, isNew: false },
  ];

  it('separates the new count from the total with a logical (start/end) gap', () => {
    render(<QuickWordsCollected words={words} collectionTotal={4} />);
    const neu = screen.getByTestId('quick-words-new-count');
    expect(neu.className).toContain('me-2');
    expect(neu.className).not.toContain('mr-2');
  });

  it("lets the best word's tiles follow the word's own direction", () => {
    render(<QuickWordsCollected words={words} collectionTotal={4} />);
    const tiles = screen.getByTestId('quick-best-word').nextElementSibling as HTMLElement;
    expect(tiles.getAttribute('dir')).toBe('auto');
  });
});
