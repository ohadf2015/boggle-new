import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameModeSelector } from '../GameModeSelector';
import type { GameModeOption } from '../GameModeSelector'; // eslint-disable-line no-duplicate-imports

const mockT = (key: string) => {
  const translations: Record<string, string> = {
    'gameModes.random': 'Random',
    'gameModes.classic.name': 'Classic',
    'gameModes.blast.name': 'Blast',
    'gameModes.wordHunt.name': 'Word Hunt',
  };
  return translations[key] || key;
};

describe('GameModeSelector', () => {
  it('should render random + classic + word-hunt + wheel-rush + blast when showRandom is true', () => {
    render(
      <GameModeSelector
        selectedMode="random"
        onSelectMode={vi.fn()}
        t={mockT}
        showRandom
      />
    );

    expect(screen.getByTestId('game-mode-random')).toBeInTheDocument();
    expect(screen.getByTestId('game-mode-classic')).toBeInTheDocument();
    expect(screen.getByTestId('game-mode-word-hunt')).toBeInTheDocument();
    expect(screen.getByTestId('game-mode-wheel-rush')).toBeInTheDocument();
    // Blast is a first-class rematch option on the results selector (was missing).
    expect(screen.getByTestId('game-mode-blast')).toBeInTheDocument();
  });

  it('should render classic + word-hunt when showRandom is false', () => {
    render(
      <GameModeSelector
        selectedMode="classic"
        onSelectMode={vi.fn()}
        t={mockT}
        showRandom={false}
      />
    );

    expect(screen.queryByTestId('game-mode-random')).not.toBeInTheDocument();
    expect(screen.getByTestId('game-mode-classic')).toBeInTheDocument();
    expect(screen.getByTestId('game-mode-word-hunt')).toBeInTheDocument();
  });

  it('should highlight the selected mode with active styling', () => {
    render(
      <GameModeSelector
        selectedMode="word-hunt"
        onSelectMode={vi.fn()}
        t={mockT}
        showRandom
      />
    );

    const huntButton = screen.getByTestId('game-mode-word-hunt');
    expect(huntButton.className).toContain('bg-neo-pink/30');

    const classicButton = screen.getByTestId('game-mode-classic');
    expect(classicButton.className).toContain('bg-neo-navy/60');
  });

  it('should call onSelectMode when a mode button is clicked', () => {
    const onSelectMode = vi.fn();
    render(
      <GameModeSelector
        selectedMode="random"
        onSelectMode={onSelectMode}
        t={mockT}
        showRandom
      />
    );

    fireEvent.click(screen.getByTestId('game-mode-word-hunt'));
    expect(onSelectMode).toHaveBeenCalledWith('word-hunt');

    fireEvent.click(screen.getByTestId('game-mode-classic'));
    expect(onSelectMode).toHaveBeenCalledWith('classic');
  });

  it('should render icons instead of emojis', () => {
    const { container } = render(
      <GameModeSelector
        selectedMode="random"
        onSelectMode={vi.fn()}
        t={mockT}
        showRandom
      />
    );

    // Lucide icons render as SVG elements (one per visible mode):
    // random + classic + word-hunt + wheel-rush + blast = 5
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBe(5);

    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      expect(button.textContent).not.toMatch(/[\u{1F3B2}\u{1F4DD}\u{1F4A5}\u{1F3AF}]/u);
    });
  });

  it('should display translated mode labels', () => {
    render(
      <GameModeSelector
        selectedMode="random"
        onSelectMode={vi.fn()}
        t={mockT}
        showRandom
      />
    );

    expect(screen.getByText('Random')).toBeInTheDocument();
    expect(screen.getByText('Classic')).toBeInTheDocument();
    expect(screen.getByText('Word Hunt')).toBeInTheDocument();
  });
});
