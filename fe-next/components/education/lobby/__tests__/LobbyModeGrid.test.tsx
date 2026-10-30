import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LobbyModeGrid } from '../LobbyModeGrid';
import { CATALOGUE_CATEGORIES, catalogueModes } from '../../ClassroomModeCatalogueData';

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}|${JSON.stringify(params)}` : key);

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

  it('Then games are grouped under their category headings (read aloud, not drawn), in catalogue order', () => {
    renderGrid();
    for (const category of CATALOGUE_CATEGORIES) {
      const section = screen.getByTestId(`mode-group-${category}`);
      expect(section).toHaveTextContent(`eg2Modes.category.${category}`);
      expect(section.className).toMatch(/(^|\s)contents(\s|$)/);
      expect(within(section).getByRole('heading').className).toMatch(/(^|\s)sr-only(\s|$)/);
      const ids = within(section).getAllByRole('radio').map((r) => r.getAttribute('data-testid'));
      expect(ids).toEqual(catalogueModes().filter((m) => m.category === category).map((m) => `mode-tile-${m.id}`));
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

  it('Then all seven tiles share one grid whose columns follow its own width, not the viewport', () => {
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
    expect(screen.getByTestId('lobby-mode-grid').innerHTML).not.toMatch(/bg-neo-(lime|cyan|pink|purple|yellow|orange)(?![\w/-])/);
  });

  it('Then names may wrap and nothing is cut with an ellipsis', () => {
    renderGrid();
    expect(screen.getByTestId('lobby-mode-grid').innerHTML).not.toMatch(/truncate|line-clamp|uppercase/);
  });

  it('Then the recommended sticker is a neutral outline', () => {
    renderGrid();
    expect(screen.getByTestId('mode-recommended').className).toContain('border-neo-cream');
  });
});
