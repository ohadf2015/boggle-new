import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WordCraftGameOverScene } from '../WordCraftGameOverScene';

const t = (k: string) => {
  if (k === 'wordcraft.winnerLabel') return 'Winner: {name}';
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
