import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LobbyModeGrid } from '../LobbyModeGrid';
import { CATALOGUE_CATEGORIES, catalogueModes } from '../../ClassroomModeCatalogueData';

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}|${JSON.stringify(params)}` : key);

function withoutDecor(el: HTMLElement): string {
  const copy = el.cloneNode(true) as HTMLElement;
  copy.querySelectorAll('[data-accent-decor]').forEach((n) => n.remove());
  return copy.innerHTML;
}

function renderGrid(overrides: Partial<Parameters<typeof LobbyModeGrid>[0]> = {}) {
  const onPick = vi.fn();
  render(<LobbyModeGrid selected="classic" recommended="vocab-quiz" selectedMinutes={5} onPick={onPick} t={t} {...overrides} />);
  return { onPick };
}

describe('<LobbyModeGrid> — the picker is the page', () => {
  it('Given the lobby, Then every game is one radio in one group, with exactly one checked', () => {
    renderGrid();
    const group = screen.getByRole('radiogroup');
    const radios = within(group).getAllByRole('radio');
    expect(radios).toHaveLength(catalogueModes().length);
    expect(radios.filter((r) => r.getAttribute('aria-checked') === 'true')).toHaveLength(1);
    expect(screen.getByTestId('mode-tile-classic')).toHaveAttribute('aria-checked', 'true');
  });

  it('Then games are grouped under visible category headings, in catalogue order', () => {
    renderGrid();
    for (const category of CATALOGUE_CATEGORIES) {
      const section = screen.getByTestId(`mode-group-${category}`);
      const heading = within(section).getByRole('heading');
      expect(heading).toHaveTextContent(`eg2Modes.category.${category}`);
      expect(heading.className).not.toMatch(/(^|\s)sr-only(\s|$)/);
      const ids = within(section).getAllByRole('radio').map((r) => r.getAttribute('data-testid'));
      expect(ids).toEqual(catalogueModes().filter((m) => m.category === category).map((m) => `mode-tile-${m.id}`));
    }
  });

  it('Then the first two cards are Classic and Vocab Quiz, the games classes finish', () => {
    renderGrid();
    const ids = within(screen.getByRole('radiogroup')).getAllByRole('radio').map((r) => r.getAttribute('data-testid'));
    expect(ids.slice(0, 2)).toEqual(['mode-tile-classic', 'mode-tile-vocab-quiz']);
  });

  it('Then Boss Battle is on screen and pickable like any free game: no lock, no Pro word', () => {
    const { onPick } = renderGrid();
    const boss = screen.getByTestId('mode-tile-boss-battle');
    expect(boss).not.toHaveAttribute('aria-disabled', 'true');
    expect(boss.textContent ?? '').not.toMatch(/\bpro\b|lock|upgrade|teacherPro/i);
    fireEvent.click(boss);
    expect(onPick).toHaveBeenCalledWith('boss-battle');
  });

  it('Then Wordcraft and Crossword sit under "play together", each card with its one-line student hint', () => {
    renderGrid();
    const together = screen.getByTestId('mode-group-together');
    for (const id of ['wordcraft', 'crossword']) {
      const hint = within(within(together).getByTestId(`mode-tile-${id}`)).getByTestId('mode-hint');
      expect(hint).toHaveTextContent(`eg2Modes.hint.${id}`);
    }
    expect(within(screen.getByTestId('mode-group-board')).queryByTestId('mode-hint')).toBeNull();
  });

  it('Then on a phone only the play-together hints show and those cards take the full row; the start-here hints wait for the wide grid', () => {
    renderGrid();
    for (const id of ['wordcraft', 'crossword']) {
      const card = screen.getByTestId(`mode-tile-${id}`);
      expect(card.className).toMatch(/(^|\s)col-span-2(\s|$)/);
      expect(within(card).getByTestId('mode-hint').className).not.toMatch(/(^|\s)hidden(\s|$)/);
    }
    for (const id of ['classic', 'vocab-quiz']) {
      const card = screen.getByTestId(`mode-tile-${id}`);
      expect(card.className).not.toMatch(/(^|\s)col-span-2(\s|$)/);
      expect(within(card).getByTestId('mode-hint').className).toMatch(/(^|\s)hidden(\s|$)/);
      expect(within(card).getByTestId('mode-hint').className).toContain('@2xl:block');
    }
  });

  it('Given Wordcraft cannot be dealt, Then its card stays in the group but is disabled with the reason, and a tap picks nothing', () => {
    const { onPick } = renderGrid({ blocked: { wordcraft: 'eg2Modes.blocked.wordcraftLanguage' } });
    const card = screen.getByTestId('mode-tile-wordcraft');
    expect(card).toHaveAttribute('aria-disabled', 'true');
    expect(within(card).getByTestId('mode-blocked-reason')).toHaveTextContent('eg2Modes.blocked.wordcraftLanguage');
    expect(within(card).queryByTestId('mode-hint')).toBeNull();
    fireEvent.click(card);
    expect(onPick).not.toHaveBeenCalled();
    expect(screen.getByTestId('mode-tile-crossword')).not.toHaveAttribute('aria-disabled');
  });

  it('Then each card has one entrance on mount: a transform-only keyframe, staggered, and skipped under reduced motion', () => {
    renderGrid();
    const css = screen.getByTestId('lobby-mode-grid').querySelector('style')!.textContent ?? '';
    expect(css).toMatch(/@keyframes lc-mode-in/);
    expect(css).not.toMatch(/opacity/);
    const tiles = within(screen.getByRole('radiogroup')).getAllByRole('radio');
    tiles.forEach((tile, i) => {
      expect(tile.className).toMatch(/motion-safe:animate-\[lc-mode-in_[^\]]*_backwards\]/);
      expect(tile.className).not.toMatch(/(^|\s)animate-/);
      expect(tile.style.animationDelay).toBe(`${i * 35}ms`);
    });
  });

  it('Then each tile opens on its own arcade color block holding the art, neighbours never match, and lime stays for GO LIVE', () => {
    renderGrid();
    const tiles = within(screen.getByRole('radiogroup')).getAllByRole('radio');
    const accents = tiles.map((tile) => tile.getAttribute('data-accent'));
    accents.slice(1).forEach((a, i) => expect(a).not.toBe(accents[i]));
    expect(accents).not.toContain('lime');
    for (const tile of tiles) {
      const block = tile.querySelector('[data-accent-decor]')!;
      expect(block.className).toMatch(/bg-neo-(cyan|pink|purple|yellow|orange)/);
      expect(within(block as HTMLElement).getByTestId('mode-card-cover')).toBeInTheDocument();
    }
  });

  it('When a card is tapped, Then it only selects: onPick with that id, and the selected card does nothing', () => {
    const { onPick } = renderGrid();
    fireEvent.click(screen.getByTestId('mode-tile-blast'));
    expect(onPick).toHaveBeenCalledWith('blast');
    fireEvent.click(screen.getByTestId('mode-tile-classic'));
    expect(onPick).toHaveBeenCalledTimes(1);
  });

  it('Then each card says how long and where it plays; the selected one shows the configured round', () => {
    renderGrid();
    const card = screen.getByTestId('mode-tile-classic');
    expect(card).toHaveTextContent('education.modePicker.minutes|{"count":5}');
    expect(within(card).getByTestId(/^delivery-tag-/)).toBeInTheDocument();
  });

  it('Then every card keeps its time and where-it-plays on one line, short copy with the full label on hover', () => {
    renderGrid();
    for (const mode of catalogueModes()) {
      const tag = within(screen.getByTestId(`mode-tile-${mode.id}`)).getByTestId(`delivery-tag-${mode.delivery}`);
      expect(tag).toHaveTextContent(`eduShell.deliveryShort.${mode.delivery}`);
      expect(tag).toHaveAttribute('title', `eduShell.delivery.${mode.delivery}`);
      expect((tag.parentElement as HTMLElement).className).toMatch(/(^|\s)flex-nowrap(\s|$)/);
    }
  });

  it('Then the recommended game carries one sticker, inside its own card', () => {
    renderGrid();
    const stickers = screen.getAllByTestId('mode-recommended');
    expect(stickers).toHaveLength(1);
    expect(screen.getByTestId('mode-tile-vocab-quiz')).toContainElement(stickers[0]);
    expect(stickers[0]).toHaveTextContent('eduShell.host.bestForList');
    expect(stickers[0]).toHaveAttribute('title', 'eduShell.host.bestForListHint');
  });

  it('Given a game the teacher has not tried lately, Then its tag says so instead of calling the game new', () => {
    renderGrid({ suggested: 'blast' });
    expect(screen.getByTestId('mode-suggestion')).toHaveTextContent('eduShell.host.untried');
    expect(screen.getByTestId('mode-suggestion')).toHaveAttribute('title', 'eduShell.host.untriedHint');
  });

  it('Given a launch in flight, Then the cards are disabled so the choice cannot change under GO LIVE', () => {
    renderGrid({ busy: true });
    expect(screen.getByTestId('mode-tile-blast')).toBeDisabled();
  });

  it('Then every tile shares one grid whose columns follow its own width, not the viewport', () => {
    renderGrid();
    const grid = screen.getByTestId('lobby-mode-grid');
    expect(grid.className).toContain('@container');
    const cells = screen.getByTestId('lobby-mode-cells');
    expect(cells.className).toMatch(/grid-cols-2/);
    expect(cells.className).toMatch(/@2xl:grid-cols-4/);
    expect(within(cells).getAllByRole('radio')).toHaveLength(catalogueModes().length);
    expect(grid.innerHTML).not.toMatch(/(?<![@\w-])(sm|md|lg):/);
  });

  it('Then the selected tile is outlined with a lime ring and a check, never a colored fill', () => {
    renderGrid();
    const on = screen.getByTestId('mode-tile-classic');
    expect(on.className).toContain('ring-neo-lime');
    expect(within(on).getByTestId('mode-selected-check')).toBeInTheDocument();
    expect(withoutDecor(screen.getByTestId('lobby-mode-grid'))).not.toMatch(/bg-neo-(lime|cyan|pink|purple|yellow|orange)(?![\w/-])/);
  });

  it('Then names may wrap and nothing is cut with an ellipsis', () => {
    renderGrid();
    expect(screen.getByTestId('lobby-mode-grid').innerHTML).not.toMatch(/truncate|line-clamp|uppercase/);
  });

  it('Then the recommended sticker is a neutral outline', () => {
    renderGrid();
    expect(screen.getByTestId('mode-recommended').className).toContain('border-neo-cream');
  });

  it('Given a lesson run sheet sits above the grid, When the grid is dense, Then the cover art goes shorter so the page still fits', () => {
    renderGrid({ dense: true });
    const art = screen.getByTestId('mode-tile-classic').querySelector('[data-accent-decor]')!;
    expect(art.className).toMatch(/aspect-\[3\/1\]/);
    expect(art.className).toMatch(/(^|\s)size-10(\s|$)/);
  });

  it('Given no run sheet, Then the cover art keeps its normal size', () => {
    renderGrid();
    const art = screen.getByTestId('mode-tile-classic').querySelector('[data-accent-decor]')!;
    expect(art.className).not.toMatch(/aspect-\[3\/1\]/);
    expect(art.className).toMatch(/(^|\s)size-12(\s|$)/);
  });
});
