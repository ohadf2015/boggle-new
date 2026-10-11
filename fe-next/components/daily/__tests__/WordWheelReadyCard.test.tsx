import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import WordWheelReadyCard from '../WordWheelReadyCard';

const t = (key: string, params?: Record<string, unknown>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

const base = {
  t,
  centerLetter: 'N',
  outerLetters: ['W', 'G', 'H', 'A', 'I', 'T'],
  puzzleNumber: 285,
  streakDays: 0,
  onPlay: vi.fn(),
};

describe('WordWheelReadyCard', () => {
  it('names today\'s puzzle and starts it from one PLAY button', () => {
    const onPlay = vi.fn();
    render(<WordWheelReadyCard {...base} onPlay={onPlay}><div data-testid="board" /></WordWheelReadyCard>);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('wordWheel.title');
    expect(screen.getByText(/daily\.puzzleNumber/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'daily.play' }));
    expect(onPlay).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('board')).toBeInTheDocument();
  });

  it('lists the three rules once, not as separate chips', () => {
    render(<WordWheelReadyCard {...base} />);
    const rules = screen.getByTestId('ready-rules');
    expect(rules.textContent).toContain('wordWheel.centerLetterRule');
    expect(rules.textContent).toContain('wordWheel.minLetters');
    expect(rules.textContent).toContain('wordWheel.timeLimit');
  });

  it('shows the streak only when there is one', () => {
    const { rerender } = render(<WordWheelReadyCard {...base} />);
    expect(screen.queryByTestId('ready-streak')).toBeNull();
    rerender(<WordWheelReadyCard {...base} streakDays={4} />);
    expect(screen.getByTestId('ready-streak').textContent).toContain('"count":4');
  });

  it('hides the outer letters until play starts', () => {
    render(<WordWheelReadyCard {...base} />);
    const tiles = screen.getAllByTestId('preview-outer-letter');
    expect(tiles).toHaveLength(6);
    tiles.forEach((tile, i) => expect(tile.textContent).not.toContain(base.outerLetters[i]));
    expect(screen.getByText('N')).toBeInTheDocument();
  });
});
