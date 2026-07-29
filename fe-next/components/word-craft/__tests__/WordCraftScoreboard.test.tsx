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

describe('WordCraftScoreboard', () => {
  it('renders both scores and the bag count', () => {
    renderBoard();
    expect(screen.getByText('120')).toBeTruthy();
    expect(screen.getByText('80')).toBeTruthy();
    expect(screen.getByText('42')).toBeTruthy();
  });

  it('renders folded territory counts when territory prop is present', () => {
    renderBoard({
      territory: { playerCount: 7, botCount: 3, label: 'Territory' },
    });
    const terr = screen.getByTestId('wc-scoreboard-territory');
    expect(terr).toBeTruthy();
    expect(terr.textContent).toContain('7');
    expect(terr.textContent).toContain('3');
  });

  it('omits the territory chip when territory prop is absent', () => {
    renderBoard();
    expect(screen.queryByTestId('wc-scoreboard-territory')).toBeNull();
  });
});
