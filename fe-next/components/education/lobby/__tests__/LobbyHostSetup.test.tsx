import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LobbyHostSetup } from '../LobbyHostSetup';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, number>) => (p ? `${k}:${p.count}` : k) }),
}));

function renderSetup(over: Partial<React.ComponentProps<typeof LobbyHostSetup>> = {}) {
  const onApplyPreset = vi.fn();
  const onGamesOpenChange = vi.fn();
  const utils = render(
    <LobbyHostSetup
      lessonStep={<div data-testid="lesson-step" />}
      activePreset="standard"
      onApplyPreset={onApplyPreset}
      options={<button type="button" data-testid="lobby-setup-summary">Teams · rivals on · 3 min</button>}
      gamesOpen={false}
      onGamesOpenChange={onGamesOpenChange}
      modeGrid={<div data-testid="lobby-mode-grid" />}
      {...over}
    />,
  );
  return { ...utils, onApplyPreset, onGamesOpenChange };
}

describe('LobbyHostSetup first frame', () => {
  it('Given the lobby opens, Then only the class and list line and one closed More games fold show', () => {
    renderSetup();
    expect(screen.getByTestId('lesson-step')).toBeInTheDocument();
    expect(screen.getByTestId('lobby-more-games')).toHaveTextContent('eduShell.host.moreGames');
    expect(screen.queryByRole('radiogroup', { name: 'teacher.classroom.presets.title' })).toBeNull();
    expect(screen.queryByTestId('lobby-setup-summary')).toBeNull();
    expect(screen.getByTestId('lobby-host-setup')).not.toHaveAttribute('data-lobby-expanded');
  });

  it('Given the fold is open, Then it shows three preset cards with the active one checked, the options line and the games, and marks the lobby expanded', () => {
    renderSetup({ gamesOpen: true });
    expect(screen.getByTestId('lobby-host-setup')).toHaveAttribute('data-lobby-expanded');
    expect(screen.getByTestId('lesson-step')).toBeInTheDocument();
    const group = screen.getByRole('radiogroup', { name: 'teacher.classroom.presets.title' });
    const cards = within(group).getAllByRole('radio');
    expect(cards).toHaveLength(3);
    expect(screen.getByTestId('preset-standard')).toHaveAttribute('aria-checked', 'true');
    expect(within(screen.getByTestId('preset-standard')).getByTestId('preset-check')).toBeInTheDocument();
    expect(screen.getByTestId('preset-sped')).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByTestId('lobby-setup-summary')).toHaveTextContent('Teams · rivals on · 3 min');
  });

  it('Given the games are folded, Then the grid is not mounted and More games opens it', () => {
    const { onGamesOpenChange } = renderSetup();
    expect(screen.queryByTestId('lobby-mode-grid')).toBeNull();
    const more = screen.getByTestId('lobby-more-games');
    expect(more).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(more);
    expect(onGamesOpenChange).toHaveBeenCalledWith(true);
  });

  it('Given More games is open, Then the grid shows under it', () => {
    renderSetup({ gamesOpen: true });
    expect(screen.getByTestId('lobby-more-games')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('lobby-mode-grid')).toBeInTheDocument();
  });

  it('Given a teacher taps a preset card, Then that preset is applied', () => {
    const { onApplyPreset } = renderSetup({ activePreset: null, gamesOpen: true });
    expect(screen.queryByTestId('preset-check')).toBeNull();
    fireEvent.click(screen.getByTestId('preset-friday-battle'));
    expect(onApplyPreset).toHaveBeenCalledWith('friday-battle');
  });

  it('Given the fold is open, Then each preset icon is a filled accent square and the chosen card is marked in ink and pink, not lime', () => {
    renderSetup({ gamesOpen: true });
    const fills = ['standard', 'friday-battle', 'sped'].map((id) => within(screen.getByTestId(`preset-${id}`)).getByTestId('preset-icon'));
    expect(fills.map((f) => ['bg-neo-pink', 'bg-neo-cyan', 'bg-neo-yellow'].find((c) => f.classList.contains(c)))).toEqual(['bg-neo-pink', 'bg-neo-cyan', 'bg-neo-yellow']);
    for (const f of fills) expect(f).toHaveClass('border-neo-black', 'text-neo-black');
    const on = screen.getByTestId('preset-standard');
    expect(on.className).not.toMatch(/neo-lime/);
    expect(on).toHaveClass('border-neo-black');
    expect(within(on).getByTestId('preset-check')).toHaveClass('border-neo-black');
    expect(within(on).getByTestId('preset-check').innerHTML).not.toMatch(/lime/);
  });
});
