import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WordCraftGameOverScene } from '../WordCraftGameOverScene';

const t = (k: string, vars?: Record<string, unknown>) => {
  if (k === 'wordcraft.youWon') return 'You won!';
  if (k === 'wordcraft.opponentWon') return `${String(vars?.name ?? '')} won`;
  if (k === 'wordcraft.tied') return 'Tied';
  if (k === 'wordcraft.you') return 'You';
  if (k === 'wordcraft.bot') return 'Bot';
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

  it('says "You won!" (not the player name) when the local player wins', () => {
    const { container } = render(
      <WordCraftGameOverScene
        t={t}
        playerScore={120}
        botScore={80}
      />
    );
    const banner = container.querySelector('[role="status"]');
    expect(banner?.textContent).toContain('You won!');
    // Must never leak an un-substituted i18n placeholder.
    expect(banner?.textContent).not.toContain('{name}');
    expect(banner?.textContent).not.toContain('{{name}}');
  });

  it('names the opponent + "won" when the local player loses', () => {
    const { container } = render(
      <WordCraftGameOverScene t={t} playerScore={80} botScore={120} />
    );
    const banner = container.querySelector('[role="status"]');
    // Default opponent label is the bot; placeholder must be substituted.
    expect(banner?.textContent).toContain('Bot won');
    expect(banner?.textContent).not.toContain('{name}');
  });

  it('renders an avatar beside each score column (seeded fallback when none supplied)', () => {
    const { container } = render(
      <WordCraftGameOverScene t={t} playerScore={120} botScore={80} />
    );
    // Both the player and opponent columns carry an avatar node — the win/lose
    // screen now shows faces, not just numbers.
    expect(container.querySelectorAll('[data-wc-result-avatar]').length).toBe(2);
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

  it('names the winning SEAT in hot-seat instead of ambiguous "You won!"', () => {
    // GIVEN two humans on one device and Player 1 (the local seat) wins
    const { container } = render(
      <WordCraftGameOverScene
        t={t}
        playerScore={120}
        botScore={80}
        playerName="Player 1"
        botName="Player 2"
      />
    );
    // THEN the banner names the winning seat — "You won!" is meaningless when
    // both players share the screen.
    const banner = container.querySelector('[role="status"]');
    expect(banner?.textContent).toContain('Player 1');
    expect(banner?.textContent).not.toContain('You won!');
  });

  it('renders as a full-screen modal overlay so the game end is unmissable', () => {
    const { container } = render(
      <WordCraftGameOverScene
        t={t}
        playerScore={50}
        botScore={50}
      />
    );
    const overlay = container.querySelector('[role="dialog"]');
    expect(overlay).toBeTruthy();
    expect(overlay?.getAttribute('aria-modal')).toBe('true');
    expect(overlay?.className).toContain('fixed');
    expect(overlay?.className).toContain('inset-0');
    expect(overlay?.className).toContain('z-50');
  });

  it('shows both final square counts so the result is concrete', () => {
    render(
      <WordCraftGameOverScene
        t={t}
        playerScore={120}
        botScore={80}
      />
    );
    // The headline number for each side (territory squares) must be visible.
    expect(screen.getByText('120')).toBeTruthy();
    expect(screen.getByText('80')).toBeTruthy();
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
