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
  it('should render all 4 modes when showRandom is true', () => {
    render(
      <GameModeSelector
        selectedMode="random"
        onSelectMode={jest.fn()}
        t={mockT}
        showRandom
      />
    );

    expect(screen.getByTestId('game-mode-random')).toBeInTheDocument();
    expect(screen.getByTestId('game-mode-classic')).toBeInTheDocument();
    expect(screen.getByTestId('game-mode-blast')).toBeInTheDocument();
    expect(screen.getByTestId('game-mode-word-hunt')).toBeInTheDocument();
  });

  it('should render only 3 modes when showRandom is false', () => {
    render(
      <GameModeSelector
        selectedMode="classic"
        onSelectMode={jest.fn()}
        t={mockT}
        showRandom={false}
      />
    );

    expect(screen.queryByTestId('game-mode-random')).not.toBeInTheDocument();
    expect(screen.getByTestId('game-mode-classic')).toBeInTheDocument();
    expect(screen.getByTestId('game-mode-blast')).toBeInTheDocument();
    expect(screen.getByTestId('game-mode-word-hunt')).toBeInTheDocument();
  });

  it('should highlight the selected mode with active styling', () => {
    render(
      <GameModeSelector
        selectedMode="blast"
        onSelectMode={jest.fn()}
        t={mockT}
        showRandom
      />
    );

    const blastButton = screen.getByTestId('game-mode-blast');
    expect(blastButton.className).toContain('bg-neo-cyan/30');

    const classicButton = screen.getByTestId('game-mode-classic');
    expect(classicButton.className).not.toContain('bg-neo-cyan/30');
  });

  it('should call onSelectMode when a mode button is clicked', () => {
    const onSelectMode = jest.fn();
    render(
      <GameModeSelector
        selectedMode="random"
        onSelectMode={onSelectMode}
        t={mockT}
        showRandom
      />
    );

    fireEvent.click(screen.getByTestId('game-mode-blast'));
    expect(onSelectMode).toHaveBeenCalledWith('blast');

    fireEvent.click(screen.getByTestId('game-mode-word-hunt'));
    expect(onSelectMode).toHaveBeenCalledWith('word-hunt');
  });

  it('should render icons instead of emojis', () => {
    const { container } = render(
      <GameModeSelector
        selectedMode="random"
        onSelectMode={jest.fn()}
        t={mockT}
        showRandom
      />
    );

    // Lucide icons render as SVG elements
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBe(4); // One icon per mode

    // No emoji characters should be present
    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      // Check that button text doesn't contain common emoji codepoints
      expect(button.textContent).not.toMatch(/[\u{1F3B2}\u{1F4DD}\u{1F4A5}\u{1F3AF}]/u);
    });
  });

  it('should display translated mode labels', () => {
    render(
      <GameModeSelector
        selectedMode="random"
        onSelectMode={jest.fn()}
        t={mockT}
        showRandom
      />
    );

    expect(screen.getByText('Random')).toBeInTheDocument();
    expect(screen.getByText('Classic')).toBeInTheDocument();
    expect(screen.getByText('Blast')).toBeInTheDocument();
    expect(screen.getByText('Word Hunt')).toBeInTheDocument();
  });
});
