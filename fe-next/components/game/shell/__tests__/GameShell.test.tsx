import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GameShell } from '../GameShell';

describe('GameShell', () => {
  it('given rails and a stage, when rendered, then both rails wrap the stage at first paint', () => {
    render(
      <GameShell mode="classic" accent="lime" left={<p>rivals</p>} right={<p>words</p>}>
        <div data-testid="board">board</div>
      </GameShell>,
    );
    expect(screen.getByTestId('game-shell-left').textContent).toBe('rivals');
    expect(screen.getByTestId('game-shell-right').textContent).toBe('words');
    expect(screen.getByTestId('game-shell-stage').contains(screen.getByTestId('board'))).toBe(true);
    expect(screen.getByTestId('game-shell').getAttribute('data-game-shell')).toBe('classic');
  });

  it('exposes the accent as a CSS variable so rails and board share one mode colour', () => {
    render(
      <GameShell mode="blast" accent="pink" left={null} right={null}>
        <div />
      </GameShell>,
    );
    expect(screen.getByTestId('game-shell').style.getPropertyValue('--shell-accent')).toBe('#ff1493');
  });
});
