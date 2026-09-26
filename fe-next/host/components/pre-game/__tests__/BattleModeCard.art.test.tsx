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
});
