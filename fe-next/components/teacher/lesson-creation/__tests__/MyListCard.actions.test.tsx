import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k), language: 'en' }) }));
vi.mock('../library/AssignListDialog', () => ({
  default: ({ lessonId }: { lessonId: string | null }) => (lessonId ? <div data-testid="assign-dialog" data-lesson={lessonId} /> : null),
}));

import MyListCard from '../MyListCard';

const lesson = { id: 'L1', name: 'Physics', language: 'en', words: [{ word: 'photon' }, { word: 'orbit' }], is_public: false } as never;
const handlers = { onHost: vi.fn(), onPractice: vi.fn(), onResults: vi.fn(), onEdit: vi.fn(), onToggleShare: vi.fn() };

describe('MyListCard actions', () => {
  it('Given a list, Then its two actions are Start a game and Assign practice, in the shared words', () => {
    render(<MyListCard lesson={lesson} index={0} sharing={false} {...handlers} />);
    expect(screen.getByTestId('lesson-host-L1')).toHaveTextContent('eduShell.home.startLive');
    expect(screen.getByTestId('lesson-assign-L1')).toHaveTextContent('eduShell.home.focus.assign');
  });

  it('When Assign practice is tapped, Then the assign flow opens for this list', () => {
    render(<MyListCard lesson={lesson} index={0} sharing={false} {...handlers} />);
    expect(screen.queryByTestId('assign-dialog')).toBeNull();
    fireEvent.click(screen.getByTestId('lesson-assign-L1'));
    expect(screen.getByTestId('assign-dialog')).toHaveAttribute('data-lesson', 'L1');
  });

  it('Given the rarer actions, Then practice, results and share stay reachable as labelled icon buttons', () => {
    render(<MyListCard lesson={lesson} index={0} sharing={false} {...handlers} />);
    for (const id of ['lesson-practice-L1', 'lesson-results-L1', 'lesson-share-L1']) {
      const b = screen.getByTestId(id);
      expect(b).toHaveAttribute('aria-label');
      expect(b.textContent?.trim()).toBe('');
    }
  });
});

describe('MyListCard look', () => {
  it('Given neighbouring cards, Then each gets its own accent color', () => {
    const { rerender } = render(<MyListCard lesson={lesson} index={0} sharing={false} {...handlers} />);
    const first = screen.getByTestId('my-list-L1').getAttribute('data-accent');
    rerender(<MyListCard lesson={lesson} index={1} sharing={false} {...handlers} />);
    expect(screen.getByTestId('my-list-L1').getAttribute('data-accent')).not.toBe(first);
  });

  it('Given a list, Then its words show as separate tiles', () => {
    render(<MyListCard lesson={lesson} index={0} sharing={false} {...handlers} />);
    expect(screen.getAllByTestId('word-tile').map((n) => n.textContent)).toEqual(['photon', 'orbit']);
  });
});

describe('MyListCard open list', () => {
  it('When the list name or its words are tapped, Then the list opens', () => {
    const onEdit = vi.fn();
    render(<MyListCard lesson={lesson} index={0} sharing={false} {...handlers} onEdit={onEdit} />);
    fireEvent.click(screen.getByTestId('lesson-open-L1'));
    fireEvent.click(screen.getByTestId('lesson-words-L1'));
    expect(onEdit).toHaveBeenCalledTimes(2);
  });
});
