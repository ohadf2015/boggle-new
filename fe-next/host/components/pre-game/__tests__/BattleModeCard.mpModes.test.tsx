import { vi, describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BattleModeCard } from '../BattleModeCard';

const t = (key: string) => key;

const baseProps = {
  selectedGameMode: 'random' as const,
  setSelectedGameMode: vi.fn(),
  t,
};

describe('BattleModeCard — MP mode list (Ohad 2026-09-27)', () => {
  it('offers the five MP modes + how-to', () => {
    render(<BattleModeCard {...baseProps} isAdmin onHowToPlay={vi.fn()} />);
    for (const mode of ['random', 'classic', 'word-hunt', 'wheel-rush', 'blast']) {
      expect(screen.getByTestId(`game-mode-${mode}`)).toBeInTheDocument();
    }
    expect(screen.getByTestId('lobby-how-to-play')).toBeInTheDocument();
  });

  it('crossword is gone from the MP picker (admin too)', () => {
    render(<BattleModeCard {...baseProps} isAdmin />);
    expect(screen.queryByTestId('game-mode-crossword')).not.toBeInTheDocument();
  });
});
