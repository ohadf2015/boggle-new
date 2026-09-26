import { vi, describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { BattleModeCard } from '../BattleModeCard';

vi.mock('@/hooks/useExperiment', () => ({ useExperiment: () => ({ variant: 'off' }) }));

const t = (key: string) => key;
const PUBLIC_MODES = ['random', 'classic', 'word-hunt', 'wheel-rush', 'blast'] as const;

describe('BattleModeCard — illustrated mode tiles', () => {
  it('every public mode tile carries its own sticker art, decorative to screen readers', () => {
    render(<BattleModeCard selectedGameMode="classic" setSelectedGameMode={vi.fn()} t={t} />);
    for (const mode of PUBLIC_MODES) {
      const art = within(screen.getByTestId(`game-mode-${mode}`)).getByTestId(`mode-art-${mode}`);
      expect(art).toHaveAttribute('aria-hidden', 'true');
    }
  });

  it('the tile name is still the accessible label (art adds no text)', () => {
    render(<BattleModeCard selectedGameMode="classic" setSelectedGameMode={vi.fn()} t={t} />);
    expect(screen.getByRole('button', { name: 'gameModes.blast.name' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'gameModes.classic.name' })).toHaveAttribute('aria-pressed', 'true');
  });
  it('with a how-to handler the grid spare slot becomes a "How to play" tile', () => {
    const onHowToPlay = vi.fn();
    render(<BattleModeCard selectedGameMode="classic" setSelectedGameMode={vi.fn()} t={t} onHowToPlay={onHowToPlay} />);
    const tile = screen.getByTestId('lobby-how-to-play');
    expect(tile).toHaveTextContent('mpUi.lobby.howToPlay');
    expect(tile.parentElement).toBe(screen.getByTestId('game-mode-classic').parentElement);
    tile.click();
    expect(onHowToPlay).toHaveBeenCalledTimes(1);
  });

  it('the chosen tile is tinted + ringed in its mode colour, not flooded solid (START stays the one solid lime)', () => {
    render(<BattleModeCard selectedGameMode="classic" setSelectedGameMode={vi.fn()} t={t} />);
    const tile = screen.getByTestId('game-mode-classic');
    expect(tile).toHaveAttribute('aria-pressed', 'true');
    expect(tile.className).not.toMatch(/\bbg-neo-lime(?![/\w-])/);
    expect(tile.className).toMatch(/\bbg-neo-lime\/\d+/);
    expect(tile.className).toContain('border-neo-lime');
  });
});
