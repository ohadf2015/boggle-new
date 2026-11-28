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
  it('Given the lobby opens, Then the three preset cards show up front with the active one checked, and the options and games stay in one closed fold', () => {
    renderSetup();
    expect(screen.getByTestId('lesson-step')).toBeInTheDocument();
    const group = screen.getByRole('radiogroup', { name: 'teacher.classroom.presets.title' });
    expect(within(group).getAllByRole('radio')).toHaveLength(3);
    expect(screen.getByTestId('preset-standard')).toHaveAttribute('aria-checked', 'true');
    expect(within(screen.getByTestId('preset-standard')).getByTestId('preset-check')).toBeInTheDocument();
    expect(screen.getByTestId('preset-sped')).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByTestId('lobby-more-games')).toHaveTextContent('eduShell.host.moreGames');
    expect(screen.queryByTestId('lobby-setup-summary')).toBeNull();
    expect(screen.getByTestId('lobby-host-setup')).not.toHaveAttribute('data-lobby-expanded');
  });

  it('Given the fold is open, Then it shows the options line and the games, and marks the lobby expanded', () => {
    renderSetup({ gamesOpen: true });
    expect(screen.getByTestId('lobby-host-setup')).toHaveAttribute('data-lobby-expanded');
    expect(screen.getByTestId('lobby-setup-summary')).toHaveTextContent('Teams · rivals on · 3 min');
    expect(screen.getAllByRole('radio')).toHaveLength(3);
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
    const { onApplyPreset } = renderSetup({ activePreset: null });
    expect(screen.queryByTestId('preset-check')).toBeNull();
    fireEvent.click(screen.getByTestId('preset-friday-battle'));
    expect(onApplyPreset).toHaveBeenCalledWith('friday-battle');
  });

  it('Given the presets, Then each card leads with its own mascot art on an accent panel, states its facts once, and the chosen card is marked in ink and pink, not lime', () => {
    renderSetup();
    const ids = ['standard', 'friday-battle', 'sped'] as const;
    const panels = ids.map((id) => within(screen.getByTestId(`preset-${id}`)).getByTestId('preset-icon'));
    expect(panels.map((f) => ['bg-neo-pink', 'bg-neo-cyan', 'bg-neo-yellow'].find((c) => f.classList.contains(c)))).toEqual(['bg-neo-pink', 'bg-neo-cyan', 'bg-neo-yellow']);
    ids.forEach((id, i) => expect(panels[i].querySelector('img')).toHaveAttribute('src', `/mascot/teacher/presets/${id}.webp`));
    expect(within(screen.getByTestId('preset-sped')).getByTestId('preset-values').textContent).toContain('education.modePicker.minutes');
    const on = screen.getByTestId('preset-standard');
    expect(on.className).not.toMatch(/neo-lime/);
    expect(on).toHaveClass('border-neo-black');
    expect(within(on).getByTestId('preset-check').outerHTML).not.toMatch(/lime/);
  });
});
