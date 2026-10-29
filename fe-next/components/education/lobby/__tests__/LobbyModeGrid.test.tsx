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

  it('Then games are grouped under their category headings, in catalogue order', () => {
    renderGrid();
    for (const category of CATALOGUE_CATEGORIES) {
      const section = screen.getByTestId(`mode-group-${category}`);
      expect(section).toHaveTextContent(`eg2Modes.category.${category}`);
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

  it('Then the recommended game carries one sticker, inside its own card', () => {
    renderGrid();
    const stickers = screen.getAllByTestId('mode-recommended');
    expect(stickers).toHaveLength(1);
    expect(screen.getByTestId('mode-tile-vocab-quiz')).toContainElement(stickers[0]);
  });

  it('Given a launch in flight, Then the cards are disabled so the choice cannot change under GO LIVE', () => {
    renderGrid({ busy: true });
    expect(screen.getByTestId('mode-tile-blast')).toBeDisabled();
  });
});
