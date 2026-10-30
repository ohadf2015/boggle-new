import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ClassroomModeCatalogue, ClassroomModeCardRow } from '../ClassroomModeCatalogue';
import { catalogueEntry, catalogueModes } from '../ClassroomModeCatalogueData';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: unknown) =>
      params && typeof params === 'object' ? `${key}|${JSON.stringify(params)}` : key,
    language: 'en',
  }),
}));

type Props = React.ComponentProps<typeof ClassroomModeCatalogue>;
type RowProps = React.ComponentProps<typeof ClassroomModeCardRow>;
const t = (key: string, params?: unknown) => (params && typeof params === 'object' ? `${key}|${JSON.stringify(params)}` : key);

function setup(overrides: Partial<Props> = {}) {
  const onGoLive = vi.fn();
  render(<ClassroomModeCatalogue selected="vocab-quiz" minutes={4} playStyle="ffa" blockedKey={null} onGoLive={onGoLive} {...overrides} />);
  return { onGoLive };
}

function setupRow(overrides: Partial<RowProps> = {}) {
  const onPick = vi.fn();
  render(<ClassroomModeCardRow selected="vocab-quiz" onPick={onPick} t={t} {...overrides} />);
  return { onPick };
}

describe('<ClassroomModeCatalogue>', () => {
  it('shows every mode at once as a card, exactly one checked', () => {
    setupRow({ selected: 'blast' });
    const cards = screen.getAllByRole('radio');
    expect(cards).toHaveLength(catalogueModes().length);
    const checked = cards.filter((c) => c.getAttribute('aria-checked') === 'true');
    expect(checked).toEqual([screen.getByTestId('mode-tile-blast')]);
  });

  it('groups the cards under their category headings', () => {
    setupRow();
    const groups = screen.getAllByTestId(/^mode-group-/);
    expect(groups.length).toBeGreaterThan(1);
    const meaning = screen.getByTestId('mode-group-meaning');
    expect(within(meaning).getByTestId('mode-tile-vocab-quiz')).toBeInTheDocument();
  });

  it('spotlights the selected mode: name, mechanic, duration, complexity, style and best-for', () => {
    setup({ selected: 'classic', minutes: 5 });
    const spot = screen.getByTestId('mode-spotlight');
    expect(spot).toHaveTextContent('teacher.classroom.gameModes.classic');
    expect(spot).toHaveTextContent('education.modePicker.how.classic');
    expect(within(spot).getByTestId('spec-duration')).toHaveTextContent('education.modePicker.minutes|{"count":5}');
    expect(within(spot).getByTestId('spec-complexity')).toHaveTextContent('eg2Modes.complexity.');
    expect(within(spot).getByTestId('spec-style')).toHaveTextContent('eg2Modes.style.ffa');
    expect(within(spot).getAllByTestId('best-for-chip')).toHaveLength(2);
  });

  it('says Teams in the style chip when the teacher set teams on a team-capable mode', () => {
    setup({ selected: 'classic', playStyle: 'teams' });
    expect(screen.getByTestId('spec-style')).toHaveTextContent('eg2Modes.style.teams');
  });

  it('lays the three steps out on the wide screen without a tap', () => {
    setup({ selected: 'blast' });
    const inline = within(screen.getByTestId('how-it-plays-inline')).getAllByRole('listitem');
    expect(inline.map((li) => li.textContent)).toEqual([1, 2, 3].map((n) => `${n}eg2Modes.steps.blast.${n}`));
  });

  it('shows the selected mode cover and can open the three-step how-it-plays on a phone', () => {
    setup({ selected: 'blast' });
    expect(screen.getByTestId('spotlight-art').querySelector('img')?.getAttribute('src')).toBe(catalogueEntry('blast')!.cover);
    expect(screen.queryByTestId('how-it-plays')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('how-it-plays-toggle'));
    const steps = within(screen.getByTestId('how-it-plays')).getAllByRole('listitem');
    expect(steps).toHaveLength(3);
    expect(steps[0]).toHaveTextContent('eg2Modes.steps.blast.1');
  });

  it('selects on a card tap and never launches from it', () => {
    const { onPick } = setupRow({ selected: 'vocab-quiz' });
    fireEvent.click(screen.getByTestId('mode-tile-classic'));
    expect(onPick).toHaveBeenCalledWith('classic');
  });

  it('is the ready panel only: no card row beside GO LIVE', () => {
    setup();
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    expect(screen.getByTestId('lobby-go-live')).toBeInTheDocument();
  });

  it('launches on GO LIVE, which names the selected mode', () => {
    const { onGoLive } = setup({ selected: 'wordcraft' });
    const go = screen.getByTestId('lobby-go-live');
    expect(go).toHaveTextContent('teacher.classroom.gameModes.wordcraft');
    fireEvent.click(go);
    expect(onGoLive).toHaveBeenCalledTimes(1);
  });

  it('disables GO LIVE while blocked and says why beside it', () => {
    const { onGoLive } = setup({ blockedKey: 'education.modePicker.needsLesson' });
    const go = screen.getByTestId('lobby-go-live');
    expect(go).toBeDisabled();
    fireEvent.click(go);
    expect(onGoLive).not.toHaveBeenCalled();
    expect(screen.getByTestId('go-live-blocked')).toHaveTextContent('education.modePicker.needsLesson');
  });

  it('quotes each card in the room\'s own settings when the lobby supplies them', () => {
    setupRow({ selected: 'classic', selectedMinutes: 6, minutesFor: (id) => (id === 'vocab-quiz' ? 8 : 6) });
    expect(screen.getByTestId('mode-tile-vocab-quiz')).toHaveTextContent('education.modePicker.minutes|{"count":8}');
    expect(screen.getByTestId('mode-tile-blast')).toHaveTextContent('education.modePicker.minutes|{"count":6}');
  });

  it('lets the teacher pick Boss Battle and previews the boss fight', () => {
    const { onPick } = setupRow({ selected: 'vocab-quiz' });
    fireEvent.click(screen.getByTestId('mode-tile-boss-battle'));
    expect(onPick).toHaveBeenCalledWith('boss-battle');
  });

  it('spotlights Boss Battle with its own name and its own cover', () => {
    setup({ selected: 'boss-battle' });
    expect(screen.getByTestId('mode-spotlight')).toHaveTextContent('eg2Modes.boss.name');
    expect(screen.getByTestId('spotlight-art').querySelector('img')?.getAttribute('src')).toBe(catalogueEntry('boss-battle')!.cover);
    expect(screen.getByTestId('spec-style')).toHaveTextContent('eg2Modes.style.class');
  });

  it('flags the recommended mode on its card', () => {
    setupRow({ recommended: 'vocab-quiz' });
    expect(within(screen.getByTestId('mode-tile-vocab-quiz')).getByTestId('mode-recommended')).toBeInTheDocument();
  });

  it('gives each card its own mascot art, never one shared picture', () => {
    setupRow();
    const srcs = screen.getAllByRole('radio').map((c) => c.querySelector('img')?.getAttribute('src'));
    expect(new Set(srcs).size).toBe(srcs.length);
  });
});
