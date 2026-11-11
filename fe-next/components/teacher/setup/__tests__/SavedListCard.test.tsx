import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SavedListCard } from '../SavedListCard';

const t = (key: string, p?: Record<string, string | number>) => (p ? `${key}:${JSON.stringify(p)}` : key);
const words = Array.from({ length: 15 }, (_, i) => `word${i + 1}`);

describe('SavedListCard', () => {
  it('Given the saved list, Then its name, word count and the words as chips show, with no paste box', () => {
    render(<SavedListCard list={{ status: 'ready', name: 'Physics unit', words: words.slice(0, 5) }} onChangeWords={vi.fn()} t={t} />);
    expect(screen.getByTestId('saved-list-name')).toHaveTextContent('Physics unit');
    expect(screen.getByTestId('saved-list-count')).toHaveTextContent('eduShell.setup.words.count:{"count":5}');
    expect(screen.getAllByTestId('saved-list-chip').map((c) => c.textContent)).toEqual(words.slice(0, 5));
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('Given a long list, Then the first 12 words show as chips and the rest as one "+N more" chip', () => {
    render(<SavedListCard list={{ status: 'ready', name: 'Long', words }} onChangeWords={vi.fn()} t={t} />);
    expect(screen.getAllByTestId('saved-list-chip')).toHaveLength(12);
    expect(screen.getByTestId('saved-list-more')).toHaveTextContent('teacher.weekInsight.more:{"count":3}');
  });

  it('When the teacher taps change words, Then the change handler runs', () => {
    const onChangeWords = vi.fn();
    render(<SavedListCard list={{ status: 'ready', name: 'Physics unit', words }} onChangeWords={onChangeWords} t={t} />);
    fireEvent.click(screen.getByTestId('saved-list-change'));
    expect(onChangeWords).toHaveBeenCalledTimes(1);
  });

  it('Given the list is still loading, Then a busy placeholder shows and never an empty paste box', () => {
    render(<SavedListCard list={{ status: 'loading' }} onChangeWords={vi.fn()} t={t} />);
    expect(screen.getByTestId('saved-list-card')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByTestId('saved-list-chip')).toBeNull();
  });
});
