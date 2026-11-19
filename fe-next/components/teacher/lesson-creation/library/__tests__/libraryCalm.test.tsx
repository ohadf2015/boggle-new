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
// The cream close square is the shared teacher dialog chrome, not a competing action.
const isDialogClose = (el: HTMLElement) => el.matches('[data-nb-dialog-header] > button[aria-label]');
const fills = (root: ParentNode) =>
  Array.from(root.querySelectorAll<HTMLElement>('[class]')).filter((el) => COLOR_FILL.test(el.getAttribute('class') ?? '') && !isDialogClose(el));

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

describe('Library cards', () => {
  it.each([
    ['verified', { source: 'verified' as const }, 'eduLibrary.badge.verified'],
    ['teacher', { source: 'teacher' as const, authorName: 'Ms. Rivera', copyCount: 0, playCount: 0 }, 'eduLibrary.badge.byTeacher'],
  ])('Given a %s list, Then the card is calm navy with one small accent and no colored fill elsewhere', (_l, patch, badgeKey) => {
    render(<LibraryCard item={{ ...base, ...patch }} index={0} onOpen={vi.fn()} />);
    const card = screen.getByTestId('library-card');
    expect(card.className).toContain('bg-neo-navy-light');
    expect(within(card).getByTestId('library-card-badge')).toHaveTextContent(badgeKey);
    const accent = within(card).getByTestId('list-card-accent');
    expect(fills(card)).toEqual([accent]);
    expect(accent.className).toMatch(/bg-neo-(cyan|pink|purple|yellow|orange)/);
    expect(card.querySelectorAll('.uppercase')).toHaveLength(0);
  });

  it('Given the same list at two grid positions, Then it keeps one accent color', () => {
    const accent = (index: number) => {
      const { unmount } = render(<LibraryCard item={{ ...base, id: 'pub-42' }} index={index} onOpen={vi.fn()} />);
      const cls = screen.getByTestId('list-card-accent').className.match(/bg-neo-\w+/)?.[0];
      unmount();
      return cls;
    };
    expect(accent(0)).toBeDefined();
    expect(accent(7)).toBe(accent(0));
  });

  it('Given a list, Then the card is one control with the name, one fact line and what a tap does', () => {
    const onOpen = vi.fn();
    render(<LibraryCard item={base} index={0} onOpen={onOpen} />);
    const card = screen.getByTestId('library-card');
    expect(card.tagName).toBe('BUTTON');
    expect(card.querySelectorAll('button, a')).toHaveLength(0);
    expect(card).toHaveTextContent('Ocean Animals');
    expect(within(card).getByTestId('library-card-fact')).toHaveTextContent('eduLibrary.card.words');
    expect(within(card).getByTestId('library-card-fact')).toHaveTextContent('עברית');
    expect(card).toHaveTextContent('eduLibrary.card.use');
    expect(screen.queryByTestId('library-card-sample')).toBeNull();
    fireEvent.click(card);
    expect(onOpen).toHaveBeenCalled();
  });

  it('Given reduced motion, Then the entrance is motion-safe only', () => {
    render(<LibraryCard item={base} index={0} onOpen={vi.fn()} />);
    const classes = (screen.getByTestId('library-card').getAttribute('class') ?? '').split(/\s+/);
    expect(classes.filter((c) => /^animate-/.test(c))).toEqual([]);
  });

  it('Given the filters, Then nothing is a colored fill, the language is a plain picker, and the selected source wears a lime ring', () => {
    const onChange = vi.fn();
    const { container } = render(<DiscoverFilters filters={{ ...filters }} onChange={onChange} total={3} />);
    expect(fills(container)).toEqual([]);
    expect(container.querySelectorAll('.uppercase')).toHaveLength(0);
    expect(screen.queryByRole('button', { name: /eduLibrary.discover.source.all/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'eduLibrary.discover.filters' }));
    expect(fills(container)).toEqual([]);
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

describe('DiscoverFilters first view', () => {
  it('Given a teacher picked Verified only, Then the closed Filters button counts it so the narrowed list is never a mystery', () => {
    render(<DiscoverFilters filters={{ ...filters, source: 'verified' }} onChange={vi.fn()} total={3} />);
    const toggle = screen.getByRole('button', { name: 'eduLibrary.discover.filters' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveTextContent('1');
  });
});
