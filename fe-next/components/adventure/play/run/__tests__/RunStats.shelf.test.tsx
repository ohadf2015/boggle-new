import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({
    // Interpolating, so a sentence key with a number in it still renders the number:
    // the tooltip's one surviving figure lives INSIDE its sentence now, not beside it.
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k} ${Object.values(p).join(' ')}` : k),
    language: 'en',
  }),
}));

import RunStats from '../RunStats';
import { relicRunContributions, runStackCtx } from '../relicRunTotals';
import type { RunSummary } from '../runSummary';

const seed = (levels: string[][]) => {
  const m = new Map<string, string>([['adv-run-words-w1', JSON.stringify(levels)]]);
  (globalThis as { sessionStorage?: unknown }).sessionStorage = {
    getItem: (k: string) => m.get(k) ?? null, setItem: () => {}, removeItem: () => {},
  };
};

const summary: RunSummary = { levelsCleared: 2, relics: ['magnet'], gold: 40, bestWord: null };

describe('RunStats relic shelf — the recap answers the same question the HUD does', () => {
  it('Given the run context, when a relic on the shelf is tapped, then it prints what it paid THIS RUN', () => {
    seed([['house', 'tiger'], ['planet']]);
    const expected = relicRunContributions(runStackCtx(1, 3, ['magnet']).levels, ['magnet']).magnet!;
    expect(expected).toBeGreaterThan(0);

    render(<RunStats summary={summary} fell variant="relics" runCtx={{ world: 1, step: 3 }} />);
    fireEvent.click(screen.getByRole('button', { name: 'adventurePlay.relic.magnet' }));
    expect(screen.getByTestId('relic-run').textContent).toContain(`${expected}`);
  });

  it('Given no run context, then the shelf still renders — the tooltip simply carries no numbers', () => {
    seed([['house']]);
    render(<RunStats summary={summary} fell variant="relics" />);
    fireEvent.click(screen.getByRole('button', { name: 'adventurePlay.relic.magnet' }));
    expect(screen.queryByTestId('relic-run')).toBeNull();
    expect(screen.getByRole('tooltip').textContent).toContain('adventurePlay.relic.magnet');
  });
});

/**
 * The bar keeps its relic bar pinned through the whole run and into its victory
 * screen — an icon strip you read at a glance. Ours used to swap it for the
 * grey sentence "No relics this run", which reads as an apology and breaks the
 * one shape the player learned in the HUD.
 */
describe('RunStats relic shelf — empty', () => {
  const none: RunSummary = { levelsCleared: 1, relics: [], gold: 0, bestWord: null };

  it('Given no relics, then the shelf is still a shelf — empty sockets, not a sentence', () => {
    seed([]);
    render(<RunStats summary={none} fell variant="relics" />);
    expect(screen.getByTestId('relic-shelf')).toBeInTheDocument();
    expect(screen.getAllByTestId('relic-socket').length).toBeGreaterThanOrEqual(3);
    expect(screen.queryByText('adventurePlay.loot.noRelics')).toBeNull();
  });

  it('Given relics, then the sockets give way to the chips and the shelf states the count', () => {
    seed([['house']]);
    render(<RunStats summary={summary} fell variant="relics" />);
    expect(screen.queryByTestId('relic-socket')).toBeNull();
    expect(screen.getByTestId('relic-shelf').textContent).toContain('1');
  });
});
