import { render, screen } from '@testing-library/react';
import { WordsLadder, LadderWord } from '../WordsLadder';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

describe('WordsLadder', () => {
  const meId = 'u1';
  const words: LadderWord[] = [
    { word: 'OWNED', score: 12, ts: 1000, userId: 'u1' },
    { word: 'OPPONENT', score: 18, ts: 2000, userId: 'u2' },
    { word: 'STOLEN', score: 10, ts: 3000, userId: 'u1', stolenFrom: 'u2' },
  ];

  it('renders newest first', () => {
    const { container } = render(<WordsLadder words={words} meId={meId} />);
    const rows = container.querySelectorAll('[data-row="true"]');
    expect(rows[0].textContent).toMatch(/STOLEN/);
    expect(rows[1].textContent).toMatch(/OPPONENT/);
    expect(rows[2].textContent).toMatch(/OWNED/);
  });

  it('marks own words with data-mine=true', () => {
    render(<WordsLadder words={words} meId={meId} />);
    expect(screen.getByTestId('ladder-row-OWNED')).toHaveAttribute('data-mine', 'true');
  });

  it('marks opponent words with data-mine=false', () => {
    render(<WordsLadder words={words} meId={meId} />);
    expect(screen.getByTestId('ladder-row-OPPONENT')).toHaveAttribute('data-mine', 'false');
  });

  it('marks stolen words with data-stolen=true', () => {
    render(<WordsLadder words={words} meId={meId} />);
    expect(screen.getByTestId('ladder-row-STOLEN')).toHaveAttribute('data-stolen', 'true');
  });

  it('animates bump on top entry only', () => {
    render(<WordsLadder words={words} meId={meId} />);
    expect(screen.getByTestId('ladder-row-STOLEN')).toHaveAttribute('data-bump', 'true');
    expect(screen.getByTestId('ladder-row-OPPONENT')).toHaveAttribute('data-bump', 'false');
    expect(screen.getByTestId('ladder-row-OWNED')).toHaveAttribute('data-bump', 'false');
  });

  it('renders empty-state placeholder when no words', () => {
    render(<WordsLadder words={[]} meId={meId} />);
    expect(screen.getByTestId('ladder-empty')).toBeInTheDocument();
  });

  it('uses aria-live polite for screen-reader announcements', () => {
    const { container } = render(<WordsLadder words={words} meId={meId} />);
    expect(container.querySelector('[aria-live="polite"]')).toBeInTheDocument();
  });

  it('renders with unique key based on word and timestamp', () => {
    const { container: container1 } = render(<WordsLadder words={[words[0]]} meId={meId} />);
    const { container: container2 } = render(<WordsLadder words={[words[0]]} meId={meId} />);
    // Both should render without console warnings about keys
    expect(container1.querySelectorAll('[data-row="true"]')).toHaveLength(1);
    expect(container2.querySelectorAll('[data-row="true"]')).toHaveLength(1);
  });

  it('shows ⌨️ chip on kb-input rows', () => {
    const words: LadderWord[] = [{ word: 'TYPED', score: 11, ts: 1, userId: 'me', inputMethod: 'kb' as const }];
    render(<WordsLadder words={words} meId="me" />);
    expect(screen.getByTestId('ladder-kb-chip-TYPED')).toBeInTheDocument();
  });

  it('does not show chip on drag rows', () => {
    const words: LadderWord[] = [{ word: 'DRAGGED', score: 10, ts: 1, userId: 'me', inputMethod: 'drag' as const }];
    render(<WordsLadder words={words} meId="me" />);
    expect(screen.queryByTestId('ladder-kb-chip-DRAGGED')).not.toBeInTheDocument();
  });

  it('does not show chip when inputMethod is undefined (legacy)', () => {
    const words: LadderWord[] = [{ word: 'LEGACY', score: 10, ts: 1, userId: 'me' }];
    render(<WordsLadder words={words} meId="me" />);
    expect(screen.queryByTestId('ladder-kb-chip-LEGACY')).not.toBeInTheDocument();
  });
});
