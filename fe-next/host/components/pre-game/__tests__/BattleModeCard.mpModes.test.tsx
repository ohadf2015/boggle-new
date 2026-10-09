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

  it('hides the in-work modes from ordinary hosts (admin flag alone too)', () => {
    render(<BattleModeCard {...baseProps} isAdmin />);
    expect(screen.queryByTestId('game-mode-crossword')).not.toBeInTheDocument();
    expect(screen.queryByTestId('game-mode-word-tower')).not.toBeInTheDocument();
  });

  it('offers crossword (never the retired MP word-tower) to hosts who can see in-work modes', () => {
    render(<BattleModeCard {...baseProps} showInWorkModes />);
    expect(screen.getByTestId('game-mode-crossword')).toBeInTheDocument();
    expect(screen.queryByTestId('game-mode-word-tower')).not.toBeInTheDocument();
  });

  it('offers crossword only in rooms whose language has puzzles', () => {
    const { unmount } = render(<BattleModeCard {...baseProps} showInWorkModes language="he" />);
    expect(screen.getByTestId('game-mode-crossword')).toBeInTheDocument();
    unmount();
    render(<BattleModeCard {...baseProps} showInWorkModes language="ru" />);
    expect(screen.queryByTestId('game-mode-crossword')).not.toBeInTheDocument();
  });

  it.each(['ja', 'es'])('offers crossword in %s rooms', (language) => {
    render(<BattleModeCard {...baseProps} showInWorkModes language={language} />);
    expect(screen.getByTestId('game-mode-crossword')).toBeInTheDocument();
  });

  it('falls back to random when the room switches to a language without crossword', () => {
    const setSelectedGameMode = vi.fn();
    render(<BattleModeCard {...baseProps} setSelectedGameMode={setSelectedGameMode} selectedGameMode="crossword" showInWorkModes language="ru" />);
    expect(setSelectedGameMode).toHaveBeenCalledWith('random');
  });

  it('leaves non-picker selections (e.g. classroom wordcraft) alone', () => {
    const setSelectedGameMode = vi.fn();
    render(<BattleModeCard {...baseProps} setSelectedGameMode={setSelectedGameMode} selectedGameMode={'wordcraft' as never} language="ja" />);
    expect(setSelectedGameMode).not.toHaveBeenCalled();
  });
});
