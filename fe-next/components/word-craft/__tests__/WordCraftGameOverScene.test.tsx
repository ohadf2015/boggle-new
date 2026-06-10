import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WordCraftGameOverScene } from '../WordCraftGameOverScene';

const t = (k: string, vars?: Record<string, unknown>) => {
  if (k === 'wordcraft.winnerLabel') {
    const template = 'Winner: {{name}}';
    if (vars?.name) return template.replace('{{name}}', String(vars.name));
    return template;
  }
  if (k === 'wordcraft.you') return 'You';
  if (k === 'wordcraft.duel.youWin') return 'You win!';
  if (k === 'wordcraft.duel.youLose') return 'They win';
  if (k === 'wordcraft.duel.tie') return 'Tied!';
  if (k === 'wordcraft.duel.vsChallenger') return `vs ${String(vars?.name ?? '')}`;
  return `[${k}]`;
};

describe('WordCraftGameOverScene', () => {
  it('renders the final scores banner', () => {
    const { container } = render(
      <WordCraftGameOverScene
        t={t}
        playerScore={120}
        botScore={80}
      />
    );
    expect(container.querySelector('[role="status"]')).toBeTruthy();
  });

  it('displays winner label with player name when player wins', () => {
    const { container } = render(
      <WordCraftGameOverScene
        t={t}
        playerScore={120}
        botScore={80}
      />
    );
    const banner = container.querySelector('[role="status"]');
    expect(banner?.textContent).toContain('Winner');
  });

  it('has neo-yellow background for celebration', () => {
    const { container } = render(
      <WordCraftGameOverScene
        t={t}
        playerScore={100}
        botScore={100}
      />
    );
    const banner = container.querySelector('[role="status"]');
    expect(banner?.className).toContain('bg-neo-yellow');
  });

  it('uses the supplied seat names (hot-seat) instead of You/WordBot', () => {
    // GIVEN explicit player/bot names (pass-and-play: Player 1 / Player 2)
    const { container } = render(
      <WordCraftGameOverScene
        t={t}
        playerScore={80}
        botScore={120}
        playerName="Player 1"
        botName="Player 2"
      />
    );
    // WHEN player 2 (the bot seat) wins THEN the banner names Player 2, not WordBot
    const banner = container.querySelector('[role="status"]');
    expect(banner?.textContent).toContain('Player 2');
    expect(banner?.textContent).not.toContain('wordcraft.bot');
  });

  it('has proper positioning and z-index (on the floating wrapper)', () => {
    const { container } = render(
      <WordCraftGameOverScene
        t={t}
        playerScore={50}
        botScore={50}
      />
    );
    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toContain('z-40');
    expect(wrapper?.className).toContain('bottom-');
  });

  it('shows the New Best badge only when isNewBest is set', () => {
    const without = render(
      <WordCraftGameOverScene t={t} playerScore={120} botScore={80} />
    );
    expect(without.queryByText(/wordcraft.newBest/)).toBeNull();
    without.unmount();

    render(
      <WordCraftGameOverScene t={t} playerScore={120} botScore={80} isNewBest />
    );
    expect(screen.getByText(/wordcraft.newBest/)).toBeTruthy();
  });

  describe('play-again / home closure loop', () => {
    it('renders Play Again + Home CTAs and fires their handlers (the missing replay loop)', () => {
      const onPlayAgain = vi.fn();
      const onHome = vi.fn();
      render(
        <WordCraftGameOverScene
          t={t}
          playerScore={120}
          botScore={80}
          onPlayAgain={onPlayAgain}
          onHome={onHome}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /playAgain/i }));
      expect(onPlayAgain).toHaveBeenCalledTimes(1);
      fireEvent.click(screen.getByRole('button', { name: /home/i }));
      expect(onHome).toHaveBeenCalledTimes(1);
    });

    it('omits the CTAs when no handlers are supplied (e.g. duel/hot-seat contexts)', () => {
      render(<WordCraftGameOverScene t={t} playerScore={50} botScore={50} />);
      expect(screen.queryByRole('button', { name: /playAgain/i })).toBeNull();
    });
  });

  describe('duel result', () => {
    it('renders duel result when duelOutcome is present', () => {
      const { container } = render(
        <WordCraftGameOverScene
          t={t}
          playerScore={150}
          botScore={100}
          duelOutcome={{
            outcome: 'win',
            challengerName: 'Alice',
            challengerScore: 120,
          }}
        />
      );
      // Should render the duel result component (shows challenger name and scores)
      expect(container.textContent).toContain('Alice');
      expect(container.textContent).toContain('150');
      expect(container.textContent).toContain('120');
    });

    it('shows win outcome when player scores higher than challenger', () => {
      render(
        <WordCraftGameOverScene
          t={t}
          playerScore={200}
          botScore={100}
          duelOutcome={{
            outcome: 'win',
            challengerName: 'Bob',
            challengerScore: 150,
          }}
        />
      );
      expect(screen.getByText(/You win!/)).toBeTruthy();
    });

    it('shows lose outcome when player scores lower than challenger', () => {
      render(
        <WordCraftGameOverScene
          t={t}
          playerScore={100}
          botScore={100}
          duelOutcome={{
            outcome: 'lose',
            challengerName: 'Charlie',
            challengerScore: 200,
          }}
        />
      );
      expect(screen.getByText(/They win/)).toBeTruthy();
    });

    it('shows tie outcome when scores are equal', () => {
      render(
        <WordCraftGameOverScene
          t={t}
          playerScore={150}
          botScore={100}
          duelOutcome={{
            outcome: 'tie',
            challengerName: 'Dave',
            challengerScore: 150,
          }}
        />
      );
      expect(screen.getByText(/Tied!/)).toBeTruthy();
    });

    it('displays challenger name in vs header', () => {
      render(
        <WordCraftGameOverScene
          t={t}
          playerScore={100}
          botScore={100}
          duelOutcome={{
            outcome: 'win',
            challengerName: 'Eve',
            challengerScore: 80,
          }}
        />
      );
      expect(screen.getByText(/vs Eve/)).toBeTruthy();
    });

    it('still offers Play Again + Home after a duel (no dead-end)', () => {
      // GIVEN a finished duel WITH replay handlers
      const onPlayAgain = vi.fn();
      const onHome = vi.fn();
      render(
        <WordCraftGameOverScene
          t={t}
          playerScore={150}
          botScore={100}
          duelOutcome={{ outcome: 'win', challengerName: 'Alice', challengerScore: 120 }}
          onPlayAgain={onPlayAgain}
          onHome={onHome}
        />
      );
      // THEN the player can escape the duel result, not just re-challenge
      fireEvent.click(screen.getByRole('button', { name: /playAgain/i }));
      expect(onPlayAgain).toHaveBeenCalledTimes(1);
      fireEvent.click(screen.getByRole('button', { name: /home/i }));
      expect(onHome).toHaveBeenCalledTimes(1);
    });
  });
});
