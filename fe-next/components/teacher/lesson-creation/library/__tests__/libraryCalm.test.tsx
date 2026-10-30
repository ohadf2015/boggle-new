import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import type { LibraryItem } from '@/lib/education/libraryTypes';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

import LibraryCard from '../LibraryCard';
import DiscoverFilters from '../DiscoverFilters';
import ListPreviewSheet from '../ListPreviewSheet';

const COLOR_FILL = /(^|\s)bg-neo-(lime|cyan|pink|purple|orange|yellow|white|cream)(\/\d+)?(\s|$)/;
const fills = (root: ParentNode) =>
  Array.from(root.querySelectorAll<HTMLElement>('[class]')).filter((el) => COLOR_FILL.test(el.getAttribute('class') ?? ''));

const base: LibraryItem = {
  id: 'pub-1',
  source: 'verified',
  name: 'Ocean Animals',
  description: null,
  language: 'he',
  words: [{ word: 'whale' }, { word: 'squid' }],
  wordCount: 2,
  authorName: null,
  gradeBand: null,
  topic: null,
  copyCount: null,
  playCount: null,
  createdAt: null,
  isMine: false,
  remixedFrom: null,
};
const filters = { language: 'en', query: '', grade: null, topic: null, source: 'all', sort: 'popular' } as const;

afterEach(cleanup);

describe('Library calm style', () => {
  it.each([
    ['verified', { source: 'verified' as const }, 'eduLibrary.badge.verified'],
    ['teacher', { source: 'teacher' as const, authorName: 'Ms. Rivera', copyCount: 0, playCount: 0 }, 'eduLibrary.badge.byTeacher'],
  ])('Given a %s list card, Then the only fill is the cream sample word tile, the badge is outlined, and nothing shouts', (_l, patch, badgeKey) => {
    render(<LibraryCard item={{ ...base, ...patch }} index={0} onOpen={vi.fn()} />);
    const card = screen.getByTestId('library-card');
    const tile = within(card).getByTestId('library-card-sample');
    expect(tile).toHaveTextContent('whale');
    expect(fills(card)).toEqual([tile]);
    expect(card.querySelectorAll('.uppercase')).toHaveLength(0);
    const badge = within(card).getByTestId('library-card-badge');
    expect(badge).toHaveTextContent(badgeKey);
    expect(badge.className).toMatch(/\bborder\b|\bborder-2\b/);
  });

  it('Given a list card, Then it names the language as text and shows what a tap does', () => {
    const onOpen = vi.fn();
    render(<LibraryCard item={base} index={0} onOpen={onOpen} />);
    const card = screen.getByTestId('library-card');
    expect(card).toHaveTextContent('עברית');
    expect(card).toHaveTextContent('eduLibrary.card.use');
    fireEvent.click(card);
    expect(onOpen).toHaveBeenCalled();
  });

  it('Given the filters, Then nothing is a colored fill, the language is a plain picker, and the selected source wears a lime ring', () => {
    const onChange = vi.fn();
    const { container } = render(<DiscoverFilters filters={{ ...filters }} onChange={onChange} total={3} />);
    expect(fills(container)).toEqual([]);
    expect(container.querySelectorAll('.uppercase')).toHaveLength(0);
    const active = screen.getByRole('button', { name: /eduLibrary.discover.source.all/ });
    expect(active).toHaveAttribute('aria-pressed', 'true');
    expect(active.className).toMatch(/ring-neo-lime|border-neo-lime/);
    const lang = screen.getByRole('combobox', { name: 'eduLibrary.meta.language' });
    expect(within(lang).getByRole('option', { name: '日本語' })).toBeInTheDocument();
    fireEvent.change(lang, { target: { value: 'ja' } });
    expect(onChange).toHaveBeenCalledWith({ language: 'ja' });
  });

  it('Given an open list, Then Host is the one lime action and the header is not a color band', () => {
    render(
      <ListPreviewSheet
        item={{ ...base, source: 'teacher', authorName: 'Ms. Rivera', copyCount: 1, playCount: 2 }}
        onClose={vi.fn()}
        busy={null}
        copied={false}
        onHost={vi.fn()}
        onAssign={vi.fn()}
        onCopy={vi.fn()}
        onOpenMyLists={vi.fn()}
        onReport={vi.fn()}
      />,
    );
    const sheet = screen.getByTestId('list-preview-sheet');
    const host = screen.getByTestId('preview-host');
    expect(fills(sheet)).toEqual([host]);
    expect(sheet.querySelectorAll('.uppercase')).toHaveLength(0);
  });

  it('Given a copied list, Then the copied state is outlined too', () => {
    render(
      <ListPreviewSheet item={base} onClose={vi.fn()} busy={null} copied onHost={vi.fn()} onAssign={vi.fn()} onCopy={vi.fn()} onOpenMyLists={vi.fn()} onReport={vi.fn()} />,
    );
    expect(fills(screen.getByTestId('list-preview-sheet'))).toEqual([screen.getByTestId('preview-host')]);
  });
});
