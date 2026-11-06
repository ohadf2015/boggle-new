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

const ACCENT_FILL = /(^|\s)sm:bg-neo-(cyan|pink|purple|yellow|orange)(\s|$)/;
const LIME_FILL = /(^|:|\s)bg-neo-lime\b/;

describe('Library game cards', () => {
  it.each([
    ['verified', { source: 'verified' as const }, 'eduLibrary.badge.verified', /\bbg-neo-cream\b/],
    ['teacher', { source: 'teacher' as const, authorName: 'Ms. Rivera', copyCount: 0, playCount: 0 }, 'eduLibrary.badge.byTeacher', /\bborder-neo-cream\b/],
  ])('Given a %s list card, Then it wears an arcade color band, the sample word is a cream letter tile, and nothing is lime', (_l, patch, badgeKey, badgeLook) => {
    render(<LibraryCard item={{ ...base, ...patch }} index={0} onOpen={vi.fn()} />);
    const card = screen.getByTestId('library-card');
    expect(within(card).getByTestId('library-card-band').className).toMatch(ACCENT_FILL);
    const tile = within(card).getByTestId('library-card-sample');
    expect(tile).toHaveTextContent('whale');
    expect(tile.className).toMatch(/\bbg-neo-cream\b/);
    expect(tile.className).toMatch(/shadow/);
    expect(Array.from(card.querySelectorAll('[class]')).filter((el) => LIME_FILL.test(el.getAttribute('class') ?? ''))).toEqual([]);
    expect(card.querySelectorAll('.uppercase')).toHaveLength(0);
    const badge = within(card).getByTestId('library-card-badge');
    expect(badge).toHaveTextContent(badgeKey);
    expect(badge.className).toMatch(badgeLook);
  });

  it('Given the same list at two grid positions, Then it keeps one accent color', () => {
    const band = (index: number) => {
      const { unmount } = render(<LibraryCard item={{ ...base, id: 'pub-42' }} index={index} onOpen={vi.fn()} />);
      const cls = screen.getByTestId('library-card-band').className.match(ACCENT_FILL)?.[2];
      unmount();
      return cls;
    };
    expect(band(0)).toBeDefined();
    expect(band(7)).toBe(band(0));
  });

  it('Given a list with more words, Then the next words peek behind the sample tile, hidden from assistive tech', () => {
    render(<LibraryCard item={{ ...base, words: [{ word: 'whale' }, { word: 'squid' }, { word: 'crab' }] }} index={0} onOpen={vi.fn()} />);
    const fan = screen.getAllByTestId('library-card-fan-tile');
    expect(fan.map((el) => el.textContent)).toEqual(['squid', 'crab']);
    fan.forEach((el) => expect(el.closest('[aria-hidden="true"]')).not.toBeNull());
  });

  it('Given reduced motion, Then every animation and hover tilt on the card is gated behind motion-safe or reset by motion-reduce', () => {
    render(<LibraryCard item={base} index={0} onOpen={vi.fn()} />);
    const classes = Array.from(screen.getByTestId('library-card').querySelectorAll<HTMLElement>('[class]'))
      .concat(screen.getByTestId('library-card'))
      .flatMap((el) => (el.getAttribute('class') ?? '').split(/\s+/));
    expect(classes.filter((c) => /^animate-/.test(c))).toEqual([]);
    const card = screen.getByTestId('library-card').className;
    expect(card).toMatch(/motion-reduce:hover:rotate-0/);
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
