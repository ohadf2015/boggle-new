import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WordCraftScoreboard } from '../WordCraftScoreboard';
import type { PlayerState } from '@/lib/word-craft/types';

// Avatar pulls heavy avatar-rendering deps; the scoreboard logic under test
// (scores, bag, territory) doesn't depend on it.
vi.mock('@/components/Avatar', () => ({
  default: () => <div data-testid="avatar" />,
}));

const player: PlayerState = { score: 120, rack: [] } as unknown as PlayerState;
const bot: PlayerState = { score: 80, rack: [] } as unknown as PlayerState;

const labels = {
  you: 'You',
  bot: 'Bot',
  yourTurn: 'Your turn',
  botTurn: 'Bot turn',
  gameOver: 'Game over',
  bagRemaining: 'left',
};

function renderBoard(extra?: Partial<React.ComponentProps<typeof WordCraftScoreboard>>) {
  return render(
    <WordCraftScoreboard
      player={player}
      bot={bot}
      turn="player"
      tilesRemaining={42}
      labels={labels}
      {...extra}
    />,
  );
}

describe('WordCraftScoreboard (Conquest)', () => {
  it('falls back to the point totals + bag count when no territory is supplied', () => {
    renderBoard();
    expect(screen.getByText('120')).toBeTruthy();
    expect(screen.getByText('80')).toBeTruthy();
    expect(screen.getByText('42')).toBeTruthy();
  });

  it('headlines territory cell counts (not points) when territory is supplied', () => {
    renderBoard({
      territory: { playerCount: 7, botCount: 3, label: 'Territory' },
    });
    // The big numbers are the cell counts now, not the 120/80 point totals.
    expect(screen.getByText('7')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.queryByText('120')).toBeNull();
    expect(screen.queryByText('80')).toBeNull();
    // Territory label shows in the meta row.
    expect(screen.getByText('Territory')).toBeTruthy();
  });
});
