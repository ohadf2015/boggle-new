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
  it('Given the lobby opens, Then it shows the word list, three preset cards with the active one checked, and the options line', () => {
    renderSetup();
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
    const { onApplyPreset } = renderSetup({ activePreset: null });
    expect(screen.queryByTestId('preset-check')).toBeNull();
    fireEvent.click(screen.getByTestId('preset-friday-battle'));
    expect(onApplyPreset).toHaveBeenCalledWith('friday-battle');
  });
});
