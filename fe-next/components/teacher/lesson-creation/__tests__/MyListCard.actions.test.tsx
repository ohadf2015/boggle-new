import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k), language: 'en' }) }));
vi.mock('../library/AssignListDialog', () => ({
  default: ({ lessonId }: { lessonId: string | null }) => (lessonId ? <div data-testid="assign-dialog" data-lesson={lessonId} /> : null),
}));

import MyListCard from '../MyListCard';

const lesson = { id: 'L1', name: 'Physics', language: 'en', words: [{ word: 'photon' }, { word: 'orbit' }], is_public: false } as never;
const handlers = { onHost: vi.fn(), onPractice: vi.fn(), onResults: vi.fn(), onEdit: vi.fn(), onToggleShare: vi.fn() };
const renderCard = (props: Partial<Parameters<typeof MyListCard>[0]> = {}) =>
  render(<MyListCard lesson={lesson} index={0} sharing={false} {...handlers} {...props} />);
const openMenu = () => userEvent.click(screen.getByTestId('lesson-menu-L1'));

describe('MyListCard face', () => {
  beforeEach(() => vi.clearAllMocks());

  it('Given a list, Then the card has three controls: the name, Start a game and the menu', () => {
    renderCard();
    const controls = within(screen.getByTestId('my-list-L1')).getAllByRole('button');
    expect(controls.map((c) => c.getAttribute('data-testid'))).toEqual(['lesson-open-L1', 'lesson-menu-L1', 'lesson-host-L1']);
    expect(screen.getByTestId('lesson-host-L1')).toHaveTextContent('eduShell.home.startLive');
  });

  it('Given a list, Then Start is not lime, because New list is the page primary', () => {
    renderCard();
    expect(screen.getByTestId('lesson-host-L1').className).not.toMatch(/(^|\s)bg-neo-lime(\s|$)/);
  });

  it('Given a list, Then the one fact is its word count and language, with no word chips or definitions meter', () => {
    renderCard();
    const fact = screen.getByTestId('lesson-fact-L1');
    expect(fact).toHaveTextContent('eduLibrary.card.words:{"count":2}');
    expect(fact).toHaveTextContent('English');
    expect(screen.queryByTestId('word-tile')).toBeNull();
    expect(screen.getByTestId('my-list-L1')).not.toHaveTextContent('teacher.lesson.definitionCoverage');
  });

  it('Given a list given to a class, Then the fact names the class', () => {
    renderCard({ classroomName: '7B' });
    expect(within(screen.getByTestId('lesson-fact-L1')).getByTestId('lesson-classroom-L1')).toHaveTextContent('7B');
  });

  it('Given neighbouring cards, Then each keeps its own small accent on one calm surface', () => {
    const { rerender } = renderCard();
    const card = screen.getByTestId('my-list-L1');
    const first = card.getAttribute('data-accent');
    expect(card.className).toContain('bg-neo-navy-light');
    rerender(<MyListCard lesson={lesson} index={1} sharing={false} {...handlers} />);
    expect(screen.getByTestId('my-list-L1').getAttribute('data-accent')).not.toBe(first);
  });

  it('When the list name is tapped, Then the list opens', async () => {
    renderCard();
    await userEvent.click(screen.getByTestId('lesson-open-L1'));
    expect(handlers.onEdit).toHaveBeenCalledTimes(1);
  });

  it('When Start is tapped, Then the game starts', async () => {
    renderCard();
    await userEvent.click(screen.getByTestId('lesson-host-L1'));
    expect(handlers.onHost).toHaveBeenCalledTimes(1);
  });
});

describe('MyListCard menu', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ['lesson-edit-L1', 'onEdit'],
    ['lesson-practice-L1', 'onPractice'],
    ['lesson-results-L1', 'onResults'],
    ['lesson-share-L1', 'onToggleShare'],
  ] as const)('When %s is picked, Then %s runs', async (id, handler) => {
    renderCard();
    expect(screen.queryByTestId(id)).toBeNull();
    await openMenu();
    await userEvent.click(screen.getByTestId(id));
    expect(handlers[handler]).toHaveBeenCalledTimes(1);
  });

  it('When Assign practice is picked, Then the assign flow opens for this list', async () => {
    renderCard();
    expect(screen.queryByTestId('assign-dialog')).toBeNull();
    await openMenu();
    await userEvent.click(screen.getByTestId('lesson-assign-L1'));
    expect(screen.getByTestId('assign-dialog')).toHaveAttribute('data-lesson', 'L1');
  });

  it('Given a shared list, Then the share item reads as checked', async () => {
    renderCard({ lesson: { ...(lesson as object), is_public: true } as never });
    await openMenu();
    const share = screen.getByTestId('lesson-share-L1');
    expect(share).toHaveAttribute('role', 'menuitemcheckbox');
    expect(share).toHaveAttribute('aria-checked', 'true');
    expect(share).toHaveTextContent('eduLibrary.share.shared');
  });

  it('Given sharing is in flight, Then the share item is disabled', async () => {
    renderCard({ sharing: true });
    await openMenu();
    expect(screen.getByTestId('lesson-share-L1')).toHaveAttribute('aria-disabled', 'true');
  });
});
