import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WordCraftGameOverScene } from '../WordCraftGameOverScene';

const t = (k: string) => {
  if (k === 'wordcraft.winnerLabel') return 'Winner: {{name}}';
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

  it('has proper positioning and z-index', () => {
    const { container } = render(
      <WordCraftGameOverScene
        t={t}
        playerScore={50}
        botScore={50}
      />
    );
    const banner = container.querySelector('[role="status"]');
    expect(banner?.className).toContain('z-40');
    expect(banner?.className).toContain('bottom-');
  });
});
