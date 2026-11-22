import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GameHeader } from '../GameHeader';

const t = ((key: string) => key) as never;

describe('GameHeader press + FAB clearance', () => {
  it('tutorial and pause buttons press with a translate, not a scale', () => {
    render(<GameHeader gameActive t={t} onShowTutorial={vi.fn()} onPauseToggle={vi.fn()} />);
    for (const el of [screen.getByTestId('game-header-pause'), screen.getByLabelText('help.viewTutorial')]) {
      expect(el.className).not.toMatch(/active:scale-/);
      expect(el.className).toContain('active:translate-y-px');
    }
  });

  it('reserves room at the end of the mobile row for the floating mute button when a hint button is shown', () => {
    const hints = { isSinglePlayer: true, hintsRemaining: 0, isAvailable: false, isLoading: false } as never;
    const { container } = render(<GameHeader gameActive t={t} hints={hints} />);
    expect((container.firstElementChild as HTMLElement).className).toContain('pe-12');
  });
});
