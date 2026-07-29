import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { WordCraftHUD } from '../WordCraftHUD';

const t = (k: string) => `[${k}]`;

describe('WordCraftHUD', () => {
  it('renders player score chip with data-wc-score-chip attribute', () => {
    const { container } = render(
      <WordCraftHUD
        t={t}
        playerScore={42}
        botScore={10}
        currentTurn="player"
        tilesInBag={45}
      />
    );
    expect(container.querySelector('[data-wc-score-chip]')).toBeTruthy();
  });

  it('renders bag count with data-wc-bag attribute', () => {
    const { container } = render(
      <WordCraftHUD t={t} playerScore={0} botScore={0} currentTurn="player" tilesInBag={78} />
    );
    const bag = container.querySelector('[data-wc-bag]');
    expect(bag).toBeTruthy();
    expect(bag?.textContent).toContain('78');
  });

  it('renders the legend chip', () => {
    const { container } = render(
      <WordCraftHUD t={t} playerScore={0} botScore={0} currentTurn="player" tilesInBag={78} />
    );
    expect(container.querySelector('[data-premium="TW"]')).toBeTruthy();
  });

  it('highlights player score when it is player turn', () => {
    const { container } = render(
      <WordCraftHUD t={t} playerScore={50} botScore={30} currentTurn="player" tilesInBag={45} />
    );
    const playerChip = container.querySelector('[data-wc-score-chip]');
    expect(playerChip?.className).toContain('bg-neo-lime');
  });

  it('highlights bot score when it is bot turn', () => {
    const { container } = render(
      <WordCraftHUD t={t} playerScore={30} botScore={50} currentTurn="bot" tilesInBag={45} />
    );
    const playerChip = container.querySelector('[data-wc-score-chip]');
    expect(playerChip?.className).toContain('bg-neo-navy-light');
  });
});
