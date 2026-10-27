import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { HuntFinishOverlay } from '../HuntFinishOverlay';

vi.mock('@/components/effects/InlineConfetti', () => ({
  InlineConfetti: () => <div data-testid="inline-confetti" />,
}));

const t = (key: string) => key;

describe('HuntFinishOverlay', () => {
  it('Given a lost run, When the board locks, Then it says so close and reveals the word letter by letter', () => {
    render(<HuntFinishOverlay outcome="loss" targetWord="crane" language="en" tier={null} calm={false} onSkip={vi.fn()} t={t} />);
    expect(screen.getByText('closeLoss.soClose')).toBeInTheDocument();
    expect(screen.getByText('wordHunt.results.theTargetWordWas')).toBeInTheDocument();
    const tiles = screen.getAllByTestId('hunt-finish-letter');
    expect(tiles.map(el => el.textContent).join('')).toBe('CRANE');
    expect(screen.queryByTestId('inline-confetti')).toBeNull();
  });

  it('Given a solve, When the board locks, Then the tier praise and the word show with one confetti burst', () => {
    render(
      <HuntFinishOverlay
        outcome="win" targetWord="crane" language="en" calm={false} onSkip={vi.fn()} t={t}
        tier={{ tier: 1, labelKey: 'wordHunt.tier.genius' } as never}
      />,
    );
    expect(screen.getByText('wordHunt.tier.genius')).toBeInTheDocument();
    expect(screen.getAllByTestId('hunt-finish-letter')).toHaveLength(5);
    expect(screen.getAllByTestId('inline-confetti')).toHaveLength(1);
  });

  it('Given reduced effects, When a solve locks the board, Then the word still shows but no confetti fires', () => {
    render(<HuntFinishOverlay outcome="win" targetWord="crane" language="en" tier={null} calm onSkip={vi.fn()} t={t} />);
    expect(screen.getAllByTestId('hunt-finish-letter')).toHaveLength(5);
    expect(screen.queryByTestId('inline-confetti')).toBeNull();
  });

  it('Given the finish beat, When the player taps the board, Then results are asked for right away', () => {
    const onSkip = vi.fn();
    render(<HuntFinishOverlay outcome="loss" targetWord="crane" language="en" tier={null} calm onSkip={onSkip} t={t} />);
    fireEvent.click(screen.getByTestId('hunt-finish'));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('Given a Hebrew word, When revealed, Then final letter forms are applied', () => {
    render(<HuntFinishOverlay outcome="loss" targetWord="שלומ" language="he" tier={null} calm onSkip={vi.fn()} t={t} />);
    expect(screen.getAllByTestId('hunt-finish-letter').map(el => el.textContent).join('')).toBe('שלום');
  });
});
