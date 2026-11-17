import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { HuntFinishOverlay } from '../HuntFinishOverlay';

vi.mock('@/components/effects/InlineConfetti', () => ({
  InlineConfetti: () => <div data-testid="inline-confetti" />,
}));

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${JSON.stringify(params)}` : key);

describe('HuntFinishOverlay', () => {
  it('Given a lost run, When the board locks, Then it says so close and reveals the word letter by letter', () => {
    render(<HuntFinishOverlay outcome="loss" targetWord="crane" language="en" tries={10} calm={false} onSkip={vi.fn()} t={t} />);
    expect(screen.getByText('closeLoss.soClose')).toBeInTheDocument();
    expect(screen.getByText('wordHunt.results.theTargetWordWas')).toBeInTheDocument();
    const tiles = screen.getAllByTestId('hunt-finish-letter');
    expect(tiles.map(el => el.textContent).join('')).toBe('CRANE');
    expect(screen.queryByTestId('inline-confetti')).toBeNull();
  });

  it('Given a solve in two tries, Then a big "Solved!" names the tries used, with one confetti burst and no ordinary praise', () => {
    render(<HuntFinishOverlay outcome="win" targetWord="crane" language="en" tries={2} calm={false} onSkip={vi.fn()} t={t} />);
    expect(screen.getByTestId('hunt-finish-headline')).toHaveTextContent('wordHunt.survival.solved.title');
    expect(screen.getByTestId('hunt-finish-tries')).toHaveTextContent('wordHunt.survival.solved.inTries_other:{"count":2}');
    expect(screen.queryByText(/wordHunt\.celebrate\.tier/)).toBeNull();
    expect(screen.getAllByTestId('inline-confetti')).toHaveLength(1);
  });

  it('Given a first-try solve, Then it says so instead of a count', () => {
    render(<HuntFinishOverlay outcome="win" targetWord="crane" language="en" tries={1} calm={false} onSkip={vi.fn()} t={t} />);
    expect(screen.getByTestId('hunt-finish-tries')).toHaveTextContent('wordHunt.survival.solved.firstTry');
  });

  it('Given Russian, Then the tries line picks the few/many form', () => {
    const { unmount } = render(<HuntFinishOverlay outcome="win" targetWord="слово" language="ru" tries={3} calm onSkip={vi.fn()} t={t} />);
    expect(screen.getByTestId('hunt-finish-tries')).toHaveTextContent('inTries_few');
    unmount();
    render(<HuntFinishOverlay outcome="win" targetWord="слово" language="ru" tries={6} calm onSkip={vi.fn()} t={t} />);
    expect(screen.getByTestId('hunt-finish-tries')).toHaveTextContent('inTries_many');
  });

  it('Given a solve, Then the word is not repeated over the board: the clue boxes above already hold it', () => {
    render(<HuntFinishOverlay outcome="win" targetWord="crane" language="en" tries={2} calm={false} onSkip={vi.fn()} t={t} />);
    expect(screen.queryByTestId('hunt-finish-letter')).toBeNull();
  });

  it('Given a solve, Then the dim over the board is static, never an opacity fade-in', () => {
    render(<HuntFinishOverlay outcome="win" targetWord="crane" language="en" tries={2} calm={false} onSkip={vi.fn()} t={t} />);
    const finish = screen.getByTestId('hunt-finish');
    expect(finish.className).toContain('bg-neo-navy/');
    expect(finish.querySelector('[style*="opacity"]')).toBeNull();
  });

  it('Given reduced effects, When a solve locks the board, Then the headline still shows but no confetti fires', () => {
    render(<HuntFinishOverlay outcome="win" targetWord="crane" language="en" tries={2} calm onSkip={vi.fn()} t={t} />);
    expect(screen.getByTestId('hunt-finish-headline')).toBeInTheDocument();
    expect(screen.queryByTestId('inline-confetti')).toBeNull();
  });

  it('Given the finish beat, When the player taps the board, Then results are asked for right away', () => {
    const onSkip = vi.fn();
    render(<HuntFinishOverlay outcome="loss" targetWord="crane" language="en" tries={10} calm onSkip={onSkip} t={t} />);
    fireEvent.click(screen.getByTestId('hunt-finish'));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it.each(['win', 'loss'] as const)('Given a %s, Then no small "tap to continue" label is printed under the stamp; the tap shortcut stays for assistive tech', (outcome) => {
    render(<HuntFinishOverlay outcome={outcome} targetWord="crane" language="en" tries={1} calm={false} onSkip={vi.fn()} t={t} />);
    expect(screen.queryByText('common.tapToContinue')).toBeNull();
    expect(screen.getByTestId('hunt-finish')).toHaveAttribute('aria-label', 'common.tapToContinue');
  });

  it('Given a Hebrew word, When revealed, Then final letter forms are applied', () => {
    render(<HuntFinishOverlay outcome="loss" targetWord="שלומ" language="he" tries={10} calm onSkip={vi.fn()} t={t} />);
    expect(screen.getAllByTestId('hunt-finish-letter').map(el => el.textContent).join('')).toBe('שלום');
  });
});
